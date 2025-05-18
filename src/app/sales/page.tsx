import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, FileText, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data for demonstration
const mockSales = [
  { id: 'S001', date: '2024-07-15', customer: 'John Doe', total: '$150.75', status: 'Paid' },
  { id: 'S002', date: '2024-07-14', customer: 'Jane Smith', total: '$88.00', status: 'Pending' },
  { id: 'S003', date: '2024-07-14', customer: 'Bob Johnson', total: '$230.50', status: 'Paid' },
  { id: 'S004', date: '2024-07-13', customer: 'Alice Brown', total: '$45.20', status: 'Paid (Credit)' },
  { id: 'S005', date: '2024-07-12', customer: 'Mike Davis', total: '$199.99', status: 'Overdue' },
];


export default function SalesPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Management</h1>
            <p className="text-muted-foreground">Track and manage your sales transactions.</p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> New Sale
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Sales History</CardTitle>
            <CardDescription>Review all recorded sales transactions.</CardDescription>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by sale ID or customer..." className="pl-10 w-full" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>Paid</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Pending</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Overdue</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>{sale.date}</TableCell>
                    <TableCell>{sale.customer}</TableCell>
                    <TableCell className="text-right">{sale.total}</TableCell>
                    <TableCell>
                       <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        sale.status.startsWith('Paid') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        sale.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {sale.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary">
                        <FileText className="h-4 w-4" />
                         <span className="sr-only">View Bill</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {mockSales.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    No sales recorded yet. Create a new sale to get started.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
