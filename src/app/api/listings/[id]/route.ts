import { NextRequest, NextResponse } from "next/server";
import {
  getRequestUser,
  getServiceSupabase,
  jsonError,
  LISTING_SELECT,
  requireApprovedBroker,
} from "@/lib/deal-server";
import { fetchChatUserSummaries, hydrateListings } from "@/lib/platform-server-data";
import {
  isActiveBrokerStatus,
  isActiveListingStatus,
  parseNumber,
} from "@/lib/deal-utils";
import type { Listing, ListingDocument, PlatformUser } from "@/lib/deal-types";
import { getListingDocumentValidationError } from "@/lib/document-upload";
import { getHandoverDateValidationMessage } from "@/lib/handover-date";
import { getImageUploadValidationError } from "@/lib/image-upload";
import { normalizeListingMediaUrl } from "@/lib/listing-media";

const MIN_LISTING_IMAGES = 1;
const MAX_LISTING_IMAGES = 10;
const EXISTING_IMAGE_KEY_PREFIX = "existing:";
const NEW_IMAGE_KEY_PREFIX = "new:";
const LISTING_ACTIVITY_FIELD_NAMES = [
  "title",
  "property_type",
  "deal_type",
  "bedrooms",
  "size_sqft",
  "area_id",
  "developer",
  "price",
  "payment_plan",
  "handover_date",
  "yield_percent",
  "property_video_url",
  "notes",
  "description",
] as const;

type ListingConversationRow = {
  id: string;
  broker_user_id: string | null;
  last_message_id?: string | null;
};

type LegacyChatMessageRow = {
  sender_id: string;
};

async function fetchListingEngagementMetrics(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  ownerUserId: string
) {
  const [enquiriesResult, conversationsResult, legacyMessagesResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("listing_id", listingId),
    supabase.from("chat_conversations").select("id, broker_user_id, last_message_id").eq("listing_id", listingId),
    supabase.from("chat_messages").select("sender_id").eq("listing_id", listingId),
  ]);

  if (enquiriesResult.error) {
    throw new Error(enquiriesResult.error.message || "Failed to load enquiries count.");
  }

  if (conversationsResult.error) {
    throw new Error(conversationsResult.error.message || "Failed to load broker engagement count.");
  }

  if (legacyMessagesResult.error) {
    throw new Error(legacyMessagesResult.error.message || "Failed to load broker engagement count.");
  }

  const conversations = ((conversationsResult.data || []) as ListingConversationRow[]).filter((conversation) => conversation.id);
  const engagedBrokerIds = new Set<string>();

  conversations.forEach((conversation) => {
    if (conversation.broker_user_id && conversation.broker_user_id !== ownerUserId && conversation.last_message_id) {
      engagedBrokerIds.add(conversation.broker_user_id);
    }
  });

  const legacySenderIds = Array.from(
    new Set(
      ((legacyMessagesResult.data || []) as LegacyChatMessageRow[])
        .map((message) => message.sender_id)
        .filter((senderId) => senderId && senderId !== ownerUserId)
    )
  );

  if (legacySenderIds.length) {
    const legacySendersResult = await supabase.from("users").select("id, role").in("id", legacySenderIds);

    if (legacySendersResult.error) {
      throw new Error(legacySendersResult.error.message || "Failed to load broker engagement count.");
    }

    ((legacySendersResult.data || []) as Array<Pick<PlatformUser, "id" | "role">>).forEach((sender) => {
      if (sender.role === "broker") {
        engagedBrokerIds.add(sender.id);
      }
    });
  }

  return {
    enquiryCount: enquiriesResult.count || 0,
    brokersEngagedCount: engagedBrokerIds.size,
  };
}

function assertOwnerOrAdmin(listing: Pick<Listing, "created_by">, user: Pick<PlatformUser, "id" | "role">) {
  return user.role === "admin" || listing.created_by === user.id;
}

