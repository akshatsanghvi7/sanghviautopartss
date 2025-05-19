
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, Users, ShoppingCart } from 'lucide-react';

export default function DashboardPage() {
  // Placeholder data - in a real app, this would come from state or API
  const summaryStats = [
    { title: "Total Revenue", value: "₹125,670", icon: DollarSign, change: "+12.5%", changeType: "positive" as const, dataAiHint: "money chart" },
    { title: "Parts in Stock", value: "1,890", icon: Package, change: "-2.1%", changeType: "negative" as const, dataAiHint: "inventory boxes" },
    { title: "Active Customers", value: "342", icon: Users, change: "+5", changeType: "positive" as const, dataAiHint: "people community" },
    { title: "Sales Today", value: "28", icon: ShoppingCart, change: "+8.0%", changeType: "positive" as const, dataAiHint: "shopping cart" },
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
                <p className={`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'} dark:text-opacity-80`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Overview of the latest transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for recent sales chart or list */}
              <div className="flex items-center justify-center h-60 border-2 border-dashed border-border rounded-md bg-muted/30">
                <p className="text-muted-foreground">Recent Sales Data (Coming Soon)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Parts that need reordering soon.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for low stock items list */}
               <div className="flex items-center justify-center h-60 border-2 border-dashed border-border rounded-md bg-muted/30">
                <p className="text-muted-foreground">Low Stock Items (Coming Soon)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
