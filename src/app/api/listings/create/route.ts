import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import { parseNumber } from "@/lib/deal-utils";
import {
  getListingDocumentMetadataValidationError,
  parseListingDocumentMetadata,
  type UploadedListingDocumentMetadata,
} from "@/lib/document-upload";
import { triggerListingSubmittedEmail } from "@/lib/email-notifications";
import { runEmailWorkflowInBackground } from "@/lib/email-service";
import { getHandoverDateValidationMessage } from "@/lib/handover-date";
import { getImageUploadValidationError } from "@/lib/image-upload";
import { normalizeListingMediaUrl } from "@/lib/listing-media";
import {
  getListingPercentageValidationError,
  parseOptionalNumericInput,
} from "@/lib/numeric-field-validation";

const MIN_LISTING_IMAGES = 1;
const MAX_LISTING_IMAGES = 10;

export async function POST(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const formData = await request.formData();
  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  let documents: UploadedListingDocumentMetadata[];

  try {
    documents = parseListingDocumentMetadata(formData);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Document metadata is invalid.", 400);
  }

  if (images.length < MIN_LISTING_IMAGES) {
    return jsonError("At least 1 image is required.", 400);
  }

  if (images.length > MAX_LISTING_IMAGES) {
    return jsonError("You can upload a maximum of 10 images.", 400);
  }

  for (const image of images) {
    const imageValidationError = getImageUploadValidationError(image, {
      label: image.name,
      validateSize: true,
    });

    if (imageValidationError) {
      return jsonError(imageValidationError, 400);
    }
  }

  for (const document of documents) {
    const documentValidationError = getListingDocumentMetadataValidationError(document, auth.user.id);

    if (documentValidationError) {
      return jsonError(documentValidationError, 400);
    }
  }

  const title = String(formData.get("title") || "").trim();
  const areaId = String(formData.get("areaId") || "").trim();
  const price = Number(formData.get("price") || 0);
  const propertyType = String(formData.get("propertyType") || "apartment");
  const handoverDate = String(formData.get("handoverDate") || "").trim() || null;
  const yieldPercentInput = String(formData.get("yieldPercent") || "");
  const coBrokePercentInput = String(formData.get("coBrokePercent") || "");

  if (!title || !areaId || !price) {
    return jsonError("Title, area, and price are required.", 400);
  }

  const handoverDateError = getHandoverDateValidationMessage(handoverDate);
  if (handoverDateError) {
    return jsonError(handoverDateError, 400);
  }

  const yieldPercentValidationError = getListingPercentageValidationError(yieldPercentInput, {
    invalidMessage: "Yield Percent must be numeric.",
    maxMessage: "Yield Percent cannot exceed 100.",
  });
  if (yieldPercentValidationError) {
    return jsonError(yieldPercentValidationError, 400);
  }

  const coBrokePercentValidationError = getListingPercentageValidationError(coBrokePercentInput, {
    invalidMessage: "Co-broke Percent must be numeric.",
    maxMessage: "Co-broke Percent cannot exceed 100.",
  });
  if (coBrokePercentValidationError) {
    return jsonError(coBrokePercentValidationError, 400);
  }

  const yieldPercent = parseOptionalNumericInput(yieldPercentInput);

  const { data: credits } = await supabase
    .from("broker_credits")
    .select("id, available_credits, used_credits, total_credits_assigned")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!credits || credits.available_credits < 1) {
    return jsonError("You do not have enough listing credits to publish this listing.", 400);
  }

  const listingId = globalThis.crypto.randomUUID();

  const uploadedImages = [];
  for (let index = 0; index < images.length; index += 1) {
    const file = images[index];

    const storagePath = `${auth.user.id}/${listingId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("listing-images").upload(storagePath, file, {
      upsert: false,
    });

    if (uploadError) {
      return jsonError(uploadError.message || "Failed to upload image.", 500);
    }

    const { data: publicUrl } = supabase.storage.from("listing-images").getPublicUrl(storagePath);
    uploadedImages.push({
      file_name: file.name,
      storage_path: storagePath,
      public_url: publicUrl.publicUrl,
      sort_order: index,
      is_cover: index === 0,
    });
  }

  const processedDocuments = [];
  for (const doc of documents) {
    const fileName = doc.storage_path.substring(doc.storage_path.lastIndexOf("/") + 1);
    const newStoragePath = `${auth.user.id}/${listingId}/${fileName}`;
    
    const { error: copyError } = await supabase.storage
      .from("listing-documents")
      .copy(doc.storage_path, newStoragePath);
      
    if (copyError) {
      return jsonError(copyError.message || "Failed to copy document to permanent storage.", 500);
    }
    
    await supabase.storage.from("listing-documents").remove([doc.storage_path]);

    const { data: publicUrl } = supabase.storage.from("listing-documents").getPublicUrl(newStoragePath);
    processedDocuments.push({
      file_name: doc.file_name,
      storage_path: newStoragePath,
      public_url: publicUrl.publicUrl,
    });
  }

  const coBrokePercent = parseOptionalNumericInput(coBrokePercentInput) || 0;
  const paymentTerms = String(formData.get("paymentTerms") || "").trim();

  const { data: rpcResult, error: rpcError } = await supabase.rpc("create_listing_transaction", {
    p_listing_id: listingId,
    p_user_id: auth.user.id,
    p_agency_id: auth.user.agency_id || null,
    p_title: title,
    p_property_type: propertyType,
    p_deal_type: String(formData.get("dealType") || "secondary"),
    p_bedrooms: parseNumber(String(formData.get("bedrooms") || "")),
    p_size_sqft: parseNumber(String(formData.get("sizeSqft") || "")),
    p_area_id: areaId,
    p_developer: String(formData.get("developer") || "").trim() || null,
    p_price: price,
    p_payment_plan: String(formData.get("paymentPlan") || "").trim() || null,
    p_handover_date: handoverDate,
    p_yield_percent: yieldPercent,
    p_property_video_url: normalizeListingMediaUrl(String(formData.get("propertyVideoUrl") || "")),
    p_notes: String(formData.get("notes") || "").trim() || null,
    p_description: String(formData.get("description") || "").trim() || null,
    p_co_broke_percent: coBrokePercent,
    p_payment_terms: paymentTerms || null,
    p_commission_notes: String(formData.get("notes") || "").trim() || null,
    p_images: uploadedImages,
    p_documents: processedDocuments,
  });

  if (rpcError || !rpcResult) {
    return jsonError(rpcError?.message || "Failed to create listing via transaction.", 500);
  }

  const emailWorkflow = triggerListingSubmittedEmail({
    listingId,
    brokerUserId: auth.user.id,
    brokerEmail: auth.user.email,
    listingTitle: title,
  });
  runEmailWorkflowInBackground(emailWorkflow, "listing-submitted-email");

  return NextResponse.json({
    success: true,
    listingId,
    message: "Listing created. It is now waiting for admin moderation.",
  });
}
