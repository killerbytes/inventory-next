"use client";

import AddCustomerModal from "@/components/modals/CustomerModal";
import CreateProductModal from "@/components/modals/ProductModal";
import SalesOrderModal from "@/components/modals/SalesOrderModal";
import AddSupplierModal from "@/components/modals/SupplierModal";
import { Button, buttonVariants } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/rbac";
import { getDashboardDataAction } from "@/server/actions/dashboard.actions";
import { useUIStore } from "@/stores/uiStore";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import PermissionGuard from "../common/PermissionGuard";
import DeadStock from "./dashboard/DeadStock";
import LastMonthProfitCard from "./dashboard/LastMonthProfitCard";
import LowStock from "./dashboard/LowStock";
import MostPopular from "./dashboard/MostPopular";
import OutstandingGoodReceiptsCard from "./dashboard/OutstandingGoodReceiptsCard";
import RecentInventoryMovements from "./dashboard/RecentInventoryMovements";
import RecentSalesOrders from "./dashboard/RecentSalesOrders";
import SalesOrderCard from "./dashboard/SalesOrderCard";
import StockAlertCard from "./dashboard/StockAlertCard";
import WeekSalesGraph from "./dashboard/WeekSalesGraph";

interface DashboardClientWidgetProps {
  initialData?: any;
}

export default function DashboardClientWidget({
  initialData,
}: DashboardClientWidgetProps) {
  const [data, setData] = useState<any>(initialData || null);
  const {
    setSalesOrderModalOpen,
    setProductModalOpen,
    setCustomerModalOpen,
    setSupplierModalOpen,
  } = useUIStore();

  useEffect(() => {
    if (!initialData) {
      getDashboardDataAction().then((res) => {
        if (res) setData(res);
      });
    }
  }, [initialData]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <SalesOrderCard data={data?.todaySales} />
        <OutstandingGoodReceiptsCard data={data?.outstandingGoodReceipts} />
        <StockAlertCard data={data?.stockAlerts} />
        <LastMonthProfitCard data={data?.lastMonthProfit} />
      </div>

      {/* 5 Quick Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
        <PermissionGuard permission={PERMISSIONS.MANAGE_SALES}>
          <Button
            className="shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
            onClick={() => setSalesOrderModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Sales Order
          </Button>
        </PermissionGuard>

        <PermissionGuard permission={PERMISSIONS.MANAGE_GOODS}>
          <Link
            href="/good-receipts/create"
            className={`${buttonVariants({
              variant: "default",
            })} shadow-xs bg-amber-600 hover:bg-amber-700 text-white gap-2 font-medium justify-center flex items-center`}
          >
            <Plus className="h-4 w-4" /> Good Receipt
          </Link>
        </PermissionGuard>

        <PermissionGuard permission={PERMISSIONS.MANAGE_PRODUCTS}>
          <Button
            className="shadow-xs bg-slate-600 hover:bg-slate-700 text-white gap-2 font-medium"
            onClick={() => setProductModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Product
          </Button>
        </PermissionGuard>

        <PermissionGuard permission={PERMISSIONS.MANAGE_CUSTOMERS}>
          <Button
            className="shadow-xs bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium"
            onClick={() => setCustomerModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Customer
          </Button>
        </PermissionGuard>

        <PermissionGuard permission={PERMISSIONS.MANAGE_SUPPLIERS}>
          <Button
            className="shadow-xs bg-cyan-600 hover:bg-cyan-700 text-white gap-2 font-medium"
            onClick={() => setSupplierModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Supplier
          </Button>
        </PermissionGuard>
      </div>

      {/* Recent Sales Orders */}
      <RecentSalesOrders orders={data?.recentOrders} />

      {/* Recent Inventory Movements */}
      <RecentInventoryMovements movements={data?.recentMovements} />

      {/* Dead Stock & Low Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <DeadStock items={data?.deadStock} />
        <LowStock items={data?.stockAlerts?.items} />
      </div>

      {/* Weekly Sales & Most Popular */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <WeekSalesGraph data={data?.weeklySales} />
        <MostPopular data={data?.mostPopular} />
      </div>

      {/* Modals connected via useUIStore */}
      <SalesOrderModal customers={data?.customers || []} />
      <CreateProductModal />
      <AddCustomerModal />
      <AddSupplierModal />
    </div>
  );
}
