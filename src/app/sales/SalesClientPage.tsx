"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, FileText, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, startTransition } from 'react';
import type { Sale, Part, Customer } from '@/lib/types';
import { SaleFormDialog, type SaleFormData } from '@/components/sales/SaleFormDialog';
import { InvoiceViewDialog } from '@/components/sales/InvoiceViewDialog';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { addSale, updateSalePaymentType } from './actions';

interface SalesClientPageProps {
  initialSales: Sale[];
  initialInventoryParts: Part[];
  initialCustomers: Customer[]; // For context, not directly modified here but Server Action handles it
}

export function SalesClientPage({ initialSales, initialInventoryParts, initialCustomers }: SalesClientPageProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [inventoryParts, setInventoryParts] = useState<Part[]>(initialInventoryParts);
  // Customers state is not directly managed here, server actions handle updates

  const [isSaleFormOpen, setIsSaleFormOpen] = useState(false);
  const [isInvoiceViewOpen, setIsInvoiceViewOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);

  const [statusFilters, setStatusFilters] = useState({ paid: true, pending: false, overdue: false });

  useEffect(() => {
    setSales(initialSales);
  }, [initialSales]);

  useEffect(() => {
    setInventoryParts(initialInventoryParts);
  }, [initialInventoryParts]);


  const handleNewSaleSubmit = async (data: SaleFormData) => {
    const newSaleData: Sale = {
      id: `S${Date.now().toString().slice(-4)}${Math.random().toString(36).substr(2, 2).toUpperCase()}`, 
      date: data.saleDate!.toISOString(), 
      buyerName: data.buyerName,
      gstNumber: data.gstNumber,
      contactDetails: data.contactDetails,
      emailAddress: data.emailAddress,
      items: data.items.map(item => ({
        partNumber: item.partNumber,
        partName: item.partName, 
        quantitySold: item.quantity,
        unitPrice: item.unitPrice,
        itemTotal: item.quantity * item.unitPrice,
      })),
      subTotal: data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
      discount: data.discount || 0,
      netAmount: data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0) - (data.discount || 0),
      paymentType: data.paymentType,
    };

    startTransition(async () => {
      const result = await addSale(newSaleData);
      if (result.success) {
        toast({ title: "Sale Recorded", description: result.message });
        setIsSaleFormOpen(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleSalePaymentTypeChangeClient = async (saleId: string, newPaymentType: 'cash' | 'credit') => {
    startTransition(async () => {
      const result = await updateSalePaymentType(saleId, newPaymentType);
      if (result.success) {
        toast({ title: "Payment Type Updated", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleViewBillClick = (sale: Sale) => {
    setSelectedSaleForInvoice(sale);
    setIsInvoiceViewOpen(true);
  };

  const filteredSales = sales.filter(sale =>
    (sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.buyerName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilters.paid && (sale.paymentType === 'cash' || sale.paymentType === 'credit')) 
  ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const handleStatusFilterChange = (statusKey: keyof typeof statusFilters, checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [statusKey]: checked }));
  };

  const getPaymentTypeStyle = (paymentType: 'cash' | 'credit') => {
    switch (paymentType) {
      case 'cash': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800';
      case 'credit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Management</h1>
          <p className="text-muted-foreground">Track sales. Customer 'Amount Due' updates for 'Credit' sales.</p>
        </div>
        <Button onClick={() => setIsSaleFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> New Sale</Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
          <CardDescription>Review sales. You can change payment type for each sale.</CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by sale ID or customer..." className="pl-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Filter className="mr-2 h-4 w-4" />Filter Status (Placeholder)</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel><DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={statusFilters.paid} onCheckedChange={(checked) => handleStatusFilterChange('paid', Boolean(checked))}>Paid/Completed</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilters.pending} onCheckedChange={(checked) => handleStatusFilterChange('pending', Boolean(checked))} disabled>Pending</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilters.overdue} onCheckedChange={(checked) => handleStatusFilterChange('overdue', Boolean(checked))} disabled>Overdue</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale ID</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
                <TableHead className="text-right">Net Amount</TableHead><TableHead>Payment Type</TableHead><TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>{format(parseISO(sale.date), "PPp")}</TableCell>
                  <TableCell>{sale.buyerName}</TableCell>
                  <TableCell className="text-right">₹{sale.netAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Select value={sale.paymentType} onValueChange={(newPaymentType: 'cash' | 'credit') => handleSalePaymentTypeChangeClient(sale.id, newPaymentType)}>
                      <SelectTrigger className={cn("h-8 text-xs w-auto min-w-[100px] border", getPaymentTypeStyle(sale.paymentType))}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                        <SelectItem value="credit" className="text-xs">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewBillClick(sale)} title="View Bill"><FileText className="h-4 w-4" /><span className="sr-only">View Bill</span></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredSales.length === 0 && (<div className="text-center py-10 text-muted-foreground">{sales.length > 0 && searchTerm ? 'No sales match search.' : 'No sales recorded.'}</div>)}
        </CardContent>
      </Card>
      <SaleFormDialog isOpen={isSaleFormOpen} onOpenChange={setIsSaleFormOpen} onSubmit={handleNewSaleSubmit} inventoryParts={inventoryParts} />
      {selectedSaleForInvoice && (<InvoiceViewDialog isOpen={isInvoiceViewOpen} onOpenChange={setIsInvoiceViewOpen} sale={selectedSaleForInvoice} />)}
    </div>
  );
}