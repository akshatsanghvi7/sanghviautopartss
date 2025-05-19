
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone, Download, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Supplier, Purchase } from '@/lib/types';
import React, { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { SupplierPurchaseHistoryDialog } from '@/components/suppliers/SupplierPurchaseHistoryDialog';

// Initial mock data if localStorage is empty
const initialMockSuppliers: Supplier[] = [
  { id: 'SUP001', name: 'AutoParts Pro', contactPerson: 'Sarah Connor', email: 'sales@autopartspro.com', phone: '555-0011', balance: '$0.00' },
  { id: 'SUP002', name: 'Speedy Spares', contactPerson: 'Mike Wheeler', email: 'info@speedyspares.co', phone: '555-0022', balance: '$0.00' },
  { id: 'SUP003', name: 'Global Auto Inc.', contactPerson: 'Linda Hamilton', email: 'accounts@globalauto.com', phone: '555-0033', balance: '$0.00' },
];

const excelColumns = ["Supplier ID", "Name", "Contact Person", "Email", "Phone", "Balance"];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('autocentral-suppliers', initialMockSuppliers);
  const [purchases] = useLocalStorage<Purchase[]>('autocentral-purchases', []);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<Supplier | null>(null);

  // De-duplicate suppliers by ID for display
  const uniqueSuppliers = useMemo(() => {
    const seenIds = new Set<string>();
    return suppliers.filter(supplier => {
      if (!supplier || !supplier.id) return false; // Guard against null/undefined suppliers or missing ID
      if (seenIds.has(supplier.id)) {
        return false;
      }
      seenIds.add(supplier.id);
      return true;
    });
  }, [suppliers]);

  const filteredSuppliers = uniqueSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSupplier = () => {
    toast({ title: "Feature Coming Soon", description: "Ability to manually add suppliers will be implemented. Suppliers are currently added automatically via Purchase Orders." });
  };

  const handleEditSupplier = (supplierId: string) => {
    toast({ title: "Feature Coming Soon", description: `Editing supplier ${supplierId} will be implemented to correct details like phone/email or update contact information.` });
  };

  const handleDeleteSupplier = (supplierId: string) => {
    toast({ title: "Feature Coming Soon", description: `Deleting supplier ${supplierId} will be implemented with confirmation.` });
  };

  const handleViewHistory = (supplier: Supplier) => {
    setSelectedSupplierForHistory(supplier);
    setIsHistoryDialogOpen(true);
  };

  const handleExportToExcel = () => {
    if (filteredSuppliers.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no suppliers in the list to export.",
        variant: "destructive"
      });
      return;
    }
    
    const dataToExport = [
      excelColumns, 
      ...filteredSuppliers.map(supplier => [
        supplier.id || '',
        supplier.name || '',
        supplier.contactPerson || '',
        supplier.email || '',
        supplier.phone || '',
        supplier.balance || '',
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    
    try {
      XLSX.writeFile(workbook, "suppliers.xlsx");
      toast({
        title: "Export Successful",
        description: "Supplier data has been exported to suppliers.xlsx.",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the data to Excel.",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Supplier Management</h1>
            <p className="text-muted-foreground">Manage your supplier information. Balances are not automatically updated from purchases yet.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportToExcel}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={handleAddSupplier}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
            </Button>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Supplier List</CardTitle>
            <CardDescription>
              Browse, search, and manage your suppliers. New suppliers are automatically added from purchases. 
              If you see issues like phone numbers in email fields, this indicates a data entry error that will be fixable via the 'Edit' feature once fully implemented.
            </CardDescription>
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
                    <TableCell>
                        {supplier.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {supplier.email}</div> : '-'}
                    </TableCell>
                    <TableCell>
                        {supplier.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/>{supplier.phone}</div> : '-'}
                    </TableCell>
                    <TableCell className="text-right">{supplier.balance}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewHistory(supplier)}>
                        <History className="h-4 w-4" />
                        <span className="sr-only">View Purchase History</span>
                      </Button>
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
                    {uniqueSuppliers.length > 0 && searchTerm ? 'No suppliers match your search.' : 'No suppliers found. Suppliers are added automatically when a purchase is recorded.'}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedSupplierForHistory && (
        <SupplierPurchaseHistoryDialog
            isOpen={isHistoryDialogOpen}
            onOpenChange={setIsHistoryDialogOpen}
            supplier={selectedSupplierForHistory}
            allPurchases={purchases}
        />
      )}
    </AppLayout>
  );
}
