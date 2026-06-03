import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { verificationPolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Verification Policy | DXB Deal Flow",
  description: "DXB Deal Flow Verification Policy.",
};

export default function VerificationPolicyPage() {
  return <LegalDocumentPage content={verificationPolicyContent} />;
}
