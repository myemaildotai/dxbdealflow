import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { privacyPolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy | DXB Deal Flow",
  description: "DXB Deal Flow Privacy Policy.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage content={privacyPolicyContent} />;
}
