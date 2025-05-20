
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, Download, AlertCircle, CalendarDays } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import React, { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Sale, SaleItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

interface SalesSummaryData {
  totalSales: number;
  cashSales: number;
  creditSales: number;
  highestSellingProduct: { name: string; quantity: number; partNumber: string } | null;
  numberOfTransactions: number;
}

const initialReportTypes = [
    { id: "sales-summary", name: "Sales Summary", description: "Overview of sales performance.", icon: BarChart3, dataAiHint: "sales graph" },
    { id: "inventory-valuation", name: "Inventory Valuation", description: "Current value of your stock.", icon: FileText, dataAiHint: "document list", disabled: true },
    { id: "profit-loss", name: "Profit & Loss", description: "Financial performance overview.", icon: BarChart3, dataAiHint: "financial chart", disabled: true },
    { id: "customer-activity", name: "Customer Activity", description: "Report on customer interactions.", icon: FileText, dataAiHint: "customer data", disabled: true },
    { id: "supplier-performance", name: "Supplier Performance", description: "Track supplier efficiency.", icon: FileText, dataAiHint: "supplier report", disabled: true },
    { id: "stock-movement", name: "Stock Movement", description: "History of inventory changes.", icon: BarChart3, dataAiHint: "inventory flow", disabled: true },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sales] = useLocalStorage<Sale[]>('autocentral-sales', []);
  const { toast } = useToast();

  const [salesSummaryData, setSalesSummaryData] = useState<SalesSummaryData | null>(null);
  const [isSalesSummaryLoading, setIsSalesSummaryLoading] = useState(false);

  const handleGenerateSalesSummary = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({
        title: "Date Range Required",
        description: "Please select a valid date range to generate the sales summary.",
        variant: "destructive",
      });
      return;
    }
    setIsSalesSummaryLoading(true);
    setSalesSummaryData(null);

    // Simulate API call delay
    setTimeout(() => {
      const fromDate = startOfDay(dateRange.from!);
      const toDate = endOfDay(dateRange.to!);

      const filteredSales = sales.filter(sale => {
        const saleDate = parseISO(sale.date);
        return isWithinInterval(saleDate, { start: fromDate, end: toDate });
      });

      if (filteredSales.length === 0) {
        setSalesSummaryData({
            totalSales: 0, cashSales: 0, creditSales: 0, highestSellingProduct: null, numberOfTransactions: 0
        });
        setIsSalesSummaryLoading(false);
        return;
      }

      let totalSales = 0;
      let cashSales = 0;
      let creditSales = 0;
      const productQuantities: Record<string, { name: string; quantity: number }> = {};

      filteredSales.forEach(sale => {
        totalSales += sale.netAmount;
        if (sale.paymentType === 'cash') {
          cashSales += sale.netAmount;
        } else if (sale.paymentType === 'credit') {
          creditSales += sale.netAmount;
        }
        sale.items.forEach(item => {
          if (!productQuantities[item.partNumber]) {
            productQuantities[item.partNumber] = { name: item.partName, quantity: 0 };
          }
          productQuantities[item.partNumber].quantity += item.quantitySold;
        });
      });

      let highestSellingProduct: { name: string; quantity: number; partNumber: string } | null = null;
      let maxQuantity = 0;
      for (const partNumber in productQuantities) {
        if (productQuantities[partNumber].quantity > maxQuantity) {
          maxQuantity = productQuantities[partNumber].quantity;
          highestSellingProduct = { 
            partNumber,
            name: productQuantities[partNumber].name, 
            quantity: productQuantities[partNumber].quantity 
          };
        }
      }
      
      setSalesSummaryData({
        totalSales,
        cashSales,
        creditSales,
        highestSellingProduct,
        numberOfTransactions: filteredSales.length,
      });
      setIsSalesSummaryLoading(false);
    }, 500); // Simulate delay
  };
  
  const handleViewReport = (reportId: string) => {
    if (reportId === "sales-summary") {
      handleGenerateSalesSummary();
    } else {
      toast({
        title: "Report Not Implemented",
        description: "This report type is not yet available.",
      });
    }
  };

  const handleDownloadReport = (reportId: string) => {
     toast({
        title: "Download Not Implemented",
        description: `Download functionality for ${reportId} is not yet available.`,
      });
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
                <p className="text-muted-foreground">Generate and view detailed business reports. Select a date range to analyze data.</p>
            </div>
            <div>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {initialReportTypes.map((report) => (
            <Card key={report.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <report.icon className="h-8 w-8 text-primary mb-2" />
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-primary" 
                      onClick={() => handleDownloadReport(report.id)}
                      disabled={report.disabled || (report.id === "sales-summary" && !salesSummaryData)}
                    >
                      <Download className="h-5 w-5" />
                      <span className="sr-only">Download Report</span>
                   </Button>
                </div>
                <CardTitle className="text-xl">{report.name}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                {report.id === "sales-summary" ? (
                  <div className="h-40 bg-muted/30 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 p-4 text-sm overflow-y-auto custom-scrollbar" data-ai-hint={report.dataAiHint}>
                    {isSalesSummaryLoading ? (
                      <p className="text-muted-foreground">Loading summary...</p>
                    ) : salesSummaryData ? (
                      <div className="space-y-1 text-left w-full">
                        <p><strong>Total Sales:</strong> ₹{salesSummaryData.totalSales.toFixed(2)}</p>
                        <p><strong>Cash Sales:</strong> ₹{salesSummaryData.cashSales.toFixed(2)}</p>
                        <p><strong>Credit Sales:</strong> ₹{salesSummaryData.creditSales.toFixed(2)}</p>
                        <p><strong>Transactions:</strong> {salesSummaryData.numberOfTransactions}</p>
                        {salesSummaryData.highestSellingProduct ? (
                          <p><strong>Top Seller:</strong> {salesSummaryData.highestSellingProduct.name} ({salesSummaryData.highestSellingProduct.partNumber}) - {salesSummaryData.highestSellingProduct.quantity} units</p>
                        ) : (
                          <p>No products sold in this period.</p>
                        )}
                      </div>
                    ) : (
                       <div className="text-center">
                         <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                         <p className="text-muted-foreground">Select a date range and click "View Report" to see the Sales Summary.</p>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 bg-muted/30 rounded-md flex items-center justify-center border-2 border-dashed border-border mb-4" data-ai-hint={report.dataAiHint}>
                    <p className="text-sm text-muted-foreground">
                      {report.disabled ? `${report.name} (Coming Soon)` : "Chart/Data Preview (Coming Soon)"}
                    </p>
                  </div>
                )}
                <Button 
                  className="w-full mt-auto" 
                  onClick={() => handleViewReport(report.id)}
                  disabled={report.disabled || (report.id === "sales-summary" && (!dateRange || !dateRange.from || !dateRange.to))}
                >
                  View Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}
