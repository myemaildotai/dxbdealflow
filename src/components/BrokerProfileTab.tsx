"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import PhoneInput, { type Value as PhoneNumberValue } from "react-phone-number-input";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { BrokerSocialProfilesSection } from "@/components/BrokerSocialProfilesSection";
import { BROKER_BIO_MAX_LENGTH } from "@/lib/broker-application";
import { getBrokerSocialFieldError, getBrokerSocialInputValue } from "@/lib/broker-social";
import { apiFetch } from "@/lib/deal-api";
import type { BrokerDashboardData } from "@/lib/deal-types";
import { cn } from "@/lib/deal-utils";
import { compressImageForUpload } from "@/lib/image-upload";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import {
  getProfilePhotoValidationError,
  PROFILE_PHOTO_ACCEPT,
  PROFILE_PHOTO_MAX_SIZE_LABEL,
} from "@/lib/profile-photo";

const MAX_EXPERIENCE_YEARS = 60;

type BrokerProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  agencyName: string;
  whatsappNumber: string;
  instagramProfile: string;
  linkedinProfile: string;
  reraBrn: string;
  speciality: string;
  experienceYears: string;
  bio: string;
  coveredAreaIds: string[];
  shareLatestDeals: boolean;
};

type ProfileField = "agencyName" | "whatsappNumber" | "instagramProfile" | "linkedinProfile" | "experienceYears" | "bio";
type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

type BrokerProfileUpdateResponse = Pick<BrokerDashboardData, "profile" | "brokerProfile" | "agency"> & {
  message: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 break-words text-sm text-[#b24b40] sm:mt-2">{message}</p>;
}

function createProfileFormState(dashboard: BrokerDashboardData): BrokerProfileFormState {
  return {
    firstName: dashboard.profile?.first_name || "",
    lastName: dashboard.profile?.last_name || "",
    email: dashboard.profile?.email || "",
    phone: dashboard.profile?.phone || "",
    agencyName: dashboard.agency?.name || "",
    whatsappNumber: dashboard.brokerProfile?.whatsapp_number || "",
    instagramProfile: getBrokerSocialInputValue("instagramProfile", dashboard.brokerProfile?.instagram_profile),
    linkedinProfile: getBrokerSocialInputValue("linkedinProfile", dashboard.brokerProfile?.linkedin_profile),
    reraBrn: dashboard.brokerProfile?.rera_brn || dashboard.agency?.rera_brn || "",
    speciality: dashboard.brokerProfile?.speciality || "",
    experienceYears:
      dashboard.brokerProfile?.experience_years !== null && dashboard.brokerProfile?.experience_years !== undefined
        ? String(dashboard.brokerProfile.experience_years)
        : "",
    bio: dashboard.brokerProfile?.bio || "",
    coveredAreaIds: Array.from(new Set(dashboard.brokerProfile?.covered_area_ids || [])),
    shareLatestDeals: dashboard.brokerProfile?.share_latest_deals ?? false,
  };
}

function normalizeProfileFormState(form: BrokerProfileFormState) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    agencyName: form.agencyName.trim(),
    whatsappNumber: form.whatsappNumber.trim(),
    instagramProfile: form.instagramProfile.trim(),
    linkedinProfile: form.linkedinProfile.trim(),
    reraBrn: form.reraBrn.trim(),
    speciality: form.speciality.trim(),
    experienceYears: form.experienceYears.trim(),
    bio: form.bio.trim(),
    coveredAreaIds: Array.from(new Set(form.coveredAreaIds)).sort(),
    shareLatestDeals: form.shareLatestDeals,
  };
}

function areProfileFormsEqual(left: BrokerProfileFormState, right: BrokerProfileFormState) {
  return JSON.stringify(normalizeProfileFormState(left)) === JSON.stringify(normalizeProfileFormState(right));
}

