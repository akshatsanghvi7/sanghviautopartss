
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone, Download, History, Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Supplier, Purchase } from '@/lib/types';
import React, { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { SupplierPurchaseHistoryDialog } from '@/components/suppliers/SupplierPurchaseHistoryDialog';
import { AdjustSupplierBalanceDialog } from '@/components/suppliers/AdjustSupplierBalanceDialog';

// Initial mock data if localStorage is empty
const initialMockSuppliers: Supplier[] = [
  { id: 'SUP001', name: 'AutoParts Pro', contactPerson: 'Sarah Connor', email: 'sales@autopartspro.com', phone: '555-0011', balance: 0 },
  { id: 'SUP002', name: 'Speedy Spares', contactPerson: 'Mike Wheeler', email: 'info@speedyspares.co', phone: '555-0022', balance: 125.50 },
  { id: 'SUP003', name: 'Global Auto Inc.', contactPerson: 'Linda Hamilton', email: 'accounts@globalauto.com', phone: '555-0033', balance: 0 },
];

const excelColumns = ["Supplier ID", "Name", "Contact Person", "Email", "Phone", "Balance Owed ($)"];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('autocentral-suppliers', initialMockSuppliers);
  const [purchases] = useLocalStorage<Purchase[]>('autocentral-purchases', []);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<Supplier | null>(null);

  const [isAdjustBalanceDialogOpen, setIsAdjustBalanceDialogOpen] = useState(false);
  const [selectedSupplierForBalance, setSelectedSupplierForBalance] = useState<Supplier | null>(null);


  const uniqueSuppliers = useMemo(() => {
    const seenIds = new Set<string>();
    const processedSuppliers = suppliers.map(s => {
      let numericBalance = 0;
      if (typeof s.balance === 'number') {
        numericBalance = s.balance;
      } else if (typeof s.balance === 'string') {
        const parsed = parseFloat(String(s.balance).replace(/[^0-9.-]+/g,""));
        numericBalance = isNaN(parsed) ? 0 : parsed;
      } else if (s.balance === undefined || s.balance === null) {
        numericBalance = 0;
      }
      return { ...s, balance: numericBalance };
    });

    return processedSuppliers.filter(supplier => {
      if (!supplier || !supplier.id) return false; 
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
    toast({ title: "Feature Coming Soon", description: "Ability to manually add suppliers will be implemented. Suppliers are currently added or updated automatically via Purchase Orders." });
  };

  const handleEditSupplier = (supplierId: string) => {
    toast({ title: "Feature Coming Soon", description: `Editing supplier ${supplierId} will allow correcting details like phone/email or updating contact information directly.` });
  };

  const handleDeleteSupplier = (supplierId: string) => {
    toast({ title: "Feature Coming Soon", description: `Deleting supplier ${supplierId} will be implemented with confirmation. Ensure all dues are cleared.` });
  };

  const handleViewHistory = (supplier: Supplier) => {
    setSelectedSupplierForHistory(supplier);
    setIsHistoryDialogOpen(true);
  };

  const handleOpenAdjustBalanceDialog = (supplier: Supplier) => {
    setSelectedSupplierForBalance(supplier);
    setIsAdjustBalanceDialogOpen(true);
  };

  const handleUpdateSupplierBalance = (supplierId: string, newBalance: number) => {
    setSuppliers(prevSuppliers =>
      prevSuppliers.map(s =>
        s.id === supplierId ? { ...s, balance: newBalance } : s
      )
    );
    const supplierName = suppliers.find(s => s.id === supplierId)?.name || 'Supplier';
    toast({
      title: "Balance Updated",
      description: `Balance for ${supplierName} has been updated to $${newBalance.toFixed(2)}.`,
    });
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
        typeof supplier.balance === 'number' ? supplier.balance.toFixed(2) : '0.00',
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
            <p className="text-muted-foreground">Manage your supplier information. Balances represent amount owed from 'On Credit' purchases and are updated automatically. You can also manually adjust balances.</p>
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
              Browse, search, and manage your suppliers. New suppliers are automatically added from purchases, and details/balances are updated.
              If you see issues like phone numbers in email fields, this may indicate a data entry error during purchase. Balances are not automatically cleared by payments in this version.
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
                  <TableHead className="text-right">Balance Owed</TableHead>
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
                    <TableCell className="text-right">${(typeof supplier.balance === 'number' ? supplier.balance : 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewHistory(supplier)} title="View Purchase History">
                        <History className="h-4 w-4" />
                        <span className="sr-only">View Purchase History</span>
                      </Button>
                       <Button variant="ghost" size="icon" className="hover:text-amber-600" onClick={() => handleOpenAdjustBalanceDialog(supplier)} title="Adjust Balance">
                        <Coins className="h-4 w-4" />
                        <span className="sr-only">Adjust Balance</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditSupplier(supplier.id)} title="Edit Supplier">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteSupplier(supplier.id)} title="Delete Supplier">
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
      {selectedSupplierForBalance && (
        <AdjustSupplierBalanceDialog
          isOpen={isAdjustBalanceDialogOpen}
          onOpenChange={setIsAdjustBalanceDialogOpen}
          supplier={selectedSupplierForBalance}
          onSubmit={handleUpdateSupplierBalance}
        />
      )}
    </AppLayout>
  );
}
