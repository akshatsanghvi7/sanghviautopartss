
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, FileText, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Sale, Part, SaleItem, Customer } from '@/lib/types';
import { SaleFormDialog, type SaleFormData } from '@/components/sales/SaleFormDialog';
import { InvoiceViewDialog } from '@/components/sales/InvoiceViewDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Initial mock sales data if localStorage is empty
const initialMockSales: Sale[] = [
  { id: 'S001', date: new Date('2024-07-15T10:00:00Z').toISOString(), buyerName: 'John Doe', emailAddress: 'john.doe@example.com', contactDetails: '555-1234', items: [{ partNumber: 'P001', partName: 'Spark Plug', quantitySold: 2, unitPrice: 5.99, itemTotal: 11.98 }], subTotal: 11.98, netAmount: 11.98, paymentType: 'cash', gstNumber: 'GST123' },
  { id: 'S002', date: new Date('2024-07-14T11:30:00Z').toISOString(), buyerName: 'Jane Smith', emailAddress: 'jane.smith@example.com', contactDetails: '555-5678', items: [{ partNumber: 'P002', partName: 'Oil Filter', quantitySold: 1, unitPrice: 12.50, itemTotal: 12.50 }], subTotal: 12.50, netAmount: 12.50, paymentType: 'credit', discount: 0 },
];


