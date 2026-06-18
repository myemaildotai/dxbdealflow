"use client";

import { Suspense, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { ListingSubmittedSuccessModal } from "@/components/ListingSubmittedSuccessModal";
import { ListingMediaLinks } from "@/components/ListingMediaLinks";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/auth/useAuth";
import { apiFetch, apiFetchCached } from "@/lib/deal-api";
import { invalidateListingCaches } from "@/lib/client-cache";
import { cn, formatDealType, formatPropertyType } from "@/lib/deal-utils";
import { Area, Listing, ListingDocument, ListingFormValues, ListingImage } from "@/lib/deal-types";
import {
  LISTING_DOCUMENT_ACCEPT,
  LISTING_DOCUMENT_DUPLICATE_FILENAME_MESSAGE,
  LISTING_DOCUMENT_MAX_SIZE_LABEL,
  getListingDocumentAllowedFormatsLabel,
  getListingDocumentValidationError,
  normalizeListingDocumentFileName,
  type UploadedListingDocumentMetadata,
} from "@/lib/document-upload";
import {
  removeUploadedListingDocuments,
  uploadListingDocumentsDirectly,
} from "@/lib/listing-document-upload-client";
import { getHandoverDateValidationMessage, getMinimumHandoverDateKey } from "@/lib/handover-date";
import {
  compressImagesForUpload,
  getImageUploadValidationError,
  IMAGE_UPLOAD_ACCEPT,
} from "@/lib/image-upload";
import {
  LISTING_BEDROOM_OPTIONS as BEDROOM_OPTIONS,
  mapListingBedroomToApi as mapBedroomToApi,
  normalizeListingBedroomValue as normalizeBedroomValue,
} from "@/lib/listing-bedrooms";
import { canManageListings, getDefaultRouteForUser } from "@/lib/route-access";

const MIN_LISTING_IMAGES = 1;
const MAX_LISTING_IMAGES = 10;

const PROPERTY_TYPE_OPTIONS = ["apartment", "villa", "townhouse", "penthouse", "office", "retail", "warehouse", "land"] as const;
const DEAL_TYPE_OPTIONS = ["secondary", "off_plan", "distressed", "urgent_sale"] as const;
const SELECT_OPTION_STYLE = { backgroundColor: "#ffffff", color: "#0f172a" } as const;
type FieldKey = keyof ListingFormValues | "images" | "documents";
type ListingErrors = Partial<Record<FieldKey, string>>;
type ListingTouched = Partial<Record<FieldKey, boolean>>;
type PreviewItem =
  | {
      key: string;
      kind: "existing";
      title: string;
      imageUrl?: string;
      image: ListingImage;
    }
  | {
      key: string;
      kind: "new";
      title: string;
      imageUrl?: string;
      file: File;
    };
type ProgressItem = {
  key: FieldKey;
  label: string;
  complete: boolean;
  required: boolean;
  contribution: number;
};
type ListingProgressState = {
  items: ProgressItem[];
  percentage: number;
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  completedRequiredCount: number;
  requiredCount: number;
  score: number;
  maxScore: number;
};
const FIELD_ORDER: FieldKey[] = ["title", "propertyType", "areaId", "price", "bedrooms", "sizeSqft", "developer", "dealType", "handoverDate", "yieldPercent", "coBrokePercent", "description", "images"];
const EXISTING_IMAGE_KEY_PREFIX = "existing:";
const NEW_IMAGE_KEY_PREFIX = "new:";
const EXISTING_DOCUMENT_KEY_PREFIX = "existing-document:";
const NEW_DOCUMENT_KEY_PREFIX = "new-document:";
const RECOMMENDED_IMAGE_COUNT = 6;
const RECOMMENDED_DOCUMENT_COUNT = 1;
const PROGRESS_MILESTONES = [0, 25, 50, 75, 100] as const;
const IMAGE_GALLERY_DRAG_SCROLL_EDGE_PX = 72;
const IMAGE_GALLERY_DRAG_SCROLL_MAX_STEP_PX = 26;

const initialValues: ListingFormValues = {
  title: "",
  propertyType: "",
  dealType: "",
  bedrooms: "",
  sizeSqft: "",
  areaId: "",
  developer: "",
  price: "",
  paymentPlan: "",
  handoverDate: "",
  yieldPercent: "",
  propertyVideoUrl: "",
  coBrokePercent: "",
  notes: "",
  description: "",
  paymentTerms: "",
};

type ListingDetailResponse = { listing: Listing };

export default function PostListingPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Preparing listing form..." />}>
      <PostListingPageContent />
    </Suspense>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mt-2 text-xl font-bold text-brand-ink sm:mt-3 sm:text-[1.55rem]">{title}</h3>
      <div className="mt-3 sm:mt-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  id,
  children,
  hint,
  required = false,
  error,
}: {
  label: string;
  id: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-slate sm:mb-2 sm:gap-2 sm:text-[12px] sm:tracking-[0.22em]">
        <span className="min-w-0 break-words">{label}</span>
        {required ? <span className="text-[#c65345]">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1.5 break-words text-sm font-medium text-[#c65345] sm:mt-2">{error}</p> : hint ? <p className="mt-1.5 break-words text-sm leading-6 text-brand-slate sm:mt-2">{hint}</p> : null}
    </div>
  );
}

function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      {children}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-slate sm:right-4" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function ImagePreviewTile({
  title,
  imageUrl,
  isCover,
  isDragging,
  isDropTarget,
  disabled,
  removeDisabled,
  className,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
}: {
  title: string;
  imageUrl?: string;
  isCover: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  disabled?: boolean;
  removeDisabled?: boolean;
  className?: string;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      title={title}
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative h-[128px] shrink-0 snap-start overflow-hidden rounded-[18px] border bg-white shadow-[0_18px_34px_rgba(15,42,95,0.12)] transition duration-200 sm:h-[160px] sm:rounded-[24px]",
        isCover ? "border-[#e2c36a] ring-2 ring-[#f0da9e]/95 ring-offset-2 ring-offset-[#fbfcff]" : "border-brand-line/90",
        !disabled ? "cursor-grab active:cursor-grabbing" : "",
        !disabled && !isDragging ? "hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(15,42,95,0.14)]" : "",
        isDragging ? "scale-[0.98] opacity-55" : "",
        isDropTarget ? "ring-2 ring-brand-blue/35 ring-offset-2 ring-offset-[#fbfcff]" : "",
        className
      )}
    >
      <div className="relative h-full bg-[#edf2f8]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} draggable={false} className="pointer-events-none h-full w-full select-none object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#e4ebf3] text-sm font-medium text-brand-slate">Preview unavailable</div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,17,32,0.04)_0%,rgba(8,17,32,0.1)_36%,rgba(8,17,32,0.7)_100%)]" />
        <button
          type="button"
          aria-label={`Remove ${title}`}
          disabled={removeDisabled}
          draggable={false}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onDragStart={(event) => event.preventDefault()}
          className={cn(
            "absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-[rgba(12,20,35,0.58)] text-white shadow-[0_10px_22px_rgba(10,16,28,0.22)] backdrop-blur-sm transition duration-200",
            "hover:border-white/55 hover:bg-[rgba(185,79,64,0.88)] active:scale-95 active:bg-[rgba(161,57,42,0.92)]",
            "disabled:cursor-not-allowed disabled:opacity-55"
          )}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M6 6L14 14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M14 6L6 14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:gap-3 sm:p-4">
          <div className="min-w-0">
            <span
              className={cn(
                isCover
                  ? "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm border-[#e7cb7d] bg-[rgba(244,215,135,0.94)] text-[#473514] sm:px-3 sm:tracking-[0.18em]"
                  : ""
              )}
            >
              {isCover ? "Cover photo" : ''}
            </span>
          </div>
        </div>
        {isDropTarget ? (
          <div className="pointer-events-none absolute inset-3 rounded-[22px] border-2 border-dashed border-white/90 bg-white/10" />
        ) : null}
      </div>
    </div>
  );
}

