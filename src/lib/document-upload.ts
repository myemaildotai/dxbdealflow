export const LISTING_DOCUMENT_UPLOAD_CONFIG = {
  pdf: {
    enabled: true,
    label: "PDF",
    extensions: [".pdf"],
    mimeTypesByExtension: {
      ".pdf": ["application/pdf"],
    },
  },
  word: {
    enabled: true,
    label: "DOC/DOCX",
    extensions: [".doc", ".docx"],
    mimeTypesByExtension: {
      ".doc": ["application/msword"],
      ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    },
  },
  maxSize: {
    bytes: 25 * 1024 * 1024,
    label: "25MB",
  },
} as const;

export const LISTING_DOCUMENT_BUCKET = "listing-documents";
export const LISTING_DOCUMENT_DUPLICATE_FILENAME_MESSAGE =
  "A document with this filename is already attached or selected.";

export type UploadedListingDocumentMetadata = {
  storage_path: string;
  file_name: string;
  mime_type: string;
  size: number;
};

type ListingDocumentFamily = Omit<typeof LISTING_DOCUMENT_UPLOAD_CONFIG, "maxSize">;
type ListingDocumentFamilyKey = keyof ListingDocumentFamily;
type ListingDocumentFileLike = Pick<File, "name" | "size" | "type">;

export function normalizeListingDocumentFileName(fileName: string) {
  return fileName.trim().normalize("NFKC").toLowerCase();
}

function getEnabledDocumentFamilies() {
  return (Object.keys(LISTING_DOCUMENT_UPLOAD_CONFIG) as Array<keyof typeof LISTING_DOCUMENT_UPLOAD_CONFIG>)
    .filter((key): key is ListingDocumentFamilyKey => key !== "maxSize")
    .map((key) => LISTING_DOCUMENT_UPLOAD_CONFIG[key])
    .filter((family) => family.enabled);
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
}

export function getListingDocumentAllowedExtensions() {
  return getEnabledDocumentFamilies().flatMap((family) => [...family.extensions]);
}

export function getListingDocumentAllowedMimeTypes() {
  return getEnabledDocumentFamilies().flatMap((family) =>
    Object.values(family.mimeTypesByExtension).flatMap((mimeTypes) => [...mimeTypes])
  );
}

export function getListingDocumentAllowedFormatsLabel() {
  const labels = getEnabledDocumentFamilies().map((family) => family.label);

  if (!labels.length) {
    return "supported document";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

export const LISTING_DOCUMENT_ACCEPT = [
  ...getListingDocumentAllowedExtensions(),
  ...getListingDocumentAllowedMimeTypes(),
].join(",");
export const LISTING_DOCUMENT_MAX_SIZE = LISTING_DOCUMENT_UPLOAD_CONFIG.maxSize.bytes;
export const LISTING_DOCUMENT_MAX_SIZE_LABEL = LISTING_DOCUMENT_UPLOAD_CONFIG.maxSize.label;

function getAllowedMimeTypesForExtension(extension: string) {
  const family = getEnabledDocumentFamilies().find((enabledFamily) =>
    (enabledFamily.extensions as readonly string[]).includes(extension)
  );

  if (!family) {
    return [];
  }

  const mimeTypesByExtension = family.mimeTypesByExtension as Record<string, readonly string[]>;
  return mimeTypesByExtension[extension] || [];
}

function isAllowedDocumentExtension(extension: string) {
  return (getListingDocumentAllowedExtensions() as readonly string[]).includes(extension);
}

function isAllowedDocumentMimeType(mimeType: string) {
  return (getListingDocumentAllowedMimeTypes() as readonly string[]).includes(mimeType);
}

function normalizeMimeType(type?: string | null) {
  return typeof type === "string" ? type.trim().toLowerCase() : "";
}

function getInvalidFormatMessage(fileName: string) {
  return `${fileName || "Document"} must be a ${getListingDocumentAllowedFormatsLabel()} file.`;
}

export function getListingDocumentValidationError(file?: ListingDocumentFileLike | null) {
  if (!file) {
    return null;
  }

  const fileName = file.name || "Document";
  const extension = getFileExtension(fileName);
  const mimeType = normalizeMimeType(file.type);

  if (!isAllowedDocumentExtension(extension)) {
    return getInvalidFormatMessage(fileName);
  }

  if (mimeType) {
    if (!isAllowedDocumentMimeType(mimeType)) {
      return getInvalidFormatMessage(fileName);
    }

    if (!getAllowedMimeTypesForExtension(extension).includes(mimeType)) {
      return `${fileName} file extension and document type do not match. Please upload a ${getListingDocumentAllowedFormatsLabel()} file.`;
    }
  }

  if (file.size > LISTING_DOCUMENT_MAX_SIZE) {
    return `${fileName} exceeds the ${LISTING_DOCUMENT_MAX_SIZE_LABEL} document limit.`;
  }

  return null;
}

export function isSupportedListingDocument(file: ListingDocumentFileLike) {
  return getListingDocumentValidationError(file) === null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      return value.trim();
    }
  }

  return "";
}

function getNumberField(source: Record<string, unknown>, key: string) {
  const value = source[key];
  const parsedValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsedValue) ? parsedValue : NaN;
}

function parseListingDocumentMetadataEntry(entry: unknown): UploadedListingDocumentMetadata {
  if (!isRecord(entry)) {
    throw new Error("Document metadata is invalid.");
  }

  const storagePath = getStringField(entry, "storage_path", "storagePath");
  const fileName = getStringField(entry, "file_name", "fileName", "original_filename", "originalFilename");
  const mimeType = getStringField(entry, "mime_type", "mimeType");
  const size = getNumberField(entry, "size");

  if (!storagePath || !fileName || !Number.isFinite(size) || size <= 0) {
    throw new Error("Document metadata is invalid.");
  }

  return {
    storage_path: storagePath,
    file_name: fileName,
    mime_type: mimeType,
    size,
  };
}

export function parseListingDocumentMetadataPayload(payload: unknown) {
  if (payload === null || payload === undefined || payload === "") {
    return [];
  }

  let parsedPayload = payload;

  if (typeof payload === "string") {
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      throw new Error("Document metadata is invalid.");
    }
  }

  if (!Array.isArray(parsedPayload)) {
    throw new Error("Document metadata is invalid.");
  }

  return parsedPayload.map(parseListingDocumentMetadataEntry);
}

export function parseListingDocumentMetadata(formData: FormData) {
  const documentEntries = formData.getAll("documents");

  if (documentEntries.some((entry) => entry instanceof File)) {
    throw new Error("Document files must be uploaded before saving the listing.");
  }

  return parseListingDocumentMetadataPayload(documentEntries[0] || formData.get("documentMetadata"));
}

export function getListingDocumentMetadataValidationError(
  document: UploadedListingDocumentMetadata,
  userId: string
) {
  const expectedPrefix = `${userId}/pending/`;

  if (
    !document.storage_path.startsWith(expectedPrefix) ||
    document.storage_path.includes("..") ||
    document.storage_path.includes("\\")
  ) {
    return "Uploaded document path is invalid.";
  }

  return getListingDocumentValidationError({
    name: document.file_name,
    size: document.size,
    type: document.mime_type,
  });
}
