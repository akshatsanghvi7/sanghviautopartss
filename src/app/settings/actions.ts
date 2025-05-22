
'use server';

import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const SETTINGS_FILE = 'settings.json';

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  lowStockAlertsEnabled: boolean;
}

const defaultSettings: AppSettings = {
  companyName: 'AutoCentral Inc.',
  companyAddress: '123 Auto Drive, Carville, ST 12345',
  lowStockAlertsEnabled: true,
};

export async function getSettings(): Promise<AppSettings> {
  return readData<AppSettings>(SETTINGS_FILE, defaultSettings);
}

export async function saveSettings(newSettings: AppSettings): Promise<{ success: boolean; message: string }> {
  try {
    await writeData(SETTINGS_FILE, newSettings);
    revalidatePath('/settings');
    // Revalidate other paths that might display company name or use settings
    revalidatePath('/dashboard'); 
    revalidatePath('/layout'); // To re-render AppLayout potentially
    return { success: true, message: 'Settings saved successfully.' };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, message: 'Failed to save settings.' };
  }
}
