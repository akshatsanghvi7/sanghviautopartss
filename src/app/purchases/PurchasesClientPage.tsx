
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Filter, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, startTransition } from 'react';
import type { Purchase, Part, Supplier, PurchaseItem as PurchaseItemType } from '@/lib/types';
import { PurchaseFormDialog, type PurchaseFormData } from '@/components/purchases/PurchaseFormDialog';
import { PurchaseOrderViewDialog } from '@/components/purchases/PurchaseOrderViewDialog';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { addPurchase, updatePurchaseStatus, updatePurchasePaymentSettled } from './actions';
import type { AppSettings } from '@/app/settings/actions'; // Import AppSettings

interface PurchasesClientPageProps {
  initialPurchases: Purchase[];
  initialInventoryParts: Part[];
  initialSuppliers: Supplier[];
  companySettings: AppSettings; 
}

export function PurchasesClientPage({ initialPurchases, initialInventoryParts, initialSuppliers, companySettings }: PurchasesClientPageProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [inventoryParts, setInventoryParts] = useState<Part[]>(initialInventoryParts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);

  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [isPurchaseViewOpen, setIsPurchaseViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  
  const purchaseStatuses: Purchase['status'][] = ['Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled'];
  const [statusFilters, setStatusFilters] = useState<Record<Purchase['status'], boolean>>({
    Pending: true, Ordered: true, 'Partially Received': true, Received: true, Cancelled: false, 
  });

  useEffect(() => { setPurchases(initialPurchases); }, [initialPurchases]);
  useEffect(() => { setInventoryParts(initialInventoryParts); }, [initialInventoryParts]);
  useEffect(() => { setSuppliers(initialSuppliers); }, [initialSuppliers]);

  const handleNewPurchaseSubmit = async (formDataFromDialog: Omit<Purchase, 'id' | 'paymentSettled'>) => {
    startTransition(async () => {
      // formDataFromDialog already has 'date' as an ISO string from PurchaseFormDialog
      // and other fields correctly mapped.
      // The server action addPurchase expects this type.
      const result = await addPurchase(formDataFromDialog);
      if (result.success) {
        toast({ title: "Purchase Order Recorded", description: result.message });
        setIsPurchaseFormOpen(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleStatusFilterChange = (statusKey: Purchase['status'], checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [statusKey]: checked }));
  };

  const handlePurchaseStatusChangeClient = (purchaseId: string, newStatus: Purchase['status']) => {
    startTransition(async () => {
      const result = await updatePurchaseStatus(purchaseId, newStatus);
      if (result.success) {
        toast({ title: "Order Status Updated", description: `${result.message}${result.inventoryAdjusted ? ' Inventory also updated.' : ''}` });
      } else {
        toast({ title: "Error updating status", description: result.message, variant: "destructive" });
      }
    });
  };

  const handlePaymentStatusChangeClient = (purchaseId: string, newPaymentSelection: 'paid' | 'due') => {
    const paymentSettled = newPaymentSelection === 'paid';
    startTransition(async () => {
      const result = await updatePurchasePaymentSettled(purchaseId, paymentSettled);
      if (result.success) {
        toast({ title: "Payment Status Updated", description: result.message });
      } else {
        toast({ title: "Error updating payment status", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleViewPurchaseDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsPurchaseViewOpen(true);
  };

  const filteredPurchases = purchases.filter(purchase =>
    (purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (purchase.supplierId && purchase.supplierId.toLowerCase().includes(searchTerm.toLowerCase()))
    ) && (statusFilters[purchase.status])
  ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  
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
    if (isSettled) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-800';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage procurements. Inventory updates when PO status is 'Received'. Supplier balance updates for 'On Credit' POs.</p>
        </div>
        <Button onClick={() => setIsPurchaseFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> New Purchase Order</Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>Inventory updates with 'Received' status. Balances update for 'On Credit' POs and payment status changes.</CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search PO ID, supplier..." className="pl-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Filter className="mr-2 h-4 w-4" />Filter Status</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel><DropdownMenuSeparator />
                {purchaseStatuses.map(status => (<DropdownMenuCheckboxItem key={status} checked={statusFilters[status]} onCheckedChange={(checked) => handleStatusFilterChange(status, Boolean(checked))}>{status}</DropdownMenuCheckboxItem>))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>PO ID</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Net Amount</TableHead><TableHead>Order Status</TableHead><TableHead>Payment Status</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => {
                const isCreditPurchase = purchase.paymentType === 'on_credit';
                return (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.id}</TableCell>
                    <TableCell>{format(parseISO(purchase.date), "PP")}</TableCell>
                    <TableCell>{purchase.supplierName} {purchase.supplierId && <span className="text-xs text-muted-foreground">({purchase.supplierId})</span>}</TableCell>
                    <TableCell className="text-right">₹{purchase.netAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select value={purchase.status} onValueChange={(newStatus: Purchase['status']) => handlePurchaseStatusChangeClient(purchase.id, newStatus)}>
                        <SelectTrigger className={cn("h-8 text-xs w-auto min-w-[120px] border", getOrderStatusColor(purchase.status))}><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>{purchaseStatuses.map(s => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isCreditPurchase ? (
                        <Select value={purchase.paymentSettled ? 'paid' : 'due'} onValueChange={(val: 'paid' | 'due') => handlePaymentStatusChangeClient(purchase.id, val)}>
                          <SelectTrigger className={cn("h-8 text-xs w-auto min-w-[100px] border", getPaymentStatusSelectStyle(purchase.paymentSettled))}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="due" className="text-xs text-orange-800 dark:text-orange-200">Due</SelectItem>
                            <SelectItem value="paid" className="text-xs text-green-800 dark:text-green-200">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (<span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">Paid (Upfront)</span>)}
                    </TableCell>
                    <TableCell className="text-center"><Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewPurchaseDetails(purchase)} title="View Details"><FileText className="h-4 w-4" /><span className="sr-only">View Details</span></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredPurchases.length === 0 && (<div className="text-center py-10 text-muted-foreground">{purchases.length > 0 ? 'No POs match criteria.' : 'No POs recorded.'}</div>)}
        </CardContent>
      </Card>
      <PurchaseFormDialog isOpen={isPurchaseFormOpen} onOpenChange={setIsPurchaseFormOpen} onSubmit={handleNewPurchaseSubmit} inventoryParts={inventoryParts} inventorySuppliers={suppliers} />
      {selectedPurchase && (<PurchaseOrderViewDialog isOpen={isPurchaseViewOpen} onOpenChange={setIsPurchaseViewOpen} purchaseOrder={selectedPurchase} companySettings={companySettings} />)}
    </div>
  );
}

    