import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_ALLOWED_MIME_TYPES,
  IMAGE_UPLOAD_MAX_COMPRESSED_SIZE,
  IMAGE_UPLOAD_MAX_COMPRESSED_SIZE_LABEL,
  getImageUploadValidationError,
} from "@/lib/image-upload";

export const BROKER_PROFILE_PHOTO_BUCKET = "avatars";
export const DEFAULT_BROKER_PROFILE_PHOTO = "/assets/broker-placeholder.svg";
export const PROFILE_PHOTO_MAX_SIZE = IMAGE_UPLOAD_MAX_COMPRESSED_SIZE;
export const PROFILE_PHOTO_ALLOWED_TYPES = IMAGE_UPLOAD_ALLOWED_MIME_TYPES;
export const PROFILE_PHOTO_ACCEPT = IMAGE_UPLOAD_ACCEPT;
export const PROFILE_PHOTO_MAX_SIZE_LABEL = IMAGE_UPLOAD_MAX_COMPRESSED_SIZE_LABEL;

type ProfilePhotoValidationOptions = {
  validateSize?: boolean;
};

export function isAllowedProfilePhotoType(type?: string | null) {
  if (!type) {
    return false;
  }

  return PROFILE_PHOTO_ALLOWED_TYPES.includes(type.toLowerCase() as (typeof PROFILE_PHOTO_ALLOWED_TYPES)[number]);
}

export function getProfilePhotoValidationError(
  file?: Pick<File, "name" | "type" | "size"> | null,
  options: ProfilePhotoValidationOptions = {}
) {
  if (!file) {
    return null;
  }

  return getImageUploadValidationError(file, {
    label: "Profile photo",
    validateSize: options.validateSize ?? true,
  });
}

export function buildBrokerProfilePhotoPath(userId: string, fileName: string) {
  const safeFileName = (fileName || "profile-photo")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${userId}/${Date.now()}-${safeFileName || "profile-photo"}`;
}
