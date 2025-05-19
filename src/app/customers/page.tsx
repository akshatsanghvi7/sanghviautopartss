
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Customer } from '@/lib/types';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

// Initial mock data if localStorage is empty
const initialMockCustomers: Customer[] = [
  { id: 'C001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', balance: 0 },
  { id: 'C002', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', balance: 120.50 },
  { id: 'C003', name: 'Bob Johnson', email: 'bob.j@example.com', phone: '555-8765', balance: 0 },
  { id: 'C004', name: 'Alice Brown', email: 'alice.b@example.com', phone: '555-4321', balance: 45.20 },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('autocentral-customers', initialMockCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddCustomer = () => {
    toast({ title: "Feature Coming Soon", description: "Ability to manually add customers will be implemented." });
  };

  const handleEditCustomer = (customerId: string) => {
    toast({ title: "Feature Coming Soon", description: `Editing customer ${customerId} will be implemented.` });
  };

  const handleDeleteCustomer = (customerId: string) => {
    toast({ title: "Feature Coming Soon", description: `Deleting customer ${customerId} will be implemented with confirmation.` });
  };


  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Management</h1>
            <p className="text-muted-foreground">Manage your customer database.</p>
          </div>
          <Button onClick={handleAddCustomer}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>Browse, search, and manage your customers. New customers are automatically added from sales.</CardDescription>
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
                  <TableHead className="text-right">Balance Due</TableHead>
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
                    <TableCell className="text-right">${customer.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditCustomer(customer.id)}>
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteCustomer(customer.id)}>
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
                    {customers.length > 0 && searchTerm ? 'No customers match your search.' : 'No customers found. Customers are added automatically when a sale is recorded.'}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
