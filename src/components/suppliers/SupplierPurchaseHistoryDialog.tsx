
"use client";

import type { Purchase, Supplier } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SupplierPurchaseHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  allPurchases: Purchase[];
}

export function SupplierPurchaseHistoryDialog({ 
    isOpen, 
    onOpenChange, 
    supplier, 
    allPurchases 
}: SupplierPurchaseHistoryDialogProps) {

  const supplierPurchases = useMemo(() => {
    if (!supplier) return [];
    return allPurchases
        .filter(p => p.supplierId === supplier.id || p.supplierName.toLowerCase() === supplier.name.toLowerCase())
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [supplier, allPurchases]);

  if (!supplier) return null;
  
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Purchase History for {supplier.name}</DialogTitle>
          <DialogDescription>
            Review all purchase orders associated with this supplier.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-6 custom-scrollbar">
          {supplierPurchases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.id}</TableCell>
                    <TableCell>{format(new Date(purchase.date), "PP")}</TableCell>
                    <TableCell className="text-right">${purchase.netAmount.toFixed(2)}</TableCell>
                    <TableCell>
                        <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getStatusColor(purchase.status))}>
                            {purchase.status}
                        </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No purchase history found for this supplier.</p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
