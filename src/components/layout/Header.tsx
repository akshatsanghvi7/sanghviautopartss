
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/UserNav";
import AppLogo from "./AppLogo";
import Link from "next/link";
import useLocalStorage from "@/hooks/useLocalStorage"; // Added

export function Header() {
  const [companyName] = useLocalStorage<string>('autocentral-settings-companyName', 'AutoCentral'); // Added

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        {/* SidebarTrigger is now always visible and on the far left */}
        <SidebarTrigger className="mr-2 md:mr-4" />
        
        {/* Logo and App Name Section */}
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <AppLogo className="h-6 w-6 text-primary" /> {/* Ensure text-primary for consistent color */}
            <span className="hidden font-bold sm:inline-block text-foreground"> {/* Ensure text-foreground */}
              {companyName || 'AutoCentral'}
            </span>
          </Link>
        </div>

        {/* Spacer to push UserNav to the right */}
        <div className="flex-grow" /> 

        {/* User Navigation - always on the far right */}
        <div className="flex items-center">
          <nav className="flex items-center">
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
