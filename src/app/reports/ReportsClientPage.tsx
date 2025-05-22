
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ShoppingCart, PackageSearch, TrendingUp, LineChart } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import React, { useState, startTransition } from 'react';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { addDays, format as formatDate } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { 
  generateSalesSummaryReport, generatePurchaseSummaryReport, generateInventoryValuationReport, generateStockMovementReport,
  type SalesSummaryData, type PurchaseSummaryData, type InventoryValuationData, type StockMovementData 
} from './actions';

type ReportId = "sales-summary" | "purchase-summary" | "inventory-valuation" | "profit-loss" | "stock-movement";
interface ReportCardDisplayState { isLoading: boolean; dataGenerated: boolean; message?: string; }

const initialReportTypes = [
    { id: "sales-summary" as ReportId, name: "Sales Summary", description: "Sales performance within selected date range.", icon: BarChart3, dataAiHint: "sales graph" },
    { id: "purchase-summary" as ReportId, name: "Purchase Summary", description: "Purchase activities within selected date range.", icon: ShoppingCart, dataAiHint: "purchase graph" },
    { id: "inventory-valuation" as ReportId, name: "Inventory Valuation", description: "Calculates total current value of on-hand stock.", icon: PackageSearch, dataAiHint: "inventory value document" },
    { id: "stock-movement" as ReportId, name: "Stock Movement", description: "Visualizes parts purchased vs. sold over the last 7 days.", icon: LineChart, dataAiHint: "stock activity chart" },
    { id: "profit-loss" as ReportId, name: "Profit & Loss", description: "Financial performance overview. (Coming Soon)", icon: TrendingUp, dataAiHint: "financial chart" },
];

