export const IMAGE_UPLOAD_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic"] as const;
export const IMAGE_UPLOAD_ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"] as const;
export const IMAGE_UPLOAD_ACCEPT = [
  ...IMAGE_UPLOAD_ALLOWED_EXTENSIONS,
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
].join(",");
export const IMAGE_UPLOAD_ALLOWED_FORMATS_LABEL = "JPG, JPEG, PNG, or HEIC";
export const IMAGE_UPLOAD_MAX_COMPRESSED_SIZE = 1.5 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_COMPRESSED_SIZE_LABEL = "1.5MB";

const IMAGE_UPLOAD_MAX_DIMENSION = 1920;
const IMAGE_UPLOAD_MIN_DIMENSION = 720;
const IMAGE_UPLOAD_INITIAL_QUALITY = 0.86;
const IMAGE_UPLOAD_MIN_QUALITY = 0.5;
const COMPRESSED_IMAGE_MIME_TYPE = "image/jpeg";
const COMPRESSED_IMAGE_EXTENSION = ".jpg";

type ImageUploadFileLike = Pick<File, "name" | "size" | "type">;
type ImageUploadValidationOptions = {
  label?: string;
  validateSize?: boolean;
};
type LoadedImageSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};
type CompressionProgress = {
  current: number;
  total: number;
  file: File;
};

const MIME_TYPES_BY_EXTENSION: Record<(typeof IMAGE_UPLOAD_ALLOWED_EXTENSIONS)[number], readonly string[]> = {
  ".jpg": ["image/jpeg", "image/jpg"],
  ".jpeg": ["image/jpeg", "image/jpg"],
  ".png": ["image/png"],
  ".heic": ["image/heic", "image/heif"],
};

function getImageFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
}

function getValidationLabel(file: ImageUploadFileLike, label?: string) {
  return label || file.name || "Image";
}

function isAllowedImageExtension(extension: string): extension is (typeof IMAGE_UPLOAD_ALLOWED_EXTENSIONS)[number] {
  return IMAGE_UPLOAD_ALLOWED_EXTENSIONS.includes(extension as (typeof IMAGE_UPLOAD_ALLOWED_EXTENSIONS)[number]);
}

function normalizeMimeType(type?: string | null) {
  return typeof type === "string" ? type.trim().toLowerCase() : "";
}

function isAllowedImageMimeType(type: string) {
  return IMAGE_UPLOAD_ALLOWED_MIME_TYPES.includes(type as (typeof IMAGE_UPLOAD_ALLOWED_MIME_TYPES)[number]);
}

function getTypeMismatchMessage(label: string) {
  return `${label} file extension and image type do not match. Please upload a ${IMAGE_UPLOAD_ALLOWED_FORMATS_LABEL} image.`;
}

function getInvalidFormatMessage(label: string) {
  return `${label} must be a ${IMAGE_UPLOAD_ALLOWED_FORMATS_LABEL} image.`;
}

function getCompressedSizeMessage(label: string) {
  return `${label} must be ${IMAGE_UPLOAD_MAX_COMPRESSED_SIZE_LABEL} or smaller after compression.`;
}

export function getImageUploadValidationError(file?: ImageUploadFileLike | null, options: ImageUploadValidationOptions = {}) {
  if (!file) {
    return null;
  }

  const label = getValidationLabel(file, options.label);
  const extension = getImageFileExtension(file.name || "");
  const mimeType = normalizeMimeType(file.type);

  if (!isAllowedImageExtension(extension)) {
    return getInvalidFormatMessage(label);
  }

  if (mimeType) {
    if (!isAllowedImageMimeType(mimeType)) {
      return getInvalidFormatMessage(label);
    }

    if (!MIME_TYPES_BY_EXTENSION[extension].includes(mimeType)) {
      return getTypeMismatchMessage(label);
    }
  }

  if (options.validateSize && file.size > IMAGE_UPLOAD_MAX_COMPRESSED_SIZE) {
    return getCompressedSizeMessage(label);
  }

  return null;
}

function isHeicImageFile(file: ImageUploadFileLike) {
  const extension = getImageFileExtension(file.name || "");
  const mimeType = normalizeMimeType(file.type);
  return extension === ".heic" || mimeType === "image/heic" || mimeType === "image/heif";
}

function getCompressedImageFileName(fileName: string) {
  const trimmedName = (fileName || "image").trim();
  const lastDotIndex = trimmedName.lastIndexOf(".");
  const baseName = lastDotIndex > 0 ? trimmedName.slice(0, lastDotIndex) : trimmedName;
  const safeBaseName = (baseName || "image").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

  return `${safeBaseName || "image"}${COMPRESSED_IMAGE_EXTENSION}`;
}

