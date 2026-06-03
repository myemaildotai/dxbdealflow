import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { communityGuidelinesContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Community Guidelines | DXB Deal Flow",
  description: "DXB Deal Flow Community Guidelines.",
};

export default function CommunityGuidelinesPage() {
  return <LegalDocumentPage content={communityGuidelinesContent} />;
}
