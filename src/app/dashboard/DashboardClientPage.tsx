"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, Users, ShoppingCart, ListChecks, CheckCircle2 } from 'lucide-react';
import type { Sale, Part } from '@/lib/types'; // Part is used by lowStockItems
import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import type { DashboardData } from './actions';

interface DashboardClientPageProps {
  initialDashboardData: DashboardData;
}

export function DashboardClientPage({ initialDashboardData }: DashboardClientPageProps) {
  const [data, setData] = useState<DashboardData>(initialDashboardData);

  useEffect(() => {
    setData(initialDashboardData);
  }, [initialDashboardData]);

  const summaryStats = [
    { title: "Total Revenue (Fiscal Year)", value: `₹${data.totalRevenue.toFixed(2)}`, icon: DollarSign, dataAiHint: "money chart", subtitle: `Since ${format(data.fiscalYearStartDate, "MMM d")}` },
    { title: "Parts in Stock", value: data.partsInStock.toLocaleString(), icon: Package, dataAiHint: "inventory boxes", subtitle: "Total units available" },
    { title: "Active Customers", value: data.activeCustomers.toLocaleString(), icon: Users, dataAiHint: "people community", subtitle: "Unique buyers from sales" },
    { title: "Sales Today", value: data.salesTodayCount.toLocaleString(), icon: ShoppingCart, dataAiHint: "shopping cart", subtitle: "Transactions recorded today" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
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
          <CardHeader><CardTitle>Recent Sales</CardTitle><CardDescription>Latest 7 transactions.</CardDescription></CardHeader>
          <CardContent>
            {data.recentSales.length > 0 ? (
              <ScrollArea className="h-72 custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>Sale ID</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.recentSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.id}</TableCell><TableCell>{sale.buyerName}</TableCell>
                        <TableCell className="text-right">₹{sale.netAmount.toFixed(2)}</TableCell>
                        <TableCell>{format(parseISO(sale.date), "PPp")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (<div className="flex items-center justify-center h-60 border-2 border-dashed border-border rounded-md bg-muted/30"><p className="text-muted-foreground flex items-center gap-2"><ListChecks className="h-5 w-5" /> No recent sales data.</p></div>)}
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Low Stock Items</CardTitle><CardDescription>Parts with quantity ≤ 1.</CardDescription></CardHeader>
          <CardContent>
            {data.lowStockItems.length > 0 ? (
              <ScrollArea className="h-72 custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>Part Name</TableHead><TableHead>Part No.</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.lowStockItems.map(part => (
                      <TableRow key={`${part.partNumber}-${part.mrp}`}>
                         <TableCell className="font-medium">{part.partName}</TableCell><TableCell>{part.partNumber}</TableCell>
                         <TableCell className="text-right text-destructive font-semibold">{part.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (<div className="flex items-center justify-center h-60 border-2 border-dashed border-border rounded-md bg-muted/30"><p className="text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> All items well stocked.</p></div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}