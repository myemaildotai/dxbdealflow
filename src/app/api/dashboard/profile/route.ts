import { NextRequest, NextResponse } from "next/server";
import { BROKER_BIO_MAX_LENGTH } from "@/lib/broker-application";
import { fetchBrokerDashboardProfile } from "@/lib/broker-dashboard-server";
import { normalizeInstagramProfile, normalizeLinkedInProfile } from "@/lib/broker-social";
import { getServiceSupabase, jsonError, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import { fetchUserBundle } from "@/lib/platform-server-data";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import {
  BROKER_PROFILE_PHOTO_BUCKET,
  buildBrokerProfilePhotoPath,
  getProfilePhotoValidationError,
} from "@/lib/profile-photo";

const MAX_EXPERIENCE_YEARS = 60;
const IMMUTABLE_PROFILE_FIELDS = new Set(["firstName", "lastName", "email", "phone", "reraBrn", "rera_brn"]);

type ProfileActivityValue = string | number | boolean | string[] | null;
type ProfileActivityChangedField = {
  field: string;
  previousValue: ProfileActivityValue;
  nextValue: ProfileActivityValue;
};

type UpdateBrokerProfileBody = {
  firstName?: unknown;
  lastName?: unknown;
  agencyName?: unknown;
  speciality?: unknown;
  experienceYears?: unknown;
  whatsappNumber?: unknown;
  instagramProfile?: unknown;
  linkedinProfile?: unknown;
  bio?: unknown;
  coveredAreaIds?: unknown;
  shareLatestDeals?: unknown;
  profilePhoto?: File | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const dashboard = await fetchBrokerDashboardProfile(getServiceSupabase(), auth.user.id, auth.user);
  return NextResponse.json(dashboard, withNoStore());
}

function readStringValue(value: FormDataEntryValue | unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length ? trimmedValue : null;
}

function readBooleanValue(value: FormDataEntryValue | unknown) {
  if (typeof value !== "string") {
    return Boolean(value);
  }

  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function hasSubmittedValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value instanceof File) {
    return value.size > 0;
  }

  return true;
}

function parseCoveredAreaIds(value: FormDataEntryValue | unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))
    );
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return Array.from(
        new Set(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))
      );
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseExperienceYears(value: FormDataEntryValue | unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value > MAX_EXPERIENCE_YEARS) {
      throw new Error(`Enter a whole number between 0 and ${MAX_EXPERIENCE_YEARS}.`);
    }

    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`Enter a whole number between 0 and ${MAX_EXPERIENCE_YEARS}.`);
  }

  const trimmedValue = value.trim();
  if (!trimmedValue.length) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > MAX_EXPERIENCE_YEARS) {
    throw new Error(`Enter a whole number between 0 and ${MAX_EXPERIENCE_YEARS}.`);
  }

  return parsedValue;
}

function hasProfileActivityValueChanged(previousValue: ProfileActivityValue, nextValue: ProfileActivityValue) {
  if (Array.isArray(previousValue) || Array.isArray(nextValue)) {
    const previousItems = Array.isArray(previousValue) ? [...previousValue].sort() : [];
    const nextItems = Array.isArray(nextValue) ? [...nextValue].sort() : [];
    return JSON.stringify(previousItems) !== JSON.stringify(nextItems);
  }

  return previousValue !== nextValue;
}

function getProfileActivityChange(
  field: string,
  previousValue: ProfileActivityValue,
  nextValue: ProfileActivityValue
): ProfileActivityChangedField | null {
  return hasProfileActivityValueChanged(previousValue, nextValue)
    ? {
        field,
        previousValue,
        nextValue,
      }
    : null;
}

async function parseRequestBody(request: NextRequest): Promise<UpdateBrokerProfileBody> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const profilePhoto = formData.get("profilePhoto");

    return {
      firstName: readStringValue(formData.get("firstName")),
      lastName: readStringValue(formData.get("lastName")),
      agencyName: readStringValue(formData.get("agencyName")),
      speciality: readStringValue(formData.get("speciality")),
      experienceYears: formData.get("experienceYears"),
      whatsappNumber: readStringValue(formData.get("whatsappNumber")),
      instagramProfile: readStringValue(formData.get("instagramProfile")),
      linkedinProfile: readStringValue(formData.get("linkedinProfile")),
      bio: readStringValue(formData.get("bio")),
      coveredAreaIds: parseCoveredAreaIds(formData.get("coveredAreaIds")),
      shareLatestDeals: readBooleanValue(formData.get("shareLatestDeals")),
      profilePhoto: profilePhoto instanceof File && profilePhoto.size > 0 ? profilePhoto : null,
    };
  }

  return (await request.json()) as UpdateBrokerProfileBody;
}

async function uploadProfilePhoto(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  file: File
) {
  const storagePath = buildBrokerProfilePhotoPath(userId, file.name);
  const { error: uploadError } = await supabase.storage.from(BROKER_PROFILE_PHOTO_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload profile photo.");
  }

  const { data } = supabase.storage.from(BROKER_PROFILE_PHOTO_BUCKET).getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: data.publicUrl,
  };
}

function getPhotoStoragePathFromUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const marker = `/object/public/${BROKER_PROFILE_PHOTO_BUCKET}/`;
  const markerIndex = value.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(value.slice(markerIndex + marker.length).split("?")[0]);
}

export async function PUT(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  let body: UpdateBrokerProfileBody;

  try {
    body = await parseRequestBody(request);
  } catch {
    return jsonError("Invalid profile update payload.");
  }

  const attemptedImmutableField = Object.entries(body || {}).find(
    ([field, value]) => IMMUTABLE_PROFILE_FIELDS.has(field) && hasSubmittedValue(value)
  )?.[0];
  if (attemptedImmutableField) {
    return jsonError("First name, last name, email, phone, and RERA / BRN cannot be updated from this form.");
  }

  const supabase = getServiceSupabase();
  let uploadedProfilePhotoPath: string | null = null;
  let createdAgencyId: string | null = null;
  let profilePersisted = false;

  try {
    const bundle = await fetchUserBundle(supabase, auth.user.id);

    if (!bundle.user) {
      return jsonError("Broker account could not be found.", 404);
    }

    const existingBrokerProfile = bundle.brokerProfile;
    const agencyName = readOptionalTrimmedString(body.agencyName);
    const speciality = readOptionalTrimmedString(body.speciality);
    const bio = readOptionalTrimmedString(body.bio);
    let experienceYears: number | null;
    let instagramProfile: string | null;
    let linkedinProfile: string | null;

    try {
      experienceYears = parseExperienceYears(body.experienceYears);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : `Enter a whole number between 0 and ${MAX_EXPERIENCE_YEARS}.`, 400);
    }

    try {
      instagramProfile = normalizeInstagramProfile(body.instagramProfile);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Enter a valid Instagram profile URL or handle.", 400);
    }

    if (!instagramProfile) {
      return jsonError("Instagram is required.", 400);
    }

    try {
      linkedinProfile = normalizeLinkedInProfile(body.linkedinProfile);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Enter a valid LinkedIn profile URL or handle.", 400);
    }

    const coveredAreaIds = parseCoveredAreaIds(body.coveredAreaIds);
    const shareLatestDeals = readBooleanValue(body.shareLatestDeals);
    const normalizedWhatsappNumber = readOptionalTrimmedString(body.whatsappNumber);
    const whatsappNumber = normalizedWhatsappNumber ? normalizePhoneNumber(normalizedWhatsappNumber) : null;
    const profilePhotoError = getProfilePhotoValidationError(body.profilePhoto);
    const now = new Date().toISOString();
    const previousAgencyId = bundle.user.agency_id;
    const previousBrokerAgencyId = existingBrokerProfile?.agency_id ?? null;
    let nextAgencyId = previousBrokerAgencyId || previousAgencyId;

    if (!agencyName) {
      return jsonError("Agency name is required.", 400);
    }

    if (whatsappNumber && !isValidInternationalPhoneNumber(whatsappNumber)) {
      return jsonError("Enter a valid WhatsApp number for the selected country code.", 400);
    }

    if ((bio || "").length > BROKER_BIO_MAX_LENGTH) {
      return jsonError(`Bio must be ${BROKER_BIO_MAX_LENGTH} characters or fewer.`);
    }

    if (profilePhotoError) {
      return jsonError(profilePhotoError, 400);
    }

    if (coveredAreaIds.length) {
      const { data: selectedAreas, error: areaError } = await supabase.from("areas").select("id").in("id", coveredAreaIds);

      if (areaError) {
        return jsonError(areaError.message || "Failed to validate covered areas.", 500);
      }

      if ((selectedAreas || []).length !== coveredAreaIds.length) {
        return jsonError("One or more selected areas are unavailable.");
      }
    }

    if (nextAgencyId) {
      const { error: agencyUpdateError } = await supabase
        .from("agencies")
        .update({
          name: agencyName,
          updated_at: now,
        })
        .eq("id", nextAgencyId);

      if (agencyUpdateError) {
        return jsonError(agencyUpdateError.message || "Failed to update agency.", 500);
      }
    } else {
      const nextAgencyStatus = bundle.user.status === "approved" ? "active" : bundle.user.status || "active";
      const { data: createdAgency, error: agencyCreateError } = await supabase
        .from("agencies")
        .insert({
          name: agencyName,
          rera_brn: existingBrokerProfile?.rera_brn || null,
          status: nextAgencyStatus,
          updated_at: now,
        })
        .select("id")
        .single();

      if (agencyCreateError || !createdAgency) {
        return jsonError(agencyCreateError?.message || "Failed to create agency.", 500);
      }

      createdAgencyId = createdAgency.id;
      nextAgencyId = createdAgency.id;
    }

    let nextProfilePhotoUrl = existingBrokerProfile?.profile_photo ?? null;

    if (body.profilePhoto) {
      const uploadedPhoto = await uploadProfilePhoto(supabase, auth.user.id, body.profilePhoto);
      uploadedProfilePhotoPath = uploadedPhoto.storagePath;
      nextProfilePhotoUrl = uploadedPhoto.publicUrl;
    }

    const nextApplicationStatus =
      bundle.user.status === "approved"
        ? "active"
        : bundle.user.status || existingBrokerProfile?.application_status || "active";

    const { error: brokerProfileUpdateError } = await supabase.from("broker_profiles").upsert(
      {
        user_id: auth.user.id,
        agency_id: nextAgencyId,
        profile_photo: nextProfilePhotoUrl,
        speciality,
        experience_years: experienceYears,
        whatsapp_number: whatsappNumber,
        instagram_profile: instagramProfile,
        linkedin_profile: linkedinProfile,
        covered_area_ids: coveredAreaIds,
        share_latest_deals: shareLatestDeals,
        bio,
        application_status: existingBrokerProfile?.application_status || nextApplicationStatus,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    if (brokerProfileUpdateError) {
      if (uploadedProfilePhotoPath) {
        await supabase.storage.from(BROKER_PROFILE_PHOTO_BUCKET).remove([uploadedProfilePhotoPath]).catch(() => undefined);
      }
      if (createdAgencyId) {
        try {
          await supabase.from("agencies").delete().eq("id", createdAgencyId);
        } catch {
          // Best effort cleanup only.
        }
      }

      return jsonError(brokerProfileUpdateError.message || "Failed to update broker profile.", 500);
    }

    profilePersisted = true;

    if (bundle.user.agency_id !== nextAgencyId) {
      const { error: userAgencyUpdateError } = await supabase
        .from("users")
        .update({
          agency_id: nextAgencyId,
          updated_at: now,
        })
        .eq("id", auth.user.id);

      if (userAgencyUpdateError) {
        if (createdAgencyId) {
          try {
            await supabase
              .from("broker_profiles")
              .update({
                agency_id: previousBrokerAgencyId,
                updated_at: now,
              })
              .eq("user_id", auth.user.id);
          } catch {
            // Best effort rollback only.
          }

          try {
            await supabase.from("agencies").delete().eq("id", createdAgencyId);
          } catch {
            // Best effort cleanup only.
          }
        }

        return jsonError(userAgencyUpdateError.message || "Failed to update linked agency.", 500);
      }
    }

    const oldPhotoStoragePath = getPhotoStoragePathFromUrl(existingBrokerProfile?.profile_photo);
    if (uploadedProfilePhotoPath && oldPhotoStoragePath && oldPhotoStoragePath !== uploadedProfilePhotoPath) {
      await supabase.storage.from(BROKER_PROFILE_PHOTO_BUCKET).remove([oldPhotoStoragePath]).catch(() => undefined);
    }

    const changedFields = [
      getProfileActivityChange("agency_name", bundle.agency?.name || null, agencyName),
      getProfileActivityChange("profile_photo", existingBrokerProfile?.profile_photo || null, nextProfilePhotoUrl),
      getProfileActivityChange("speciality", existingBrokerProfile?.speciality || null, speciality),
      getProfileActivityChange("experience_years", existingBrokerProfile?.experience_years ?? null, experienceYears),
      getProfileActivityChange("whatsapp_number", existingBrokerProfile?.whatsapp_number || null, whatsappNumber),
      getProfileActivityChange("instagram_profile", existingBrokerProfile?.instagram_profile || null, instagramProfile),
      getProfileActivityChange("linkedin_profile", existingBrokerProfile?.linkedin_profile || null, linkedinProfile),
      getProfileActivityChange("bio", existingBrokerProfile?.bio || null, bio),
      getProfileActivityChange("share_latest_deals", existingBrokerProfile?.share_latest_deals ?? false, shareLatestDeals),
      getProfileActivityChange("covered_area_ids", existingBrokerProfile?.covered_area_ids || [], coveredAreaIds),
    ].filter((change): change is ProfileActivityChangedField => Boolean(change));

    if (changedFields.length) {
      await supabase.from("activity_log").insert({
        actor_user_id: auth.user.id,
        action: "broker_profile_updated",
        target_table: "broker_profiles",
        target_id: existingBrokerProfile?.id || auth.user.id,
        metadata: { changedFields },
      });
    }

    const updatedBundle = await fetchUserBundle(supabase, auth.user.id);

    if (!updatedBundle.user) {
      return jsonError("Updated broker profile could not be loaded.", 500);
    }

    return NextResponse.json(
      {
        profile: updatedBundle.user,
        brokerProfile: updatedBundle.brokerProfile,
        agency: updatedBundle.agency,
        message: "Profile updated successfully.",
      },
      withNoStore()
    );
  } catch (error) {
    if (uploadedProfilePhotoPath && !profilePersisted) {
      await supabase.storage.from(BROKER_PROFILE_PHOTO_BUCKET).remove([uploadedProfilePhotoPath]).catch(() => undefined);
    }
    if (createdAgencyId && !profilePersisted) {
      try {
        await supabase.from("agencies").delete().eq("id", createdAgencyId);
      } catch {
        // Best effort cleanup only.
      }
    }

    return jsonError(error instanceof Error ? error.message : "Failed to update profile.", 500);
  }
}
