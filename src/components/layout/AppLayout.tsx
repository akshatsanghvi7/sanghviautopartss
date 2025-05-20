
"use client";

import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Header } from '@/components/layout/Header';
import { SidebarNavItems } from '@/components/layout/SidebarNavItems';
import AppLogo from './AppLogo';
import Link from 'next/link';
import useLocalStorage from '@/hooks/useLocalStorage'; // Added
import { useToast } from '@/hooks/use-toast'; // Added
import type { Part } from '@/lib/types'; // Added

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast(); // Added

  const [companyName] = useLocalStorage<string>('autocentral-settings-companyName', 'AutoCentral'); // Added
  const [lowStockAlertsEnabled] = useLocalStorage<boolean>('autocentral-settings-lowStockAlerts', true); // Added
  const [inventoryParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', []); // Added
  const [lowStockNotificationShownThisSession, setLowStockNotificationShownThisSession] = useState(false); // Added


  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!isLoading && user && lowStockAlertsEnabled && !lowStockNotificationShownThisSession) {
      const lowStockItems = inventoryParts.filter(part => part.quantity <= 1);
      if (lowStockItems.length > 0) {
        toast({
          title: "Low Stock Alert",
          description: `${lowStockItems.length} item(s) are currently low on stock. Please check your inventory or dashboard.`,
          duration: 5000, 
        });
        setLowStockNotificationShownThisSession(true);
      }
    }
    // Reset notification flag if user logs out (isLoading becomes true, then user becomes null)
    if (isLoading && !user) {
        setLowStockNotificationShownThisSession(false);
    }

  }, [user, isLoading, lowStockAlertsEnabled, inventoryParts, toast, lowStockNotificationShownThisSession, setLowStockNotificationShownThisSession]);


  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
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
            <span className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">
              {companyName || 'AutoCentral'}
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarNavItems />
        </SidebarContent>
        <SidebarFooter className="p-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          © {new Date().getFullYear()} {companyName || 'AutoCentral Inc.'}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