function getScaledDimensions(width: number, height: number, maxDimension: number) {
  const largestSide = Math.max(width, height);
  if (largestSide <= maxDimension) {
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
  }

  const scale = maxDimension / largestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImageSource(file: File): Promise<LoadedImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to HTMLImageElement decoding below. Some browsers support HEIC there before ImageBitmap does.
    }
  }

  if (typeof window === "undefined" || typeof Image === "undefined") {
    throw new Error("Images can only be compressed in a browser.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.decoding = "async";
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Image decoding failed."));
      nextImage.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Image compression failed."));
        }
      },
      COMPRESSED_IMAGE_MIME_TYPE,
      quality
    );
  });
}

function drawImageToCanvas(canvas: HTMLCanvasElement, source: CanvasImageSource, width: number, height: number) {
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
}

export async function compressImageForUpload(file: File, label = file.name || "Image") {
  const validationError = getImageUploadValidationError(file, { label, validateSize: false });
  if (validationError) {
    throw new Error(validationError);
  }

  let loadedImage: LoadedImageSource;

  try {
    loadedImage = await loadImageSource(file);
  } catch {
    if (isHeicImageFile(file)) {
      throw new Error(`${label} is a HEIC image, but this browser cannot process HEIC uploads. Please try Safari or convert it to JPG or PNG.`);
    }

    throw new Error(`${label} could not be processed. Please upload a valid ${IMAGE_UPLOAD_ALLOWED_FORMATS_LABEL} image.`);
  }

  try {
    if (!loadedImage.width || !loadedImage.height) {
      throw new Error(`${label} could not be processed. Please upload a valid ${IMAGE_UPLOAD_ALLOWED_FORMATS_LABEL} image.`);
    }

    const canvas = document.createElement("canvas");
    let maxDimension = IMAGE_UPLOAD_MAX_DIMENSION;
    let dimensions = getScaledDimensions(loadedImage.width, loadedImage.height, maxDimension);
    let quality = IMAGE_UPLOAD_INITIAL_QUALITY;
    let bestBlob: Blob | null = null;

    for (let attempt = 0; attempt < 28; attempt += 1) {
      drawImageToCanvas(canvas, loadedImage.source, dimensions.width, dimensions.height);
      const blob = await canvasToBlob(canvas, quality);

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= IMAGE_UPLOAD_MAX_COMPRESSED_SIZE) {
        return new File([blob], getCompressedImageFileName(file.name), {
          type: COMPRESSED_IMAGE_MIME_TYPE,
          lastModified: file.lastModified || Date.now(),
        });
      }

      if (quality > IMAGE_UPLOAD_MIN_QUALITY) {
        quality = Math.max(IMAGE_UPLOAD_MIN_QUALITY, Number((quality - 0.06).toFixed(2)));
        continue;
      }

      const currentLargestSide = Math.max(dimensions.width, dimensions.height);
      const nextMaxDimension = Math.max(IMAGE_UPLOAD_MIN_DIMENSION, Math.round(currentLargestSide * 0.86));
      if (nextMaxDimension >= currentLargestSide) {
        break;
      }

      maxDimension = nextMaxDimension;
      dimensions = getScaledDimensions(loadedImage.width, loadedImage.height, maxDimension);
      quality = Math.max(IMAGE_UPLOAD_MIN_QUALITY, IMAGE_UPLOAD_INITIAL_QUALITY - 0.08);
    }

    if (bestBlob && bestBlob.size <= IMAGE_UPLOAD_MAX_COMPRESSED_SIZE) {
      return new File([bestBlob], getCompressedImageFileName(file.name), {
        type: COMPRESSED_IMAGE_MIME_TYPE,
        lastModified: file.lastModified || Date.now(),
      });
    }

    throw new Error(
      `${label} could not be compressed below ${IMAGE_UPLOAD_MAX_COMPRESSED_SIZE_LABEL}. Please choose a smaller or lower-resolution image.`
    );
  } finally {
    loadedImage.cleanup();
  }
}

export async function compressImagesForUpload(
  files: File[],
  onProgress?: (progress: CompressionProgress) => void
) {
  const compressedFiles: File[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onProgress?.({ current: index + 1, total: files.length, file });
    compressedFiles.push(await compressImageForUpload(file, file.name || `Image ${index + 1}`));
  }

  return compressedFiles;
}
