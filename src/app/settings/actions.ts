
'use server';

import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const SETTINGS_FILE = 'settings.json';

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  lowStockAlertsEnabled: boolean;
  companyGstNumber?: string;
  companyPhoneNumbers?: [string, string]; // Tuple for two phone numbers
}

const defaultSettings: AppSettings = {
  companyName: 'AutoCentral Inc.',
  companyAddress: '123 Auto Drive, Carville, ST 12345',
  lowStockAlertsEnabled: true,
  companyGstNumber: '',
  companyPhoneNumbers: ['', ''], // Initialize with two empty strings
};

export async function getSettings(): Promise<AppSettings> {
  const settingsFromFile = await readData<Partial<AppSettings>>(SETTINGS_FILE, {});
  // Merge with defaults to ensure all fields are present, especially new ones
  return {
    ...defaultSettings,
    ...settingsFromFile,
    // Ensure companyPhoneNumbers is always an array of two strings if it exists
    companyPhoneNumbers: (
      settingsFromFile.companyPhoneNumbers && settingsFromFile.companyPhoneNumbers.length === 2
        ? settingsFromFile.companyPhoneNumbers
        : defaultSettings.companyPhoneNumbers
    ) as [string, string],
  };
}

export async function saveSettings(newSettings: AppSettings): Promise<{ success: boolean; message: string }> {
  try {
    // Ensure phone numbers array is always two strings
    const settingsToSave: AppSettings = {
      ...newSettings,
      companyPhoneNumbers: [
        newSettings.companyPhoneNumbers?.[0] || '',
        newSettings.companyPhoneNumbers?.[1] || ''
      ]
    };
    await writeData(SETTINGS_FILE, settingsToSave);
    revalidatePath('/settings');
    revalidatePath('/layout'); // To re-render AppLayout and Header which use company name
    revalidatePath('/sales'); // Invoice might use company details
    revalidatePath('/purchases'); // PO might use company details
    return { success: true, message: 'Settings saved successfully.' };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, message: 'Failed to save settings.' };
  }
}
