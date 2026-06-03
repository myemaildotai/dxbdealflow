import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { contentIntellectualPropertyPolicyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Content & Intellectual Property Policy | DXB Deal Flow",
  description: "DXB Deal Flow Content and Intellectual Property Policy.",
};

export default function ContentIntellectualPropertyPolicyPage() {
  return <LegalDocumentPage content={contentIntellectualPropertyPolicyContent} />;
}
