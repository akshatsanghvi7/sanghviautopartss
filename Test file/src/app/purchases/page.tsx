
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Filter, FileText } from 'lucide-react';
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
import type { Purchase, Part, Supplier, PurchaseItem as PurchaseItemType } from '@/lib/types';
import { PurchaseFormDialog, type PurchaseFormData } from '@/components/purchases/PurchaseFormDialog';
import { PurchaseOrderViewDialog } from '@/components/purchases/PurchaseOrderViewDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const initialMockPurchases: Purchase[] = []; 

export default function PurchasesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('autocentral-purchases', initialMockPurchases);
  const [inventoryParts, setInventoryParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('autocentral-suppliers', []);

  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [isPurchaseViewOpen, setIsPurchaseViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  
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
    const formSupplierNameTrimmed = data.supplierName.trim();
    let nameForPurchaseRecord = formSupplierNameTrimmed;

    let existingSupplier: Supplier | undefined = undefined;
    let supplierUpdated = false;
    let supplierAdded = false;
    let finalSupplierBalanceForToast: number = 0;

    if (data.supplierId) { // Supplier selected from suggestion
        existingSupplier = suppliers.find(s => s.id === data.supplierId);
    }
    if (!existingSupplier && formSupplierNameTrimmed) { // No ID, try matching by name (case-insensitive, trimmed)
        existingSupplier = suppliers.find(s => s.name.trim().toLowerCase() === formSupplierNameTrimmed.toLowerCase());
    }


    if (existingSupplier) { // Existing supplier found
        supplierIdToUse = existingSupplier.id;
        
        const updatedSupplierData: Partial<Supplier> = {};
        let detailsChanged = false;

        // Check if name changed (case-insensitive and trim-insensitive)
        if (existingSupplier.name.trim().toLowerCase() !== formSupplierNameTrimmed.toLowerCase() && formSupplierNameTrimmed) {
            updatedSupplierData.name = formSupplierNameTrimmed;
            nameForPurchaseRecord = formSupplierNameTrimmed; // Use updated name for PO
            detailsChanged = true;
        } else {
            nameForPurchaseRecord = existingSupplier.name; // Use existing name for PO if not changed
        }

        if ((data.supplierContactPerson || "") !== (existingSupplier.contactPerson || "")) {
            updatedSupplierData.contactPerson = data.supplierContactPerson;
            detailsChanged = true;
        }
        if ((data.supplierEmail || "") !== (existingSupplier.email || "")) {
            updatedSupplierData.email = data.supplierEmail;
            detailsChanged = true;
        }
        if ((data.supplierPhone || "") !== (existingSupplier.phone || "")) {
            updatedSupplierData.phone = data.supplierPhone;
            detailsChanged = true;
        }
        
        let newBalance = typeof existingSupplier.balance === 'number' ? existingSupplier.balance : 0;
        if (data.paymentType === 'on_credit') {
            newBalance += (data.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0) + (data.shippingCosts || 0) + (data.otherCharges || 0));
        }
        
        if (newBalance !== (typeof existingSupplier.balance === 'number' ? existingSupplier.balance : 0)) {
            updatedSupplierData.balance = newBalance;
            detailsChanged = true; // Balance change counts as a detail change for toast
        } else if (!('balance' in updatedSupplierData) && typeof existingSupplier.balance !== 'number') {
            updatedSupplierData.balance = newBalance; // Ensure balance is set if it wasn't numeric
        }
        
        finalSupplierBalanceForToast = newBalance;

        if (detailsChanged || (updatedSupplierData.balance !== undefined && updatedSupplierData.balance !== existingSupplier.balance)) { 
            setSuppliers(prevSuppliers => prevSuppliers.map(s =>
                s.id === existingSupplier!.id
                ? { ...s, ...updatedSupplierData, balance: newBalance }
                : s
            ));
            supplierUpdated = true;
        }
    } else { // New supplier
        const newSupplierNumericBalance = data.paymentType === 'on_credit' ? (data.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0) + (data.shippingCosts || 0) + (data.otherCharges || 0)) : 0;
        const newSupplierData: Supplier = {
            id: `SUP${Date.now().toString().slice(-5)}${Math.random().toString(36).substr(2,3).toUpperCase()}`,
            name: formSupplierNameTrimmed,
            contactPerson: data.supplierContactPerson,
            email: data.supplierEmail,
            phone: data.supplierPhone,
            balance: newSupplierNumericBalance,
        };
        setSuppliers(prevSuppliers => [newSupplierData, ...prevSuppliers]);
        supplierIdToUse = newSupplierData.id;
        nameForPurchaseRecord = formSupplierNameTrimmed;
        finalSupplierBalanceForToast = newSupplierNumericBalance;
        supplierAdded = true;
    }

    if (supplierAdded) {
        toast({
            title: "New Supplier Added",
            description: `${nameForPurchaseRecord} added. Balance Owed: ₹${finalSupplierBalanceForToast.toFixed(2)}`,
        });
    } else if (supplierUpdated) {
         toast({
            title: "Supplier Updated",
            description: `Details for ${nameForPurchaseRecord} updated. Current Balance Owed: ₹${finalSupplierBalanceForToast.toFixed(2)}`,
        });
    }


    const newPurchase: Purchase = {
      id: newPurchaseId,
      date: data.purchaseDate!.toISOString(), 
      supplierId: supplierIdToUse!,
      supplierName: nameForPurchaseRecord,
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
      paymentSettled: data.paymentType !== 'on_credit', 
    };

    if (newPurchase.status === 'Received') {
      updateInventoryForPurchase(newPurchase.items, 'increase');
    } else if (newPurchase.status !== 'Cancelled') { 
        toast({
            title: "Note on Inventory",
            description: `Inventory stock is NOT updated for PO status '${newPurchase.status}'. To update stock, change status to 'Received'.`,
            duration: 7000,
        });
    }

    setPurchases(prevPurchases => [newPurchase, ...prevPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    toast({
      title: "Purchase Order Recorded",
      description: `PO ID ${newPurchase.id} from ${nameForPurchaseRecord} has been recorded.`,
    });
    setIsPurchaseFormOpen(false);
  };
  
  const updateInventoryForPurchase = (
    items: PurchaseItemType[], 
    action: 'increase' | 'decrease'
  ) => {
    setInventoryParts(prevInventory => {
      const updatedInventory = prevInventory.map(part => {
        const purchasedItem = items.find(item => item.partNumber === part.partNumber);
        if (purchasedItem) {
          const quantityChange = action === 'increase' ? purchasedItem.quantityPurchased : -purchasedItem.quantityPurchased;
          return { ...part, quantity: Math.max(0, part.quantity + quantityChange) }; 
        }
        return part;
      });
      return updatedInventory;
    });
    toast({
        title: "Inventory Updated",
        description: `Stock levels ${action === 'increase' ? 'increased' : 'decreased'} for affected items.`,
    });
  };

  const handleStatusFilterChange = (statusKey: Purchase['status'], checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [statusKey]: checked }));
  };

  const handlePurchaseStatusChange = (purchaseId: string, newStatus: Purchase['status']) => {
    let oldStatus: Purchase['status'] | undefined;
    let purchaseToUpdate: Purchase | undefined;

    setPurchases(prevPurchases => {
      const updatedPurchases = prevPurchases.map(p => {
        if (p.id === purchaseId) {
          oldStatus = p.status;
          purchaseToUpdate = { ...p, status: newStatus };
          return purchaseToUpdate;
        }
        return p;
      });
      return updatedPurchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (purchaseToUpdate && oldStatus !== undefined && oldStatus !== newStatus) {
      if (newStatus === 'Received' && oldStatus !== 'Received') {
        updateInventoryForPurchase(purchaseToUpdate.items, 'increase');
      } else if (newStatus !== 'Received' && oldStatus === 'Received') {
        updateInventoryForPurchase(purchaseToUpdate.items, 'decrease');
      } else {
         toast({
            title: "Order Status Updated",
            description: `Purchase Order ${purchaseId} status changed to ${newStatus}. Inventory not affected as status did not cross 'Received' threshold or was already 'Received'.`,
            duration: 7000,
        });
      }
    }
  };

  const handlePaymentStatusChange = (purchaseId: string, newPaymentSelection: 'paid' | 'due') => {
    let purchaseToUpdate: Purchase | undefined;
    let supplierToUpdate: Supplier | undefined;
    let balanceChange = 0;
    let finalSupplierName = '';

    setPurchases(prevPurchases =>
      prevPurchases.map(p => {
        if (p.id === purchaseId && p.paymentType === 'on_credit') {
          const oldPaymentSettled = p.paymentSettled ?? false;
          const newPaymentSettled = newPaymentSelection === 'paid';

          if (oldPaymentSettled === newPaymentSettled) {
            // No change needed for purchase itself, but might need supplier info if other logic relied on it
            // For now, this means no action and no toast.
            return p; 
          }
          
          purchaseToUpdate = { ...p, paymentSettled: newPaymentSettled };
          finalSupplierName = p.supplierName;

          // If was Due (false) and now Paid (true), balance decreases (negative change)
          // If was Paid (true) and now Due (false), balance increases (positive change)
          balanceChange = newPaymentSettled ? -p.netAmount : p.netAmount;
          
          return purchaseToUpdate;
        }
        return p;
      })
    );

    if (purchaseToUpdate && balanceChange !== 0 && purchaseToUpdate.supplierId) {
      setSuppliers(prevSuppliers =>
        prevSuppliers.map(s => {
          if (s.id === purchaseToUpdate!.supplierId) {
            supplierToUpdate = { ...s, balance: (s.balance || 0) + balanceChange };
            return supplierToUpdate;
          }
          return s;
        })
      );
    }
    
    if (purchaseToUpdate && balanceChange !== 0 && supplierToUpdate) {
        toast({
            title: `Payment Status Updated for PO ${purchaseId}`,
            description: `Marked as ${newPaymentSelection.toUpperCase()}. Supplier ${finalSupplierName}'s balance updated to ₹${supplierToUpdate.balance.toFixed(2)}.`,
        });
    } else if (purchaseToUpdate && purchaseToUpdate.paymentType !== 'on_credit') {
        toast({title: "Action Not Applicable", description: `Payment status can only be changed for 'On Credit' POs. This PO is ${purchaseToUpdate.paymentType}.`})
    } else if (balanceChange === 0 && purchaseToUpdate && purchaseToUpdate.paymentType === 'on_credit') {
        // This case means the status was already what the user selected. No toast needed.
    }
  };


  const handleViewPurchaseDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsPurchaseViewOpen(true);
  };

  const filteredPurchases = purchases.filter(purchase =>
    (purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (purchase.supplierId && purchase.supplierId.toLowerCase().includes(searchTerm.toLowerCase()))
    ) &&
    (statusFilters[purchase.status])
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const getOrderStatusColor = (status: Purchase['status']) => {
    switch (status) {
      case 'Received': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700';
      case 'Ordered': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700';
      case 'Partially Received': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700';
      case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
  };

  const getPaymentStatusSelectStyle = (isSettled?: boolean) => {
    if (isSettled) { // Paid
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800';
    } else { // Due
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-800';
    }
  };


  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
            <p className="text-muted-foreground">Manage procurements. Inventory updates when PO status becomes 'Received'. Supplier balance updates for 'On Credit' POs, and can be settled.</p>
          </div>
          <Button onClick={() => setIsPurchaseFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Purchase Order
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>Inventory is updated when PO status changes to/from 'Received'. Supplier balance is updated for 'On Credit' purchases and when payment status is toggled.</CardDescription>
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
                  <TableHead>Order Status</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => {
                  const isCreditPurchase = purchase.paymentType === 'on_credit';
                  
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.id}</TableCell>
                      <TableCell>{format(new Date(purchase.date), "PP")}</TableCell>
                      <TableCell>{purchase.supplierName} {purchase.supplierId && <span className="text-xs text-muted-foreground">({purchase.supplierId})</span>}</TableCell>
                      <TableCell className="text-right">₹{purchase.netAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Select
                            value={purchase.status}
                            onValueChange={(newStatus: Purchase['status']) => handlePurchaseStatusChange(purchase.id, newStatus)}
                        >
                          <SelectTrigger className={cn("h-8 text-xs w-auto min-w-[120px] border", getOrderStatusColor(purchase.status))}>
                              <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                              {purchaseStatuses.map(s => (
                                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isCreditPurchase ? (
                          <Select
                            value={purchase.paymentSettled ? 'paid' : 'due'}
                            onValueChange={(newPaymentSelection: 'paid' | 'due') => handlePaymentStatusChange(purchase.id, newPaymentSelection)}
                          >
                            <SelectTrigger 
                              className={cn(
                                "h-8 text-xs w-auto min-w-[100px] border", 
                                getPaymentStatusSelectStyle(purchase.paymentSettled)
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="due" className="text-xs text-orange-800 dark:text-orange-200">Due</SelectItem>
                              <SelectItem value="paid" className="text-xs text-green-800 dark:text-green-200">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                            Paid (Upfront)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewPurchaseDetails(purchase)} title="View Details">
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
             {filteredPurchases.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    {purchases.length > 0 && (searchTerm || !Object.values(statusFilters).every(v => v)) ? 'No purchase orders match your search or filter criteria.' : 'No purchase orders recorded yet. Create one to get started.'}
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
       {selectedPurchase && (
        <PurchaseOrderViewDialog
            isOpen={isPurchaseViewOpen}
            onOpenChange={setIsPurchaseViewOpen}
            purchaseOrder={selectedPurchase}
        />
      )}
    </AppLayout>
  );
}