function inputClass(hasError: boolean, extraClassName?: string) {
  return cn(
    "input min-h-[42px] rounded-md border bg-white px-3 py-2 text-sm font-medium shadow-[0_12px_28px_rgba(15,42,95,0.04)] transition duration-200 sm:text-base md:min-h-[46px] md:rounded-[10px] md:px-4 md:text-[15px]",
    hasError
      ? "border-[#dfa097] bg-[#fff8f6] text-brand-ink placeholder:text-[#c98276] focus:border-[#cf6f60] focus:shadow-[0_0_0_4px_rgba(207,111,96,0.16)]"
      : "border-brand-line hover:border-brand-blue/28 focus:border-brand-gold",
    extraClassName
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 4.75V15.25" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4.75 10H15.25" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.75 12C4.92 7.92 8.11 5.88 12 5.88C15.89 5.88 19.08 7.92 21.25 12C19.08 16.08 15.89 18.12 12 18.12C8.11 18.12 4.92 16.08 2.75 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.85" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CrownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 17.25L6.05 8.25L11 12.1L12 5.75L13 12.1L17.95 8.25L19.5 17.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.25 19.25H16.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M11.75 4.75L6.5 10L11.75 15.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ListingCompletionMedal() {
  return (
    <div className="relative flex h-[50px] w-[50px] shrink-0 items-center justify-center sm:h-[60px] sm:w-[60px]">
      <div className="absolute left-2 top-2 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[#f3cf63]/80 shadow-[0_4px_10px_rgba(214,164,43,0.24)]" />
      <div className="absolute right-2 top-4 h-2 w-2 rotate-45 rounded-[2px] bg-[#efc14b]/80 shadow-[0_4px_10px_rgba(214,164,43,0.24)]" />
      <div className="absolute bottom-4 left-1.5 h-2 w-2 rotate-45 rounded-[2px] bg-[#f5d878]/80 shadow-[0_4px_10px_rgba(214,164,43,0.24)]" />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,244,193,0.98)_0%,rgba(245,206,84,0.96)_34%,rgba(219,163,39,0.98)_68%,rgba(176,119,15,0.98)_100%)] shadow-[0_18px_32px_rgba(205,156,34,0.28)]" />
      <div className="absolute inset-[6px] rounded-full border border-white/40 bg-[radial-gradient(circle_at_30%_30%,rgba(255,248,220,0.98)_0%,rgba(241,196,68,0.92)_38%,rgba(206,143,27,0.95)_100%)]" />
      <div className="relative z-10 flex flex-col items-center text-white">
        <CrownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-[1.1rem] font-black leading-none tracking-[-0.04em] sm:text-[1rem]">100%</span>
      </div>
    </div>
  );
}

function DocumentListItem({
  title,
  meta,
  removeLabel,
  removeDisabled,
  onRemove,
}: {
  title: string;
  meta: string;
  removeLabel: string;
  removeDisabled?: boolean;
  onRemove: () => void;
}) {
  const extensionLabel = getDocumentExtensionLabel(title);

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-[#dce5ef] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-3 py-3 shadow-[0_16px_30px_rgba(15,42,95,0.07)] sm:flex-row sm:items-center sm:justify-between sm:rounded-[22px] sm:px-4 sm:py-4">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/80 bg-[linear-gradient(180deg,#f0f5fb_0%,#e4ecf8_100%)] text-[#173972] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_rgba(15,42,95,0.08)] sm:h-12 sm:w-12 sm:rounded-[16px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">{extensionLabel}</span>
        </div>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-brand-ink sm:truncate">{title}</p>
          <p className="mt-1 break-words text-xs leading-5 text-brand-slate">{meta}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          className="w-full rounded-full border border-[#efc6be] bg-[#fff4f1] px-3 py-1.5 text-xs font-semibold text-[#b25647] transition hover:border-[#e2aa9f] hover:bg-[#ffe9e3] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
        >
          {removeLabel}
        </button>
      </div>
    </div>
  );
}

function validateForm(values: ListingFormValues, totalImageCount: number): ListingErrors {
  const nextErrors: ListingErrors = {};
  if (!values.title.trim()) nextErrors.title = "Enter a listing title.";
  if (!values.propertyType) nextErrors.propertyType = "Select a property type.";
  if (!values.areaId) nextErrors.areaId = "Select an area.";
  if (!isPositiveNumber(values.price)) nextErrors.price = "Enter a valid price.";
  if (!values.bedrooms) nextErrors.bedrooms = "Select the bedroom count.";
  if (!isPositiveNumber(values.sizeSqft)) nextErrors.sizeSqft = "Enter a valid size in sqft.";
  if (!values.developer.trim()) nextErrors.developer = "Enter the developer name.";
  if (!values.dealType) nextErrors.dealType = "Select a deal type.";
  const handoverDateError = getHandoverDateValidationMessage(values.handoverDate);
  if (handoverDateError) nextErrors.handoverDate = handoverDateError;
  if (values.yieldPercent && !isValidNumber(values.yieldPercent)) nextErrors.yieldPercent = "Enter a valid yield percentage.";
  if (values.coBrokePercent && !isValidNumber(values.coBrokePercent)) nextErrors.coBrokePercent = "Enter a valid co-broke percentage.";
  if (!values.description.trim()) nextErrors.description = "Enter a description.";
  if (totalImageCount < MIN_LISTING_IMAGES) nextErrors.images = "Upload at least 1 image.";
  if (totalImageCount > MAX_LISTING_IMAGES) nextErrors.images = `You can upload up to ${MAX_LISTING_IMAGES} images.`;
  return nextErrors;
}

function sanitizeNumberInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/\s+/g, "");
  if (!cleaned) return "";
  if (/^\d*\.?\d*$/.test(cleaned)) return cleaned;
  return null;
}

function hasValue(value: string) {
  return value.trim().length > 0;
}

function isValidNumber(value: string) {
  if (!value.trim()) return false;
  return Number.isFinite(Number(value));
}

function isPositiveNumber(value: string) {
  return isValidNumber(value) && Number(value) > 0;
}

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getExistingImageKey(image: Pick<ListingImage, "id">) {
  return `${EXISTING_IMAGE_KEY_PREFIX}${image.id}`;
}

function getNewImageKey(file: File) {
  return `${NEW_IMAGE_KEY_PREFIX}${getFileKey(file)}`;
}

function getExistingDocumentKey(document: Pick<ListingDocument, "id">) {
  return `${EXISTING_DOCUMENT_KEY_PREFIX}${document.id}`;
}

function getNewDocumentKey(file: File) {
  return `${NEW_DOCUMENT_KEY_PREFIX}${getFileKey(file)}`;
}

function getImageValidationMessage(files: File[], existingImageCount = 0) {
  for (const file of files) {
    const validationError = getImageUploadValidationError(file, {
      label: file.name,
      validateSize: true,
    });

    if (validationError) {
      return validationError;
    }
  }

  if (existingImageCount + files.length > MAX_LISTING_IMAGES) {
    return `You can upload up to ${MAX_LISTING_IMAGES} images in total.`;
  }

  return "";
}

function dragEventHasFiles(dataTransfer: DataTransfer | null) {
  return !!dataTransfer && Array.from(dataTransfer.types || []).includes("Files");
}

function getDocumentExtensionLabel(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toUpperCase();
  if (!extension || extension === fileName.toUpperCase()) {
    return "FILE";
  }

  return extension.slice(0, 4);
}

function syncImageOrder(currentOrder: string[], existingImages: ListingImage[], newImages: File[]) {
  const availableKeys = [...existingImages.map(getExistingImageKey), ...newImages.map(getNewImageKey)];
  const availableKeySet = new Set(availableKeys);
  const nextOrder = currentOrder.filter((key) => availableKeySet.has(key));

  for (const key of availableKeys) {
    if (!nextOrder.includes(key)) nextOrder.push(key);
  }

  return nextOrder;
}

function moveImageKey(imageKeys: string[], sourceKey: string, targetKey: string) {
  if (sourceKey === targetKey) return imageKeys;

  const sourceIndex = imageKeys.indexOf(sourceKey);
  const targetIndex = imageKeys.indexOf(targetKey);

  if (sourceIndex === -1 || targetIndex === -1) return imageKeys;

  const nextOrder = [...imageKeys];
  const [movedKey] = nextOrder.splice(sourceIndex, 1);
  nextOrder.splice(targetIndex, 0, movedKey);
  return nextOrder;
}

function buildPreviewItems(existingImages: ListingImage[], newImages: File[], previewUrls: string[], imageOrder: string[]) {
  const existingByKey = new Map(existingImages.map((image) => [getExistingImageKey(image), image]));
  const newByKey = new Map(newImages.map((file, index) => [getNewImageKey(file), { file, previewUrl: previewUrls[index] }]));
  const orderedItems: PreviewItem[] = [];

  for (const key of imageOrder) {
    if (key.startsWith(EXISTING_IMAGE_KEY_PREFIX)) {
      const image = existingByKey.get(key);
      if (image) {
        orderedItems.push({
          key,
          kind: "existing",
          title: image.file_name,
          imageUrl: image.public_url,
          image,
        });
      }
      continue;
    }

    const newImage = newByKey.get(key);
    if (newImage) {
      orderedItems.push({
        key,
        kind: "new",
        title: newImage.file.name,
        imageUrl: newImage.previewUrl,
        file: newImage.file,
      });
    }
  }

  return orderedItems;
}

function getNormalizedContribution(currentCount: number, targetCount: number) {
  if (currentCount <= 0 || targetCount <= 0) {
    return 0;
  }

  return Math.min(currentCount / targetCount, 1);
}