export function BrokerProfileTab({
  dashboard,
  onProfileSaved,
}: {
  dashboard: BrokerDashboardData;
  onProfileSaved: (nextProfile: Pick<BrokerDashboardData, "profile" | "brokerProfile" | "agency">) => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const initialFormState = useMemo(() => createProfileFormState(dashboard), [dashboard]);
  const [form, setForm] = useState<BrokerProfileFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [isAreasCoveredOpen, setIsAreasCoveredOpen] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoProcessing, setProfilePhotoProcessing] = useState(false);
  const areasCoveredRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm(initialFormState);
    setFieldErrors({});
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setProfilePhotoProcessing(false);
    setIsAreasCoveredOpen(false);
  }, [initialFormState]);

  useEffect(() => {
    if (!profilePhotoFile) {
      setProfilePhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(profilePhotoFile);
    setProfilePhotoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [profilePhotoFile]);

  useEffect(() => {
    if (!isAreasCoveredOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (areasCoveredRef.current && !areasCoveredRef.current.contains(event.target as Node)) {
        setIsAreasCoveredOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isAreasCoveredOpen]);

  const currentPhotoSrc = profilePhotoPreview || dashboard.brokerProfile?.profile_photo || null;
  const selectedAreasLabel = form.coveredAreaIds.length
    ? `${form.coveredAreaIds.length} area${form.coveredAreaIds.length === 1 ? "" : "s"} selected`
    : "Select covered areas";
  const isDirty = useMemo(
    () => profilePhotoFile !== null || !areProfileFormsEqual(form, initialFormState),
    [form, initialFormState, profilePhotoFile]
  );

  const validateField = (field: ProfileField, nextForm = form) => {
    switch (field) {
      case "agencyName":
        return nextForm.agencyName.trim() ? "" : "Agency name is required.";
      case "whatsappNumber":
        if (!nextForm.whatsappNumber.trim()) {
          return "";
        }

        return isValidInternationalPhoneNumber(normalizePhoneNumber(nextForm.whatsappNumber))
          ? ""
          : "Enter a valid WhatsApp number for the selected country code.";
      case "instagramProfile":
        return getBrokerSocialFieldError("instagramProfile", nextForm.instagramProfile);
      case "linkedinProfile":
        return getBrokerSocialFieldError("linkedinProfile", nextForm.linkedinProfile);
      case "experienceYears":
        if (!nextForm.experienceYears.trim()) {
          return "";
        }

        return Number.isInteger(Number(nextForm.experienceYears)) &&
          Number(nextForm.experienceYears) >= 0 &&
          Number(nextForm.experienceYears) <= MAX_EXPERIENCE_YEARS
          ? ""
          : `Enter a whole number between 0 and ${MAX_EXPERIENCE_YEARS}.`;
      case "bio":
        return nextForm.bio.length <= BROKER_BIO_MAX_LENGTH ? "" : `Bio must be ${BROKER_BIO_MAX_LENGTH} characters or fewer.`;
      default:
        return "";
    }
  };

  const validateForm = (nextForm = form) => {
    const nextErrors: ProfileFieldErrors = {};
    const fields: ProfileField[] = ["agencyName", "whatsappNumber", "instagramProfile", "linkedinProfile", "experienceYears", "bio"];

    fields.forEach((field) => {
      const error = validateField(field, nextForm);
      if (error) {
        nextErrors[field] = error;
      }
    });

    return nextErrors;
  };

  const updateFieldError = (field: ProfileField, nextForm: BrokerProfileFormState) => {
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      const error = validateField(field, nextForm);

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const handleFieldChange = <K extends keyof BrokerProfileFormState>(field: K, value: BrokerProfileFormState[K]) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    if (
      field === "agencyName" ||
      field === "whatsappNumber" ||
      field === "instagramProfile" ||
      field === "linkedinProfile" ||
      field === "experienceYears" ||
      field === "bio"
    ) {
      updateFieldError(field, nextForm);
    }
  };

  const handleProfilePhotoChange = async (fileList: FileList | null) => {
    const nextFile = fileList?.[0] || null;

    if (!nextFile) {
      setProfilePhotoFile(null);
      return;
    }

    const validationError = getProfilePhotoValidationError(nextFile, { validateSize: false });
    if (validationError) {
      setProfilePhotoFile(null);
      enqueueSnackbar(validationError, { variant: "error" });
      return;
    }

    setProfilePhotoProcessing(true);
    setProfilePhotoFile(null);

    try {
      const compressedFile = await compressImageForUpload(nextFile, "Profile photo");
      setProfilePhotoFile(compressedFile);
    } catch (error) {
      setProfilePhotoFile(null);
      enqueueSnackbar(error instanceof Error ? error.message : "Profile photo could not be compressed.", { variant: "error" });
    } finally {
      setProfilePhotoProcessing(false);
    }
  };

  const handleReset = () => {
    setForm(initialFormState);
    setFieldErrors({});
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setProfilePhotoProcessing(false);
    setIsAreasCoveredOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      enqueueSnackbar("Please resolve the highlighted profile fields before saving.", { variant: "error" });
      return;
    }

    const profilePhotoError = getProfilePhotoValidationError(profilePhotoFile);
    if (profilePhotoError) {
      enqueueSnackbar(profilePhotoError, { variant: "error" });
      return;
    }

    if (profilePhotoProcessing) {
      enqueueSnackbar("Please wait for the profile photo to finish preparing.", { variant: "warning" });
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("agencyName", form.agencyName);
      payload.append("whatsappNumber", normalizePhoneNumber(form.whatsappNumber || ""));
      payload.append("instagramProfile", form.instagramProfile);
      payload.append("linkedinProfile", form.linkedinProfile);
      payload.append("speciality", form.speciality);
      payload.append("experienceYears", form.experienceYears);
      payload.append("bio", form.bio);
      payload.append("coveredAreaIds", JSON.stringify(form.coveredAreaIds));
      payload.append("shareLatestDeals", String(form.shareLatestDeals));

      if (profilePhotoFile) {
        payload.append("profilePhoto", profilePhotoFile);
      }

      const response = await apiFetch<BrokerProfileUpdateResponse>("/api/dashboard/profile", {
        method: "PUT",
        body: payload,
      });

      onProfileSaved({
        profile: response.profile,
        brokerProfile: response.brokerProfile,
        agency: response.agency,
      });
      enqueueSnackbar(response.message || "Profile updated successfully.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to update broker profile.", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-6">
      <div className="panel p-4 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Profile</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-brand-navy sm:text-[2rem]">Edit your broker profile</h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 sm:mt-8">
          <div className="flex flex-col items-center text-center">
            <label className="label text-center">Profile Photo</label>

            <button
              type="button"
              className="group relative mt-1 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || profilePhotoProcessing}
            >
              <BrokerAvatar
                src={currentPhotoSrc}
                alt="Profile photo"
                className="h-24 w-24 border border-brand-line bg-white shadow-[0_10px_24px_rgba(15,42,95,0.08)] transition duration-200 group-hover:scale-[1.02] group-hover:opacity-90 group-focus-visible:scale-[1.02] group-focus-visible:opacity-90"
              />
              <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-brand-navy/65 px-2 text-white opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M12 16V8M8.5 11.5 12 8l3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 18h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Upload</span>
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={PROFILE_PHOTO_ACCEPT}
              className="hidden"
              onChange={(event) => {
                void handleProfilePhotoChange(event.target.files);
                event.target.value = "";
              }}
              disabled={submitting || profilePhotoProcessing}
            />

            <p className="mt-3 break-words text-xs text-brand-slate">
              {profilePhotoProcessing
                ? "Preparing photo for upload..."
                : `Click photo to upload (JPG, JPEG, PNG, HEIC; compressed up to ${PROFILE_PHOTO_MAX_SIZE_LABEL})`}
            </p>

            {profilePhotoFile && (
              <p className="mt-1 max-w-full break-words text-xs text-brand-ink sm:max-w-md sm:truncate">
                {profilePhotoFile.name}
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-2 lg:gap-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="label mb-0" htmlFor="broker-profile-first-name">
                  First Name
                </label>
              </div>
              <input
                id="broker-profile-first-name"
                className="input border-brand-line bg-brand-panel-soft text-brand-slate"
                value={form.firstName}
                disabled={submitting}
                readOnly
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="label mb-0" htmlFor="broker-profile-last-name">
                  Last Name
                </label>
              </div>
              <input
                id="broker-profile-last-name"
                className="input border-brand-line bg-brand-panel-soft text-brand-slate"
                value={form.lastName}
                disabled={submitting}
                readOnly
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="label mb-0" htmlFor="broker-profile-email">
                  Email
                </label>
              </div>
              <input
                id="broker-profile-email"
                className="input border-brand-line bg-brand-panel-soft text-brand-slate"
                value={form.email}
                disabled
                readOnly
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="label mb-0" htmlFor="broker-profile-phone">
                  Phone
                </label>
              </div>
              <input
                id="broker-profile-phone"
                className="input border-brand-line bg-brand-panel-soft text-brand-slate"
                value={form.phone}
                disabled
                readOnly
              />
            </div>

            <div>
              <label className="label" htmlFor="broker-profile-whatsapp">
                WhatsApp
              </label>
              <PhoneInput
                id="broker-profile-whatsapp"
                international
                countryCallingCodeEditable={false}
                defaultCountry="AE"
                value={(form.whatsappNumber || undefined) as PhoneNumberValue | undefined}
                onChange={(value) => handleFieldChange("whatsappNumber", value || "")}
                onBlur={() => updateFieldError("whatsappNumber", form)}
                placeholder="Enter WhatsApp number"
                autoComplete="tel"
                className="phone-input"
                disabled={submitting}
              />
              <FieldError message={fieldErrors.whatsappNumber} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="label mb-0" htmlFor="broker-profile-rera">
                  RERA / BRN
                </label>
              </div>
              <input
                id="broker-profile-rera"
                className="input border-brand-line bg-brand-panel-soft text-brand-slate"
                value={form.reraBrn}
                disabled
                readOnly
              />
            </div>

            <div>
              <label className="label" htmlFor="broker-profile-speciality">
                Speciality
              </label>
              <input
                id="broker-profile-speciality"
                className="input"
                value={form.speciality}
                onChange={(event) => handleFieldChange("speciality", event.target.value)}
                placeholder="Secondary Market, Off-Plan, Luxury..."
                disabled={submitting}
              />
            </div>

            <div>
              <label className="label" htmlFor="broker-profile-experience">
                Experience (Years)
              </label>
              <input
                id="broker-profile-experience"
                className="input"
                type="number"
                min="0"
                max={MAX_EXPERIENCE_YEARS}
                value={form.experienceYears}
                onChange={(event) => handleFieldChange("experienceYears", event.target.value)}
                onBlur={() => updateFieldError("experienceYears", form)}
                placeholder="0"
                disabled={submitting}
              />
              <FieldError message={fieldErrors.experienceYears} />
            </div>

            <div className="lg:col-span-2">
              <BrokerSocialProfilesSection
                instagramValue={form.instagramProfile}
                linkedinValue={form.linkedinProfile}
                instagramError={fieldErrors.instagramProfile}
                linkedinError={fieldErrors.linkedinProfile}
                onInstagramChange={(value) => handleFieldChange("instagramProfile", value)}
                onLinkedInChange={(value) => handleFieldChange("linkedinProfile", value)}
                onInstagramBlur={() => updateFieldError("instagramProfile", form)}
                onLinkedInBlur={() => updateFieldError("linkedinProfile", form)}
                disabled={submitting}
                helperText="Optional. Add your active Instagram and LinkedIn profiles so admins can reference them when reviewing your account."
              />
            </div>

            <div>
              <label className="label" htmlFor="broker-profile-agency-name">
                Agency Name
              </label>
              <input
                id="broker-profile-agency-name"
                className="input"
                value={form.agencyName}
                onChange={(event) => handleFieldChange("agencyName", event.target.value)}
                onBlur={() => updateFieldError("agencyName", form)}
                placeholder="Enter your agency name"
                autoComplete="organization"
                required
                disabled={submitting}
              />
              <FieldError message={fieldErrors.agencyName} />
            </div>

            <div>
              <div ref={areasCoveredRef} className="relative">
                <label className="label">Areas Covered</label>
                <button
                  type="button"
                  aria-expanded={isAreasCoveredOpen}
                  aria-haspopup="listbox"
                  onClick={() => setIsAreasCoveredOpen((open) => !open)}
                  className="input flex min-h-[44px] items-center justify-between gap-3 px-3 py-2 text-left md:min-h-[52px] md:px-4 md:py-3"
                  disabled={submitting}
                >
                  <span className={form.coveredAreaIds.length ? "truncate text-left text-sm text-brand-ink" : "truncate text-left text-sm text-brand-slate"}>
                    {selectedAreasLabel}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={cn("h-4 w-4 shrink-0 text-brand-slate transition-transform duration-200", isAreasCoveredOpen && "rotate-180")}
                  >
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isAreasCoveredOpen ? (
                  <div
                    role="listbox"
                    aria-multiselectable="true"
                    className="absolute left-0 right-0 z-[220] mt-2 max-h-[min(18rem,calc(100dvh-8rem))] overflow-auto rounded-[12px] border border-brand-line bg-white py-1 shadow-medium"
                  >
                    {dashboard.areas.map((area) => {
                      const checked = form.coveredAreaIds.includes(area.id);

                      return (
                        <button
                          key={area.id}
                          type="button"
                          role="option"
                          aria-selected={checked}
                          onClick={() =>
                            handleFieldChange(
                              "coveredAreaIds",
                              checked
                                ? form.coveredAreaIds.filter((id) => id !== area.id)
                                : [...form.coveredAreaIds, area.id]
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition sm:px-4 sm:py-3",
                            checked ? "bg-[#fff7df] text-brand-navy" : "text-brand-ink hover:bg-brand-panel-soft"
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{area.name}</span>
                          </span>
                          <span className={cn("shrink-0 text-xs", checked ? "text-brand-gold" : "text-transparent")}>Selected</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="label mb-0" htmlFor="broker-profile-bio">
                  Bio
                </label>
                <span className={cn("text-xs", form.bio.length >= BROKER_BIO_MAX_LENGTH ? "text-brand-gold" : "text-brand-slate")}>
                  {form.bio.length}/{BROKER_BIO_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="broker-profile-bio"
                className="input min-h-[80px] resize-none"
                value={form.bio}
                onChange={(event) => handleFieldChange("bio", event.target.value)}
                onBlur={() => updateFieldError("bio", form)}
                maxLength={BROKER_BIO_MAX_LENGTH}
                placeholder="Tell partners a bit about your market focus and how you work."
                disabled={submitting}
              />
              <FieldError message={fieldErrors.bio} />
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="broker-profile-share-latest-deals"
                className="flex cursor-pointer items-start gap-3 rounded-[8px] border border-brand-line/80 bg-brand-panel-soft px-3 py-3 transition hover:border-brand-blue/20 hover:bg-white sm:px-4 sm:py-4"
              >
                <input
                  id="broker-profile-share-latest-deals"
                  type="checkbox"
                  checked={form.shareLatestDeals}
                  onChange={(event) => handleFieldChange("shareLatestDeals", event.target.checked)}
                  className="peer sr-only"
                  disabled={submitting}
                />
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-line bg-white text-transparent transition peer-checked:border-brand-gold peer-checked:bg-brand-gold peer-checked:text-brand-navy">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-brand-ink">Share latest deals with me</span>
                  <span className="mt-1 block break-words text-sm leading-6 text-brand-slate">
                    Keep me opted in for marketplace updates and shared deal opportunities.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-brand-line/80 pt-5 sm:mt-8 sm:gap-4 sm:pt-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="break-words text-sm text-brand-slate">{isDirty ? "You have unsaved profile changes." : "All profile changes are saved."}</p>

            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row lg:w-auto">
              <button type="button" className="btn-secondary w-full sm:w-auto" onClick={handleReset} disabled={!isDirty || submitting || profilePhotoProcessing}>
                Reset Changes
              </button>
              <button type="submit" className="btn-primary w-full sm:w-auto sm:min-w-[180px]" disabled={!isDirty || submitting || profilePhotoProcessing}>
                {profilePhotoProcessing ? "Preparing Photo..." : submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
