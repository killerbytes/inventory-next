"use client";

import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/rbac";
import { cn, getMappedSearchProductCombinations } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  Annoyed,
  BadgeDollarSign,
  BadgePercent,
  Banknote,
  BanknoteArrowUp,
  Barcode,
  BookUser,
  Boxes,
  ChartCandlestick,
  ClipboardList,
  Container,
  CreditCard,
  Diff,
  Gauge,
  Home,
  Moon,
  PackageOpen,
  Search,
  ShoppingCart,
  Sun,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback } from "react";
import { PermissionGuard } from "../common/PermissionGuard";
import ProductComboSearchCommand from "../common/ProductComboSearchCommand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "../ui/sidebar";
import UserDropdown from "./UserDropdown";

const navGroups = [
  {
    label: "APPLICATION",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      {
        title: "Good Receipt",
        href: "/good-receipts",
        icon: Truck,
        permission: PERMISSIONS.VIEW_GOODS,
      },
      {
        title: "Sales Orders",
        href: "/sales-orders",
        icon: BanknoteArrowUp,
        permission: PERMISSIONS.VIEW_SALES,
      },
      {
        title: "Invoices",
        href: "/invoices",
        icon: CreditCard,
        permission: PERMISSIONS.MANAGE_INVOICES,
      },
      { title: "Search", href: "/search", icon: Search },
      { title: "Barcode Scanner", href: "/scanner", icon: Barcode },
    ],
  },
  {
    label: "REPORTS & AUDIT",
    items: [
      {
        title: "Payments",
        href: "/payments",
        icon: Banknote,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Movements",
        href: "/reports/inventory-movements",
        icon: ClipboardList,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Stock Adjustments",
        href: "/reports/stock-adjustments",
        icon: Diff,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Break Packs",
        href: "/inventory/break-packs",
        icon: PackageOpen,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Price History",
        href: "/reports/price-history",
        icon: ChartCandlestick,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Reorder Levels",
        href: "/reports/reorder-levels",
        icon: Gauge,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Popular Products",
        href: "/reports/popular-products",
        icon: TrendingUp,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Profit Margin",
        href: "/reports/profit",
        icon: BadgeDollarSign,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
      {
        title: "Dead Stock (No Sales)",
        href: "/reports/no-sales",
        icon: Annoyed,
        permission: PERMISSIONS.VIEW_REPORTS,
      },
    ],
  },
  {
    label: "MANAGE & MASTER DATA",
    items: [
      {
        title: "Products",
        href: "/products",
        icon: ShoppingCart,
        permission: PERMISSIONS.VIEW_PRODUCTS,
      },
      {
        title: "Users",
        href: "/users",
        icon: Users,
        permission: PERMISSIONS.VIEW_USERS,
      },
      {
        title: "Price Upload",
        href: "/price-manager",
        icon: BadgePercent,
        permission: PERMISSIONS.MANAGE_PRODUCTS,
      },
      {
        title: "Categories",
        href: "/categories",
        icon: Boxes,
        permission: PERMISSIONS.MANAGE_CATEGORIES,
      },
      {
        title: "Customers",
        href: "/customers",
        icon: BookUser,
        permission: PERMISSIONS.MANAGE_CUSTOMERS,
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: Container,
        permission: PERMISSIONS.MANAGE_SUPPLIERS,
      },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [dark, setDark] = React.useState(false);
  const router = useRouter();

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || "H Concepcion Hardware";

  const onSearch = useCallback(async (search: string) => {
    return await getMappedSearchProductCombinations({ search });
  }, []);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="items-center text-center text-gray-400 leading-tight uppercase">
        <img src="/logo.png" className="mx-auto w-20" />
        <h1 className="text-white">{appTitle}</h1>
      </SidebarHeader>

      <SidebarContent className="scrollbar-none">
        <SidebarGroup>
          <ProductComboSearchCommand
            onSearch={onSearch}
            onSelect={(item) => {
              if (item?.productId) {
                router.push(`/products/${item.productId}`);
              }
            }}
            render={({ setOpen }) => (
              <Button
                onClick={() => setOpen(true)}
                className="w-full justify-start"
                variant="secondary"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search (Ctrl+J)</span>
              </Button>
            )}
          ></ProductComboSearchCommand>
        </SidebarGroup>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold tracking-widest text-sidebar-foreground/70 uppercase px-2">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));

                  const linkElement = (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-lg font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "hover:bg-accent hover:text-accent-foreground text-sidebar-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
                      <span>{item.title}</span>
                    </Link>
                  );

                  if (item.permission) {
                    return (
                      <PermissionGuard
                        key={item.title}
                        permission={item.permission}
                      >
                        {linkElement}
                      </PermissionGuard>
                    );
                  }

                  return linkElement;
                })}
              </div>
            </div>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <UserDropdown />
        <div className="text-center mt-auto py-2 border-t gap-2 flex flex-col text-xs">
          <div className="">&copy; {new Date().getFullYear()} My Hardware</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className="uppercase flex gap-2 justify-center">
            {/* {build?.env}
            <div>{formatDateTime(String(build?.buildTime ?? ""))}</div> */}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
