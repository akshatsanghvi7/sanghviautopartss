
import { AppLayout } from '@/components/layout/AppLayout';
import { getCustomersWithCalculatedBalances } from './actions';
import { CustomersClientPage } from './CustomersClientPage';
import type { Sale } from '@/lib/types'; // Sale type for passing to client if needed for history
import { readData } from '@/lib/file-data-utils'; // To get sales for history dialog

const initialMockCustomers = [ // Only used if customers.json is truly empty for the very first load
  { id: 'C001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', balance: 0 },
  { id: 'C002', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', balance: 0 },
];

export default async function CustomersPage() {
  const customersWithBalances = await getCustomersWithCalculatedBalances();
  const allSales = await readData<Sale[]>('sales.json', []); // Pass all sales for history dialog

  return (
    <CustomersClientPage 
      initialCustomers={customersWithBalances.length > 0 ? customersWithBalances : initialMockCustomers} 
      allSalesForHistory={allSales}
    />
  );
}
