
import { AppLayout } from '@/components/layout/AppLayout';
import { ReportsClientPage } from './ReportsClientPage';
// No initial data fetching needed at this level for reports page itself, client page will call actions.

export default function ReportsPage() {
  // Data for reports will be fetched on client by calling server actions
  return (
    <AppLayout>
      <ReportsClientPage />
    </AppLayout>
  );
}
