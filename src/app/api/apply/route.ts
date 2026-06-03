import { NextRequest, NextResponse } from "next/server";
import { verifyBrokerRegistration } from "@/lib/broker-verification";
import type { BrokerVerificationResult } from "@/lib/broker-verification";
import { getServiceSupabase, jsonError } from "@/lib/deal-server";
import {
  BROKER_PROFILE_PHOTO_BUCKET,
  buildBrokerProfilePhotoPath,
  getProfilePhotoValidationError,
} from "@/lib/profile-photo";
import { BROKER_BIO_MAX_LENGTH, getBrokerBioCharacterCount, normalizeBrokerBio } from "@/lib/broker-application";
import { normalizeInstagramProfile, normalizeLinkedInProfile } from "@/lib/broker-social";
import { isValidEmailAddress } from "@/lib/email";
import { triggerBrokerVerificationSuccessEmail, triggerManualReviewPendingEmail } from "@/lib/email-notifications";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

type ApplyRequestBody = {
  authUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shareLatestDeals: boolean;
  termsAccepted: boolean;
  agencyName: string;
  reraBrn: string;
  coveredAreaIds: string[];
  speciality: string | null;
  experienceYears: number | null;
  bio?: string | null;
  instagramProfile?: string | null;
  linkedinProfile?: string | null;
  profilePhoto?: File | null;
};

function readStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readBooleanValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseCoveredAreaIds(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseOptionalNumber(value: FormDataEntryValue | string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

async function parseRequestBody(request: NextRequest): Promise<ApplyRequestBody> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const profilePhoto = formData.get("profilePhoto");
    const bio = formData.get("bio");

    return {
      authUserId: readStringValue(formData.get("authUserId")),
      firstName: readStringValue(formData.get("firstName")),
      lastName: readStringValue(formData.get("lastName")),
      email: readStringValue(formData.get("email")),
      phone: normalizePhoneNumber(readStringValue(formData.get("phone"))),
      shareLatestDeals: readBooleanValue(formData.get("shareLatestDeals")),
      termsAccepted: readBooleanValue(formData.get("termsAccepted")),
      agencyName: readStringValue(formData.get("agencyName")),
      reraBrn: readStringValue(formData.get("reraBrn")),
      coveredAreaIds: parseCoveredAreaIds(formData.get("coveredAreaIds")),
      speciality: readStringValue(formData.get("speciality")) || null,
      experienceYears: parseOptionalNumber(formData.get("experienceYears")),
      bio: normalizeBrokerBio(typeof bio === "string" ? bio : "") || null,
      instagramProfile: normalizeInstagramProfile(formData.get("instagramProfile")),
      linkedinProfile: normalizeLinkedInProfile(formData.get("linkedinProfile")),
      profilePhoto: profilePhoto instanceof File && profilePhoto.size > 0 ? profilePhoto : null,
    };
  }

  const body = await request.json();

  return {
    authUserId: typeof body.authUserId === "string" ? body.authUserId.trim() : "",
    firstName: typeof body.firstName === "string" ? body.firstName.trim() : "",
    lastName: typeof body.lastName === "string" ? body.lastName.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    phone: typeof body.phone === "string" ? normalizePhoneNumber(body.phone) : "",
    shareLatestDeals: Boolean(body.shareLatestDeals),
    termsAccepted: Boolean(body.termsAccepted),
    agencyName: typeof body.agencyName === "string" ? body.agencyName.trim() : "",
    reraBrn: typeof body.reraBrn === "string" ? body.reraBrn.trim() : "",
    coveredAreaIds: Array.isArray(body.coveredAreaIds)
      ? body.coveredAreaIds.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    speciality: typeof body.speciality === "string" && body.speciality.trim().length ? body.speciality.trim() : null,
    experienceYears: parseOptionalNumber(body.experienceYears),
    bio: normalizeBrokerBio(typeof body.bio === "string" ? body.bio : "") || null,
    instagramProfile: normalizeInstagramProfile(body.instagramProfile),
    linkedinProfile: normalizeLinkedInProfile(body.linkedinProfile),
    profilePhoto: null,
  };
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

export async function POST(request: NextRequest) {
  let body: ApplyRequestBody;

  try {
    body = await parseRequestBody(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid application payload.", 400);
  }

  try {
    const requiredFields: Array<
      keyof Pick<
        ApplyRequestBody,
        "authUserId" | "firstName" | "lastName" | "email" | "phone" | "agencyName" | "reraBrn" | "instagramProfile"
      >
    > = [
      "authUserId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "agencyName",
      "reraBrn",
      "instagramProfile",
    ];

    for (const field of requiredFields) {
      if (!body[field]) return jsonError(`${field} is required.`);
    }

    if (body.experienceYears !== null && !Number.isFinite(body.experienceYears)) {
      return jsonError("experienceYears must be a valid number.");
    }

    if (!isValidEmailAddress(body.email)) {
      return jsonError("Enter a valid email address.");
    }

    if (getBrokerBioCharacterCount(body.bio) > BROKER_BIO_MAX_LENGTH) {
      return jsonError(`Bio must be ${BROKER_BIO_MAX_LENGTH} characters or fewer.`);
    }

    if (!isValidInternationalPhoneNumber(body.phone)) {
      return jsonError("Enter a valid phone number including country code.");
    }

    if (!body.termsAccepted) {
      return jsonError("You must accept the Terms & Conditions and Privacy Policy.");
    }

    const profilePhotoError = getProfilePhotoValidationError(body.profilePhoto);
    if (profilePhotoError) {
      return jsonError(profilePhotoError, 400);
    }

    const supabase = getServiceSupabase();
    const submittedAt = new Date().toISOString();
    let createdAgencyId: string | null = null;
    let createdUser = false;
    let createdBrokerProfile = false;
    let createdBrokerVerification = false;
    let createdEmailVerification = false;
    let createdActivityLog = false;
    let uploadedProfilePhotoPath: string | null = null;

    const rollbackApplication = async () => {
      if (uploadedProfilePhotoPath) {
        await supabase.storage.from(BROKER_PROFILE_PHOTO_BUCKET).remove([uploadedProfilePhotoPath]).catch(() => undefined);
      }

      if (createdActivityLog) {
        await supabase.from("activity_log").delete().eq("actor_user_id", body.authUserId).eq("action", "broker_application_submitted");
      }

      if (createdBrokerVerification) {
        await supabase.from("broker_verifications").delete().eq("user_id", body.authUserId);
      }

      if (createdEmailVerification) {
        await supabase.from("broker_email_verifications").delete().eq("user_id", body.authUserId);
      }

      await supabase.from("broker_credits").delete().eq("user_id", body.authUserId);

      if (createdBrokerProfile) {
        await supabase.from("broker_profiles").delete().eq("user_id", body.authUserId);
      }

      if (createdUser) {
        await supabase.from("users").delete().eq("id", body.authUserId);
        await supabase.auth.admin.deleteUser(body.authUserId).catch(() => undefined);
      }

      if (createdAgencyId) {
        await supabase.from("agencies").delete().eq("id", createdAgencyId);
      }
    };

    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, phone, agency_id, role, status")
      .eq("id", body.authUserId)
      .maybeSingle();

    const { data: existingBrokerProfile } = await supabase
      .from("broker_profiles")
      .select("user_id")
      .eq("user_id", body.authUserId)
      .maybeSingle();

    const { data: existingEmailVerification } = await supabase
      .from("broker_email_verifications")
      .select("user_id")
      .eq("user_id", body.authUserId)
      .maybeSingle();

    if (existingBrokerProfile) {
      return jsonError("An application already exists for this account.", 409);
    }

    const { data: duplicateEmailUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", body.email)
      .neq("id", body.authUserId)
      .maybeSingle();

    if (duplicateEmailUser) {
      return jsonError("This email is already linked to another account.", 409);
    }

    // Reuse the existing RERA / BRN input as broker number so the current registration form stays unchanged.
    let verificationError: string | null = null;
    let verification: BrokerVerificationResult;

    try {
      verification = await verifyBrokerRegistration({
        brokerNumber: body.reraBrn,
        email: body.email,
        mobileNumber: body.phone,
      });
    } catch (error) {
      verificationError = error instanceof Error ? error.message : "DLD verification failed.";
      verification = {
        broker_found: false,
        email_match: false,
        phone_match: false,
        status: "pending",
        broker_name: "",
        broker_number: typeof body.reraBrn === "string" ? body.reraBrn.trim() : "",
        official_email: "",
        official_phone: "",
        office_name: "",
        office_number: "",
        verification_source: "DLD",
        raw_payload: null,
      };
    }

    const autoApproved = verification.status === "auto_approved";

    const { data: existingAgency } = await supabase
      .from("agencies")
      .select("id, name")
      .ilike("name", body.agencyName)
      .maybeSingle();

    let agencyId = existingAgency?.id;
    if (!agencyId) {
      const { data: agency, error: agencyError } = await supabase
        .from("agencies")
        .insert({ name: body.agencyName, rera_brn: body.reraBrn, status: "pending" })
        .select("id")
        .single();

      if (agencyError || !agency) {
        return jsonError(agencyError?.message || "Failed to create agency.", 500);
      }

      agencyId = agency.id;
      createdAgencyId = agency.id;
    }

    const userPayload = {
      id: body.authUserId,
      email: body.email,
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone,
      role: "broker",
      status: autoApproved ? "active" : "pending",
      agency_id: agencyId,
    };

    const { error: userError } = existingUser
      ? await supabase.from("users").update(userPayload).eq("id", body.authUserId)
      : await supabase.from("users").insert(userPayload);

    if (userError) {
      await rollbackApplication();
      return jsonError(userError.message || "Failed to create application record.", 500);
    }

    createdUser = !existingUser;

    let profilePhotoUrl: string | null = null;

    if (body.profilePhoto) {
      try {
        const uploadedPhoto = await uploadProfilePhoto(supabase, body.authUserId, body.profilePhoto);
        uploadedProfilePhotoPath = uploadedPhoto.storagePath;
        profilePhotoUrl = uploadedPhoto.publicUrl;
      } catch (error) {
        await rollbackApplication();
        return jsonError(error instanceof Error ? error.message : "Failed to upload profile photo.", 500);
      }
    }

    const { error: profileError } = await supabase.from("broker_profiles").insert({
      user_id: body.authUserId,
      agency_id: agencyId,
      profile_photo: profilePhotoUrl,
      rera_brn: body.reraBrn,
      covered_area_ids: body.coveredAreaIds,
      speciality: body.speciality,
      experience_years: body.experienceYears,
      whatsapp_number: body.phone,
      instagram_profile: body.instagramProfile || null,
      linkedin_profile: body.linkedinProfile || null,
      share_latest_deals: body.shareLatestDeals,
      terms_accepted: body.termsAccepted,
      bio: body.bio || null,
      application_status: autoApproved ? "active" : "pending",
      application_submitted_at: submittedAt,
      approved_at: autoApproved ? submittedAt : null,
    });

    if (profileError) {
      await rollbackApplication();
      return jsonError(profileError.message || "Failed to create broker profile.", 500);
    }

    createdBrokerProfile = true;

    const { error: brokerVerificationSaveError } = await supabase.from("broker_verifications").upsert({
      user_id: body.authUserId,
      broker_number: verification.broker_number || body.reraBrn,
      broker_name: verification.broker_name || null,
      broker_email: verification.official_email || null,
      broker_phone: verification.official_phone || null,
      office_name: verification.office_name || null,
      office_number: verification.office_number || null,
      broker_found: verification.broker_found,
      email_match: verification.email_match,
      phone_match: verification.phone_match,
      verification_source: verification.verification_source,
      verification_status: verification.status,
      raw_payload: verification.raw_payload,
      verified_at: new Date().toISOString(),
    });

    if (brokerVerificationSaveError) {
      await rollbackApplication();
      return jsonError(brokerVerificationSaveError.message || "Failed to save broker verification.", 500);
    }

    createdBrokerVerification = true;

    const { error: emailVerificationError } = await supabase.from("broker_email_verifications").upsert(
      {
        user_id: body.authUserId,
        email: body.email.toLowerCase(),
        verified_at: null,
      },
      { onConflict: "user_id" }
    );

    if (emailVerificationError) {
      await rollbackApplication();
      return jsonError(emailVerificationError.message || "Failed to initialize email verification.", 500);
    }

    createdEmailVerification = !existingEmailVerification;

    const { error: creditsError } = await supabase.from("broker_credits").upsert({
      user_id: body.authUserId,
      available_credits: 1,
      used_credits: 0,
      total_credits_assigned: 1,
    });

    if (creditsError) {
      await rollbackApplication();
      return jsonError(creditsError.message || "Failed to initialize broker credits.", 500);
    }

    const { error: activityError } = await supabase.from("activity_log").insert({
      actor_user_id: body.authUserId,
      action: "broker_application_submitted",
      target_table: "users",
      target_id: body.authUserId,
      metadata: {
        agencyId,
        broker_found: verification.broker_found,
        email_match: verification.email_match,
        phone_match: verification.phone_match,
        share_latest_deals: body.shareLatestDeals,
        terms_accepted: body.termsAccepted,
        verification_source: verification.verification_source,
        verification_status: verification.status,
        verification_error: verificationError,
      },
    });

    if (activityError) {
      await rollbackApplication();
      return jsonError(activityError.message || "Failed to log broker application.", 500);
    }

    createdActivityLog = true;

    const brokerName = [body.firstName, body.lastName].filter(Boolean).join(" ").trim() || "Broker";

    // Email trigger: auto-approved RERA match or manual-review pending broker application.
    if (autoApproved) {
      await triggerBrokerVerificationSuccessEmail({
        userId: body.authUserId,
        email: body.email,
        brokerName,
      });
    } else {
      await triggerManualReviewPendingEmail({
        userId: body.authUserId,
        email: body.email,
        brokerName,
        verificationStatus: verification.status,
      });
    }

    return NextResponse.json({
      success: true,
      broker_found: verification.broker_found,
      email_match: verification.email_match,
      phone_match: verification.phone_match,
      status: verification.status,
      message: autoApproved
        ? "Application submitted and auto-approved. Verify your email, then sign in."
        : "Application submitted. Verify your email and wait for admin approval.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Application failed.", 500);
  }
}
