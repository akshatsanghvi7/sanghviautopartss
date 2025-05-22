
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
import { Mail, Download, Phone, Building } from 'lucide-react'; // Changed Printer to Download
import { useToast } from '@/hooks/use-toast';
import AppLogo from '@/components/layout/AppLogo';
import type { AppSettings } from '@/app/settings/actions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  companySettings: AppSettings; 
}

export function InvoiceViewDialog({ isOpen, onOpenChange, sale, companySettings }: InvoiceViewDialogProps) {
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

  const handleDownloadPdf = () => {
    const invoiceElement = document.getElementById('printable-invoice-area');
    if (invoiceElement) {
      toast({ title: "Generating PDF...", description: "Please wait while your invoice is prepared." });
      html2canvas(invoiceElement, { 
        scale: 2, // Increase scale for better quality
        useCORS: true, 
        logging: false, // Reduce console noise
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calculate the ratio to fit the image onto the PDF page, maintaining aspect ratio
        const imgRatio = canvasWidth / canvasHeight;
        const pdfRatio = pdfWidth / pdfHeight;

        let finalPdfImageWidth = pdfWidth;
        let finalPdfImageHeight = pdfWidth / imgRatio;

        if (finalPdfImageHeight > pdfHeight) {
            finalPdfImageHeight = pdfHeight;
            finalPdfImageWidth = pdfHeight * imgRatio;
        }
        
        // Center the image on the page
        const xOffset = (pdfWidth - finalPdfImageWidth) / 2;
        const yOffset = 0; // Start from top or add small margin e.g. 20

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalPdfImageWidth, finalPdfImageHeight);
        pdf.save(`invoice-${sale.id}.pdf`);
        toast({ title: "Invoice Downloaded", description: "Your PDF invoice has been downloaded." });
      }).catch(err => {
        console.error("Error generating PDF:", err);
        toast({ title: "PDF Download Failed", description: "Could not generate the PDF.", variant: "destructive" });
      });
    } else {
      toast({ title: "Error", description: "Could not find invoice content to download.", variant: "destructive" });
    }
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

        <ScrollArea className="h-[65vh] pr-6 custom-scrollbar" id="invoice-content-scrollarea"> {/* ID changed for clarity */}
          <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm" id="printable-invoice-area"> {/* Added ID here */}
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <AppLogo className="h-12 w-12 text-primary mb-2" />
                <h2 className="text-2xl font-bold text-primary">{companySettings.companyName || 'AutoCentral Inc.'}</h2>
                {companySettings.companyAddress && <p className="text-muted-foreground text-sm flex items-center gap-1"><Building className="h-3 w-3"/>{companySettings.companyAddress}</p>}
                {companySettings.companyGstNumber && <p className="text-muted-foreground text-sm">GSTIN: {companySettings.companyGstNumber}</p>}
                {companySettings.companyPhoneNumbers?.[0] && <p className="text-muted-foreground text-sm flex items-center gap-1"><Phone className="h-3 w-3"/>{companySettings.companyPhoneNumbers[0]}</p>}
                {companySettings.companyPhoneNumbers?.[1] && <p className="text-muted-foreground text-sm flex items-center gap-1"><Phone className="h-3 w-3"/>{companySettings.companyPhoneNumbers[1]}</p>}
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
          <Button variant="outline" onClick={handleDownloadPdf}>
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
