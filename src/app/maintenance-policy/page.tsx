import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { maintenancePolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Maintenance Policy | DXB Deal Flow",
  description: "DXB Deal Flow Maintenance and Platform Availability Policy.",
};

export default function MaintenancePolicyPage() {
  return <LegalDocumentPage content={maintenancePolicyContent} />;
}
