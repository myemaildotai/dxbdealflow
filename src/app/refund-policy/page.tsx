import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { refundPolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Refund Policy | DXB Deal Flow",
  description: "DXB Deal Flow Refund and Subscription Policy.",
};

export default function RefundPolicyPage() {
  return <LegalDocumentPage content={refundPolicyContent} />;
}
