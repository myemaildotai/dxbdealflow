"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminBrokerDetailWorkspace from "@/app/admin/brokers/[userId]/_components/AdminBrokerDetailWorkspace";
import { isAdminBrokerWorkspacePath } from "@/lib/admin-routes";

export default function AdminBrokerDetailLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";

  return isAdminBrokerWorkspacePath(pathname) ? <AdminBrokerDetailWorkspace /> : children;
}
