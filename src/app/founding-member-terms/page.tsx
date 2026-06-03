import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { foundingMemberTermsContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Founding Member Terms | DXB Deal Flow",
  description: "DXB Deal Flow Founding Member Terms.",
};

export default function FoundingMemberTermsPage() {
  return <LegalDocumentPage content={foundingMemberTermsContent} />;
}
