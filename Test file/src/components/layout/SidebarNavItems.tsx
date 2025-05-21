"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Boxes, LayoutDashboard, ShoppingCart, Truck, Settings, Users, FileText, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  external?: boolean;
  isActive?: (pathname: string, href: string) => boolean;
  subItems?: NavItem[];
}

const defaultIsActive = (pathname: string, href: string) => pathname.startsWith(href);

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    isActive: (pathname, href) => pathname === href || pathname === "/",
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: Boxes,
  },
  {
    href: "/sales",
    label: "Sales",
    icon: ShoppingCart,
  },
  {
    href: "/purchases",
    label: "Purchases",
    icon: Truck,
  },
  {
    href: "/customers",
    label: "Customers",
    icon: Users,
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    icon: Users, // Could use a different icon like Briefcase
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function SidebarNavItems() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild={false} // Ensure it's a button for styling if not an anchor directly
              className={cn(
                "w-full justify-start",
                (item.isActive || defaultIsActive)(pathname, item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              aria-current={ (item.isActive || defaultIsActive)(pathname, item.href) ? "page" : undefined}
              tooltip={{ children: item.label, side: "right", align: "center" }}
            >
              <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
