import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit2, Trash2, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data for demonstration
const mockCustomers = [
  { id: 'C001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', balance: '$0.00' },
  { id: 'C002', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', balance: '$120.50' },
  { id: 'C003', name: 'Bob Johnson', email: 'bob.j@example.com', phone: '555-8765', balance: '$0.00' },
  { id: 'C004', name: 'Alice Brown', email: 'alice.b@example.com', phone: '555-4321', balance: '$45.20' },
];

export default function CustomersPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Management</h1>
            <p className="text-muted-foreground">Manage your customer database.</p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>Browse, search, and manage your customers.</CardDescription>
             <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or phone..." className="pl-10 w-full sm:w-1/2 lg:w-1/3" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell className="flex items-center gap-1"> <Mail className="h-3 w-3 text-muted-foreground"/> {customer.email}</TableCell>
                    <TableCell className="flex items-center gap-1"> <Phone className="h-3 w-3 text-muted-foreground"/>{customer.phone}</TableCell>
                    <TableCell className="text-right">{customer.balance}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {mockCustomers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    No customers found. Add new customers to get started.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
