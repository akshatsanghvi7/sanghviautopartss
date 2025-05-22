
import { AppLayout } from '@/components/layout/AppLayout';
import { getParts } from './actions';
import { InventoryClientPage } from './InventoryClientPage';
import type { Part } from '@/lib/types';

// Initial mock data if files are empty or not found
const initialMockParts: Part[] = [
  { partName: 'Spark Plug X100', otherName: 'Ignition Plug', partNumber: 'P001', company: 'Bosch', quantity: 150, category: 'Engine', mrp: '₹5.99', shelf: 'A1-01' },
  { partName: 'Oil Filter Z20', partNumber: 'P002', company: 'Mann-Filter', quantity: 80, category: 'Engine', mrp: '₹12.50', shelf: 'A1-02' },
  { partName: 'Brake Pad Set F5', otherName: 'Front Brakes', partNumber: 'P003', company: 'Brembo', quantity: 120, category: 'Brakes', mrp: '₹45.00', shelf: 'B2-05' },
  { partName: 'Headlight Bulb H4', partNumber: 'P004', company: 'Philips', quantity: 200, category: 'Lighting', mrp: '₹8.75', shelf: 'C3-10' },
  { partName: 'Air Filter A300', otherName: 'Engine Air Cleaner', partNumber: 'P005', company: 'K&N', quantity: 95, category: 'Filtration', mrp: '₹18.20', shelf: 'A1-03' },
  { partName: 'Spark Plug X100', otherName: 'Ignition Plug Alt', partNumber: 'P001', company: 'Bosch', quantity: 50, category: 'Engine', mrp: '₹6.50', shelf: 'A1-04' },
];

export default async function InventoryPage() {
  // Fetch parts from file via Server Action helper, fall back to mock data if file is empty/new
  const parts = await getParts();
  const currentParts = parts.length > 0 ? parts : initialMockParts;


  return (
    <AppLayout>
      <InventoryClientPage initialParts={currentParts} />
    </AppLayout>
  );
}
