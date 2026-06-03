import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { coBrokePolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Co-Broke Policy | DXB Deal Flow",
  description: "DXB Deal Flow Co-Broke and Commission Disclaimer.",
};

export default function CoBrokePolicyPage() {
  return <LegalDocumentPage content={coBrokePolicyContent} />;
}
