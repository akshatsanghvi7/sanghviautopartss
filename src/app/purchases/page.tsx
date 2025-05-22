import { AppLayout } from '@/components/layout/AppLayout';
import { getPurchases, getInventoryParts, getSuppliers } from './actions';
import { PurchasesClientPage } from './PurchasesClientPage';
import type { Purchase, Part, Supplier } from '@/lib/types';
import { getSettings } from '@/app/settings/actions'; // Import getSettings

const initialMockPurchases: Purchase[] = []; 
const initialMockParts: Part[] = [];
const initialMockSuppliers: Supplier[] = [];

export default async function PurchasesPage() {
  const purchases = await getPurchases();
  const inventoryParts = await getInventoryParts();
  const suppliers = await getSuppliers();
  const settings = await getSettings(); // Fetch company settings

  return (
    <PurchasesClientPage 
      initialPurchases={purchases.length > 0 ? purchases : initialMockPurchases} 
      initialInventoryParts={inventoryParts.length > 0 ? inventoryParts : initialMockParts}
      initialSuppliers={suppliers.length > 0 ? suppliers : initialMockSuppliers}
      companySettings={settings} // Pass company settings
    />
  );
}