function getListingProgressState(values: ListingFormValues, totalImageCount: number, totalDocumentCount: number, errors: ListingErrors): ListingProgressState {
  const imageContribution = !errors.images ? getNormalizedContribution(totalImageCount, RECOMMENDED_IMAGE_COUNT) : 0;
  const documentContribution = getNormalizedContribution(totalDocumentCount, RECOMMENDED_DOCUMENT_COUNT);
  const items: ProgressItem[] = [
    { key: "title", label: "Listing title", required: true, complete: hasValue(values.title) && !errors.title, contribution: hasValue(values.title) && !errors.title ? 1 : 0 },
    { key: "propertyType", label: "Property type", required: true, complete: Boolean(values.propertyType) && !errors.propertyType, contribution: Boolean(values.propertyType) && !errors.propertyType ? 1 : 0 },
    { key: "areaId", label: "Area", required: true, complete: hasValue(values.areaId) && !errors.areaId, contribution: hasValue(values.areaId) && !errors.areaId ? 1 : 0 },
    { key: "dealType", label: "Deal type", required: true, complete: Boolean(values.dealType) && !errors.dealType, contribution: Boolean(values.dealType) && !errors.dealType ? 1 : 0 },
    { key: "price", label: "Price", required: true, complete: hasValue(values.price) && !errors.price, contribution: hasValue(values.price) && !errors.price ? 1 : 0 },
    { key: "sizeSqft", label: "Size", required: true, complete: hasValue(values.sizeSqft) && !errors.sizeSqft, contribution: hasValue(values.sizeSqft) && !errors.sizeSqft ? 1 : 0 },
    { key: "bedrooms", label: "Bedrooms", required: true, complete: hasValue(values.bedrooms) && !errors.bedrooms, contribution: hasValue(values.bedrooms) && !errors.bedrooms ? 1 : 0 },
    { key: "developer", label: "Developer", required: true, complete: hasValue(values.developer) && !errors.developer, contribution: hasValue(values.developer) && !errors.developer ? 1 : 0 },
    { key: "description", label: "Description", required: true, complete: hasValue(values.description) && !errors.description, contribution: hasValue(values.description) && !errors.description ? 1 : 0 },
    {
      key: "images",
      label: "Images",
      required: true,
      complete: totalImageCount >= MIN_LISTING_IMAGES && totalImageCount <= MAX_LISTING_IMAGES && !errors.images,
      contribution: imageContribution,
    },
    { key: "paymentPlan", label: "Payment plan", required: false, complete: hasValue(values.paymentPlan), contribution: hasValue(values.paymentPlan) ? 1 : 0 },
    { key: "handoverDate", label: "Handover date", required: false, complete: hasValue(values.handoverDate) && !errors.handoverDate, contribution: hasValue(values.handoverDate) && !errors.handoverDate ? 1 : 0 },
    { key: "yieldPercent", label: "Yield percent", required: false, complete: hasValue(values.yieldPercent) && !errors.yieldPercent, contribution: hasValue(values.yieldPercent) && !errors.yieldPercent ? 1 : 0 },
    { key: "coBrokePercent", label: "Co-broke percent", required: false, complete: hasValue(values.coBrokePercent) && !errors.coBrokePercent, contribution: hasValue(values.coBrokePercent) && !errors.coBrokePercent ? 1 : 0 },
    { key: "paymentTerms", label: "Payment terms", required: false, complete: hasValue(values.paymentTerms), contribution: hasValue(values.paymentTerms) ? 1 : 0 },
    { key: "notes", label: "Notes", required: false, complete: hasValue(values.notes), contribution: hasValue(values.notes) ? 1 : 0 },
    { key: "documents", label: "Supporting files", required: false, complete: totalDocumentCount > 0, contribution: documentContribution },
  ];

  const completedCount = items.filter((item) => item.complete).length;
  const requiredItems = items.filter((item) => item.required);
  const completedRequiredCount = requiredItems.filter((item) => item.complete).length;
  const score = items.reduce((total, item) => total + item.contribution, 0);
  const maxScore = Math.max(items.length, 1);
  const rawPercentage = (score / maxScore) * 100;
  const percentage = score >= maxScore ? 100 : Math.max(0, Math.min(99, Math.round(rawPercentage)));

  return {
    items,
    percentage,
    completedCount,
    totalCount: items.length,
    remainingCount: items.length - completedCount,
    completedRequiredCount,
    requiredCount: requiredItems.length,
    score,
    maxScore,
  };
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M12 16.25V5.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 9.25L12 5.75L15.5 9.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 18.25H18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ListingProgressCard({
  progress,
  backAction,
  primaryAction,
}: {
  progress: ListingProgressState;
  backAction?: ReactNode;
  primaryAction?: ReactNode;
}) {
  const completionPercentage = Math.max(0, Math.min(progress.percentage, 100));
  const isComplete = completionPercentage >= 100;
  const qualityToneClass =
    completionPercentage >= 80 ? "text-[#238349]" : completionPercentage >= 50 ? "text-[#c67c22]" : "text-[#cf584c]";
  const markerToneClass =
    completionPercentage >= 80
      ? "border-[#68bd88] text-[#238349] shadow-[0_14px_24px_rgba(35,131,73,0.18)]"
      : completionPercentage >= 50
        ? "border-[#efc57a] text-[#b7791e] shadow-[0_14px_24px_rgba(198,124,34,0.18)]"
        : "border-[#efaca5] text-[#cf584c] shadow-[0_14px_24px_rgba(207,88,76,0.16)]";
  const qualityMessage =
    isComplete
      ? "Listings like this get more views and responses."
      : completionPercentage >= 80
        ? "A few finishing touches can take this listing all the way."
        : completionPercentage >= 50
          ? "You're building momentum. Keep layering in more listing details."
          : "Build the essentials first to unlock a stronger listing score.";
  const progressTitle = isComplete ? "Your listing is 100%" : `Listing Quality: ${completionPercentage}%`;
  const markerLabel = `${completionPercentage}%`;
  const markerLeft = `clamp(1.75rem, ${completionPercentage}%, calc(100% - 1.75rem))`;

  return (
    <section className="relative overflow-hidden rounded-[12px] border border-[#edf1f6] bg-white shadow-[0_22px_44px_rgba(15,42,95,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,238,211,0.58)_0%,rgba(247,238,211,0)_34%),radial-gradient(circle_at_bottom_right,rgba(223,233,246,0.66)_0%,rgba(223,233,246,0)_34%)]" />
      <div className="relative grid gap-4 px-4 py-4 sm:px-6 sm:py-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        <div className="hidden sm:block lg:min-w-[172px]">{backAction}</div>

        <div className="min-w-0">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-6">
            <div className={cn("min-w-0", isComplete ? "flex items-center gap-4 xl:min-w-[300px]" : "xl:min-w-[255px]")}>
              {isComplete ? <ListingCompletionMedal /> : null}
              <div className="min-w-0">
                <p className={cn("text-[1.32rem] font-bold leading-tight tracking-[-0.03em] sm:text-[1.55rem]", isComplete ? "text-[#1f9d4d]" : qualityToneClass)}>
                  {progressTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#7b8798] sm:text-[15px]">{qualityMessage}</p>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="relative pt-4">
                <div
                  className={cn(
                    "relative h-3.5 overflow-hidden rounded-full",
                    isComplete
                      ? "bg-[linear-gradient(90deg,#25a34c_0%,#269f49_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_rgba(37,163,76,0.2)]"
                      : "bg-[linear-gradient(90deg,#ea5b57_0%,#f19a2f_30%,#f4cb4b_57%,#7abe60_80%,#2ea357_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_20px_rgba(229,145,57,0.16)]"
                  )}
                  role="progressbar"
                  aria-label="Listing quality progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={completionPercentage}
                  aria-valuetext={`${completionPercentage}% complete`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.08)_100%)]" />
                </div>

                <div className="pointer-events-none absolute left-0 top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: markerLeft }}>
                  <div
                    className={cn(
                      "inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-full border bg-white px-3 text-[12px] font-bold tracking-[-0.02em] transition-all duration-300 sm:min-h-[46px] sm:min-w-[46px]",
                      isComplete ? "border-[#2ea357] bg-[#2ea357] text-[#4fb36d] shadow-[0_14px_24px_rgba(46,163,87,0.24)]" : markerToneClass
                    )}
                  >
                    {markerLabel}
                  </div>
                  <span className={cn("mt-1 h-4 w-px", isComplete ? "bg-[#2ea357]/35" : "bg-[#d68476]/45")} />
                </div>
              </div>

              <div className="mt-3 flex items-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d97a6]">
                {PROGRESS_MILESTONES.map((milestone, index) => (
                  <span
                    key={milestone}
                    className={cn(
                      "flex-1",
                      index === 0 ? "text-left" : index === PROGRESS_MILESTONES.length - 1 ? "text-right" : "text-center",
                      isComplete && milestone === 100 ? "text-[#1f9d4d]" : ""
                    )}
                  >
                    {milestone}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {primaryAction ? <div className="w-full lg:min-w-[196px]">{primaryAction}</div> : null}
      </div>
    </section>
  );
}

function PostListingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedSearchParams = searchParams ?? new URLSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();
  const editId = resolvedSearchParams.get("id");
  const isEditMode = Boolean(editId);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageGalleryScrollRef = useRef<HTMLDivElement | null>(null);
  const imageGalleryDragScrollFrameRef = useRef<number | null>(null);
  const imageGalleryDragScrollStepRef = useRef(0);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadDragDepthRef = useRef(0);
  const [areas, setAreas] = useState<Area[]>([]);
  const [values, setValues] = useState<ListingFormValues>(initialValues);
  const [existingImages, setExistingImages] = useState<ListingImage[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<ListingDocument[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [imageOrder, setImageOrder] = useState<string[]>([]);
  const [touched, setTouched] = useState<ListingTouched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [removingImageIds, setRemovingImageIds] = useState<string[]>([]);
  const [stagedRemovedImageIds, setStagedRemovedImageIds] = useState<string[]>([]);
  const [removingDocumentIds, setRemovingDocumentIds] = useState<string[]>([]);
  const [imageMessage, setImageMessage] = useState("");
  const [imageCompressionStatus, setImageCompressionStatus] = useState("");
  const [documentMessage, setDocumentMessage] = useState("");
  const [documentUploadStatus, setDocumentUploadStatus] = useState("");
  const [draggedImageKey, setDraggedImageKey] = useState<string | null>(null);
  const [dropTargetImageKey, setDropTargetImageKey] = useState<string | null>(null);
  const [isImageUploadDragActive, setIsImageUploadDragActive] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const minimumHandoverDate = getMinimumHandoverDateKey();

  useEffect(() => {
    document.body.classList.add("post-listing-page");
    return () => document.body.classList.remove("post-listing-page");
  }, []);

  useEffect(() => {
    return () => {
      if (imageGalleryDragScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(imageGalleryDragScrollFrameRef.current);
        imageGalleryDragScrollFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && (!user || !canManageListings(user))) {
      router.replace(getDefaultRouteForUser(user));
      return;
    }

    if (!loading && user) {
      const controller = new AbortController();

      Promise.all([
        apiFetchCached<{ areas: Area[] }>("/api/public/areas", {}, { ttlMs: 300_000 }),
        editId ? apiFetch<ListingDetailResponse>(`/api/listings/${editId}`, { signal: controller.signal }) : Promise.resolve(null),
      ])
        .then(([areasPayload, detail]) => {
          if (controller.signal.aborted) {
            return;
          }

          setAreas(areasPayload.areas || []);
          if (detail?.listing) {
            if (!detail.listing.can_edit) throw new Error("You can only edit your own listings.");
            setValues({
              title: detail.listing.title || "",
              propertyType: detail.listing.property_type || "apartment",
              dealType: detail.listing.deal_type || "secondary",
              bedrooms: normalizeBedroomValue(detail.listing.bedrooms),
              sizeSqft: detail.listing.size_sqft?.toString() || "",
              areaId: detail.listing.area_id || "",
              developer: detail.listing.developer || "",
              price: detail.listing.price?.toString() || "",
              paymentPlan: detail.listing.payment_plan || "",
              handoverDate: detail.listing.handover_date || "",
              yieldPercent: detail.listing.yield_percent?.toString() || "",
              propertyVideoUrl: detail.listing.property_video_url || "",
              coBrokePercent: detail.listing.commission_terms?.co_broke_percent?.toString() || "",
              notes: detail.listing.notes || "",
              description: detail.listing.description || "",
              paymentTerms: detail.listing.commission_terms?.payment_terms || "",
            });
            setVideoPreviewUrl(detail.listing.property_video_url || "");
            setExistingImages(detail.listing.listing_images || []);
            setExistingDocuments(detail.listing.listing_documents || []);
            setStagedRemovedImageIds([]);
          }
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          enqueueSnackbar(error instanceof Error ? error.message : "Failed to prepare form.", { variant: "error" });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setPageLoading(false);
          }
        });

      return () => controller.abort();
    }
  }, [editId, enqueueSnackbar, loading, router, user]);

  useEffect(() => {
    const nextUrls = images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextUrls);
    return () => nextUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  useEffect(() => {
    if (!values.propertyVideoUrl.trim()) {
      setVideoPreviewUrl("");
    }
  }, [values.propertyVideoUrl]);

  useEffect(() => {
    setImageOrder((currentOrder) => syncImageOrder(currentOrder, existingImages, images));
  }, [existingImages, images]);

  const totalImageCount = existingImages.length + images.length;
  const remainingImageSlots = Math.max(0, MAX_LISTING_IMAGES - totalImageCount);
  const totalDocumentCount = existingDocuments.length + documents.length;
  const errors = validateForm(values, totalImageCount);
  const progress = getListingProgressState(values, totalImageCount, totalDocumentCount, errors);
  const orderedPreviewItems = buildPreviewItems(existingImages, images, previewUrls, imageOrder);
  const orderedNewImages = orderedPreviewItems.flatMap((item) => (item.kind === "new" ? [item.file] : []));
  const isCompressingImages = Boolean(imageCompressionStatus);
  const previewInteractionDisabled = submitting || removingImageIds.length > 0 || removingDocumentIds.length > 0 || isCompressingImages;
  const imageUploadDisabled = submitting || removingDocumentIds.length > 0 || isCompressingImages || !remainingImageSlots;
  const documentUploadDisabled = submitting || removingDocumentIds.length > 0;
  const currentImageValidationMessage = getImageValidationMessage(orderedNewImages, existingImages.length);
  const imageError = imageMessage || currentImageValidationMessage || errors.images;

  const updateField = <K extends keyof ListingFormValues>(field: K, nextValue: ListingFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: nextValue }));
  };

  const handleNumberChange = (field: "price" | "sizeSqft" | "yieldPercent" | "coBrokePercent") => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = sanitizeNumberInput(event.target.value);
    if (nextValue !== null) updateField(field, nextValue);
  };

  const handleBlur = (field: FieldKey) => setTouched((current) => ({ ...current, [field]: true }));

  const handleImageSelection = async (fileList: FileList | null) => {
    const nextFiles = Array.from(fileList || []);
    if (!nextFiles.length) return;

    setTouched((current) => ({ ...current, images: true }));

    const sourceKeys = new Set<string>();
    const uniqueFiles = nextFiles.filter((file) => {
      const fileKey = getFileKey(file);
      if (sourceKeys.has(fileKey)) return false;
      sourceKeys.add(fileKey);
      return true;
    });

    if (!uniqueFiles.length) return;

    if (totalImageCount + uniqueFiles.length > MAX_LISTING_IMAGES) {
      setImageMessage(`You can upload up to ${MAX_LISTING_IMAGES} images in total.`);
      return;
    }

    for (const file of uniqueFiles) {
      const validationError = getImageUploadValidationError(file, {
        label: file.name,
        validateSize: false,
      });

      if (validationError) {
        setImageMessage(validationError);
        return;
      }
    }

    setImageMessage("");
    setImageCompressionStatus(`Compressing ${uniqueFiles.length} photo${uniqueFiles.length === 1 ? "" : "s"}...`);

    try {
      const compressedFiles = await compressImagesForUpload(uniqueFiles, ({ current, total }) => {
        setImageCompressionStatus(`Compressing photos ${current}/${total}...`);
      });
      const validationMessage = getImageValidationMessage(compressedFiles, totalImageCount);
      if (validationMessage) {
        setImageMessage(validationMessage);
        return;
      }

      setImages((current) => {
        const currentKeys = new Set(current.map(getFileKey));
        const uniqueCompressedFiles = compressedFiles.filter((file) => {
          const fileKey = getFileKey(file);
          if (currentKeys.has(fileKey)) return false;
          currentKeys.add(fileKey);
          return true;
        });

        return [...current, ...uniqueCompressedFiles];
      });
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : "One or more photos could not be compressed.");
    } finally {
      setImageCompressionStatus("");
    }
  };

  const resetImageUploadDragState = () => {
    imageUploadDragDepthRef.current = 0;
    setIsImageUploadDragActive(false);
  };

  const handleImageUploadDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    if (!dragEventHasFiles(event.dataTransfer)) return;

    event.preventDefault();
    if (imageUploadDisabled) return;

    imageUploadDragDepthRef.current += 1;
    if (!isImageUploadDragActive) {
      setIsImageUploadDragActive(true);
    }
  };

  const handleImageUploadDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (!dragEventHasFiles(event.dataTransfer)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = imageUploadDisabled ? "none" : "copy";

    if (!imageUploadDisabled && !isImageUploadDragActive) {
      setIsImageUploadDragActive(true);
    }
  };

  const handleImageUploadDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    if (!dragEventHasFiles(event.dataTransfer)) return;

    imageUploadDragDepthRef.current = Math.max(0, imageUploadDragDepthRef.current - 1);
    if (imageUploadDragDepthRef.current === 0) {
      setIsImageUploadDragActive(false);
    }
  };

  const handleImageUploadDrop = (event: DragEvent<HTMLButtonElement>) => {
    if (!dragEventHasFiles(event.dataTransfer)) return;

    event.preventDefault();
    resetImageUploadDragState();

    if (imageUploadDisabled) return;

    void handleImageSelection(event.dataTransfer.files);
  };

  const handleRemoveNewImage = (imageKey: string) => {
    setTouched((current) => ({ ...current, images: true }));
    if (totalImageCount - 1 < MIN_LISTING_IMAGES) {
      setImageMessage("Upload at least 1 image.");
      return;
    }
    setImages((current) => current.filter((file) => getNewImageKey(file) !== imageKey));
    if (draggedImageKey === imageKey) setDraggedImageKey(null);
    if (dropTargetImageKey === imageKey) setDropTargetImageKey(null);
    setImageMessage("");
  };

  const handleRemoveExistingImage = async (imageId: string, imageKey: string) => {
    if (!editId) return;
    setTouched((current) => ({ ...current, images: true }));
    if (totalImageCount - 1 < MIN_LISTING_IMAGES) {
      setImageMessage("Upload at least 1 image.");
      return;
    }

    // Keep the final existing image staged locally when replacement files are already queued.
    // The server applies that removal during save alongside the new uploads.
    if (existingImages.length === 1 && images.length > 0) {
      setStagedRemovedImageIds((current) => (current.includes(imageId) ? current : [...current, imageId]));
      setExistingImages((current) => current.filter((image) => image.id !== imageId));
      if (draggedImageKey === imageKey) setDraggedImageKey(null);
      if (dropTargetImageKey === imageKey) setDropTargetImageKey(null);
      setImageMessage("");
      return;
    }

    setRemovingImageIds((current) => [...current, imageId]);
    try {
      await apiFetch(`/api/listings/${editId}`, { method: "PATCH", body: JSON.stringify({ action: "remove_image", imageId }) });
      invalidateListingCaches(editId);
      setExistingImages((current) => current.filter((image) => image.id !== imageId).map((image, index) => ({ ...image, is_cover: index === 0, sort_order: index })));
      if (draggedImageKey === imageKey) setDraggedImageKey(null);
      if (dropTargetImageKey === imageKey) setDropTargetImageKey(null);
      setImageMessage("");
      enqueueSnackbar("Image removed.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to remove image.", { variant: "error" });
    } finally {
      setRemovingImageIds((current) => current.filter((id) => id !== imageId));
    }
  };

  const handleDocumentSelection = (fileList: FileList | null) => {
    const nextFiles = Array.from(fileList || []);
    if (!nextFiles.length) return;

    setTouched((current) => ({ ...current, documents: true }));

    const currentFileNames = new Set(documents.map((file) => normalizeListingDocumentFileName(file.name)));
    if (isEditMode) {
      existingDocuments.forEach((document) => {
        currentFileNames.add(normalizeListingDocumentFileName(document.file_name));
      });
    }

    let duplicateFileNameFound = false;
    const uniqueFiles = nextFiles.filter((file) => {
      const normalizedFileName = normalizeListingDocumentFileName(file.name);
      if (currentFileNames.has(normalizedFileName)) {
        duplicateFileNameFound = true;
        return false;
      }

      currentFileNames.add(normalizedFileName);
      return true;
    });

    if (!uniqueFiles.length) {
      if (duplicateFileNameFound) {
        setDocumentMessage(LISTING_DOCUMENT_DUPLICATE_FILENAME_MESSAGE);
      }
      return;
    }

    for (const file of uniqueFiles) {
      const validationError = getListingDocumentValidationError(file);
      if (validationError) {
        setDocumentMessage(validationError);
        return;
      }
    }

    setDocumentMessage(duplicateFileNameFound ? LISTING_DOCUMENT_DUPLICATE_FILENAME_MESSAGE : "");
    setDocuments((current) => [...current, ...uniqueFiles]);
  };

  const handleRemoveNewDocument = (documentKey: string) => {
    setTouched((current) => ({ ...current, documents: true }));
    setDocuments((current) => current.filter((file) => getNewDocumentKey(file) !== documentKey));
    setDocumentMessage("");
  };

  const handleRemoveExistingDocument = async (documentId: string) => {
    if (!editId) return;

    setTouched((current) => ({ ...current, documents: true }));
    setRemovingDocumentIds((current) => [...current, documentId]);

    try {
      await apiFetch(`/api/listings/${editId}`, { method: "PATCH", body: JSON.stringify({ action: "remove_document", documentId }) });
      invalidateListingCaches(editId);
      setExistingDocuments((current) => current.filter((document) => document.id !== documentId));
      setDocumentMessage("");
      enqueueSnackbar("Document removed.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to remove document.", { variant: "error" });
    } finally {
      setRemovingDocumentIds((current) => current.filter((id) => id !== documentId));
    }
  };

  const focusFirstError = (nextErrors: ListingErrors) => {
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    const targetId = firstInvalid === "images" ? "listing-images-section" : `${firstInvalid}-field`;
    const target = firstInvalid ? document.getElementById(targetId) : null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) target.focus();
  };

  const resetCreateListingForm = () => {
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
    imageUploadDragDepthRef.current = 0;
    setValues(initialValues);
    setExistingImages([]);
    setExistingDocuments([]);
    setImages([]);
    setDocuments([]);
    setPreviewUrls([]);
    setImageOrder([]);
    setTouched({});
    setSubmitAttempted(false);
    setRemovingImageIds([]);
    setStagedRemovedImageIds([]);
    setRemovingDocumentIds([]);
    setImageMessage("");
    setImageCompressionStatus("");
    setDocumentMessage("");
    setDocumentUploadStatus("");
    setDraggedImageKey(null);
    setDropTargetImageKey(null);
    setIsImageUploadDragActive(false);
    setVideoPreviewUrl("");
  };

  const handleSuccessModalClose = () => {
    setSuccessModalOpen(false);
    resetCreateListingForm();
    router.replace("/post-listing", { scroll: false });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };

  const handleGoToListings = () => {
    setSuccessModalOpen(false);
    router.push("/dashboard/listings");
  };

  const handleBackToWorkspace = () => {
    setSuccessModalOpen(false);
    router.push("/dashboard");
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (isCompressingImages) {
      enqueueSnackbar("Please wait for image compression to finish before saving.", { variant: "warning" });
      return;
    }

    if (removingImageIds.length || removingDocumentIds.length) {
      enqueueSnackbar("Please wait for file updates to finish before saving.", { variant: "warning" });
      return;
    }
    const nextImageMessage = imageMessage || currentImageValidationMessage;
    if (nextImageMessage) {
      setTouched((current) => ({ ...current, images: true }));
      setImageMessage(nextImageMessage);
      focusFirstError({ ...errors, images: nextImageMessage });
      enqueueSnackbar("Please review the highlighted fields.", { variant: "error" });
      return;
    }
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      enqueueSnackbar("Please review the highlighted fields.", { variant: "error" });
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, key === "bedrooms" ? mapBedroomToApi(value) : String(value)));
    orderedNewImages.forEach((file) => formData.append("images", file));
    formData.append("imageOrder", JSON.stringify(orderedPreviewItems.map((item) => item.key)));
    formData.append("removeImageIds", JSON.stringify(stagedRemovedImageIds));

    setSubmitting(true);
    let uploadedDocuments: UploadedListingDocumentMetadata[] = [];
    let shouldCleanupUploadedDocuments = false;

    try {
      let listingId = editId || null;

      if (documents.length) {
        if (!user?.uid) {
          throw new Error("Please sign in again before uploading documents.");
        }

        setDocumentUploadStatus(`Uploading ${documents.length} document${documents.length === 1 ? "" : "s"}...`);
        uploadedDocuments = await uploadListingDocumentsDirectly(user.uid, documents, {
          onProgress: ({ completed, total }) => {
            setDocumentUploadStatus(`Uploading documents ${completed}/${total}...`);
          },
        });
        shouldCleanupUploadedDocuments = true;
      }

      formData.append("documents", JSON.stringify(uploadedDocuments));

      if (editId) {
        await apiFetch<{ success: true }>(`/api/listings/${editId}`, { method: "PUT", body: formData });
        shouldCleanupUploadedDocuments = false;
        enqueueSnackbar("Listing updated.", { variant: "success" });
      } else {
        const response = await apiFetch<{ success: true; listingId: string }>("/api/listings/create", { method: "POST", body: formData });
        shouldCleanupUploadedDocuments = false;
        listingId = response.listingId;
      }
      invalidateListingCaches(listingId || undefined);
      if (editId) {
        router.push("/dashboard/listings");
      } else {
        setSuccessModalOpen(true);
      }
    } catch (error) {
      if (shouldCleanupUploadedDocuments) {
        await removeUploadedListingDocuments(uploadedDocuments.map((document) => document.storage_path));
      }

      enqueueSnackbar(error instanceof Error ? error.message : "Failed to save listing.", { variant: "error" });
    } finally {
      setSubmitting(false);
      setDocumentUploadStatus("");
    }
  };

  const stopImageGalleryDragScroll = () => {
    imageGalleryDragScrollStepRef.current = 0;

    if (imageGalleryDragScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(imageGalleryDragScrollFrameRef.current);
      imageGalleryDragScrollFrameRef.current = null;
    }
  };

  const scheduleImageGalleryDragScroll = (step: number) => {
    imageGalleryDragScrollStepRef.current = step;

    if (step === 0) {
      stopImageGalleryDragScroll();
      return;
    }

    if (imageGalleryDragScrollFrameRef.current !== null) {
      return;
    }

    const scroll = () => {
      const node = imageGalleryScrollRef.current;
      const nextStep = imageGalleryDragScrollStepRef.current;

      if (!node || nextStep === 0) {
        imageGalleryDragScrollFrameRef.current = null;
        return;
      }

      const previousScrollLeft = node.scrollLeft;
      const maxScrollLeft = node.scrollWidth - node.clientWidth;
      node.scrollLeft = Math.min(maxScrollLeft, Math.max(0, previousScrollLeft + nextStep));

      if (Math.abs(node.scrollLeft - previousScrollLeft) < 0.5) {
        imageGalleryDragScrollStepRef.current = 0;
        imageGalleryDragScrollFrameRef.current = null;
        return;
      }

      imageGalleryDragScrollFrameRef.current = window.requestAnimationFrame(scroll);
    };

    imageGalleryDragScrollFrameRef.current = window.requestAnimationFrame(scroll);
  };

  const handleImageGalleryDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggedImageKey) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const node = imageGalleryScrollRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const leftDistance = event.clientX - rect.left;
    const rightDistance = rect.right - event.clientX;
    let nextStep = 0;

    if (leftDistance < IMAGE_GALLERY_DRAG_SCROLL_EDGE_PX) {
      const intensity = Math.max(0, Math.min(1, (IMAGE_GALLERY_DRAG_SCROLL_EDGE_PX - leftDistance) / IMAGE_GALLERY_DRAG_SCROLL_EDGE_PX));
      nextStep = -Math.ceil(intensity * IMAGE_GALLERY_DRAG_SCROLL_MAX_STEP_PX);
    } else if (rightDistance < IMAGE_GALLERY_DRAG_SCROLL_EDGE_PX) {
      const intensity = Math.max(0, Math.min(1, (IMAGE_GALLERY_DRAG_SCROLL_EDGE_PX - rightDistance) / IMAGE_GALLERY_DRAG_SCROLL_EDGE_PX));
      nextStep = Math.ceil(intensity * IMAGE_GALLERY_DRAG_SCROLL_MAX_STEP_PX);
    }

    scheduleImageGalleryDragScroll(nextStep);
  };

  const handleImageGalleryDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const node = imageGalleryScrollRef.current;
    const relatedTarget = event.relatedTarget;
    if (node && relatedTarget instanceof Node && node.contains(relatedTarget)) return;

    stopImageGalleryDragScroll();
  };

  const handleImageGalleryDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggedImageKey) return;

    event.preventDefault();
    stopImageGalleryDragScroll();
    setDraggedImageKey(null);
    setDropTargetImageKey(null);
  };

  const handleImageDragStart = (imageKey: string) => (event: DragEvent<HTMLDivElement>) => {
    if (previewInteractionDisabled) return;
    stopImageGalleryDragScroll();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", imageKey);
    setDraggedImageKey(imageKey);
    setDropTargetImageKey(null);
  };

  const handleImageDragEnter = (imageKey: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!draggedImageKey || draggedImageKey === imageKey) return;
    setDropTargetImageKey(imageKey);
  };

  const handleImageDragOver = (imageKey: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!draggedImageKey || draggedImageKey === imageKey) return;
    event.dataTransfer.dropEffect = "move";
    if (dropTargetImageKey !== imageKey) setDropTargetImageKey(imageKey);
  };

  const handleImageDrop = (imageKey: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    stopImageGalleryDragScroll();
    const sourceKey = draggedImageKey || event.dataTransfer.getData("text/plain");
    if (!sourceKey) return;
    const shouldScrollToCover = imageOrder.indexOf(imageKey) === 0;
    setImageOrder((current) => moveImageKey(current, sourceKey, imageKey));
    setDraggedImageKey(null);
    setDropTargetImageKey(null);

    if (shouldScrollToCover) {
      window.requestAnimationFrame(() => {
        imageGalleryScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      });
    }
  };

  const handleImageDragEnd = () => {
    stopImageGalleryDragScroll();
    setDraggedImageKey(null);
    setDropTargetImageKey(null);
  };

  if (loading || pageLoading || !user) return <LoadingScreen label="Preparing listing form..." />;

  const visibleError = (field: FieldKey) => (!touched[field] && !submitAttempted ? undefined : field === "images" ? imageError : errors[field]);
  const formTitle = isEditMode ? "Edit Listing" : "Create Listing";

  return (
    <AppShell mainClassName="!max-w-[1540px] xl:!px-10">
      <div className="mb-6">
        <ListingProgressCard
          progress={progress}
          backAction={
            <BackButton
              fallbackHref="/dashboard/listings"
              aria-label="Back to Listings"
              className={cn(
                "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-[#e6ebf2] bg-white px-4 py-3 text-sm font-semibold text-brand-navy shadow-[0_12px_26px_rgba(15,42,95,0.05)] transition hover:border-[#d7deea] hover:bg-[#fbfcfe] sm:w-auto"
              )}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Back to Listings</span>
            </BackButton>
          }
          primaryAction={
            <button
              className="btn-accent inline-flex min-h-[52px] w-full shrink-0 items-center justify-center rounded-[16px] border-[#d4af37] bg-[#dfb43a] px-5 py-3 text-sm font-semibold text-brand-navy shadow-[0_16px_28px_rgba(212,175,55,0.24)] hover:bg-[#cfaa34] sm:min-w-[190px] sm:w-auto"
              type="button"
              onClick={handleSubmit}
              disabled={submitting || removingImageIds.length > 0 || removingDocumentIds.length > 0}
            >
              {submitting ? "Saving..." : isEditMode ? "Update Listing" : "Create Listing"}
            </button>
          }
        />
      </div>
      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4 sm:space-y-6">
          <section className="panel overflow-hidden">
            <div className="border-b border-brand-line/80 bg-[#f5f7fa] px-4 py-4 sm:px-8 sm:py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-slate">{formTitle}</p>
              <div className="mt-3 flex flex-col gap-3 lg:mt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
                <div>
                  <h2 className="text-xl font-bold text-brand-ink sm:text-[2rem]">{formTitle}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-slate sm:mt-3">Let&apos;s craft a standout listing that gets attention.</p>
                </div>
              </div>
            </div>
            <div className="space-y-5 px-4 py-4 sm:space-y-8 sm:px-8 sm:py-8">
              <SectionCard title="Core Details">
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                  <Field label="Listing title" required error={visibleError("title")} id="title-field">
                    <input id="title-field" className={inputClass(Boolean(visibleError("title")))} value={values.title} onBlur={() => handleBlur("title")} onChange={(event) => updateField("title", event.target.value)} placeholder="Luxury 3BR in Downtown with Burj views" />
                  </Field>
                  <Field label="Property type" required error={visibleError("propertyType")} id="propertyType-field">
                    <SelectWrap>
                      <select id="propertyType-field" className={inputClass(Boolean(visibleError("propertyType")), "appearance-none pr-11")} value={values.propertyType} onBlur={() => handleBlur("propertyType")} onChange={(event) => updateField("propertyType", event.target.value as ListingFormValues["propertyType"])}>
                        <option value="" style={SELECT_OPTION_STYLE}>Select Property Type</option>
                        {PROPERTY_TYPE_OPTIONS.map((type) => <option key={type} value={type} style={SELECT_OPTION_STYLE}>{formatPropertyType(type)}</option>)}
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Area" required error={visibleError("areaId")} id="areaId-field">
                    <SelectWrap>
                      <select id="areaId-field" className={inputClass(Boolean(visibleError("areaId")), "appearance-none pr-11")} value={values.areaId} onBlur={() => handleBlur("areaId")} onChange={(event) => updateField("areaId", event.target.value)}>
                        <option value="" style={SELECT_OPTION_STYLE}>Select Area</option>
                        {areas.map((area) => <option key={area.id} value={area.id} style={SELECT_OPTION_STYLE}>{area.name}</option>)}
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Deal type" required error={visibleError("dealType")} id="dealType-field">
                    <SelectWrap>
                      <select id="dealType-field" className={inputClass(Boolean(visibleError("dealType")), "appearance-none pr-11")} value={values.dealType} onBlur={() => handleBlur("dealType")} onChange={(event) => updateField("dealType", event.target.value as ListingFormValues["dealType"])}>
                        <option value="" style={SELECT_OPTION_STYLE}>Select Deal Type</option>
                        {DEAL_TYPE_OPTIONS.map((type) => <option key={type} value={type} style={SELECT_OPTION_STYLE}>{formatDealType(type)}</option>)}
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Price" required error={visibleError("price")} id="price-field">
                    <input id="price-field" className={inputClass(Boolean(visibleError("price")))} value={values.price} onBlur={() => handleBlur("price")} onChange={handleNumberChange("price")} placeholder="2850000" inputMode="decimal" />
                  </Field>
                  <Field label="Size (sqft)" required error={visibleError("sizeSqft")} id="sizeSqft-field">
                    <input id="sizeSqft-field" className={inputClass(Boolean(visibleError("sizeSqft")))} value={values.sizeSqft} onBlur={() => handleBlur("sizeSqft")} onChange={handleNumberChange("sizeSqft")} placeholder="2140" inputMode="decimal" />
                  </Field>
                  <Field label="Bedrooms" required error={visibleError("bedrooms")} id="bedrooms-field">
                    <SelectWrap>
                      <select id="bedrooms-field" className={inputClass(Boolean(visibleError("bedrooms")), "appearance-none pr-11")} value={values.bedrooms} onBlur={() => handleBlur("bedrooms")} onChange={(event) => updateField("bedrooms", event.target.value)}>
                        <option value="" style={SELECT_OPTION_STYLE}>Select Bedrooms</option>
                        {BEDROOM_OPTIONS.map((option) => <option key={option.value} value={option.value} style={SELECT_OPTION_STYLE}>{option.label}</option>)}
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Developer" required error={visibleError("developer")} id="developer-field">
                    <input id="developer-field" className={inputClass(Boolean(visibleError("developer")))} value={values.developer} onBlur={() => handleBlur("developer")} onChange={(event) => updateField("developer", event.target.value)} placeholder="Emaar" />
                  </Field>
                </div>
              </SectionCard>
              <SectionCard title="Commercial Terms">
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                  <Field label="Payment plan" id="paymentPlan-field">
                    <input id="paymentPlan-field" className={inputClass(false)} value={values.paymentPlan} onChange={(event) => updateField("paymentPlan", event.target.value)} placeholder="60/40 post-handover" />
                  </Field>
                  <Field label="Handover date" error={visibleError("handoverDate")} id="handoverDate-field">
                    <input
                      id="handoverDate-field"
                      type="date"
                      min={minimumHandoverDate}
                      className={inputClass(Boolean(visibleError("handoverDate")))}
                      value={values.handoverDate}
                      onBlur={() => handleBlur("handoverDate")}
                      onChange={(event) => updateField("handoverDate", event.target.value)}
                    />
                  </Field>
                  <Field label="Yield percent" error={visibleError("yieldPercent")} id="yieldPercent-field">
                    <input id="yieldPercent-field" className={inputClass(Boolean(visibleError("yieldPercent")))} value={values.yieldPercent} onBlur={() => handleBlur("yieldPercent")} onChange={handleNumberChange("yieldPercent")} placeholder="6.5" inputMode="decimal" />
                  </Field>
                  <Field label="Co-broke percent" error={visibleError("coBrokePercent")} id="coBrokePercent-field">
                    <input id="coBrokePercent-field" className={inputClass(Boolean(visibleError("coBrokePercent")))} value={values.coBrokePercent} onBlur={() => handleBlur("coBrokePercent")} onChange={handleNumberChange("coBrokePercent")} placeholder="2" inputMode="decimal" />
                  </Field>
                  <div className="lg:col-span-2">
                    <Field label="Payment terms" id="paymentTerms-field">
                      <textarea id="paymentTerms-field" className={inputClass(false, "min-h-[110px] sm:min-h-[120px]")} value={values.paymentTerms} onChange={(event) => updateField("paymentTerms", event.target.value)} placeholder="Commission payable on SPA or transfer." />
                    </Field>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Descriptions & Notes">
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                  <Field label="Description" required error={visibleError("description")} id="description-field">
                    <textarea id="description-field" className={inputClass(Boolean(visibleError("description")), "min-h-[112px] sm:min-h-[130px]")} value={values.description} onBlur={() => handleBlur("description")} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe the layout, views, handover status, and what makes the deal compelling." />
                  </Field>
                  <Field label="Notes" id="notes-field">
                    <textarea id="notes-field" className={inputClass(false, "min-h-[112px] sm:min-h-[130px]")} value={values.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Qualified buyers only, owner motivated, direct instruction, etc." />
                  </Field>
                </div>
              </SectionCard>

              <ListingMediaLinks
                editable
                inputId="propertyVideoUrl-field"
                url={values.propertyVideoUrl}
                previewUrl={videoPreviewUrl}
                onUrlChange={(nextValue) => updateField("propertyVideoUrl", nextValue)}
                onPreviewClick={() => setVideoPreviewUrl(values.propertyVideoUrl)}
              />
            </div>
          </section>
         
        </div>

        <div className="space-y-4 sm:space-y-6 xl:sticky xl:top-28">
          <section id="listing-images-section" className="panel overflow-hidden rounded-[18px] border border-[#dbe4ef] shadow-[0_24px_54px_rgba(15,42,95,0.08)] sm:rounded-[30px]">
            <div className="relative border-b border-[#e8edf4] bg-[#f5f7fa] px-4 py-4 sm:px-6 sm:py-7">
              <p className="mb-3 inline-flex rounded-full border border-[#d7e0eb] bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-slate shadow-[0_12px_24px_rgba(15,42,95,0.06)] sm:absolute sm:right-5 sm:top-4 sm:mb-0 sm:px-4 sm:tracking-[0.2em]">
                {orderedPreviewItems.length} / {MAX_LISTING_IMAGES} photos
              </p>

              <div className="flex items-start justify-between">
                <div className="max-w-[30rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#97a4b8]">
                    Visual gallery
                  </p>

                  <div className="mt-2 items-center gap-3 sm:mt-3 sm:gap-4">
                    <h2 className="break-words text-xl font-bold text-brand-ink sm:whitespace-nowrap sm:text-[1.55rem]">
                      Visual gallery
                    </h2>
                    <p className="text-sm leading-6 text-brand-slate">
                      High-quality listing photos, hero shots, or teaser renders. 
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 px-3 py-3 sm:space-y-4 sm:px-5 sm:py-5">
              <input
                ref={imageInputRef}
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                multiple
                className="hidden"
                onChange={(event) => {
                  void handleImageSelection(event.target.files);
                  event.target.value = "";
                }}
                disabled={imageUploadDisabled}
              />
              <div className="rounded-[18px] border border-[#dee6ef] bg-white p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98)] sm:rounded-[28px] sm:p-4">
                {orderedPreviewItems.length ? (
                  <div
                    ref={imageGalleryScrollRef}
                    onDragOver={handleImageGalleryDragOver}
                    onDragLeave={handleImageGalleryDragLeave}
                    onDrop={handleImageGalleryDrop}
                    className="flex touch-pan-x gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none pb-2 pr-1 sm:gap-4"
                  >
                    {orderedPreviewItems.map((item, index) => (
                      <ImagePreviewTile
                        key={item.key}
                        title={item.title}
                        imageUrl={item.imageUrl}
                        isCover={index === 0}
                        isDragging={draggedImageKey === item.key}
                        isDropTarget={dropTargetImageKey === item.key && draggedImageKey !== item.key}
                        disabled={previewInteractionDisabled}
                        className={
                          orderedPreviewItems.length === 1
                            ? "w-full"
                            : index === 0
                              ? "w-[min(100%,14.5rem)] sm:w-[14.5rem] lg:w-[15.5rem]"
                              : "w-[9.25rem] sm:w-[9.75rem] lg:w-[10.5rem]"
                        }
                        onDragStart={handleImageDragStart(item.key)}
                        onDragEnter={handleImageDragEnter(item.key)}
                        onDragOver={handleImageDragOver(item.key)}
                        onDrop={handleImageDrop(item.key)}
                        onDragEnd={handleImageDragEnd}
                        removeDisabled={submitting || (item.kind === "existing" && removingImageIds.includes(item.image.id))}
                        onRemove={item.kind === "existing" ? () => handleRemoveExistingImage(item.image.id, item.key) : () => handleRemoveNewImage(item.key)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[140px] items-center justify-center rounded-[18px] border border-dashed border-[#d7e0eb] bg-[#f8fafc] px-4 py-5 text-center sm:min-h-[210px] sm:rounded-[24px] sm:px-6 sm:py-8">
                    <div className="max-w-[18rem]">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#5f9d79] text-white shadow-[0_16px_28px_rgba(15,42,95,0.18)] sm:h-14 sm:w-14">
                        <UploadIcon />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-brand-ink sm:mt-4 sm:text-base">No photos added yet</p>
                      <p className="mt-1.5 text-sm leading-6 text-brand-slate sm:mt-2">Start with the best hero shot, or view image to build a stronger first impression.</p>
                    </div>
                  </div>
                )}

                <button
                  id="images-field"
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  onDragEnter={handleImageUploadDragEnter}
                  onDragOver={handleImageUploadDragOver}
                  onDragLeave={handleImageUploadDragLeave}
                  onDrop={handleImageUploadDrop}
                  disabled={imageUploadDisabled}
                  className={cn(
                    "mt-3 w-full rounded-[18px] border border-dashed px-3 py-3 text-center transition duration-200 sm:mt-4 sm:rounded-[24px] sm:px-4 sm:py-5",
                    isImageUploadDragActive
                      ? "border-brand-blue/45 bg-[#eef4ff] shadow-[0_18px_34px_rgba(46,79,140,0.12)]"
                      : "border-[#d7e0eb] bg-[#f8fafc] hover:border-brand-blue/35 hover:bg-white",
                    imageUploadDisabled ? "cursor-not-allowed opacity-70" : ""
                  )}
                >
                  <div className="pointer-events-none flex flex-col items-center gap-2 sm:gap-3">
                    <div
                      className={cn(
                        "inline-flex max-w-full items-center gap-2 rounded-full border bg-white px-3 py-2 shadow-[0_14px_26px_rgba(15,42,95,0.08)] sm:gap-3 sm:px-5 sm:py-3",
                        isImageUploadDragActive ? "border-[#b9cae8] shadow-[0_18px_30px_rgba(46,79,140,0.12)]" : "border-[#dfe6ef]"
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5f9d79] text-white sm:h-9 sm:w-9">
                        <PlusIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 break-words text-sm font-semibold text-brand-ink sm:text-base">
                        {imageCompressionStatus ? "Compressing Photos" : remainingImageSlots ? "Upload Photos" : "Image limit reached"}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {imageCompressionStatus ? (
                <p className="break-words text-sm font-medium text-brand-slate">{imageCompressionStatus}</p>
              ) : (touched.images || submitAttempted || imageMessage) && imageError ? (
                <p className="break-words text-sm font-medium text-[#c65345]">{imageError}</p>
              ) : (
                <div className="flex flex-col gap-2 text-sm text-brand-slate sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-words">Upload up to {MAX_LISTING_IMAGES} photos. JPG, JPEG, PNG, and HEIC images are supported. Drag the cards to reorder the gallery.</p>
                  
                </div>
              )}
            </div>
          </section>

          <section className="panel overflow-hidden rounded-[18px] border border-[#dbe4ef] shadow-[0_24px_54px_rgba(15,42,95,0.08)] sm:rounded-[30px]">
            <div className="relative border-b border-[#e8edf4] bg-[#f5f7fa] px-4 py-4 sm:px-6 sm:py-7">
              <p className="mb-3 inline-flex rounded-full border border-[#d7e0eb] bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-slate shadow-[0_12px_24px_rgba(15,42,95,0.06)] sm:absolute sm:right-5 sm:top-4 sm:mb-0 sm:px-4 sm:tracking-[0.2em]">
                {totalDocumentCount} file{totalDocumentCount === 1 ? "" : "s"}
              </p>

              <div className="flex items-start justify-between">
                <div className="max-w-[30rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#97a4b8]">Supporting files</p>
                  <div className="mt-2 items-center gap-3 sm:mt-3 sm:gap-4">
                    <h2 className="break-words text-xl font-bold text-brand-ink sm:whitespace-nowrap sm:text-[1.55rem]">Supporting files</h2>
                    <p className="text-sm leading-6 text-brand-slate">
                      Upload {getListingDocumentAllowedFormatsLabel()} files up to {LISTING_DOCUMENT_MAX_SIZE_LABEL} each.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 px-3 py-3 sm:space-y-4 sm:px-5 sm:py-5">
              <input
                ref={documentInputRef}
                type="file"
                accept={LISTING_DOCUMENT_ACCEPT}
                multiple
                className="hidden"
                onChange={(event) => {
                  handleDocumentSelection(event.target.files);
                  event.target.value = "";
                }}
                disabled={documentUploadDisabled}
              />
              <div className="rounded-[18px] border border-[#dee6ef] bg-white p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98)] sm:rounded-[28px] sm:p-4">
                {totalDocumentCount ? (
                  <div className="space-y-3 rounded-[18px] border border-[#dee6ef] bg-white p-3 shadow-[0_18px_34px_rgba(15,42,95,0.06)] sm:rounded-[24px] sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-brand-ink">Attached documents</p>
                        <p className="mt-1 text-xs leading-5 text-brand-slate">Keep only the files you want to ship with this listing.</p>
                      </div>
                      <p className="rounded-full border border-[#dbe3ec] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-slate">
                        Ready to submit
                      </p>
                    </div>
                    <div className="space-y-3">
                      {existingDocuments.map((document) => (
                        <DocumentListItem
                          key={getExistingDocumentKey(document)}
                          title={document.file_name}
                          meta="Already attached to this listing."
                          removeLabel={removingDocumentIds.includes(document.id) ? "Removing..." : "Remove"}
                          removeDisabled={submitting || removingDocumentIds.includes(document.id)}
                          onRemove={() => handleRemoveExistingDocument(document.id)}
                        />
                      ))}
                      {documents.map((file) => (
                        <DocumentListItem
                          key={getNewDocumentKey(file)}
                          title={file.name}
                          meta="Queued to upload when you save."
                          removeLabel="Remove"
                          removeDisabled={submitting}
                          onRemove={() => handleRemoveNewDocument(getNewDocumentKey(file))}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[140px] items-center justify-center rounded-[18px] border border-dashed border-[#d7e0eb] bg-[#f8fafc] px-4 py-5 text-center sm:min-h-[210px] sm:rounded-[24px] sm:px-6 sm:py-8">
                    <div className="max-w-[18rem]">
                      <div className="mx-auto inline-flex items-center justify-center rounded-full border border-[#7bb08f] bg-[#5f9d79] p-2.5 text-white shadow-[0_16px_28px_rgba(95,157,121,0.22)] sm:p-3">
                        <EyeIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-brand-ink sm:mt-4 sm:text-base">No documents added yet</p>
                      <p className="mt-1.5 text-sm leading-6 text-brand-slate sm:mt-2">
                        Add brochures, pricing sheets, floor plans, or research notes to support the listing.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  id="documents-field"
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={documentUploadDisabled}
                  className={cn(
                    "mt-3 w-full rounded-[18px] border border-dashed px-3 py-3 text-center transition duration-200 sm:mt-4 sm:rounded-[24px] sm:px-4 sm:py-5",
                    "border-[#d7e0eb] bg-[#f8fafc] hover:border-brand-blue/35 hover:bg-white",
                    documentUploadDisabled ? "cursor-not-allowed opacity-70" : ""
                  )}
                >
                  <div className="pointer-events-none flex flex-col items-center gap-2 sm:gap-3">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#dfe6ef] bg-white px-3 py-2 shadow-[0_14px_26px_rgba(15,42,95,0.08)] sm:gap-3 sm:px-5 sm:py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5f9d79] text-white sm:h-9 sm:w-9">
                        <PlusIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 break-words text-sm font-semibold text-brand-ink sm:text-base">Upload Document</span>
                    </div>
                  </div>
                </button>
              </div>
              {documentUploadStatus ? (
                <p className="break-words text-sm font-medium text-brand-slate">{documentUploadStatus}</p>
              ) : documentMessage ? (
                <p className="break-words text-sm font-medium text-[#c65345]">{documentMessage}</p>
              ) : (
                <p className="break-words text-sm leading-6 text-brand-slate">
                  Supported files: {getListingDocumentAllowedFormatsLabel()}. Maximum {LISTING_DOCUMENT_MAX_SIZE_LABEL} per document.
                </p>
              )}
            </div>
          </section>

        </div>
      </div>
      <ListingSubmittedSuccessModal
        open={successModalOpen}
        onClose={handleSuccessModalClose}
        onGoToListings={handleGoToListings}
        onBackToWorkspace={handleBackToWorkspace}
      />
    </AppShell>
  );
}
