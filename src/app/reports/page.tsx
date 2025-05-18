import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, CalendarDays, Download } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Assuming this component exists or will be created

// A simple DateRangePicker placeholder if not available from shadcn
const DatePickerWithRangePlaceholder = () => (
  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
    <CalendarDays className="mr-2 h-4 w-4" />
    <span>Pick a date range</span>
  </Button>
);


export default function ReportsPage() {

  const reportTypes = [
    { name: "Sales Summary", description: "Overview of sales performance.", icon: BarChart3, dataAiHint: "sales graph" },
    { name: "Inventory Valuation", description: "Current value of your stock.", icon: FileText, dataAiHint: "document list" },
    { name: "Profit & Loss", description: "Financial performance overview.", icon: BarChart3, dataAiHint: "financial chart" },
    { name: "Customer Activity", description: "Report on customer interactions.", icon: FileText, dataAiHint: "customer data" },
    { name: "Supplier Performance", description: "Track supplier efficiency.", icon: FileText, dataAiHint: "supplier report" },
    { name: "Stock Movement", description: "History of inventory changes.", icon: BarChart3, dataAiHint: "inventory flow" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
                <p className="text-muted-foreground">Generate and view detailed business reports.</p>
            </div>
            <div>
                {/* DatePickerWithRange needs to be implemented or use a placeholder */}
                <DatePickerWithRangePlaceholder />
            </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => (
            <Card key={report.name} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <report.icon className="h-8 w-8 text-primary mb-2" />
                   <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                      <Download className="h-5 w-5" />
                      <span className="sr-only">Download Report</span>
                   </Button>
                </div>
                <CardTitle className="text-xl">{report.name}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted/30 rounded-md flex items-center justify-center border-2 border-dashed border-border mb-4" data-ai-hint={report.dataAiHint}>
                    <p className="text-sm text-muted-foreground">Chart/Data Preview (Coming Soon)</p>
                </div>
                <Button className="w-full">View Report</Button>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}

// Placeholder for DatePickerWithRange if not yet implemented
// You would typically have this in components/ui/date-range-picker.tsx
// For now, keeping it simple.
// If you have @radix-ui/react-popover and react-day-picker installed, a basic one can be built.
// For this scaffold, we'll use the placeholder defined above.
