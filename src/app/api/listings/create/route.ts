import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import { parseNumber } from "@/lib/deal-utils";
import { getListingDocumentValidationError } from "@/lib/document-upload";
import { triggerListingSubmittedEmail } from "@/lib/email-notifications";
import { getHandoverDateValidationMessage } from "@/lib/handover-date";
import { getImageUploadValidationError } from "@/lib/image-upload";
import { normalizeListingMediaUrl } from "@/lib/listing-media";

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
  const documents = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

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
    const documentValidationError = getListingDocumentValidationError(document);
    if (documentValidationError) {
      return jsonError(documentValidationError, 400);
    }
  }

  const title = String(formData.get("title") || "").trim();
  const areaId = String(formData.get("areaId") || "").trim();
  const price = Number(formData.get("price") || 0);
  const propertyType = String(formData.get("propertyType") || "apartment");
  const handoverDate = String(formData.get("handoverDate") || "").trim() || null;

  if (!title || !areaId || !price) {
    return jsonError("Title, area, and price are required.", 400);
  }

  const handoverDateError = getHandoverDateValidationMessage(handoverDate);
  if (handoverDateError) {
    return jsonError(handoverDateError, 400);
  }

  const { data: credits } = await supabase
    .from("broker_credits")
    .select("id, available_credits, used_credits, total_credits_assigned")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!credits || credits.available_credits < 1) {
    return jsonError("You do not have enough listing credits to publish this listing.", 400);
  }

  const insertPayload = {
    title,
    property_type: propertyType,
    deal_type: String(formData.get("dealType") || "secondary"),
    bedrooms: parseNumber(String(formData.get("bedrooms") || "")),
    size_sqft: parseNumber(String(formData.get("sizeSqft") || "")),
    area_id: areaId,
    developer: String(formData.get("developer") || "").trim() || null,
    price,
    payment_plan: String(formData.get("paymentPlan") || "").trim() || null,
    handover_date: handoverDate,
    yield_percent: parseNumber(String(formData.get("yieldPercent") || "")),
    property_video_url: normalizeListingMediaUrl(String(formData.get("propertyVideoUrl") || "")),
    notes: String(formData.get("notes") || "").trim() || null,
    description: String(formData.get("description") || "").trim() || null,
    status: "pending",
    is_visible: false,
    created_by: auth.user.id,
    agency_id: auth.user.agency_id,
    credits_used: 1,
  };

  const { data: listing, error: createError } = await supabase
    .from("listings")
    .insert(insertPayload)
    .select("id")
    .single();

  if (createError || !listing) {
    return jsonError(createError?.message || "Failed to create listing.", 500);
  }

  const listingId = listing.id as string;

  const { error: creditError } = await supabase
    .from("broker_credits")
    .update({
      available_credits: credits.available_credits - 1,
      used_credits: credits.used_credits + 1,
    })
    .eq("user_id", auth.user.id);

  if (creditError) {
    await supabase.from("listings").delete().eq("id", listingId);
    return jsonError(creditError.message || "Failed to deduct credits.", 500);
  }

  const coBrokePercent = Number(formData.get("coBrokePercent") || 0);
  const paymentTerms = String(formData.get("paymentTerms") || "").trim();

  if (coBrokePercent || paymentTerms) {
    await supabase.from("commission_terms").insert({
      listing_id: listingId,
      co_broke_percent: coBrokePercent,
      payment_terms: paymentTerms || null,
      notes: String(formData.get("notes") || "").trim() || null,
    });
  }

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
    await supabase.from("listing_images").insert({
      listing_id: listingId,
      file_name: file.name,
      storage_path: storagePath,
      public_url: publicUrl.publicUrl,
      sort_order: index,
      is_cover: index === 0,
    });
  }

  for (const file of documents) {
    const storagePath = `${auth.user.id}/${listingId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("listing-documents").upload(storagePath, file, {
      upsert: false,
    });

    if (uploadError) {
      return jsonError(uploadError.message || "Failed to upload document.", 500);
    }

    const { data: publicUrl } = supabase.storage.from("listing-documents").getPublicUrl(storagePath);
    await supabase.from("listing_documents").insert({
      listing_id: listingId,
      file_name: file.name,
      storage_path: storagePath,
      public_url: publicUrl.publicUrl,
    });
  }

  await supabase.from("chat_participants").upsert({
    listing_id: listingId,
    user_id: auth.user.id,
    last_read_at: new Date().toISOString(),
  });

  await supabase.from("activity_log").insert({
    actor_user_id: auth.user.id,
    action: "listing_created",
    target_table: "listings",
    target_id: listingId,
    metadata: { creditsUsed: 1 },
  });

  // Email trigger: broker listing submission is pending admin approval.
  await triggerListingSubmittedEmail({
    listingId,
    brokerUserId: auth.user.id,
    brokerEmail: auth.user.email,
    listingTitle: title,
  });

  return NextResponse.json({
    success: true,
    listingId,
    message: "Listing created. It is now waiting for admin moderation.",
  });
}
