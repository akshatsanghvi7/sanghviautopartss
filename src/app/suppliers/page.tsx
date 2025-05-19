
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Supplier } from '@/lib/types';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

// Initial mock data if localStorage is empty
const initialMockSuppliers: Supplier[] = [
  { id: 'SUP001', name: 'AutoParts Pro', contactPerson: 'Sarah Connor', email: 'sales@autopartspro.com', phone: '555-0011', balance: '$1200.00 (Owed)' },
  { id: 'SUP002', name: 'Speedy Spares', contactPerson: 'Mike Wheeler', email: 'info@speedyspares.co', phone: '555-0022', balance: '$0.00' },
  { id: 'SUP003', name: 'Global Auto Inc.', contactPerson: 'Linda Hamilton', email: 'accounts@globalauto.com', phone: '555-0033', balance: '$750.50 (Owed)' },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('autocentral-suppliers', initialMockSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSupplier = () => {
    // Placeholder for add supplier dialog/form
    toast({ title: "Feature Coming Soon", description: "Ability to manually add suppliers will be implemented." });
  };

  const handleEditSupplier = (supplierId: string) => {
    // Placeholder for edit supplier
    toast({ title: "Feature Coming Soon", description: `Editing supplier ${supplierId} will be implemented.` });
  };

  const handleDeleteSupplier = (supplierId: string) => {
    // Placeholder for delete supplier
    // setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    toast({ title: "Feature Coming Soon", description: `Deleting supplier ${supplierId} will be implemented with confirmation.` });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Supplier Management</h1>
            <p className="text-muted-foreground">Manage your supplier information and balances.</p>
          </div>
          <Button onClick={handleAddSupplier}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Supplier List</CardTitle>
            <CardDescription>Browse, search, and manage your suppliers. New suppliers are automatically added from purchases.</CardDescription>
             <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, contact, or email..." 
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
                  <TableHead>Supplier ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.id}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.contactPerson || '-'}</TableCell>
                    <TableCell className="flex items-center gap-1"> 
                      {supplier.email ? <><Mail className="h-3 w-3 text-muted-foreground"/> {supplier.email}</> : '-'}
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      {supplier.phone ? <><Phone className="h-3 w-3 text-muted-foreground"/>{supplier.phone}</> : '-'}
                    </TableCell>
                    <TableCell className="text-right">{supplier.balance}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditSupplier(supplier.id)}>
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteSupplier(supplier.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredSuppliers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    {suppliers.length > 0 && searchTerm ? 'No suppliers match your search.' : 'No suppliers found. Suppliers are added automatically when a purchase is recorded.'}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
