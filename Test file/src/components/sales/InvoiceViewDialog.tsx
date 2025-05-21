
"use client";

import type { Sale } from '@/lib/types';
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
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Mail, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AppLogo from '@/components/layout/AppLogo';


interface InvoiceViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export function InvoiceViewDialog({ isOpen, onOpenChange, sale }: InvoiceViewDialogProps) {
  const { toast } = useToast();

  if (!sale) return null;

  const handleMailInvoice = () => {
    if (sale.emailAddress) {
      toast({
        title: "Invoice Mailed (Simulated)",
        description: `Invoice for Sale ID: ${sale.id} would be mailed to ${sale.emailAddress}.`,
      });
    } else {
      toast({
        title: "Email Not Available",
        description: "No email address provided for this customer to mail the invoice.",
        variant: "destructive",
      });
    }
  };

  const handlePrintInvoice = () => {
    toast({
        title: "Print Initiated (Simulated)",
        description: "If this were a real app, a print dialog would appear.",
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Invoice Details - #{sale.id}</DialogTitle>
          <DialogDescription>
            Sale recorded on {format(new Date(sale.date), "PPPp")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-6" id="invoice-content">
          <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <AppLogo className="h-12 w-12 text-primary mb-2" />
                <h2 className="text-2xl font-bold text-primary">AutoCentral Inc.</h2>
                <p className="text-muted-foreground">123 Auto Drive, Carville, ST 12345</p>
                <p className="text-muted-foreground">contact@autocentral.com</p>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold uppercase text-primary">Invoice</h1>
                <p className="text-muted-foreground">Invoice #: {sale.id}</p>
                <p className="text-muted-foreground">Date: {format(new Date(sale.date), "PPP")}</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Customer & Sale Details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-lg mb-1 text-primary">Bill To:</h3>
                <p className="font-medium">{sale.buyerName}</p>
                {sale.contactDetails && <p className="text-muted-foreground">{sale.contactDetails}</p>}
                {sale.emailAddress && <p className="text-muted-foreground">{sale.emailAddress}</p>}
                {sale.gstNumber && <p className="text-muted-foreground">GSTIN: {sale.gstNumber}</p>}
              </div>
              <div className="text-right">
                 <h3 className="font-semibold text-lg mb-1 text-primary">Payment Details:</h3>
                 <p>Payment Type: <span className="font-medium">{sale.paymentType.charAt(0).toUpperCase() + sale.paymentType.slice(1)}</span></p>
              </div>
            </div>

            {/* Items Table */}
            <Table className="mb-6">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Item Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, index) => (
                  <TableRow key={item.partNumber + index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium">{item.partName}</p>
                      <p className="text-xs text-muted-foreground">{item.partNumber}</p>
                    </TableCell>
                    <TableCell className="text-right">{item.quantitySold}</TableCell>
                    <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{item.itemTotal.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals Section */}
            <div className="flex justify-end mb-6">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{sale.subTotal.toFixed(2)}</span>
                </div>
                {sale.discount !== undefined && sale.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium">-₹{sale.discount.toFixed(2)}</span>
                  </div>
                )}
                 <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-primary">Net Amount:</span>
                  <span className="text-primary">₹{sale.netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Footer / Thank you note */}
            <div className="text-center text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>All amounts are in INR (unless otherwise specified).</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleMailInvoice} disabled={!sale.emailAddress}>
            <Mail className="mr-2 h-4 w-4" /> Mail Invoice
          </Button>
          <Button variant="outline" onClick={handlePrintInvoice}>
            <Printer className="mr-2 h-4 w-4" /> Print Invoice
          </Button>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
