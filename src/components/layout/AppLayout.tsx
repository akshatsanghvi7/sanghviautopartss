
"use client"; // AppLayout itself remains client for auth and session-based toast logic

import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { Header } from '@/components/layout/Header';
import { SidebarNavItems } from '@/components/layout/SidebarNavItems';
import AppLogo from './AppLogo';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Part } from '@/lib/types';

export function AppLayout({ children, companyNameFromSettings, lowStockAlertsEnabledFromSettings, initialInventoryPartsForAlert } : {
    children: ReactNode,
    companyNameFromSettings: string,
    lowStockAlertsEnabledFromSettings: boolean,
    initialInventoryPartsForAlert: Part[]
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const { toast } = useToast();

  const [effectiveCompanyName, setEffectiveCompanyName] = useState(companyNameFromSettings || "AutoCentral");
  const [lowStockNotificationShownThisSession, setLowStockNotificationShownThisSession] = useState(false);

  useEffect(() => {
    setEffectiveCompanyName(companyNameFromSettings || "AutoCentral");
  }, [companyNameFromSettings]);

  useEffect(() => {
    // If we are on a page other than login, and not loading, and no user, redirect to login.
    if (pathname !== '/login' && !isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router, pathname]); // Added pathname to dependencies

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

  // If the current page is the login page, just render the children (LoginPage content).
  // AuthProvider still wraps everything, so LoginPage gets the auth context.
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If still loading auth state OR if there's no user (and we're not on /login page),
  // show a global loading spinner for the app shell.
  // The useEffect above will handle redirecting to /login if !user.
  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
    );
  }

  // If authenticated and not on login page, render the full AppLayout with Sidebar, Header etc.
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
        <SidebarFooter className="p-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          Developed by Akshat Sanghvi
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Header companyNameFromSettings={effectiveCompanyName} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
