"use client";

import type { Purchase } from '@/lib/types';
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
import { Download, Building, Phone } from 'lucide-react'; // Changed Printer to Download, added Building, Phone
import { useToast } from '@/hooks/use-toast';
import AppLogo from '@/components/layout/AppLogo';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AppSettings } from '@/app/settings/actions'; // Assuming settings might be needed for company details

interface PurchaseOrderViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: Purchase | null;
  companySettings?: AppSettings; // Optional: if company details from settings are to be displayed
}

export function PurchaseOrderViewDialog({ isOpen, onOpenChange, purchaseOrder, companySettings }: PurchaseOrderViewDialogProps) {
  const { toast } = useToast();

  if (!purchaseOrder) return null;

  const handleDownloadPoPdf = () => {
    const poElement = document.getElementById('printable-po-area');
    if (poElement) {
      toast({ title: "Generating PDF...", description: "Please wait while your Purchase Order is prepared." });
      html2canvas(poElement, { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 20; 

        const usablePdfWidth = pdfWidth - 2 * margin;
        const usablePdfHeight = pdfHeight - 2 * margin;

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;

        let finalImageWidth, finalImageHeight;

        if (usablePdfWidth / canvasAspectRatio <= usablePdfHeight) {
            finalImageWidth = usablePdfWidth;
            finalImageHeight = finalImageWidth / canvasAspectRatio;
        } else {
            finalImageHeight = usablePdfHeight;
            finalImageWidth = finalImageHeight * canvasAspectRatio;
        }
        
        const xOffset = margin + (usablePdfWidth - finalImageWidth) / 2;
        const yOffset = margin + (usablePdfHeight - finalImageHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalImageWidth, finalImageHeight);
        pdf.save(`purchase-order-${purchaseOrder.id}.pdf`);
        toast({ title: "PO Downloaded", description: "Your PDF Purchase Order has been downloaded." });
      }).catch(err => {
        console.error("Error generating PO PDF:", err);
        toast({ title: "PDF Download Failed", description: "Could not generate the Purchase Order PDF.", variant: "destructive" });
      });
    } else {
      toast({ title: "Error", description: "Could not find PO content to download.", variant: "destructive" });
    }
  };
  
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
          <DialogTitle>Purchase Order Details - #{purchaseOrder.id}</DialogTitle>
          <DialogDescription>
            PO Created on {format(new Date(purchaseOrder.date), "PPPp")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-6 custom-scrollbar">
          <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm" id="printable-po-area">
            {/* PO Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <AppLogo className="h-12 w-12 text-primary mb-2" />
                <h2 className="text-2xl font-bold text-primary">{companySettings?.companyName || 'AutoCentral Inc.'}</h2>
                {companySettings?.companyAddress && <p className="text-muted-foreground text-sm flex items-center gap-1"><Building className="h-3 w-3"/>{companySettings.companyAddress}</p>}
                {companySettings?.companyGstNumber && <p className="text-muted-foreground text-sm">GSTIN: {companySettings.companyGstNumber}</p>}
                {companySettings?.companyPhoneNumbers?.[0] && <p className="text-muted-foreground text-sm flex items-center gap-1"><Phone className="h-3 w-3"/>{companySettings.companyPhoneNumbers[0]}</p>}
                {companySettings?.companyPhoneNumbers?.[1] && <p className="text-muted-foreground text-sm flex items-center gap-1"><Phone className="h-3 w-3"/>{companySettings.companyPhoneNumbers[1]}</p>}
              </div>
              <div className="flex-1 text-right">
                <h1 className="text-3xl font-bold uppercase text-primary">PO #{purchaseOrder.id}</h1>
                <p className="text-muted-foreground">Date: {format(new Date(purchaseOrder.date), "PPP")}</p>
                {purchaseOrder.supplierInvoiceNumber && (
                    <p className="text-muted-foreground">Supplier Invoice #: {purchaseOrder.supplierInvoiceNumber}</p>
                )}
                 <p className={cn("px-2 py-1 text-xs font-medium rounded-full inline-block mt-1", getStatusColor(purchaseOrder.status))}>
                    Status: {purchaseOrder.status}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Supplier Details */}
            <div className="mb-6">
                <h3 className="font-semibold text-lg mb-1 text-primary">Supplier:</h3>
                <p className="font-medium text-lg">{purchaseOrder.supplierName} {purchaseOrder.supplierId && <span className="text-sm text-muted-foreground">({purchaseOrder.supplierId})</span>}</p>
                {/* Placeholder for full supplier address if available in future */}
            </div>


            {/* Items Table */}
            <Table className="mb-6">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Item Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.items.map((item, index) => (
                  <TableRow key={item.partNumber + index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium">{item.partName}</p>
                      <p className="text-xs text-muted-foreground">{item.partNumber}</p>
                    </TableCell>
                    <TableCell className="text-right">{item.quantityPurchased}</TableCell>
                    <TableCell className="text-right">₹{item.unitCost.toFixed(2)}</TableCell>
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
                  <span className="font-medium">₹{purchaseOrder.subTotal.toFixed(2)}</span>
                </div>
                {purchaseOrder.shippingCosts !== undefined && purchaseOrder.shippingCosts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping Costs:</span>
                    <span className="font-medium">₹{purchaseOrder.shippingCosts.toFixed(2)}</span>
                  </div>
                )}
                {purchaseOrder.otherCharges !== undefined && purchaseOrder.otherCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Other Charges:</span>
                    <span className="font-medium">₹{purchaseOrder.otherCharges.toFixed(2)}</span>
                  </div>
                )}
                 <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-primary">Net Amount:</span>
                  <span className="text-primary">₹{purchaseOrder.netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />
            
            {/* Payment & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="font-semibold text-md mb-1 text-primary">Payment Details:</h3>
                    <p>Payment Type: <span className="font-medium">{purchaseOrder.paymentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></p>
                </div>
                 {purchaseOrder.notes && (
                    <div>
                        <h3 className="font-semibold text-md mb-1 text-primary">Notes:</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{purchaseOrder.notes}</p>
                    </div>
                )}
            </div>


            {/* Footer / Thank you note */}
            <div className="text-center text-muted-foreground">
              <p>AutoCentral Inc. Purchase Order System</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleDownloadPoPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
