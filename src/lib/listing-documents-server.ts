import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LISTING_DOCUMENT_BUCKET,
  type UploadedListingDocumentMetadata,
} from "@/lib/document-upload";

export async function saveUploadedListingDocuments(
  supabase: SupabaseClient,
  listingId: string,
  documents: UploadedListingDocumentMetadata[]
) {
  if (!documents.length) {
    return;
  }

  const rows = documents.map((document) => {
    const { data: publicUrl } = supabase.storage
      .from(LISTING_DOCUMENT_BUCKET)
      .getPublicUrl(document.storage_path);

    return {
      listing_id: listingId,
      file_name: document.file_name,
      storage_path: document.storage_path,
      public_url: publicUrl.publicUrl,
    };
  });

  const { error } = await supabase.from("listing_documents").insert(rows);

  if (error) {
    throw new Error(error.message || "Failed to save document.");
  }
}