export function ReportsClientPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const { toast } = useToast();

  const [salesSummaryData, setSalesSummaryData] = useState<SalesSummaryData | null>(null);
  const [purchaseSummaryData, setPurchaseSummaryData] = useState<PurchaseSummaryData | null>(null);
  const [inventoryValuationData, setInventoryValuationData] = useState<InventoryValuationData | null>(null);
  const [stockMovementData, setStockMovementData] = useState<StockMovementData | null>(null);
  
  const initialDisplayStates: Record<ReportId, ReportCardDisplayState> = {
    "sales-summary": { isLoading: false, dataGenerated: false }, "purchase-summary": { isLoading: false, dataGenerated: false },
    "inventory-valuation": { isLoading: false, dataGenerated: false }, "stock-movement": { isLoading: false, dataGenerated: false },
    "profit-loss": { isLoading: false, dataGenerated: false, message: "Detailed report coming soon..." },
  };
  const [reportDisplayStates, setReportDisplayStates] = useState<Record<ReportId, ReportCardDisplayState>>(initialDisplayStates);

  const updateReportState = (id: ReportId, updates: Partial<ReportCardDisplayState>) => setReportDisplayStates(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));

  const handleViewReport = (reportId: ReportId) => {
    const requiresDateRange = reportId === "sales-summary" || reportId === "purchase-summary";
    if (requiresDateRange && (!dateRange || !dateRange.from || !dateRange.to)) {
      toast({ title: "Date Range Required", variant: "destructive" }); return;
    }
    updateReportState(reportId, { isLoading: true, dataGenerated: false, message: undefined });

    startTransition(async () => {
      try {
        if (reportId === "sales-summary") {
          const result = await generateSalesSummaryReport(dateRange!);
          if ('message' in result && result.message !== "No sales data found for the selected period.") { // Allow empty data message
             setSalesSummaryData(null); updateReportState(reportId, { isLoading: false, dataGenerated: true, message: result.message });
          } else if ('totalSales' in result) {
            setSalesSummaryData(result); updateReportState(reportId, { isLoading: false, dataGenerated: true, message: result.totalSales === 0 && result.numberOfTransactions === 0 ? "No sales data for the selected period." : undefined });
          }
        } else if (reportId === "purchase-summary") {
          const result = await generatePurchaseSummaryReport(dateRange!);
           if ('message' in result && result.message !== "No purchase data found for the selected period.") {
             setPurchaseSummaryData(null); updateReportState(reportId, { isLoading: false, dataGenerated: true, message: result.message });
          } else if ('totalPurchases' in result) {
            setPurchaseSummaryData(result); updateReportState(reportId, { isLoading: false, dataGenerated: true, message: result.totalPurchases === 0 && result.numberOfPurchaseOrders === 0 ? "No purchase data for the selected period." : undefined });
          }
        } else if (reportId === "inventory-valuation") {
          const result = await generateInventoryValuationReport();
          setInventoryValuationData(result); updateReportState(reportId, { isLoading: false, dataGenerated: true });
        } else if (reportId === "stock-movement") {
          const result = await generateStockMovementReport();
          setStockMovementData(result); updateReportState(reportId, { isLoading: false, dataGenerated: true, message: !result.hasData ? "No stock movement data for the last 7 days." : undefined });
        } else if (reportId === "profit-loss") {
          updateReportState(reportId, { isLoading: false, dataGenerated: true, message: "Detailed Profit & Loss report coming soon..." });
        }
      } catch (error) {
        console.error("Error generating report:", error);
        updateReportState(reportId, { isLoading: false, dataGenerated: false, message: "Error generating report." });
        toast({ title: "Report Error", description: "Could not generate report.", variant: "destructive" });
      }
    });
  };

  // Chart config (can be memoized if needed)
  const chartConfig = { purchased: { label: "Purchased", color: "hsl(var(--chart-1))" }, sold: { label: "Sold", color: "hsl(var(--chart-2))" } };

  const renderReportContent = (report: typeof initialReportTypes[0]) => {
    const state = reportDisplayStates[report.id];
    if (state.isLoading) return <div className="flex justify-center items-center h-full"><svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"></path></svg></div>;
    if (state.message) return <p className="text-muted-foreground p-2 text-center">{state.message}</p>;
    if (!state.dataGenerated) {
      const reqDate = report.id === "sales-summary" || report.id === "purchase-summary";
      return (<div className="text-center p-2"><report.icon className="mx-auto h-8 w-8 text-muted-foreground mb-2" /><p className="text-muted-foreground">{reqDate ? "Select date range & click View." : "Click View Report."}</p></div>);
    }

    if (report.id === "sales-summary" && salesSummaryData) {
      return (<div className="space-y-1 text-left w-full text-sm p-2">
        <p><strong>Total Sales:</strong> ₹{salesSummaryData.totalSales.toFixed(2)}</p> <p><strong>Cash Sales:</strong> ₹{salesSummaryData.cashSales.toFixed(2)}</p> <p><strong>Credit Sales:</strong> ₹{salesSummaryData.creditSales.toFixed(2)}</p> <p><strong>Transactions:</strong> {salesSummaryData.numberOfTransactions}</p>
        {salesSummaryData.highestSellingProduct ? <p><strong>Top Seller:</strong> {salesSummaryData.highestSellingProduct.name} ({salesSummaryData.highestSellingProduct.partNumber}) - {salesSummaryData.highestSellingProduct.quantity} units</p> : <p>No products sold.</p>}
      </div>);
    }
    if (report.id === "purchase-summary" && purchaseSummaryData) {
      return (<div className="space-y-1 text-left w-full text-sm p-2">
        <p><strong>Total Purchases:</strong> ₹{purchaseSummaryData.totalPurchases.toFixed(2)}</p> <p><strong>Purchase Orders:</strong> {purchaseSummaryData.numberOfPurchaseOrders}</p>
        {purchaseSummaryData.mostFrequentPart ? <p><strong>Top Part Purchased:</strong> {purchaseSummaryData.mostFrequentPart.name} ({purchaseSummaryData.mostFrequentPart.partNumber}) - {purchaseSummaryData.mostFrequentPart.quantity} units</p> : <p>No parts purchased.</p>}
        {purchaseSummaryData.topSupplierByValue ? <p><strong>Top Supplier (value):</strong> {purchaseSummaryData.topSupplierByValue.name} - Total: ₹{purchaseSummaryData.topSupplierByValue.totalValue.toFixed(2)}</p> : <p>No supplier spending.</p>}
      </div>);
    }
    if (report.id === "inventory-valuation" && inventoryValuationData) {
      return (<div className="space-y-1 text-left w-full text-sm p-2">
        <p><strong>Total Inventory Value (MRP):</strong> ₹{inventoryValuationData.totalValue.toFixed(2)}</p> <p><strong>Unique Part Entries:</strong> {inventoryValuationData.numberOfUniqueParts}</p> <p><strong>Total Quantity of All Parts:</strong> {inventoryValuationData.totalQuantityOfParts} units</p>
      </div>);
    }
    if (report.id === "stock-movement" && stockMovementData?.data) {
      return (
        <ChartContainer config={chartConfig} className="h-full w-full p-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockMovementData.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} /><YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
              <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="purchased" fill="var(--color-purchased)" radius={4} name="Purchased" /><Bar dataKey="sold" fill="var(--color-sold)" radius={4} name="Sold" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      );
    }
    return <p className="text-muted-foreground p-2">Click "View Report" to generate.</p>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1><p className="text-muted-foreground">Generate business reports. Date range for Sales & Purchase Summaries.</p></div>
          <div><DatePickerWithRange date={dateRange} onDateChange={setDateRange} /></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {initialReportTypes.map((report) => (
          <Card key={report.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between"><report.icon className="h-8 w-8 text-primary mb-2" /></div>
              <CardTitle className="text-xl">{report.name}</CardTitle><CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              <div className="h-48 bg-muted/30 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 text-sm overflow-hidden" data-ai-hint={report.dataAiHint}>
                {renderReportContent(report)}
              </div>
              <Button className="w-full mt-auto" onClick={() => handleViewReport(report.id)} disabled={((report.id === "sales-summary" || report.id === "purchase-summary") && (!dateRange || !dateRange.from || !dateRange.to)) || reportDisplayStates[report.id].isLoading}>
                {reportDisplayStates[report.id].isLoading ? "Generating..." : "View Report"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
