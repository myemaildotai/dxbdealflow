import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

export const ENQUIRY_FULL_NAME_MIN_LENGTH = 2;
export const ENQUIRY_FULL_NAME_MAX_LENGTH = 30;
export const ENQUIRY_EMAIL_MAX_LENGTH = 100;
export const ENQUIRY_PHONE_MAX_LENGTH = 20;
export const ENQUIRY_MESSAGE_MAX_LENGTH = 180;

export const ENQUIRY_VALIDATION_MESSAGES = {
  fullNameRequired: "Full name is required.",
  fullNameMin: `Full name must be at least ${ENQUIRY_FULL_NAME_MIN_LENGTH} characters.`,
  fullNameMax: "Full name cannot exceed 30 characters.",
  emailRequired: "Email address is required.",
  emailInvalid: "Enter a valid email address.",
  emailMax: "Email address cannot exceed 100 characters.",
  phoneInvalid: "Enter a valid phone number including country code.",
  phoneInvalidSelectedCountry: "Enter a valid phone number for the selected country code.",
  phoneMax: "Phone number cannot exceed 20 characters.",
  messageRequired: "Message is required.",
  messageMax: "Message cannot exceed 180 characters.",
} as const;

export type EnquiryField = "contactName" | "contactEmail" | "contactPhone" | "message";
export type EnquiryFieldErrors = Partial<Record<EnquiryField, string>>;

export type EnquiryFormValues = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  message: string;
};

type EnquiryFormInput = Partial<Record<EnquiryField, unknown>>;

type EnquiryNormalizeOptions = {
  normalizePhone?: boolean;
};

type EnquiryValidationOptions = {
  phoneInvalidMessage?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENQUIRY_FIELDS: EnquiryField[] = ["contactName", "contactEmail", "contactPhone", "message"];

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeEnquiryFormValues(input: EnquiryFormInput, options: EnquiryNormalizeOptions = {}): EnquiryFormValues {
  const contactPhone = readString(input.contactPhone);

  return {
    contactName: readString(input.contactName),
    contactEmail: readString(input.contactEmail),
    contactPhone: options.normalizePhone && contactPhone ? normalizePhoneNumber(contactPhone) : contactPhone,
    message: readString(input.message),
  };
}

export function validateEnquiryField(
  field: EnquiryField,
  values: EnquiryFormValues,
  options: EnquiryValidationOptions = {}
) {
  switch (field) {
    case "contactName":
      if (!values.contactName) {
        return ENQUIRY_VALIDATION_MESSAGES.fullNameRequired;
      }

      if (values.contactName.length < ENQUIRY_FULL_NAME_MIN_LENGTH) {
        return ENQUIRY_VALIDATION_MESSAGES.fullNameMin;
      }

      return values.contactName.length <= ENQUIRY_FULL_NAME_MAX_LENGTH ? "" : ENQUIRY_VALIDATION_MESSAGES.fullNameMax;
    case "contactEmail":
      if (!values.contactEmail) {
        return ENQUIRY_VALIDATION_MESSAGES.emailRequired;
      }

      if (values.contactEmail.length > ENQUIRY_EMAIL_MAX_LENGTH) {
        return ENQUIRY_VALIDATION_MESSAGES.emailMax;
      }

      return EMAIL_REGEX.test(values.contactEmail) ? "" : ENQUIRY_VALIDATION_MESSAGES.emailInvalid;
    case "contactPhone":
      if (!values.contactPhone) {
        return "";
      }

      if (values.contactPhone.length > ENQUIRY_PHONE_MAX_LENGTH) {
        return ENQUIRY_VALIDATION_MESSAGES.phoneMax;
      }

      return isValidInternationalPhoneNumber(normalizePhoneNumber(values.contactPhone))
        ? ""
        : options.phoneInvalidMessage || ENQUIRY_VALIDATION_MESSAGES.phoneInvalid;
    case "message":
      if (!values.message) {
        return ENQUIRY_VALIDATION_MESSAGES.messageRequired;
      }

      return values.message.length <= ENQUIRY_MESSAGE_MAX_LENGTH ? "" : ENQUIRY_VALIDATION_MESSAGES.messageMax;
    default:
      return "";
  }
}

export function validateEnquiryFormValues(values: EnquiryFormValues, options: EnquiryValidationOptions = {}) {
  const errors: EnquiryFieldErrors = {};

  ENQUIRY_FIELDS.forEach((field) => {
    const error = validateEnquiryField(field, values, options);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function validateEnquiryInput(
  input: EnquiryFormInput,
  options: EnquiryNormalizeOptions & EnquiryValidationOptions = {}
) {
  const values = normalizeEnquiryFormValues(input, options);
  const validation = validateEnquiryFormValues(values, options);

  return {
    values,
    ...validation,
  };
}
