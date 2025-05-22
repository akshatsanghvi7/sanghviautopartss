
import { AppLayout } from '@/components/layout/AppLayout';
import { getSuppliersWithCalculatedBalances, getAllPurchasesForHistory } from './actions';
import { SuppliersClientPage } from './SuppliersClientPage';

const initialMockSuppliers = [ // Fallback if suppliers.json is empty
  { id: 'SUP001', name: 'AutoParts Pro', contactPerson: 'Sarah Connor', email: 'sales@autopartspro.com', phone: '555-0011', balance: 0 },
];

export default async function SuppliersPage() {
  const suppliersWithBalances = await getSuppliersWithCalculatedBalances();
  const allPurchases = await getAllPurchasesForHistory();

  return (
    <AppLayout>
      <SuppliersClientPage 
        initialSuppliers={suppliersWithBalances.length > 0 ? suppliersWithBalances : initialMockSuppliers}
        allPurchasesForHistory={allPurchases}
      />
    </AppLayout>
  );
}
