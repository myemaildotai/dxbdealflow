import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import { getImageUploadValidationError } from "@/lib/image-upload";

const MAX_LISTING_IMAGES = 10;

export async function POST(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const listingId = formData.get("listingId") as string;
    const isCover = formData.get("isCover") === "true";

    if (!(file instanceof File) || !file.size || !listingId) {
      return jsonError("File and listingId are required.", 400);
    }

    const imageValidationError = getImageUploadValidationError(file, {
      label: file.name,
      validateSize: true,
    });

    if (imageValidationError) {
      return jsonError(imageValidationError, 400);
    }

    const supabase = getServiceSupabase();

    // Verify listing ownership
    const { data: listing } = await supabase
      .from("listings")
      .select("created_by")
      .eq("id", listingId)
      .single();

    if (!listing || listing.created_by !== auth.user.id) {
      return jsonError("Listing not found or access denied.", 403);
    }

    const existingImagesResult = await supabase
      .from("listing_images")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if ((existingImagesResult.count || 0) >= MAX_LISTING_IMAGES) {
      return jsonError("You can upload a maximum of 10 images per listing.", 400);
    }

    // Generate unique file name
    const fileName = `${listingId}/${Date.now()}_${file.name}`;
    const storagePath = `listings/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("listings")
      .upload(storagePath, file, {
        upsert: false,
      });

    if (uploadError) {
      return jsonError("Failed to upload image.", 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("listings")
      .getPublicUrl(storagePath);

    // If this is the cover image, clear other covers
    if (isCover) {
      await supabase
        .from("listing_images")
        .update({ is_cover: false })
        .eq("listing_id", listingId);
    }

    // Insert image record
    const { data: imageRecord, error: recordError } = await supabase
      .from("listing_images")
      .insert({
        listing_id: listingId,
        file_name: file.name,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        sort_order: 999, // Default, can be reordered
        is_cover: isCover,
      })
      .select("id")
      .single();

    if (recordError || !imageRecord) {
      return jsonError("Failed to save image record.", 500);
    }

    return NextResponse.json({
      success: true,
      imageId: imageRecord.id,
      publicUrl: urlData.publicUrl,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Image upload failed.",
      500
    );
  }
}
