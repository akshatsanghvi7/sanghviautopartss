
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Filter } from 'lucide-react';
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
import React, { useState, useEffect, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Purchase, Part, Supplier } from '@/lib/types';
import { PurchaseFormDialog, type PurchaseFormData } from '@/components/purchases/PurchaseFormDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // Added import for cn

const initialMockPurchases: Purchase[] = []; 

export default function PurchasesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('autocentral-purchases', initialMockPurchases);
  const [inventoryParts, setInventoryParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('autocentral-suppliers', []);

  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  
  const purchaseStatuses: Purchase['status'][] = ['Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled'];
  const [statusFilters, setStatusFilters] = useState<Record<Purchase['status'], boolean>>({
    Pending: true,
    Ordered: true,
    'Partially Received': true,
    Received: true,
    Cancelled: false, 
  });


  const handleNewPurchaseSubmit = (data: PurchaseFormData) => {
    const newPurchaseId = `PO${Date.now().toString().slice(-5)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    let supplierIdToUse = data.supplierId;
    let supplierNameToUse = data.supplierName;

    // Check and update/create supplier
    const existingSupplierByName = suppliers.find(s => s.name.toLowerCase() === data.supplierName.toLowerCase());
    
    if (data.supplierId && existingSupplierByName && data.supplierId === existingSupplierByName.id) { // Existing supplier selected and ID matches
      // Update existing supplier's contact details if they were changed in the form
      const updatedSuppliers = suppliers.map(s => 
        s.id === data.supplierId 
        ? { ...s, 
            name: data.supplierName, // Name might be slightly different casing, use form's
            contactPerson: data.supplierContactPerson || s.contactPerson,
            email: data.supplierEmail || s.email,
            phone: data.supplierPhone || s.phone,
          } 
        : s
      );
      setSuppliers(updatedSuppliers);
      supplierIdToUse = data.supplierId;
      supplierNameToUse = data.supplierName;
    } else if (existingSupplierByName && !data.supplierId) { // Typed name matches existing supplier, but wasn't selected via ID (e.g. new entry matching old name)
       const updatedSuppliers = suppliers.map(s => 
        s.id === existingSupplierByName.id
        ? { ...s, 
            contactPerson: data.supplierContactPerson || s.contactPerson,
            email: data.supplierEmail || s.email,
            phone: data.supplierPhone || s.phone,
          } 
        : s
      );
      setSuppliers(updatedSuppliers);
      supplierIdToUse = existingSupplierByName.id;
      supplierNameToUse = existingSupplierByName.name; // Use canonical name
      toast({
        title: "Supplier Updated",
        description: `Details for ${existingSupplierByName.name} updated.`,
      });
    }
     else { // New supplier
      const newSupplier: Supplier = {
        id: `SUP${Date.now().toString().slice(-5)}`,
        name: data.supplierName,
        contactPerson: data.supplierContactPerson,
        email: data.supplierEmail,
        phone: data.supplierPhone,
        balance: '$0.00',
      };
      setSuppliers(prevSuppliers => [newSupplier, ...prevSuppliers]);
      supplierIdToUse = newSupplier.id;
      supplierNameToUse = newSupplier.name;
      toast({
        title: "New Supplier Added",
        description: `${newSupplier.name} has been added.`,
      });
    }

    const newPurchase: Purchase = {
      id: newPurchaseId,
      date: data.purchaseDate!.toISOString(), // purchaseDate is now guaranteed by form validation
      supplierId: supplierIdToUse,
      supplierName: supplierNameToUse,
      supplierInvoiceNumber: data.supplierInvoiceNumber,
      items: data.items.map(item => ({
        partNumber: item.partNumber,
        partName: item.partName,
        quantityPurchased: item.quantity,
        unitCost: item.unitCost,
        itemTotal: item.quantity * item.unitCost,
      })),
      subTotal: data.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0),
      shippingCosts: data.shippingCosts,
      otherCharges: data.otherCharges,
      netAmount: data.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0) + (data.shippingCosts || 0) + (data.otherCharges || 0),
      paymentType: data.paymentType,
      status: data.status,
      notes: data.notes,
    };

    // Update inventory only if status is 'Received'
    if (newPurchase.status === 'Received') {
      const updatedInventory = inventoryParts.map(part => {
        const purchasedItem = newPurchase.items.find(item => item.partNumber === part.partNumber);
        if (purchasedItem) {
          return { ...part, quantity: part.quantity + purchasedItem.quantityPurchased };
        }
        return part;
      });
      setInventoryParts(updatedInventory);
    }

    setPurchases(prevPurchases => [newPurchase, ...prevPurchases]);
    toast({
      title: "Purchase Order Recorded",
      description: `PO ID ${newPurchase.id} from ${supplierNameToUse} has been recorded.`,
    });
    setIsPurchaseFormOpen(false);
  };
  
  const handleStatusFilterChange = (statusKey: Purchase['status'], checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [statusKey]: checked }));
  };

  const handlePurchaseStatusChange = (purchaseId: string, newStatus: Purchase['status']) => {
    setPurchases(prevPurchases => 
      prevPurchases.map(p => 
        p.id === purchaseId ? { ...p, status: newStatus } : p
      )
    );
    // Note: Inventory is NOT adjusted here. This is a known simplification.
    // A more complex system would track received quantities or handle inventory based on status transitions.
    toast({
      title: "Status Updated",
      description: `Purchase Order ${purchaseId} status changed to ${newStatus}. Inventory stock levels are not automatically adjusted by this status change alone.`,
      duration: 7000,
    });
  };

  const filteredPurchases = purchases.filter(purchase =>
    (purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (purchase.supplierId && purchase.supplierId.toLowerCase().includes(searchTerm.toLowerCase()))
    ) &&
    (statusFilters[purchase.status])
  );
  
  const getStatusColor = (status: Purchase['status']) => {
    switch (status) {
      case 'Received':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Ordered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Partially Received':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'; 
      case 'Cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };


  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
            <p className="text-muted-foreground">Manage your part procurements and supplier orders.</p>
          </div>
          <Button onClick={() => setIsPurchaseFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Purchase Order
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>Review all recorded purchase orders. Inventory is updated when PO status is 'Received' upon creation.</CardDescription>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO ID, supplier name/ID..."
                  className="pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {purchaseStatuses.map(status => (
                     <DropdownMenuCheckboxItem
                        key={status}
                        checked={statusFilters[status]}
                        onCheckedChange={(checked) => handleStatusFilterChange(status, Boolean(checked))}
                    >
                        {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.id}</TableCell>
                    <TableCell>{format(new Date(purchase.date), "PP")}</TableCell>
                    <TableCell>{purchase.supplierName} {purchase.supplierId && <span className="text-xs text-muted-foreground">({purchase.supplierId})</span>}</TableCell>
                    <TableCell className="text-right">${purchase.netAmount.toFixed(2)}</TableCell>
                     <TableCell>
                       <Select
                          value={purchase.status}
                          onValueChange={(newStatus: Purchase['status']) => handlePurchaseStatusChange(purchase.id, newStatus)}
                       >
                        <SelectTrigger className={cn("h-8 text-xs w-auto min-w-[120px]", getStatusColor(purchase.status))}>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            {purchaseStatuses.map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                            ))}
                        </SelectContent>
                       </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {filteredPurchases.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    {purchases.length > 0 && searchTerm ? 'No purchase orders match your search.' : 'No purchase orders recorded yet. Create one to get started.'}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <PurchaseFormDialog
        isOpen={isPurchaseFormOpen}
        onOpenChange={setIsPurchaseFormOpen}
        onSubmit={handleNewPurchaseSubmit}
        inventoryParts={inventoryParts}
        inventorySuppliers={suppliers}
      />
    </AppLayout>
  );
}

