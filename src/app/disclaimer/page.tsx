import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { disclaimerContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Disclaimer | DXB Deal Flow",
  description: "DXB Deal Flow Investment and Market Disclaimer.",
};

export default function DisclaimerPage() {
  return <LegalDocumentPage content={disclaimerContent} />;
}
