import * as React from "react";
import { SidebarTrigger } from "../ui/sidebar";

export default function PageHeader({
  title,
  description,
  children,
}: {
  className?: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="bg-border h-5 w-px"></div>
        <div>
          <div className="text-lg font-bold">{title}</div>
          <div className="text-sm">{description}</div>
        </div>
      </div>
      <div className="gap-2 flex ml-auto">{children}</div>
    </div>
  );
}
