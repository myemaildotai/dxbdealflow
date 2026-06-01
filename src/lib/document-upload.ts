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

type ListingDocumentFamily = Omit<typeof LISTING_DOCUMENT_UPLOAD_CONFIG, "maxSize">;
type ListingDocumentFamilyKey = keyof ListingDocumentFamily;
type ListingDocumentFileLike = Pick<File, "name" | "size" | "type">;

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
