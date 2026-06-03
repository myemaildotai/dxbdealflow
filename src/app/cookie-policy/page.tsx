import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { cookiePolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Cookie Policy | DXB Deal Flow",
  description: "DXB Deal Flow Cookie Policy.",
};

export default function CookiePolicyPage() {
  return <LegalDocumentPage content={cookiePolicyContent} />;
}
