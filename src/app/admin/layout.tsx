"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminWorkspace from "@/app/admin/_components/AdminWorkspace";
import { isAdminWorkspacePath } from "@/lib/admin-routes";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";

  return isAdminWorkspacePath(pathname) ? <AdminWorkspace /> : children;
}
