
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, Users, ShoppingCart, AlertTriangle, CheckCircle2, ListChecks } from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Sale, Part } from '@/lib/types';
import { useMemo } from 'react';
import { startOfDay, endOfDay, isWithinInterval, parseISO, format, getYear, setMonth, setDate, isBefore } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';

export default function DashboardPage() {
  const [sales] = useLocalStorage<Sale[]>('autocentral-sales', []);
  const [inventoryParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', []);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Fiscal year starts April 1st
    let fiscalYearStart = setDate(setMonth(now, 3), 1); // April is month 3 (0-indexed)
    if (isBefore(now, fiscalYearStart)) {
      fiscalYearStart = setDate(setMonth(now, 3), 1);
      fiscalYearStart.setFullYear(getYear(now) - 1);
    }
    fiscalYearStart = startOfDay(fiscalYearStart);

    const salesInFiscalYear = sales.filter(sale => {
      const saleDate = parseISO(sale.date);
      return isWithinInterval(saleDate, { start: fiscalYearStart, end: now });
    });
    const totalRevenue = salesInFiscalYear.reduce((acc, sale) => acc + sale.netAmount, 0);

    const partsInStock = inventoryParts.reduce((acc, part) => acc + part.quantity, 0);

    const activeCustomers = new Set(sales.map(sale => sale.buyerName.toLowerCase())).size;
    
    const salesTodayCount = sales.filter(sale => {
        const saleDate = parseISO(sale.date);
        return isWithinInterval(saleDate, { start: todayStart, end: todayEnd });
    }).length;

    const recentSales = [...sales]
        .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
        .slice(0, 7);

    const lowStockItems = inventoryParts.filter(part => part.quantity <= 1);

    return {
      totalRevenue,
      partsInStock,
      activeCustomers,
      salesTodayCount,
      recentSales,
      lowStockItems
    };
  }, [sales, inventoryParts]);

  const summaryStats = [
    { title: "Total Revenue (Fiscal Year)", value: `₹${dashboardData.totalRevenue.toFixed(2)}`, icon: DollarSign, dataAiHint: "money chart", subtitle: `Since ${format(startOfDay(setDate(setMonth(new Date(), 3), 1)), "MMM d")}` },
    { title: "Parts in Stock", value: dashboardData.partsInStock.toLocaleString(), icon: Package, dataAiHint: "inventory boxes", subtitle: "Total units available" },
    { title: "Active Customers", value: dashboardData.activeCustomers.toLocaleString(), icon: Users, dataAiHint: "people community", subtitle: "Unique buyers from sales" },
    { title: "Sales Today", value: dashboardData.salesTodayCount.toLocaleString(), icon: ShoppingCart, dataAiHint: "shopping cart", subtitle: "Transactions recorded today" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryStats.map((stat) => (
            <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                {stat.subtitle && <p className="text-xs text-muted-foreground">{stat.subtitle}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Latest 7 transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.recentSales.length > 0 ? (
                <ScrollArea className="h-72 custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sale ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.recentSales.map(sale => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.id}</TableCell>
                          <TableCell>{sale.buyerName}</TableCell>
                          <TableCell className="text-right">₹{sale.netAmount.toFixed(2)}</TableCell>
                          <TableCell>{format(parseISO(sale.date), "PPp")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-60 border-2 border-dashed border-border rounded-md bg-muted/30">
                  <p className="text-muted-foreground flex items-center gap-2"><ListChecks className="h-5 w-5" /> No recent sales data found.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Parts with quantity less than or equal to 1.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.lowStockItems.length > 0 ? (
                <ScrollArea className="h-72 custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Name</TableHead>
                        <TableHead>Part No.</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.lowStockItems.map(part => (
                        <TableRow key={`${part.partNumber}-${part.mrp}`}>
                           <TableCell className="font-medium">{part.partName}</TableCell>
                           <TableCell>{part.partNumber}</TableCell>
                           <TableCell className="text-right text-destructive font-semibold">{part.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-60 border-2 border-dashed border-border rounded-md bg-muted/30">
                  <p className="text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> All items well stocked.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
