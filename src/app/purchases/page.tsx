
import { AppLayout } from '@/components/layout/AppLayout';
import { getPurchases, getInventoryParts, getSuppliers } from './actions';
import { PurchasesClientPage } from './PurchasesClientPage';
import type { Purchase, Part, Supplier } from '@/lib/types';

const initialMockPurchases: Purchase[] = []; // Keep for initial structure if file is empty
const initialMockParts: Part[] = [];
const initialMockSuppliers: Supplier[] = [];

export default async function PurchasesPage() {
  const purchases = await getPurchases();
  const inventoryParts = await getInventoryParts();
  const suppliers = await getSuppliers();

  return (
    <PurchasesClientPage 
      initialPurchases={purchases.length > 0 ? purchases : initialMockPurchases} 
      initialInventoryParts={inventoryParts.length > 0 ? inventoryParts : initialMockParts}
      initialSuppliers={suppliers.length > 0 ? suppliers : initialMockSuppliers}
    />
  );
}
