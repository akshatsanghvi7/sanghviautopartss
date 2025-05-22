
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/UserNav";
import AppLogo from "./AppLogo";
import Link from "next/link";
import { useState, useEffect } from "react";

interface HeaderProps {
  companyNameFromSettings?: string; // Make it optional for cases where it might not be passed
}

export function Header({ companyNameFromSettings }: HeaderProps) {
  const [effectiveCompanyName, setEffectiveCompanyName] = useState(companyNameFromSettings || "AutoCentral");
  
  useEffect(() => {
    setEffectiveCompanyName(companyNameFromSettings || "AutoCentral");
  }, [companyNameFromSettings]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        <SidebarTrigger className="mr-2 md:mr-4" />
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <AppLogo className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block text-foreground">{effectiveCompanyName}</span>
          </Link>
        </div>
        <div className="flex-grow" /> 
        <div className="flex items-center"><nav className="flex items-center"><UserNav /></nav></div>
      </div>
    </header>
  );
}
