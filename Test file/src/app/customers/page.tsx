
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Customer, Sale } from '@/lib/types';
import React, { useState, useMemo } from 'react'; 
import { useToast } from "@/hooks/use-toast";
import { CustomerSalesHistoryDialog } from '@/components/customers/CustomerSalesHistoryDialog';

// Initial mock data if localStorage is empty
const initialMockCustomers: Customer[] = [
  { id: 'C001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', balance: 0 },
  { id: 'C002', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', balance: 0 },
  { id: 'C003', name: 'Bob Johnson', email: 'bob.j@example.com', phone: '555-8765', balance: 0 },
  { id: 'C004', name: 'Alice Brown', email: 'alice.b@example.com', phone: '555-4321', balance: 0 },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('autocentral-customers', initialMockCustomers);
  const [sales, setSales] = useLocalStorage<Sale[]>('autocentral-sales', []);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  const processedCustomersWithBalance = useMemo(() => {
    // De-duplicate customers by name (case-insensitive) as a first step
    const uniqueCustomersByName: Record<string, Customer> = {};
    customers.forEach(customer => {
      const normalizedName = customer.name.toLowerCase();
      if (!uniqueCustomersByName[normalizedName]) {
        uniqueCustomersByName[normalizedName] = { ...customer, balance: 0 }; // Initialize balance
      } else {
        // If duplicate names exist but different IDs, merge details if one is more complete
        // For simplicity here, we'll just keep the first one encountered with this name
        // A more robust system might have better ID management or merging strategy
        if (!uniqueCustomersByName[normalizedName].email && customer.email) {
            uniqueCustomersByName[normalizedName].email = customer.email;
        }
        if (!uniqueCustomersByName[normalizedName].phone && customer.phone) {
            uniqueCustomersByName[normalizedName].phone = customer.phone;
        }
      }
    });
    
    const customersArray = Object.values(uniqueCustomersByName);

    return customersArray.map(customer => {
      const amountDue = sales.reduce((acc, sale) => {
        if (sale.buyerName.toLowerCase() === customer.name.toLowerCase() && sale.paymentType === 'credit') {
          return acc + sale.netAmount;
        }
        return acc;
      }, 0);
      return { ...customer, balance: amountDue };
    });
  }, [customers, sales]);

  const filteredCustomers = useMemo(() => {
    return processedCustomersWithBalance.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [processedCustomersWithBalance, searchTerm]);


  const handleAddCustomer = () => {
    toast({ title: "Feature Coming Soon", description: "Ability to manually add customers will be implemented. Customers are currently added/updated automatically from Sales." });
  };

  const handleEditCustomer = (customerId: string) => {
    toast({ title: "Feature Coming Soon", description: `Editing customer ${customerId} will be implemented.` });
  };

  const handleDeleteCustomer = (customerId: string) => {
    toast({ title: "Feature Coming Soon", description: `Deleting customer ${customerId} will be implemented with confirmation.` });
  };

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    setIsHistoryDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Management</h1>
            <p className="text-muted-foreground">Manage your customer database. "Amount Due" is calculated from 'Credit' sales. Customers are added/updated automatically via Sales.</p>
          </div>
          <Button onClick={handleAddCustomer}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>Browse, search, and manage your customers. New customers are automatically added from sales, and their 'Amount Due' is updated based on credit sales.</CardDescription>
             <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or phone..." 
                className="pl-10 w-full sm:w-1/2 lg:w-1/3" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell> 
                      {customer.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {customer.email}</div> : '-'}
                    </TableCell>
                    <TableCell>
                      {customer.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/>{customer.phone}</div> : '-'}
                    </TableCell>
                    <TableCell className="text-right">₹{customer.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewHistory(customer)} title="View Sales History">
                        <History className="h-4 w-4" />
                        <span className="sr-only">View Sales History</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditCustomer(customer.id)} title="Edit Customer">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteCustomer(customer.id)} title="Delete Customer">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredCustomers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    {processedCustomersWithBalance.length > 0 && searchTerm ? 'No customers match your search.' : 'No customers found. Customers are added automatically when a sale is recorded.'}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedCustomerForHistory && (
        <CustomerSalesHistoryDialog
          isOpen={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          customer={selectedCustomerForHistory}
          allSales={sales}
        />
      )}
    </AppLayout>
  );
}
