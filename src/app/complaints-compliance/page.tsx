import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { complaintsComplianceContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Complaints & Compliance | DXB Deal Flow",
  description: "DXB Deal Flow Complaints and Compliance Policy.",
};

export default function ComplaintsCompliancePage() {
  return <LegalDocumentPage content={complaintsComplianceContent} />;
}
