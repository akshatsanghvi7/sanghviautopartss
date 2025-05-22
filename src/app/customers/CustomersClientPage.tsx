
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer, Sale } from '@/lib/types';
import React, { useState, useMemo, useEffect } from 'react'; 
import { useToast } from "@/hooks/use-toast";
import { CustomerSalesHistoryDialog } from '@/components/customers/CustomerSalesHistoryDialog';

interface CustomersClientPageProps {
  initialCustomers: Customer[];
  allSalesForHistory: Sale[];
}

export function CustomersClientPage({ initialCustomers, allSalesForHistory }: CustomersClientPageProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  // Deduplication and balance calculation is now primarily handled server-side by getCustomersWithCalculatedBalances
  // The client page receives the processed list.
  const processedCustomersWithBalance = useMemo(() => {
    // Client-side de-duplication for display, if any minor discrepancies persist or for pure client interactions before revalidation
    const uniqueCustomersByName: Record<string, Customer> = {};
    customers.forEach(customer => {
      const normalizedName = customer.name.toLowerCase();
      if (!uniqueCustomersByName[normalizedName]) {
        uniqueCustomersByName[normalizedName] = { ...customer, balance: Number(customer.balance) || 0 };
      } else {
        // Basic merging strategy if somehow duplicates make it to client with different IDs
        if (!uniqueCustomersByName[normalizedName].email && customer.email) uniqueCustomersByName[normalizedName].email = customer.email;
        if (!uniqueCustomersByName[normalizedName].phone && customer.phone) uniqueCustomersByName[normalizedName].phone = customer.phone;
        // Balance should be authoritative from server action, but sum if merging client-side (less ideal)
        uniqueCustomersByName[normalizedName].balance += (Number(customer.balance) || 0);
      }
    });
    return Object.values(uniqueCustomersByName);
  }, [customers]);


  const filteredCustomers = useMemo(() => {
    return processedCustomersWithBalance.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [processedCustomersWithBalance, searchTerm]);

  const handleAddCustomer = () => toast({ title: "Info", description: "Customers are automatically added/updated via the Sales page." });
  const handleEditCustomer = (customerId: string) => toast({ title: "Feature Coming Soon", description: `Editing customer ${customerId} will be implemented.` });
  const handleDeleteCustomer = (customerId: string) => toast({ title: "Feature Coming Soon", description: `Deleting customer ${customerId} will be implemented.` });

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    setIsHistoryDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">Manage customers. "Amount Due" is from 'Credit' sales. Customers are added/updated via Sales.</p>
        </div>
        <Button onClick={handleAddCustomer}><PlusCircle className="mr-2 h-4 w-4" /> Add Customer</Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>Browse, search, and manage customers. 'Amount Due' updates based on credit sales.</CardDescription>
           <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or phone..." className="pl-10 w-full sm:w-1/2 lg:w-1/3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Customer ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Amount Due</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.id}</TableCell><TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {customer.email}</div> : '-'}</TableCell>
                  <TableCell>{customer.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/>{customer.phone}</div> : '-'}</TableCell>
                  <TableCell className="text-right">₹{(Number(customer.balance) || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewHistory(customer)} title="View Sales History"><History className="h-4 w-4" /><span className="sr-only">View Sales History</span></Button>
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditCustomer(customer.id)} title="Edit Customer"><Edit2 className="h-4 w-4" /><span className="sr-only">Edit</span></Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteCustomer(customer.id)} title="Delete Customer"><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredCustomers.length === 0 && (<div className="text-center py-10 text-muted-foreground">{customers.length > 0 && searchTerm ? 'No customers match search.' : 'No customers found.'}</div>)}
        </CardContent>
      </Card>
      {selectedCustomerForHistory && (<CustomerSalesHistoryDialog isOpen={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} customer={selectedCustomerForHistory} allSales={allSalesForHistory} />)}
    </div>
  );
}
