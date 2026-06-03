import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { termsOfUseContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Use | DXB Deal Flow",
  description: "DXB Deal Flow Terms of Use and Platform Terms.",
};

export default function TermsOfUsePage() {
  return <LegalDocumentPage content={termsOfUseContent} />;
}
