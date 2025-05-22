
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, FileText, Filter, Ban, Undo2 } from 'lucide-react'; // Added Undo2 icon
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, startTransition } from 'react';
import type { Sale, Part, Customer } from '@/lib/types';
import { SaleFormDialog, type SaleFormData } from '@/components/sales/SaleFormDialog';
import { InvoiceViewDialog } from '@/components/sales/InvoiceViewDialog';
import { CancelSaleDialog } from '@/components/sales/CancelSaleDialog';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { addSale, updateSalePaymentType, cancelSaleAction, restoreSaleAction } from './actions'; // Import restoreSaleAction
import type { AppSettings } from '@/app/settings/actions';
import { Badge } from '@/components/ui/badge';

interface SalesClientPageProps {
  initialSales: Sale[];
  initialInventoryParts: Part[];
  initialCustomers: Customer[]; 
  companySettings: AppSettings;
}

export function SalesClientPage({ initialSales, initialInventoryParts, initialCustomers, companySettings }: SalesClientPageProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [inventoryParts, setInventoryParts] = useState<Part[]>(initialInventoryParts);

  const [isSaleFormOpen, setIsSaleFormOpen] = useState(false);
  const [isInvoiceViewOpen, setIsInvoiceViewOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);

  const [isCancelSaleDialogOpen, setIsCancelSaleDialogOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  // No separate dialog needed for restore, it's a direct action

  const [statusFilters, setStatusFilters] = useState({ paid: true, pending: false, overdue: false, cancelled: true });

  useEffect(() => { setSales(initialSales); }, [initialSales]);
  useEffect(() => { setInventoryParts(initialInventoryParts); }, [initialInventoryParts]);

  const handleNewSaleSubmit = async (formData: SaleFormData) => {
    const saleDataForAction: Omit<Sale, 'id' | 'status'> = {
      id: `TEMP_ID_${Date.now()}`,
      date: formData.saleDate!.toISOString(), 
      buyerName: formData.buyerName,
      gstNumber: formData.gstNumber,
      contactDetails: formData.contactDetails,
      emailAddress: formData.emailAddress,
      items: formData.items.map(item => ({
        partNumber: item.partNumber,
        partName: item.partName, 
        quantitySold: item.quantity,
        unitPrice: item.unitPrice,
        itemTotal: item.quantity * item.unitPrice,
      })),
      subTotal: formData.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
      discount: formData.discount || 0,
      netAmount: formData.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0) - (formData.discount || 0),
      paymentType: formData.paymentType,
    };

    startTransition(async () => {
      const result = await addSale(saleDataForAction);
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

  const handleOpenCancelSaleDialog = (sale: Sale) => {
    setSaleToCancel(sale);
    setIsCancelSaleDialogOpen(true);
  };

  const handleConfirmCancelSale = () => {
    if (!saleToCancel) return;
    startTransition(async () => {
      const result = await cancelSaleAction(saleToCancel.id);
      if (result.success) {
        toast({ title: "Sale Cancelled", description: result.message });
      } else {
        toast({ title: "Error Cancelling Sale", description: result.message, variant: "destructive" });
      }
      setIsCancelSaleDialogOpen(false);
      setSaleToCancel(null);
    });
  };

  const handleRestoreSale = (saleId: string) => {
    startTransition(async () => {
      const result = await restoreSaleAction(saleId);
      if (result.success) {
        toast({ title: "Sale Restored", description: result.message });
      } else {
        toast({ title: "Error Restoring Sale", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleViewBillClick = (sale: Sale) => {
    setSelectedSaleForInvoice(sale);
    setIsInvoiceViewOpen(true);
  };

  const filteredSales = sales.filter(sale => {
    const searchTermMatch = (sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             sale.buyerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const statusMatch = (statusFilters.paid && sale.status !== 'Cancelled') || (statusFilters.cancelled && sale.status === 'Cancelled');
    return searchTermMatch && statusMatch;
  }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const handleStatusFilterChange = (statusKey: keyof typeof statusFilters, checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [statusKey]: checked }));
  };

  const getPaymentTypeStyle = (paymentType: 'cash' | 'credit', status?: 'Completed' | 'Cancelled') => {
    if (status === 'Cancelled') return 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 border-gray-400 dark:border-gray-600';
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
          <CardDescription>Review sales. You can change payment type, cancel, or restore sales.</CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by sale ID or customer..." className="pl-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Filter className="mr-2 h-4 w-4" />Filter Status</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel><DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={statusFilters.paid} onCheckedChange={(checked) => handleStatusFilterChange('paid', Boolean(checked))}>Show Completed</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilters.cancelled} onCheckedChange={(checked) => handleStatusFilterChange('cancelled', Boolean(checked))}>Show Cancelled</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale ID</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
                <TableHead className="text-right">Net Amount</TableHead><TableHead>Payment Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => {
                const isCancelled = sale.status === 'Cancelled';
                return (
                  <TableRow key={sale.id} className={cn(isCancelled && "opacity-60 bg-muted/30")}>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>{format(parseISO(sale.date), "PPp")}</TableCell>
                    <TableCell>{sale.buyerName}</TableCell>
                    <TableCell className="text-right">₹{sale.netAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        value={sale.paymentType}
                        onValueChange={(newPaymentType: 'cash' | 'credit') => handleSalePaymentTypeChangeClient(sale.id, newPaymentType)}
                        disabled={isCancelled}
                      >
                        <SelectTrigger className={cn("h-8 text-xs w-auto min-w-[100px] border", getPaymentTypeStyle(sale.paymentType, sale.status))}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                          <SelectItem value="credit" className="text-xs">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isCancelled ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewBillClick(sale)} title="View Bill"><FileText className="h-4 w-4" /><span className="sr-only">View Bill</span></Button>
                      {isCancelled ? (
                        <Button variant="ghost" size="icon" className="hover:text-green-600" onClick={() => handleRestoreSale(sale.id)} title="Restore Sale"><Undo2 className="h-4 w-4" /><span className="sr-only">Restore Sale</span></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenCancelSaleDialog(sale)} title="Cancel Sale"><Ban className="h-4 w-4" /><span className="sr-only">Cancel Sale</span></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredSales.length === 0 && (<div className="text-center py-10 text-muted-foreground">{sales.length > 0 ? 'No sales match criteria.' : 'No sales recorded.'}</div>)}
        </CardContent>
      </Card>
      <SaleFormDialog isOpen={isSaleFormOpen} onOpenChange={setIsSaleFormOpen} onSubmit={handleNewSaleSubmit} inventoryParts={inventoryParts} />
      {selectedSaleForInvoice && (<InvoiceViewDialog isOpen={isInvoiceViewOpen} onOpenChange={setIsInvoiceViewOpen} sale={selectedSaleForInvoice} companySettings={companySettings} />)}
      {saleToCancel && (<CancelSaleDialog isOpen={isCancelSaleDialogOpen} onOpenChange={setIsCancelSaleDialogOpen} onConfirm={handleConfirmCancelSale} saleId={saleToCancel.id} />)}
    </div>
  );
}
