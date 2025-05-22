
import { AppLayout } from '@/components/layout/AppLayout';
import { getSales, getInventoryParts, getCustomers } from './actions';
import { SalesClientPage } from './SalesClientPage';
import type { Sale, Part, Customer } from '@/lib/types';
import { getSettings } from '@/app/settings/actions'; // Import getSettings

// Initial mock data if files are empty or not found
const initialMockSales: Sale[] = [
  { id: 'S001', date: new Date('2024-07-15T10:00:00Z').toISOString(), buyerName: 'John Doe', emailAddress: 'john.doe@example.com', contactDetails: '555-1234', items: [{ partNumber: 'P001', partName: 'Spark Plug X100', quantitySold: 2, unitPrice: 5.99, itemTotal: 11.98 }], subTotal: 11.98, netAmount: 11.98, paymentType: 'cash', gstNumber: 'GST123' },
  { id: 'S002', date: new Date('2024-07-14T11:30:00Z').toISOString(), buyerName: 'Jane Smith', emailAddress: 'jane.smith@example.com', contactDetails: '555-5678', items: [{ partNumber: 'P002', partName: 'Oil Filter Z20', quantitySold: 1, unitPrice: 12.50, itemTotal: 12.50 }], subTotal: 12.50, netAmount: 12.50, paymentType: 'credit', discount: 0 },
];

const initialMockParts: Part[] = [
  { partName: 'Spark Plug X100', partNumber: 'P001', quantity: 150, category: 'Engine', mrp: '₹5.99' },
  { partName: 'Oil Filter Z20', partNumber: 'P002', quantity: 80, category: 'Engine', mrp: '₹12.50' },
];

const initialMockCustomers: Customer[] = [
    { id: 'C001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', balance: 0 },
];


export default async function SalesPage() {
  const sales = await getSales();
  const inventoryParts = await getInventoryParts();
  const customers = await getCustomers(); // Customers are also needed for context/potential updates
  const settings = await getSettings(); // Fetch company settings

  const currentSales = sales.length > 0 ? sales : initialMockSales;
  const currentParts = inventoryParts.length > 0 ? inventoryParts : initialMockParts;
  // Customers might be empty initially, so no fallback needed if file is empty array
  
  return (
    <SalesClientPage 
      initialSales={currentSales} 
      initialInventoryParts={currentParts}
      initialCustomers={customers} // Pass all customers for context
      companySettings={settings} // Pass company settings
    />
  );
}

