import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { listingStandardsContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Listing Standards | DXB Deal Flow",
  description: "DXB Deal Flow Listing Standards and Moderation Policy.",
};

export default function ListingStandardsPage() {
  return <LegalDocumentPage content={listingStandardsContent} />;
}