function getListingImageValidationError(files: File[], existingImageCount = 0) {
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
    return "You can upload a maximum of 10 images per listing.";
  }

  return "";
}

async function uploadListingImages(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  userId: string,
  files: File[]
) {
  const existingImagesResult = await supabase
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const existingCountResult = await supabase
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  const currentImageCount = existingCountResult.count || 0;
  if (currentImageCount + files.length > MAX_LISTING_IMAGES) {
    throw new Error("You can upload a maximum of 10 images per listing.");
  }

  let nextSortOrder = (existingImagesResult.data?.[0]?.sort_order || 0) + (existingImagesResult.data?.length ? 1 : 0);
  const uploadedImageIds: string[] = [];

  for (const file of files) {
    const validationError = getImageUploadValidationError(file, {
      label: file.name,
      validateSize: true,
    });

    if (validationError) {
      throw new Error(validationError);
    }

    const path = `${userId}/${listingId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, file, {
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload image.");
    }

    const { data: publicUrl } = supabase.storage.from("listing-images").getPublicUrl(path);

    const { data: imageRecord, error: imageError } = await supabase
      .from("listing_images")
      .insert({
        listing_id: listingId,
        file_name: file.name,
        storage_path: path,
        public_url: publicUrl.publicUrl,
        sort_order: nextSortOrder,
        is_cover: nextSortOrder === 0,
      })
      .select("id")
      .single();

    if (imageError || !imageRecord) {
      throw new Error(imageError.message || "Failed to save image.");
    }

    uploadedImageIds.push(imageRecord.id);
    nextSortOrder += 1;
  }

  return uploadedImageIds;
}

async function uploadListingDocuments(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  userId: string,
  files: File[]
) {
  for (const file of files) {
    const validationError = getListingDocumentValidationError(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const path = `${userId}/${listingId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("listing-documents").upload(path, file, {
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload document.");
    }

    const { data: publicUrl } = supabase.storage.from("listing-documents").getPublicUrl(path);
    const { error: documentError } = await supabase.from("listing_documents").insert({
      listing_id: listingId,
      file_name: file.name,
      storage_path: path,
      public_url: publicUrl.publicUrl,
    });

    if (documentError) {
      throw new Error(documentError.message || "Failed to save document.");
    }
  }
}

async function removeListingImage(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  imageId: string
) {
  const imageCountResult = await supabase
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  const currentImageCount = imageCountResult.count || 0;
  if (currentImageCount <= MIN_LISTING_IMAGES) {
    throw new Error("At least 1 image is required for a listing.");
  }

  const { data: imageRow } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path")
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (!imageRow) {
    throw new Error("Image not found.");
  }

  if (imageRow.storage_path) {
    const { error: storageError } = await supabase.storage.from("listing-images").remove([imageRow.storage_path]);
    if (storageError) {
      throw new Error(storageError.message || "Failed to remove image file.");
    }
  }

  const { error: deleteError } = await supabase.from("listing_images").delete().eq("id", imageId).eq("listing_id", listingId);
  if (deleteError) {
    throw new Error(deleteError.message || "Failed to remove image.");
  }

  await normalizeListingImageOrder(supabase, listingId);
}

async function normalizeListingImageOrder(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string
) {
  const { data: remainingImages, error: remainingError } = await supabase
    .from("listing_images")
    .select("id")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (remainingError) {
    throw new Error(remainingError.message || "Failed to reload remaining images.");
  }

  await Promise.all(
    (remainingImages || []).map((image, index) =>
      supabase
        .from("listing_images")
        .update({
          sort_order: index,
          is_cover: index === 0,
        })
        .eq("id", image.id)
      )
  );
}

async function removeListingImages(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  imageIds: string[]
) {
  const normalizedImageIds = imageIds.filter((imageId, index, collection) => !!imageId && collection.indexOf(imageId) === index);
  if (!normalizedImageIds.length) {
    return;
  }

  const { data: imageRows, error: imageLoadError } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path")
    .eq("listing_id", listingId)
    .in("id", normalizedImageIds);

  if (imageLoadError) {
    throw new Error(imageLoadError.message || "Failed to load images for removal.");
  }

  if ((imageRows || []).length !== normalizedImageIds.length) {
    throw new Error("One or more images could not be found.");
  }

  const storagePaths = (imageRows || []).map((image) => image.storage_path).filter(Boolean);
  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage.from("listing-images").remove(storagePaths);
    if (storageError) {
      throw new Error(storageError.message || "Failed to remove image file.");
    }
  }

  const { error: deleteError } = await supabase.from("listing_images").delete().eq("listing_id", listingId).in("id", normalizedImageIds);
  if (deleteError) {
    throw new Error(deleteError.message || "Failed to remove image.");
  }

  await normalizeListingImageOrder(supabase, listingId);
}

async function removeListingDocument(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  documentId: string
) {
  const { data: documentRow } = await supabase
    .from("listing_documents")
    .select("id, listing_id, storage_path")
    .eq("id", documentId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (!documentRow) {
    throw new Error("Document not found.");
  }

  if (documentRow.storage_path) {
    const { error: storageError } = await supabase.storage.from("listing-documents").remove([documentRow.storage_path]);
    if (storageError) {
      throw new Error(storageError.message || "Failed to remove document file.");
    }
  }

  const { error: deleteError } = await supabase.from("listing_documents").delete().eq("id", documentId).eq("listing_id", listingId);
  if (deleteError) {
    throw new Error(deleteError.message || "Failed to remove document.");
  }
}

function buildListingPayload(source: Record<string, FormDataEntryValue | string | null | undefined>) {
  return {
    title: String(source.title || "").trim(),
    property_type: String(source.propertyType || source.property_type || "apartment"),
    deal_type: String(source.dealType || source.deal_type || "secondary"),
    bedrooms: parseNumber(String(source.bedrooms || "")),
    size_sqft: parseNumber(String(source.sizeSqft || source.size_sqft || "")),
    area_id: String(source.areaId || source.area_id || "").trim() || null,
    developer: String(source.developer || "").trim() || null,
    price: Number(source.price || 0),
    payment_plan: String(source.paymentPlan || source.payment_plan || "").trim() || null,
    handover_date: String(source.handoverDate || source.handover_date || "").trim() || null,
    yield_percent: parseNumber(String(source.yieldPercent || source.yield_percent || "")),
    property_video_url: normalizeListingMediaUrl(String(source.propertyVideoUrl || source.property_video_url || "")),
    notes: String(source.notes || "").trim() || null,
    description: String(source.description || "").trim() || null,
  };
}

type ListingActivityFieldName = (typeof LISTING_ACTIVITY_FIELD_NAMES)[number];
type ListingActivityValue = string | number | boolean | null;
type ListingActivityChangedField = {
  field: string;
  previousValue: ListingActivityValue;
  nextValue: ListingActivityValue;
};
type ListingActivitySource = Pick<Listing, ListingActivityFieldName>;

function normalizeListingActivityValue(value: unknown): ListingActivityValue {
  if (value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
}

function areListingActivityValuesEqual(left: ListingActivityValue, right: ListingActivityValue) {
  if (left === null && right === null) {
    return true;
  }

  if (typeof left === "number" || typeof right === "number") {
    return Number(left) === Number(right);
  }

  return left === right;
}

function buildListingActivityChangedFields(
  existing: ListingActivitySource,
  payload: ReturnType<typeof buildListingPayload>
): ListingActivityChangedField[] {
  return LISTING_ACTIVITY_FIELD_NAMES.flatMap((field) => {
    const previousValue = normalizeListingActivityValue(existing[field]);
    const nextValue = normalizeListingActivityValue(payload[field]);

    if (areListingActivityValuesEqual(previousValue, nextValue)) {
      return [];
    }

    return [{ field, previousValue, nextValue }];
  });
}

function buildListingAssetActivityChangedFields({
  documentFiles,
  existingImageIds,
  imageFiles,
  imageOrder,
  normalizedRemoveImageIds,
}: {
  documentFiles: File[];
  existingImageIds: string[];
  imageFiles: File[];
  imageOrder: string[];
  normalizedRemoveImageIds: string[];
}): ListingActivityChangedField[] {
  const changedFields: ListingActivityChangedField[] = [];
  const imageChangeParts = [];

  if (imageFiles.length) {
    imageChangeParts.push(`${imageFiles.length} image${imageFiles.length === 1 ? "" : "s"} added`);
  }

  if (normalizedRemoveImageIds.length) {
    imageChangeParts.push(`${normalizedRemoveImageIds.length} image${normalizedRemoveImageIds.length === 1 ? "" : "s"} removed`);
  }

  const existingOrderFromPayload = imageOrder
    .filter((key) => key.startsWith(EXISTING_IMAGE_KEY_PREFIX))
    .map((key) => key.slice(EXISTING_IMAGE_KEY_PREFIX.length));
  const remainingExistingImageIds = existingImageIds.filter((imageId) => !normalizedRemoveImageIds.includes(imageId));
  const existingImageOrderChanged =
    existingOrderFromPayload.length === remainingExistingImageIds.length &&
    existingOrderFromPayload.some((imageId, index) => imageId !== remainingExistingImageIds[index]);

  if (existingImageOrderChanged) {
    imageChangeParts.push("image order updated");
  }

  if (imageChangeParts.length) {
    changedFields.push({
      field: "listing_images",
      previousValue: null,
      nextValue: imageChangeParts.join(", "),
    });
  }

  if (documentFiles.length) {
    changedFields.push({
      field: "listing_documents",
      previousValue: null,
      nextValue: `${documentFiles.length} document${documentFiles.length === 1 ? "" : "s"} added`,
    });
  }

  return changedFields;
}

function parseImageOrder(value: FormDataEntryValue | string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseStringArray(value: FormDataEntryValue | string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function reorderListingImages(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  orderedImageIds: string[]
) {
  const normalizedOrder = orderedImageIds.filter((imageId, index, collection) => !!imageId && collection.indexOf(imageId) === index);

  const { data: currentImages, error: loadError } = await supabase
    .from("listing_images")
    .select("id")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (loadError) {
    throw new Error(loadError.message || "Failed to load images for reordering.");
  }

  const currentImageIds = (currentImages || []).map((image) => image.id);
  if (normalizedOrder.length !== currentImageIds.length || normalizedOrder.some((imageId) => !currentImageIds.includes(imageId))) {
    throw new Error("Image reorder payload is invalid.");
  }

  const updates = await Promise.all(
    normalizedOrder.map((imageId, index) =>
      supabase
        .from("listing_images")
        .update({
          sort_order: index,
          is_cover: index === 0,
        })
        .eq("id", imageId)
        .eq("listing_id", listingId)
    )
  );

  const failedUpdate = updates.find((result) => result.error);
  if (failedUpdate?.error) {
    throw new Error(failedUpdate.error.message || "Failed to save image order.");
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServiceSupabase();
  const viewer = await getRequestUser(request);

  const { data: listingRow } = await supabase.from("listings").select(LISTING_SELECT).eq("id", params.id).maybeSingle();

  if (!listingRow || listingRow.deleted_at) {
    return jsonError("Listing not found.", 404);
  }

  const isOwner = !!viewer && viewer.id === listingRow.created_by;
  const isAdmin = viewer?.role === "admin";
  const isPubliclyVisible = isActiveListingStatus(listingRow.status) && listingRow.is_visible;
  const canSeeInternal = !!viewer && (isAdmin || isOwner || (isActiveBrokerStatus(viewer.status) && isPubliclyVisible));

  if (!isPubliclyVisible && !canSeeInternal) {
    return jsonError("Listing not found.", 404);
  }

  const canViewDocuments = !!viewer && (isOwner || isAdmin);
  let listing: Listing;
  let documentsResult: { data: ListingDocument[] | null; error: { message?: string } | null };
  let engagementMetrics: Awaited<ReturnType<typeof fetchListingEngagementMetrics>>;
  let publicBroker: Listing["public_broker"] = null;

  try {
    const [hydratedListings, loadedDocumentsResult, loadedEngagementMetrics, brokerSummaries] = await Promise.all([
      hydrateListings(supabase, [listingRow as Listing], {
        includeAgencies: canSeeInternal,
        includeCommissionTerms: canSeeInternal,
        includeOwnerActiveCount: canSeeInternal,
        includeOwners: canSeeInternal,
      }),
      canViewDocuments
        ? supabase
            .from("listing_documents")
            .select("id, listing_id, file_name, storage_path, public_url")
            .eq("listing_id", params.id)
        : Promise.resolve({ data: [] as ListingDocument[] | null, error: null }),
      fetchListingEngagementMetrics(supabase, params.id, listingRow.created_by),
      fetchChatUserSummaries(supabase, [listingRow.created_by]),
    ]);

    listing = hydratedListings[0];
    documentsResult = loadedDocumentsResult as { data: ListingDocument[] | null; error: { message?: string } | null };
    engagementMetrics = loadedEngagementMetrics;
    const brokerSummary = brokerSummaries[0];
    publicBroker =
      brokerSummary || listing.owner
        ? {
            first_name: brokerSummary?.first_name ?? listing.owner?.first_name ?? null,
            last_name: brokerSummary?.last_name ?? listing.owner?.last_name ?? null,
            profile_photo: brokerSummary?.profile_photo ?? null,
          }
        : null;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load listing detail.", 500);
  }
  const viewerCanChat = !!viewer && viewer.role === "broker" && isActiveBrokerStatus(viewer.status) && viewer.id !== listing.created_by;

  if (documentsResult.error) {
    return jsonError(documentsResult.error.message || "Failed to load listing documents.", 500);
  }

  return NextResponse.json({
    listing: {
      ...listing,
      can_edit: isOwner,
      can_chat: viewerCanChat,
      enquiry_count: engagementMetrics.enquiryCount,
      brokers_engaged_count: engagementMetrics.brokersEngagedCount,
      commission_terms: canSeeInternal ? listing.commission_terms : null,
      listing_documents: (documentsResult.data as ListingDocument[] | null) || [],
      public_broker: publicBroker,
      owner: canSeeInternal ? listing.owner : null,
      agency: canSeeInternal ? listing.agency : null,
      owner_active_listings_count: canSeeInternal ? listing.owner_active_listings_count : null,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const { action, imageId, documentId } = await request.json();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, created_by, status, is_visible, deleted_at, approved_at, approval_notification_read_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!listing || listing.deleted_at) {
    return jsonError("Listing not found.", 404);
  }

  if (!assertOwnerOrAdmin(listing, auth.user)) {
    return jsonError("You can only manage your own listings.", 403);
  }

  switch (action) {
    case "mark_approval_read": {
      if (!listing.approved_at) {
        return jsonError("Approval notification is unavailable.", 400);
      }

      if (
        listing.approval_notification_read_at &&
        listing.approval_notification_read_at.localeCompare(listing.approved_at) >= 0
      ) {
        return NextResponse.json({ success: true, readAt: listing.approval_notification_read_at });
      }

      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from("listings")
        .update({ approval_notification_read_at: readAt })
        .eq("id", params.id)
        .eq("created_by", auth.user.id);

      if (error) {
        return jsonError(error.message || "Failed to update listing notification state.", 500);
      }

      return NextResponse.json({ success: true, readAt });
    }
    case "remove_image":
      if (!imageId || typeof imageId !== "string") {
        return jsonError("Image id is required.", 400);
      }

      try {
        await removeListingImage(supabase, params.id, imageId);
        return NextResponse.json({ success: true, imageId });
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to remove image.", 500);
      }
    case "remove_document":
      if (!documentId || typeof documentId !== "string") {
        return jsonError("Document id is required.", 400);
      }

      try {
        await removeListingDocument(supabase, params.id, documentId);
        return NextResponse.json({ success: true, documentId });
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to remove document.", 500);
      }
    case "toggle_visibility":
    case "deactivate":
    case "reactivate":
      return jsonError("Only admin can change listing visibility or activation status.", 403);
    default:
      return jsonError("Unsupported listing action.", 400);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from("listings")
    .select(
      "id, created_by, deleted_at, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, property_video_url, notes, description"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.deleted_at) {
    return jsonError("Listing not found.", 404);
  }

  if (!assertOwnerOrAdmin(existing, auth.user)) {
    return jsonError("You can only edit your own listings.", 403);
  }

  const contentType = request.headers.get("content-type") || "";
  let payload: ReturnType<typeof buildListingPayload>;
  let imageFiles: File[] = [];
  let documentFiles: File[] = [];
  let imageOrder: string[] = [];
  let removeImageIds: string[] = [];
  let commissionTerms: { coBrokePercent?: string; paymentTerms?: string; notes?: string } | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    payload = buildListingPayload({
      title: formData.get("title"),
      propertyType: formData.get("propertyType"),
      dealType: formData.get("dealType"),
      bedrooms: formData.get("bedrooms"),
      sizeSqft: formData.get("sizeSqft"),
      areaId: formData.get("areaId"),
      developer: formData.get("developer"),
      price: formData.get("price"),
      paymentPlan: formData.get("paymentPlan"),
      handoverDate: formData.get("handoverDate"),
      yieldPercent: formData.get("yieldPercent"),
      propertyVideoUrl: formData.get("propertyVideoUrl"),
      notes: formData.get("notes"),
      description: formData.get("description"),
    });
    imageFiles = formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    documentFiles = formData
      .getAll("documents")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    imageOrder = parseImageOrder(formData.get("imageOrder"));
    removeImageIds = parseStringArray(formData.get("removeImageIds"));
    commissionTerms = {
      coBrokePercent: String(formData.get("coBrokePercent") || ""),
      paymentTerms: String(formData.get("paymentTerms") || ""),
      notes: String(formData.get("notes") || ""),
    };
  } else {
    const body = await request.json();
    payload = buildListingPayload(body);
    imageOrder = parseImageOrder(body.imageOrder);
    removeImageIds = parseStringArray(body.removeImageIds);
    commissionTerms = body.commissionTerms || null;
  }

  if (!payload.title || !payload.area_id || !payload.price) {
    return jsonError("Title, area, and price are required.", 400);
  }

  const handoverDateError = getHandoverDateValidationMessage(payload.handover_date);
  if (handoverDateError) {
    return jsonError(handoverDateError, 400);
  }

  const existingImagesResult = await supabase
    .from("listing_images")
    .select("id")
    .eq("listing_id", params.id)
    .order("sort_order", { ascending: true });

  if (existingImagesResult.error) {
    return jsonError(existingImagesResult.error.message || "Failed to load listing images.", 500);
  }

  const existingImageIds = (existingImagesResult.data || []).map((image) => image.id);
  const normalizedRemoveImageIds = removeImageIds.filter((imageId, index, collection) => !!imageId && collection.indexOf(imageId) === index);
  const listingChangedFields = [
    ...buildListingActivityChangedFields(existing as ListingActivitySource, payload),
    ...buildListingAssetActivityChangedFields({
      documentFiles,
      existingImageIds,
      imageFiles,
      imageOrder,
      normalizedRemoveImageIds,
    }),
  ];

  if (normalizedRemoveImageIds.some((imageId) => !existingImageIds.includes(imageId))) {
    return jsonError("Image removal payload is invalid.", 400);
  }

  const totalImageCount = existingImageIds.length - normalizedRemoveImageIds.length + imageFiles.length;

  if (totalImageCount < MIN_LISTING_IMAGES) {
    return jsonError("At least 1 image is required.", 400);
  }

  if (totalImageCount > MAX_LISTING_IMAGES) {
    return jsonError("You can upload a maximum of 10 images per listing.", 400);
  }

  const imageValidationError = getListingImageValidationError(imageFiles, existingImageIds.length - normalizedRemoveImageIds.length);
  if (imageValidationError) {
    return jsonError(imageValidationError, 400);
  }

  for (const document of documentFiles) {
    const documentValidationError = getListingDocumentValidationError(document);
    if (documentValidationError) {
      return jsonError(documentValidationError, 400);
    }
  }

  const { error: updateError } = await supabase
    .from("listings")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (updateError) {
    return jsonError(updateError.message || "Failed to update listing.", 500);
  }

  if (commissionTerms && (commissionTerms.coBrokePercent || commissionTerms.paymentTerms || commissionTerms.notes)) {
    await supabase.from("commission_terms").upsert({
      listing_id: params.id,
      co_broke_percent: Number(commissionTerms.coBrokePercent || 0),
      payment_terms: commissionTerms.paymentTerms || null,
      notes: commissionTerms.notes || null,
    });
  }

  try {
    let uploadedImageIds: string[] = [];
    if (imageFiles.length) {
      uploadedImageIds = await uploadListingImages(supabase, params.id, auth.user.id, imageFiles);
    }

    if (documentFiles.length) {
      await uploadListingDocuments(supabase, params.id, auth.user.id, documentFiles);
    }

    if (normalizedRemoveImageIds.length) {
      await removeListingImages(supabase, params.id, normalizedRemoveImageIds);
    }

    if (imageOrder.length) {
      const uploadedImageKeyOrder = imageOrder.filter((key) => key.startsWith(NEW_IMAGE_KEY_PREFIX));
      const uploadedImageIdByKey = new Map(uploadedImageKeyOrder.map((key, index) => [key, uploadedImageIds[index]]));
      const orderedImageIds = imageOrder.flatMap((key) => {
        if (key.startsWith(EXISTING_IMAGE_KEY_PREFIX)) return key.slice(EXISTING_IMAGE_KEY_PREFIX.length);
        const uploadedImageId = uploadedImageIdByKey.get(key);
        return uploadedImageId ? [uploadedImageId] : [];
      });

      await reorderListingImages(supabase, params.id, orderedImageIds);
    }
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to upload listing files.", 500);
  }

  if (listingChangedFields.length) {
    await supabase.from("activity_log").insert({
      actor_user_id: auth.user.id,
      action: "listing_updated",
      target_table: "listings",
      target_id: params.id,
      metadata: {
        changedFields: listingChangedFields,
      },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, created_by, status, is_visible, deleted_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!listing || listing.deleted_at) {
    return jsonError("Listing not found.", 404);
  }

  if (!assertOwnerOrAdmin(listing, auth.user)) {
    return jsonError("You can only delete your own listings.", 403);
  }

  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from("listings")
    .update({
      deleted_at: timestamp,
      is_visible: false,
      updated_at: timestamp,
    })
    .eq("id", params.id)
    .is("deleted_at", null);

  if (error) {
    return jsonError(error.message || "Failed to delete listing.", 500);
  }

  await supabase.from("activity_log").insert({
    actor_user_id: auth.user.id,
    action: "listing_deleted",
    target_table: "listings",
    target_id: params.id,
    metadata: {
      softDeleted: true,
      previousStatus: listing.status,
      previousVisibility: listing.is_visible,
    },
  });

  return NextResponse.json({ success: true });
}