export default function SalesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useLocalStorage<Sale[]>('autocentral-sales', initialMockSales);
  const [inventoryParts, setInventoryParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('autocentral-customers', []);


  const [isSaleFormOpen, setIsSaleFormOpen] = useState(false);
  const [isInvoiceViewOpen, setIsInvoiceViewOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);

  const [statusFilters, setStatusFilters] = useState({
    paid: true, // Represents 'cash' or 'credit' where credit is assumed paid for filtering
    pending: false, // Not directly used yet, but placeholder for future use
    overdue: false, // Not directly used yet
  });


  const handleNewSaleSubmit = (data: SaleFormData) => {
    const newSale: Sale = {
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
      discount: data.discount,
      netAmount: data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0) - (data.discount || 0),
      paymentType: data.paymentType,
    };

    const updatedInventory = inventoryParts.map(part => {
      const soldItem = newSale.items.find(item => item.partNumber === part.partNumber);
      if (soldItem) {
        return { ...part, quantity: Math.max(0, part.quantity - soldItem.quantitySold) };
      }
      return part;
    });
    setInventoryParts(updatedInventory);

    setSales(prevSales => [newSale, ...prevSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    // Update or add customer and their balance
    setCustomers(prevCustomers => {
      const existingCustomerIndex = prevCustomers.findIndex(c => c.name.toLowerCase() === newSale.buyerName.toLowerCase());
      let updatedCustomers = [...prevCustomers];

      if (existingCustomerIndex !== -1) {
        const existingCustomer = updatedCustomers[existingCustomerIndex];
        let newBalance = existingCustomer.balance;
        if (newSale.paymentType === 'credit') {
          newBalance += newSale.netAmount;
        }
        // Update existing customer's details if provided and different
        updatedCustomers[existingCustomerIndex] = {
          ...existingCustomer,
          email: newSale.emailAddress || existingCustomer.email,
          phone: newSale.contactDetails || existingCustomer.phone,
          balance: newBalance,
        };
        toast({
          title: "Customer Balance Updated",
          description: `${existingCustomer.name}'s amount due is now ₹${newBalance.toFixed(2)}.`,
        });
      } else {
        const newCustomer: Customer = {
          id: `CUST${Date.now().toString().slice(-5)}`,
          name: newSale.buyerName,
          email: newSale.emailAddress,
          phone: newSale.contactDetails,
          balance: newSale.paymentType === 'credit' ? newSale.netAmount : 0,
        };
        updatedCustomers = [newCustomer, ...updatedCustomers];
        toast({
          title: "New Customer Added",
          description: `${newCustomer.name} added. Amount due: ₹${newCustomer.balance.toFixed(2)}.`,
        });
      }
      return updatedCustomers;
    });

    toast({
      title: "Sale Recorded",
      description: `Sale ID ${newSale.id} for ${newSale.buyerName} has been recorded.`,
    });
    setIsSaleFormOpen(false);
  };

  const handleSalePaymentTypeChange = (saleId: string, newPaymentType: 'cash' | 'credit') => {
    let saleBuyerName: string | undefined;
    let saleAmount = 0;
    let oldPaymentType: 'cash' | 'credit' | undefined;

    setSales(prevSales => 
      prevSales.map(s => {
        if (s.id === saleId) {
          saleBuyerName = s.buyerName;
          saleAmount = s.netAmount;
          oldPaymentType = s.paymentType;
          return { ...s, paymentType: newPaymentType };
        }
        return s;
      })
    );

    if (saleBuyerName && oldPaymentType && oldPaymentType !== newPaymentType) {
      setCustomers(prevCustomers => 
        prevCustomers.map(c => {
          if (c.name.toLowerCase() === saleBuyerName!.toLowerCase()) {
            let newBalance = c.balance;
            if (newPaymentType === 'cash' && oldPaymentType === 'credit') { // Was credit, now cash
              newBalance -= saleAmount;
            } else if (newPaymentType === 'credit' && oldPaymentType === 'cash') { // Was cash, now credit
              newBalance += saleAmount;
            }
            toast({
              title: "Payment Type Updated",
              description: `Sale ${saleId} for ${c.name} is now ${newPaymentType}. ${c.name}'s amount due is ₹${newBalance.toFixed(2)}.`,
            });
            return { ...c, balance: Math.max(0, newBalance) }; // Ensure balance doesn't go negative
          }
          return c;
        })
      );
    }
  };


  const handleViewBillClick = (sale: Sale) => {
    setSelectedSaleForInvoice(sale);
    setIsInvoiceViewOpen(true);
  };

  const filteredSales = sales.filter(sale =>
    (sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.buyerName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    // Adjust filter logic if needed, for now, 'paid' shows all for simplicity of this filter example
    ( (statusFilters.paid && (sale.paymentType === 'cash' || sale.paymentType === 'credit')) ) 
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleStatusFilterChange = (statusKey: keyof typeof statusFilters, checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [statusKey]: checked }));
  };

  const getPaymentTypeStyle = (paymentType: 'cash' | 'credit') => {
    switch (paymentType) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800';
      case 'credit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
  };


  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Management</h1>
            <p className="text-muted-foreground">Track and manage your sales transactions. Customer 'Amount Due' updates based on 'Credit' sales.</p>
          </div>
          <Button onClick={() => setIsSaleFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Sale
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Sales History</CardTitle>
            <CardDescription>Review all recorded sales transactions. You can change payment type for each sale.</CardDescription>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sale ID or customer..."
                  className="pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter Status (Placeholder)
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={statusFilters.paid}
                    onCheckedChange={(checked) => handleStatusFilterChange('paid', Boolean(checked))}
                  >
                    Paid/Completed
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                     checked={statusFilters.pending}
                     onCheckedChange={(checked) => handleStatusFilterChange('pending', Boolean(checked))}
                     disabled 
                  >
                    Pending
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilters.overdue}
                    onCheckedChange={(checked) => handleStatusFilterChange('overdue', Boolean(checked))}
                    disabled 
                  >
                    Overdue
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>{format(new Date(sale.date), "PPp")}</TableCell>
                    <TableCell>{sale.buyerName}</TableCell>
                    <TableCell className="text-right">₹{sale.netAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        value={sale.paymentType}
                        onValueChange={(newPaymentType: 'cash' | 'credit') => handleSalePaymentTypeChange(sale.id, newPaymentType)}
                      >
                        <SelectTrigger className={cn("h-8 text-xs w-auto min-w-[100px] border", getPaymentTypeStyle(sale.paymentType))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                          <SelectItem value="credit" className="text-xs">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewBillClick(sale)} title="View Bill">
                        <FileText className="h-4 w-4" />
                         <span className="sr-only">View Bill</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredSales.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    {sales.length > 0 && searchTerm ? 'No sales match your search.' : 'No sales recorded yet. Create a new sale to get started.'}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <SaleFormDialog
        isOpen={isSaleFormOpen}
        onOpenChange={setIsSaleFormOpen}
        onSubmit={handleNewSaleSubmit}
        inventoryParts={inventoryParts}
      />
      {selectedSaleForInvoice && (
        <InvoiceViewDialog
            isOpen={isInvoiceViewOpen}
            onOpenChange={setIsInvoiceViewOpen}
            sale={selectedSaleForInvoice}
        />
      )}
    </AppLayout>
  );
}
