
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone, Download, History, Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Supplier, Purchase } from '@/lib/types';
import React, { useState, useMemo, useEffect, startTransition } from 'react';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { SupplierPurchaseHistoryDialog } from '@/components/suppliers/SupplierPurchaseHistoryDialog';
import { AdjustSupplierBalanceDialog } from '@/components/suppliers/AdjustSupplierBalanceDialog';
import { DeleteSupplierDialog } from '@/components/suppliers/DeleteSupplierDialog'; // New import
import { updateSupplierBalanceAction, deleteSupplierAction } from './actions'; // Import deleteSupplierAction

const excelColumns = ["Supplier ID", "Name", "Contact Person", "Email", "Phone", "Balance Owed (₹)"];

interface SuppliersClientPageProps {
  initialSuppliers: Supplier[];
  allPurchasesForHistory: Purchase[];
}

export function SuppliersClientPage({ initialSuppliers, allPurchasesForHistory }: SuppliersClientPageProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<Supplier | null>(null);
  const [isAdjustBalanceDialogOpen, setIsAdjustBalanceDialogOpen] = useState(false);
  const [selectedSupplierForBalance, setSelectedSupplierForBalance] = useState<Supplier | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false); // State for delete dialog
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null); // State for supplier to delete

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const uniqueSuppliers = useMemo(() => {
    const seenIds = new Set<string>();
    return suppliers.filter(supplier => {
      if (!supplier || !supplier.id || seenIds.has(supplier.id)) return false;
      seenIds.add(supplier.id);
      return true;
    }).map(s => ({...s, balance: Number(s.balance) || 0}));
  }, [suppliers]);

  const filteredSuppliers = uniqueSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSupplier = () => toast({ title: "Info", description: "Suppliers are automatically added/updated via Purchase Orders." });
  const handleEditSupplier = (supplierId: string) => toast({ title: "Feature Coming Soon", description: `Editing supplier ${supplierId} will allow correcting details.` });
  
  const handleDeleteSupplierClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    startTransition(async () => {
      const result = await deleteSupplierAction(supplierToDelete.id);
      if (result.success) {
        toast({ title: "Supplier Deleted", description: `${supplierToDelete.name} has been deleted.` });
        // The list will re-render due to revalidatePath in the server action
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsDeleteConfirmOpen(false);
      setSupplierToDelete(null);
    });
  };

  const handleViewHistory = (supplier: Supplier) => { setSelectedSupplierForHistory(supplier); setIsHistoryDialogOpen(true); };
  const handleOpenAdjustBalanceDialog = (supplier: Supplier) => { setSelectedSupplierForBalance(supplier); setIsAdjustBalanceDialogOpen(true); };

  const handleUpdateSupplierBalance = async (supplierId: string, newBalance: number) => {
    startTransition(async () => {
      const result = await updateSupplierBalanceAction(supplierId, newBalance);
      if (result.success) {
        toast({ title: "Balance Updated", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsAdjustBalanceDialogOpen(false);
    });
  };

  const handleExportToExcel = () => {
    if (filteredSuppliers.length === 0) {
      toast({ title: "No Data to Export", variant: "destructive" }); return;
    }
    const dataToExport = [excelColumns, ...filteredSuppliers.map(s => [s.id, s.name, s.contactPerson || '', s.email || '', s.phone || '', (Number(s.balance) || 0).toFixed(2)])];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
    try { XLSX.writeFile(wb, "suppliers.xlsx"); toast({ title: "Export Successful" }); } 
    catch (e) { toast({ title: "Export Failed", variant: "destructive" }); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Supplier Management</h1>
          <p className="text-muted-foreground">Manage suppliers. Balances = 'On Credit' unsettled POs. Manually adjust balances.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportToExcel}><Download className="mr-2 h-4 w-4" /> Export Excel</Button>
          <Button onClick={handleAddSupplier}><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
          <CardDescription>Suppliers are added/updated from purchases. Balances reflect unsettled 'On Credit' POs.</CardDescription>
           <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, contact, or email..." className="pl-10 w-full sm:w-1/2 lg:w-1/3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Supplier ID</TableHead><TableHead>Name</TableHead><TableHead>Contact Person</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Balance Owed</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.id}</TableCell><TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.contactPerson || '-'}</TableCell>
                  <TableCell>{supplier.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {supplier.email}</div> : '-'}</TableCell>
                  <TableCell>{supplier.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/>{supplier.phone}</div> : '-'}</TableCell>
                  <TableCell className="text-right">₹{(Number(supplier.balance) || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewHistory(supplier)} title="View Purchase History"><History className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="hover:text-amber-600" onClick={() => handleOpenAdjustBalanceDialog(supplier)} title="Adjust Balance"><Coins className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditSupplier(supplier.id)} title="Edit Supplier"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteSupplierClick(supplier)} title="Delete Supplier"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredSuppliers.length === 0 && (<div className="text-center py-10 text-muted-foreground">{uniqueSuppliers.length > 0 && searchTerm ? 'No suppliers match search.' : 'No suppliers found.'}</div>)}
        </CardContent>
      </Card>
      {selectedSupplierForHistory && (<SupplierPurchaseHistoryDialog isOpen={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} supplier={selectedSupplierForHistory} allPurchases={allPurchasesForHistory} />)}
      {selectedSupplierForBalance && (<AdjustSupplierBalanceDialog isOpen={isAdjustBalanceDialogOpen} onOpenChange={setIsAdjustBalanceDialogOpen} supplier={selectedSupplierForBalance} onSubmit={handleUpdateSupplierBalance} />)}
      {supplierToDelete && (
        <DeleteSupplierDialog
          isOpen={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          onConfirm={confirmDeleteSupplier}
          supplierName={supplierToDelete.name}
        />
      )}
    </div>
  );
}
