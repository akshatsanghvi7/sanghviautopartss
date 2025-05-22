
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from "@/components/ui/toaster";
import { getSettings } from '@/app/settings/actions'; // For root layout settings
import { getParts } from '@/app/inventory/actions'; // For initial parts for low stock alert
import { AppLayout } from '@/components/layout/AppLayout'; // Import AppLayout

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.companyName || 'AutoCentral',
    description: `Advanced Automotive Parts Management for ${settings.companyName || 'AutoCentral'}`,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  const settings = await getSettings();
  const initialInventoryParts = await getParts(); // Fetch parts for low stock alert

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {/* AppLayout is now directly part of RootLayout to pass server-fetched props */}
          <AppLayout 
            companyNameFromSettings={settings.companyName}
            lowStockAlertsEnabledFromSettings={settings.lowStockAlertsEnabled}
            initialInventoryPartsForAlert={initialInventoryParts}
          >
            {children}
          </AppLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
