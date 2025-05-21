
"use client";

import type { Sale, Customer } from '@/lib/types';
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

interface CustomerSalesHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  allSales: Sale[];
}

export function CustomerSalesHistoryDialog({ 
    isOpen, 
    onOpenChange, 
    customer, 
    allSales 
}: CustomerSalesHistoryDialogProps) {

  const customerSales = useMemo(() => {
    if (!customer) return [];
    return allSales
        .filter(s => s.buyerName.toLowerCase() === customer.name.toLowerCase())
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customer, allSales]);

  if (!customer) return null;
  
  const getPaymentTypeStyle = (paymentType: 'cash' | 'credit') => {
    switch (paymentType) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'credit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Sales History for {customer.name}</DialogTitle>
          <DialogDescription>
            Review all sales transactions associated with this customer.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-6 custom-scrollbar">
          {customerSales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Payment Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>{format(new Date(sale.date), "PPp")}</TableCell>
                    <TableCell className="text-right">₹{sale.netAmount.toFixed(2)}</TableCell>
                    <TableCell>
                        <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getPaymentTypeStyle(sale.paymentType))}>
                            {sale.paymentType.charAt(0).toUpperCase() + sale.paymentType.slice(1)}
                        </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No sales history found for this customer.</p>
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
