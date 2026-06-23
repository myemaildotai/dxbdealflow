"use client";

import { supabase } from "@/lib/supabase";
import {
  LISTING_DOCUMENT_BUCKET,
  getListingDocumentValidationError,
  type UploadedListingDocumentMetadata,
} from "@/lib/document-upload";

export const LISTING_DOCUMENT_UPLOAD_CONCURRENCY = 3;

type ListingDocumentUploadProgress = {
  completed: number;
  total: number;
};

type UploadListingDocumentsOptions = {
  onProgress?: (progress: ListingDocumentUploadProgress) => void;
};

function getStorageSafeFileName(fileName: string) {
  const safeName = fileName
    .trim()
    .replace(/[/\\]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "document";
}

function getDocumentUploadStoragePath(userId: string, file: File, index: number) {
  const nonce =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${userId}/pending/${Date.now()}-${index}-${nonce}-${getStorageSafeFileName(file.name)}`;
}

export async function removeUploadedListingDocuments(storagePaths: string[]) {
  const uniqueStoragePaths = storagePaths.filter(
    (storagePath, index, paths) => !!storagePath && paths.indexOf(storagePath) === index
  );

  if (!uniqueStoragePaths.length) {
    return;
  }

  const { error } = await supabase.storage
    .from(LISTING_DOCUMENT_BUCKET)
    .remove(uniqueStoragePaths);

  if (error) {
    console.error("Failed to remove uploaded listing documents.", {
      error: error.message,
      storagePaths: uniqueStoragePaths,
    });
  }
}

export async function uploadListingDocumentsDirectly(
  userId: string,
  files: File[],
  options: UploadListingDocumentsOptions = {}
) {
  for (const file of files) {
    const validationError = getListingDocumentValidationError(file);

    if (validationError) {
      throw new Error(validationError);
    }
  }

  const uploadedDocuments = new Array<UploadedListingDocumentMetadata>(files.length);
  const uploadedStoragePaths: string[] = [];
  let nextIndex = 0;
  let completed = 0;
  let uploadError: Error | null = null;

  const uploadNext = async () => {
    while (!uploadError) {
      const index = nextIndex;

      if (index >= files.length) {
        return;
      }

      nextIndex += 1;
      const file = files[index];
      const storagePath = getDocumentUploadStoragePath(userId, file, index);
      const uploadOptions: { contentType?: string; upsert: boolean } = {
        upsert: false,
      };

      if (file.type) {
        uploadOptions.contentType = file.type;
      }

      try {
        const { error } = await supabase.storage
          .from(LISTING_DOCUMENT_BUCKET)
          .upload(storagePath, file, uploadOptions);

        if (error) {
          throw new Error(error.message || `Failed to upload ${file.name || "document"}.`);
        }

        uploadedStoragePaths.push(storagePath);
        uploadedDocuments[index] = {
          storage_path: storagePath,
          file_name: file.name || "Document",
          mime_type: file.type || "",
          size: file.size,
        };
        completed += 1;
        options.onProgress?.({ completed, total: files.length });
      } catch (error) {
        uploadError =
          error instanceof Error
            ? error
            : new Error(`Failed to upload ${file.name || "document"}.`);
      }
    }
  };

  const workerCount = Math.min(LISTING_DOCUMENT_UPLOAD_CONCURRENCY, files.length);
  await Promise.all(Array.from({ length: workerCount }, () => uploadNext()));

  if (uploadError) {
    await removeUploadedListingDocuments(uploadedStoragePaths);
    throw uploadError;
  }

  return uploadedDocuments;
}
