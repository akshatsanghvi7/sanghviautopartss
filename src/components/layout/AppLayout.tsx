
"use client"; // AppLayout itself remains client for auth and session-based toast logic

import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { Header } from '@/components/layout/Header'; // Header will fetch its own companyName
import { SidebarNavItems } from '@/components/layout/SidebarNavItems';
import AppLogo from './AppLogo';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Part } from '@/lib/types';
// For AppLayout specific needs (low stock alert), we'll fetch settings and parts via a client-side call to a server action or API route if needed,
// or rely on data passed down if settings were fetched at a higher level server component.
// For now, to keep it simpler for the low-stock alert without a dedicated API route:
// We'll assume settings/parts are not directly available here for the low stock check without a prop or new fetch.
// Let's make a client-side function to fetch necessary data for the alert.

// Temporary client-side action to fetch minimal data for alerts.
// In a real app, this might be an API route or passed down differently.
async function getLowStockAlertDataClient(): Promise<{ lowStockAlertsEnabled: boolean; inventoryPartsCount: number; lowStockItemsCount: number }> {
  try {
    // This is a conceptual fetch; direct fs access isn't possible in client components.
    // This would normally call a Server Action or an API route.
    // For this simulation, we can't directly call readData here.
    // We'll simulate the outcome based on the assumption that settings are enabled and some parts are low.
    // This part needs to be re-evaluated if direct server action call from client useEffect is desired.
    // For this iteration, I will adjust the logic to *not* directly perform file reads here.
    // The AppLayout is a client component due to auth. We'd need to call a Server Action.

    // Fetching via a dedicated Server Action:
    const response = await fetch('/api/app-status'); // Conceptual API endpoint
    if (!response.ok) throw new Error('Failed to fetch app status');
    const data = await response.json();
    return data;

  } catch (error) {
    console.warn("Could not fetch low stock alert data for AppLayout:", error);
    // Default to alerts enabled, but no low stock items to avoid false positives if fetch fails
    return { lowStockAlertsEnabled: true, inventoryPartsCount: 0, lowStockItemsCount: 0 };
  }
}


export function AppLayout({ children, companyNameFromSettings, lowStockAlertsEnabledFromSettings, initialInventoryPartsForAlert } : { 
    children: ReactNode, 
    companyNameFromSettings: string,
    lowStockAlertsEnabledFromSettings: boolean,
    initialInventoryPartsForAlert: Part[]
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [effectiveCompanyName, setEffectiveCompanyName] = useState(companyNameFromSettings || "AutoCentral");
  const [lowStockNotificationShownThisSession, setLowStockNotificationShownThisSession] = useState(false);

  useEffect(() => {
    setEffectiveCompanyName(companyNameFromSettings || "AutoCentral");
  }, [companyNameFromSettings]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!isLoading && user && lowStockAlertsEnabledFromSettings && !lowStockNotificationShownThisSession) {
      const lowStockItems = initialInventoryPartsForAlert.filter(part => part.quantity <= 1);
      if (lowStockItems.length > 0) {
        toast({
          title: "Low Stock Alert",
          description: `${lowStockItems.length} item(s) are currently low on stock. Check inventory.`,
          duration: 5000, 
        });
        setLowStockNotificationShownThisSession(true);
      }
    }
    if (isLoading && !user) {
        setLowStockNotificationShownThisSession(false);
    }
  }, [user, isLoading, lowStockAlertsEnabledFromSettings, initialInventoryPartsForAlert, toast, lowStockNotificationShownThisSession]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarRail />
        <SidebarHeader className="p-4">
           <Link href="/dashboard" className="flex items-center gap-2">
            <AppLogo className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">{effectiveCompanyName}</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2"><SidebarNavItems /></SidebarContent>
        <SidebarFooter className="p-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">© {new Date().getFullYear()} {effectiveCompanyName || 'AutoCentral Inc.'}</SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Header companyNameFromSettings={effectiveCompanyName} /> {/* Pass company name to Header */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
