import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { acceptableUsePolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | DXB Deal Flow",
  description: "DXB Deal Flow Acceptable Use Policy.",
};

export default function AcceptableUsePolicyPage() {
  return <LegalDocumentPage content={acceptableUsePolicyContent} />;
}
