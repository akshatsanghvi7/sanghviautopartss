
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, Download, AlertCircle, CalendarDays, ShoppingCart, PackageSearch, TrendingUp } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import React, { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Sale, Purchase, Part } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

interface SalesSummaryData {
  totalSales: number;
  cashSales: number;
  creditSales: number;
  highestSellingProduct: { name: string; quantity: number; partNumber: string } | null;
  numberOfTransactions: number;
}

interface PurchaseSummaryData {
  totalPurchases: number;
  numberOfPurchaseOrders: number;
  mostFrequentPart: { name: string; quantity: number; partNumber: string } | null;
  topSupplierByValue: { name: string; totalValue: number; supplierId: string } | null;
}

type ReportId = "sales-summary" | "purchase-summary" | "inventory-valuation" | "profit-loss" | "stock-movement";

interface ReportCardDisplayState {
  isLoading: boolean;
  dataGenerated: boolean;
  message?: string;
}

const initialReportTypes = [
    { id: "sales-summary" as ReportId, name: "Sales Summary", description: "Overview of sales performance.", icon: BarChart3, dataAiHint: "sales graph", disabled: false },
    { id: "purchase-summary" as ReportId, name: "Purchase Summary", description: "Overview of purchase activities.", icon: ShoppingCart, dataAiHint: "purchase graph", disabled: false },
    { id: "inventory-valuation" as ReportId, name: "Inventory Valuation", description: "Current value of your stock.", icon: PackageSearch, dataAiHint: "inventory document", disabled: false },
    { id: "profit-loss" as ReportId, name: "Profit & Loss", description: "Financial performance overview.", icon: TrendingUp, dataAiHint: "financial chart", disabled: false },
    { id: "stock-movement" as ReportId, name: "Stock Movement", description: "History of inventory changes.", icon: FileText, dataAiHint: "inventory flow", disabled: false },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sales] = useLocalStorage<Sale[]>('autocentral-sales', []);
  const [purchases] = useLocalStorage<Purchase[]>('autocentral-purchases', []);
  const { toast } = useToast();

  const [salesSummaryData, setSalesSummaryData] = useState<SalesSummaryData | null>(null);
  const [purchaseSummaryData, setPurchaseSummaryData] = useState<PurchaseSummaryData | null>(null);
  
  const initialDisplayStates: Record<ReportId, ReportCardDisplayState> = {
    "sales-summary": { isLoading: false, dataGenerated: false },
    "purchase-summary": { isLoading: false, dataGenerated: false },
    "inventory-valuation": { isLoading: false, dataGenerated: false, message: "Detailed report coming soon..." },
    "profit-loss": { isLoading: false, dataGenerated: false, message: "Detailed report coming soon..." },
    "stock-movement": { isLoading: false, dataGenerated: false, message: "Detailed report coming soon..." },
  };
  const [reportDisplayStates, setReportDisplayStates] = useState<Record<ReportId, ReportCardDisplayState>>(initialDisplayStates);


  const updateReportState = (id: ReportId, updates: Partial<ReportCardDisplayState>) => {
    setReportDisplayStates(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  const handleGenerateSalesSummary = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({
        title: "Date Range Required",
        description: "Please select a valid date range to generate the sales summary.",
        variant: "destructive",
      });
      return;
    }
    updateReportState("sales-summary", { isLoading: true, dataGenerated: false });
    setSalesSummaryData(null);

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
        updateReportState("sales-summary", { isLoading: false, dataGenerated: true });
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
        totalSales, cashSales, creditSales, highestSellingProduct, numberOfTransactions: filteredSales.length,
      });
      updateReportState("sales-summary", { isLoading: false, dataGenerated: true });
    }, 500);
  };

  const handleGeneratePurchaseSummary = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({
        title: "Date Range Required",
        description: "Please select a valid date range to generate the purchase summary.",
        variant: "destructive",
      });
      return;
    }
    updateReportState("purchase-summary", { isLoading: true, dataGenerated: false });
    setPurchaseSummaryData(null);

    setTimeout(() => {
      const fromDate = startOfDay(dateRange.from!);
      const toDate = endOfDay(dateRange.to!);

      const filteredPurchases = purchases.filter(purchase => {
        const purchaseDate = parseISO(purchase.date);
        return isWithinInterval(purchaseDate, { start: fromDate, end: toDate });
      });

      if (filteredPurchases.length === 0) {
        setPurchaseSummaryData({
            totalPurchases: 0, numberOfPurchaseOrders: 0, mostFrequentPart: null, topSupplierByValue: null
        });
        updateReportState("purchase-summary", { isLoading: false, dataGenerated: true });
        return;
      }

      let totalPurchases = 0;
      const partQuantities: Record<string, { name: string; quantity: number }> = {};
      const supplierValues: Record<string, { name: string; totalValue: number }> = {};

      filteredPurchases.forEach(purchase => {
        totalPurchases += purchase.netAmount;
        
        if (!supplierValues[purchase.supplierId || purchase.supplierName]) {
          supplierValues[purchase.supplierId || purchase.supplierName] = { name: purchase.supplierName, totalValue: 0 };
        }
        supplierValues[purchase.supplierId || purchase.supplierName].totalValue += purchase.netAmount;

        purchase.items.forEach(item => {
          if (!partQuantities[item.partNumber]) {
            partQuantities[item.partNumber] = { name: item.partName, quantity: 0 };
          }
          partQuantities[item.partNumber].quantity += item.quantityPurchased;
        });
      });

      let mostFrequentPart: { name: string; quantity: number; partNumber: string } | null = null;
      let maxQuantity = 0;
      for (const partNumber in partQuantities) {
        if (partQuantities[partNumber].quantity > maxQuantity) {
          maxQuantity = partQuantities[partNumber].quantity;
          mostFrequentPart = { partNumber, name: partQuantities[partNumber].name, quantity: partQuantities[partNumber].quantity };
        }
      }

      let topSupplierByValue: { name: string; totalValue: number; supplierId: string } | null = null;
      let maxSupplierValue = 0;
      for (const supplierId in supplierValues) {
        if (supplierValues[supplierId].totalValue > maxSupplierValue) {
          maxSupplierValue = supplierValues[supplierId].totalValue;
          topSupplierByValue = { supplierId, name: supplierValues[supplierId].name, totalValue: supplierValues[supplierId].totalValue };
        }
      }
      
      setPurchaseSummaryData({
        totalPurchases, numberOfPurchaseOrders: filteredPurchases.length, mostFrequentPart, topSupplierByValue
      });
      updateReportState("purchase-summary", { isLoading: false, dataGenerated: true });
    }, 500);
  };
  
  const handleViewReport = (reportId: ReportId) => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({
        title: "Date Range Required",
        description: "Please select a valid date range.",
        variant: "destructive",
      });
      return;
    }
    if (reportId === "sales-summary") {
      handleGenerateSalesSummary();
    } else if (reportId === "purchase-summary") {
      handleGeneratePurchaseSummary();
    } else {
      // For other reports, mark as dataGenerated to show the "coming soon" message
      updateReportState(reportId, { isLoading: false, dataGenerated: true });
      // toast({
      //   title: "Report Not Implemented",
      //   description: "This report type is not yet available.",
      // });
    }
  };

  const handleDownloadReport = (reportId: string) => {
     toast({
        title: "Download Not Implemented",
        description: `Download functionality for ${reportId} is not yet available.`,
      });
  }

  const renderReportContent = (report: typeof initialReportTypes[0]) => {
    const state = reportDisplayStates[report.id];

    if (state.isLoading) {
        return <p className="text-muted-foreground">Loading summary...</p>;
    }

    if (!state.dataGenerated) {
        return (
            <div className="text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Select a date range and click "View Report".</p>
            </div>
        );
    }

    if (report.id === "sales-summary" && salesSummaryData) {
        if (salesSummaryData.numberOfTransactions === 0) {
            return <p className="text-muted-foreground">No sales data found for the selected period.</p>;
        }
        return (
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
        );
    }

    if (report.id === "purchase-summary" && purchaseSummaryData) {
        if (purchaseSummaryData.numberOfPurchaseOrders === 0) {
            return <p className="text-muted-foreground">No purchase data found for the selected period.</p>;
        }
        return (
            <div className="space-y-1 text-left w-full">
                <p><strong>Total Purchases:</strong> ₹{purchaseSummaryData.totalPurchases.toFixed(2)}</p>
                <p><strong>Purchase Orders:</strong> {purchaseSummaryData.numberOfPurchaseOrders}</p>
                {purchaseSummaryData.mostFrequentPart ? (
                    <p><strong>Top Part:</strong> {purchaseSummaryData.mostFrequentPart.name} ({purchaseSummaryData.mostFrequentPart.partNumber}) - {purchaseSummaryData.mostFrequentPart.quantity} units</p>
                ) : (
                    <p>No parts purchased in this period.</p>
                )}
                {purchaseSummaryData.topSupplierByValue ? (
                    <p><strong>Top Supplier:</strong> {purchaseSummaryData.topSupplierByValue.name} - Total Value: ₹{purchaseSummaryData.topSupplierByValue.totalValue.toFixed(2)}</p>
                ) : (
                    <p>No supplier spending in this period.</p>
                )}
            </div>
        );
    }
    
    // For other reports that are "activated" but not fully implemented
    if (state.message) {
      return <p className="text-muted-foreground">{state.message}</p>;
    }

    return <p className="text-muted-foreground">Click "View Report" to generate.</p>;
  };


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
                      disabled={
                        report.id !== "sales-summary" && report.id !== "purchase-summary" || 
                        (report.id === "sales-summary" && !salesSummaryData) ||
                        (report.id === "purchase-summary" && !purchaseSummaryData)
                      }
                    >
                      <Download className="h-5 w-5" />
                      <span className="sr-only">Download Report</span>
                   </Button>
                </div>
                <CardTitle className="text-xl">{report.name}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="h-48 bg-muted/30 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 p-4 text-sm overflow-y-auto custom-scrollbar" data-ai-hint={report.dataAiHint}>
                  {renderReportContent(report)}
                </div>
                <Button 
                  className="w-full mt-auto" 
                  onClick={() => handleViewReport(report.id)}
                  disabled={(!dateRange || !dateRange.from || !dateRange.to) && (report.id === "sales-summary" || report.id === "purchase-summary")}
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

