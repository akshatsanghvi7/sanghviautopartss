
import { AppLayout } from '@/components/layout/AppLayout';
import { getSettings, type AppSettings } from './actions';
import { SettingsClientPage } from './SettingsClientPage';

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <SettingsClientPage initialSettings={settings} />
  );
}
