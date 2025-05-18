"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/UserNav";
import AppLogo from "./AppLogo";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <AppLogo className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              AutoCentral
            </span>
          </Link>
        </div>

        {/* Mobile nav trigger, part of shadcn/ui/sidebar */}
        <SidebarTrigger className="md:hidden" />
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* You can add a global search bar here if needed */}
          {/* <div className="w-full flex-1 md:w-auto md:flex-none">
             <Input type="search" placeholder="Search..." className="md:w-28 lg:w-64" />
          </div> */}
          <nav className="flex items-center">
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
