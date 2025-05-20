
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, Download, ShoppingCart, PackageSearch, TrendingUp, LineChart } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import React, { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Sale, Purchase, Part, SaleItem, PurchaseItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDays, isWithinInterval, parseISO, startOfDay, endOfDay, format as formatDate, subDays } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

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

interface InventoryValuationData {
  totalValue: number;
  numberOfUniqueParts: number;
  totalQuantityOfParts: number;
}

interface StockMovementEntry {
  date: string;
  purchased: number;
  sold: number;
}
interface StockMovementData {
  data: StockMovementEntry[];
  hasData: boolean;
}


type ReportId = "sales-summary" | "purchase-summary" | "inventory-valuation" | "profit-loss" | "stock-movement";

interface ReportCardDisplayState {
  isLoading: boolean;
  dataGenerated: boolean;
  message?: string;
}

const initialReportTypes = [
    { id: "sales-summary" as ReportId, name: "Sales Summary", description: "Overview of sales performance within selected date range.", icon: BarChart3, dataAiHint: "sales graph", disabled: false },
    { id: "purchase-summary" as ReportId, name: "Purchase Summary", description: "Overview of purchase activities within selected date range.", icon: ShoppingCart, dataAiHint: "purchase graph", disabled: false },
    { id: "inventory-valuation" as ReportId, name: "Inventory Valuation", description: "Calculates the total current value of your on-hand stock based on MRP.", icon: PackageSearch, dataAiHint: "inventory value document", disabled: false },
    { id: "stock-movement" as ReportId, name: "Stock Movement", description: "Visualizes parts purchased vs. sold over the last 7 days.", icon: LineChart, dataAiHint: "stock activity chart", disabled: false },
    { id: "profit-loss" as ReportId, name: "Profit & Loss", description: "Financial performance overview. (Coming Soon)", icon: TrendingUp, dataAiHint: "financial chart", disabled: false },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sales] = useLocalStorage<Sale[]>('autocentral-sales', []);
  const [purchases] = useLocalStorage<Purchase[]>('autocentral-purchases', []);
  const [inventoryParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', []);
  const { toast } = useToast();

  const [salesSummaryData, setSalesSummaryData] = useState<SalesSummaryData | null>(null);
  const [purchaseSummaryData, setPurchaseSummaryData] = useState<PurchaseSummaryData | null>(null);
  const [inventoryValuationData, setInventoryValuationData] = useState<InventoryValuationData | null>(null);
  const [stockMovementData, setStockMovementData] = useState<StockMovementData | null>(null);
  
  const initialDisplayStates: Record<ReportId, ReportCardDisplayState> = {
    "sales-summary": { isLoading: false, dataGenerated: false },
    "purchase-summary": { isLoading: false, dataGenerated: false },
    "inventory-valuation": { isLoading: false, dataGenerated: false },
    "stock-movement": { isLoading: false, dataGenerated: false },
    "profit-loss": { isLoading: false, dataGenerated: false, message: "Detailed report coming soon..." },
  };
  const [reportDisplayStates, setReportDisplayStates] = useState<Record<ReportId, ReportCardDisplayState>>(initialDisplayStates);


  const updateReportState = (id: ReportId, updates: Partial<ReportCardDisplayState>) => {
    setReportDisplayStates(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  const parseMrp = (mrpString: string): number => {
    if (!mrpString) return 0;
    const numericValue = parseFloat(String(mrpString).replace(/[^0-9.-]+/g,""));
    return isNaN(numericValue) ? 0 : numericValue;
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

    setTimeout(() => { // Simulate API call
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

    setTimeout(() => { // Simulate API call
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

  const handleGenerateInventoryValuation = () => {
    updateReportState("inventory-valuation", { isLoading: true, dataGenerated: false });
    setInventoryValuationData(null);
    
    setTimeout(() => {
        let totalValue = 0;
        let totalQuantity = 0;
        inventoryParts.forEach(part => {
            totalValue += part.quantity * parseMrp(part.mrp);
            totalQuantity += part.quantity;
        });
        setInventoryValuationData({
            totalValue,
            numberOfUniqueParts: inventoryParts.length, // Assuming each entry is unique by partNumber + MRP combo
            totalQuantityOfParts: totalQuantity,
        });
        updateReportState("inventory-valuation", { isLoading: false, dataGenerated: true });
    }, 300);
  };
  
  const handleGenerateStockMovement = () => {
    updateReportState("stock-movement", { isLoading: true, dataGenerated: false });
    setStockMovementData(null);

    setTimeout(() => {
        const today = new Date();
        const last7DaysData: StockMovementEntry[] = [];
        let hasMovement = false;

        for (let i = 6; i >= 0; i--) {
            const currentDate = startOfDay(subDays(today, i));
            const dayEnd = endOfDay(currentDate);
            
            let dailySold = 0;
            sales.forEach(sale => {
                if (isWithinInterval(parseISO(sale.date), { start: currentDate, end: dayEnd })) {
                    sale.items.forEach(item => dailySold += item.quantitySold);
                }
            });

            let dailyPurchased = 0;
            purchases.forEach(purchase => {
                 if (purchase.status === 'Received' && isWithinInterval(parseISO(purchase.date), { start: currentDate, end: dayEnd })) {
                    purchase.items.forEach(item => dailyPurchased += item.quantityPurchased);
                }
            });
            
            if (dailySold > 0 || dailyPurchased > 0) {
                hasMovement = true;
            }

            last7DaysData.push({
                date: formatDate(currentDate, "MMM d"),
                sold: dailySold,
                purchased: dailyPurchased,
            });
        }
        setStockMovementData({ data: last7DaysData, hasData: hasMovement });
        updateReportState("stock-movement", { isLoading: false, dataGenerated: true });
    }, 700);
  };

  const handleViewReport = (reportId: ReportId) => {
    const requiresDateRange = reportId === "sales-summary" || reportId === "purchase-summary";
    if (requiresDateRange && (!dateRange || !dateRange.from || !dateRange.to)) {
      toast({
        title: "Date Range Required",
        description: `Please select a valid date range to generate the ${reportId.replace('-', ' ')}.`,
        variant: "destructive",
      });
      return;
    }

    if (reportId === "sales-summary") {
      handleGenerateSalesSummary();
    } else if (reportId === "purchase-summary") {
      handleGeneratePurchaseSummary();
    } else if (reportId === "inventory-valuation") {
      handleGenerateInventoryValuation();
    } else if (reportId === "stock-movement") {
      handleGenerateStockMovement();
    } else if (reportId === "profit-loss") {
      updateReportState(reportId, { isLoading: false, dataGenerated: true, message: "Detailed Profit & Loss report coming soon..." });
    }
  };

  const handleDownloadReport = (reportId: string) => {
     toast({
        title: "Download Not Implemented",
        description: `Download functionality for ${reportId.replace('-', ' ')} is not yet available.`,
      });
  }

  const chartConfig = {
    purchased: { label: "Purchased Qty", color: "hsl(var(--chart-1))" }, // Reddish
    sold: { label: "Sold Qty", color: "hsl(var(--chart-2))" }, // Greenish
  } satisfies ReturnType<typeof useChart>["config"];


  const renderReportContent = (report: typeof initialReportTypes[0]) => {
    const state = reportDisplayStates[report.id];

    if (state.isLoading) {
        return <div className="flex justify-center items-center h-full"><svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>;
    }

    if (!state.dataGenerated) {
        const requiresDateRange = report.id === "sales-summary" || report.id === "purchase-summary";
        return (
            <div className="text-center">
                <report.icon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                    {requiresDateRange ? "Select a date range and click \"View Report\"." : "Click \"View Report\" to generate."}
                </p>
            </div>
        );
    }

    if (report.id === "sales-summary" && salesSummaryData) {
        if (salesSummaryData.numberOfTransactions === 0) {
            return <p className="text-muted-foreground">No sales data found for the selected period.</p>;
        }
        return (
            <div className="space-y-1 text-left w-full text-sm">
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
            <div className="space-y-1 text-left w-full text-sm">
                <p><strong>Total Purchases:</strong> ₹{purchaseSummaryData.totalPurchases.toFixed(2)}</p>
                <p><strong>Purchase Orders:</strong> {purchaseSummaryData.numberOfPurchaseOrders}</p>
                {purchaseSummaryData.mostFrequentPart ? (
                    <p><strong>Top Part Purchased:</strong> {purchaseSummaryData.mostFrequentPart.name} ({purchaseSummaryData.mostFrequentPart.partNumber}) - {purchaseSummaryData.mostFrequentPart.quantity} units</p>
                ) : (
                    <p>No parts purchased in this period.</p>
                )}
                {purchaseSummaryData.topSupplierByValue ? (
                    <p><strong>Top Supplier (by value):</strong> {purchaseSummaryData.topSupplierByValue.name} - Total: ₹{purchaseSummaryData.topSupplierByValue.totalValue.toFixed(2)}</p>
                ) : (
                    <p>No supplier spending in this period.</p>
                )}
            </div>
        );
    }
    
    if (report.id === "inventory-valuation" && inventoryValuationData) {
        return (
            <div className="space-y-1 text-left w-full text-sm">
                <p><strong>Total Inventory Value (MRP):</strong> ₹{inventoryValuationData.totalValue.toFixed(2)}</p>
                <p><strong>Unique Part Entries:</strong> {inventoryValuationData.numberOfUniqueParts}</p>
                <p><strong>Total Quantity of All Parts:</strong> {inventoryValuationData.totalQuantityOfParts} units</p>
            </div>
        );
    }
    
    if (report.id === "stock-movement" && stockMovementData) {
      if (!stockMovementData.hasData) {
        return <p className="text-muted-foreground">No stock movement data for the last 7 days.</p>;
      }
      return (
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockMovementData.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="purchased" fill="var(--color-purchased)" radius={4} name="Purchased" />
              <Bar dataKey="sold" fill="var(--color-sold)" radius={4} name="Sold" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      );
    }

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
                <p className="text-muted-foreground">Generate and view detailed business reports. Date range applies to Sales & Purchase Summaries.</p>
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
                        report.id === "profit-loss" ||
                        (report.id === "sales-summary" && !salesSummaryData) ||
                        (report.id === "purchase-summary" && !purchaseSummaryData) ||
                        (report.id === "inventory-valuation" && !inventoryValuationData) ||
                        (report.id === "stock-movement" && !stockMovementData)
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
                <div className="h-48 bg-muted/30 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 p-1 text-sm overflow-hidden" data-ai-hint={report.dataAiHint}>
                  {renderReportContent(report)}
                </div>
                <Button 
                  className="w-full mt-auto" 
                  onClick={() => handleViewReport(report.id)}
                  disabled={((report.id === "sales-summary" || report.id === "purchase-summary") && (!dateRange || !dateRange.from || !dateRange.to))}
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

// Helper for chart configuration - could be moved to a separate file if complex
// For now, keeping it here for simplicity of response.
function useChart() {
  return {
    config: {
      purchased: { label: "Purchased Qty", color: "hsl(var(--chart-1))" },
      sold: { label: "Sold Qty", color: "hsl(var(--chart-2))" },
    }
  }
}

    