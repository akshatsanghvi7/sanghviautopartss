
import { AppLayout } from '@/components/layout/AppLayout';
import { getDashboardData, type DashboardData } from './actions';
import { DashboardClientPage } from './DashboardClientPage';

export default async function DashboardPage() {
  const dashboardData = await getDashboardData();
  
  return (
    <DashboardClientPage initialDashboardData={dashboardData} />
  );
}
