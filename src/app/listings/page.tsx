"use client";

import { Suspense } from "react";
import { BrowseListingsPage } from "@/components/browse-listings/BrowseListingsPage";
import { PublicHeader } from "@/components/PublicHeader";

export default function ListingsPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <Suspense fallback={<div className="min-h-[40vh] bg-[#f7f8fb]" />}>
        <BrowseListingsPage />
      </Suspense>
    </div>
  );
}
