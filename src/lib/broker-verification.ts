export type BrokerVerificationStatus = "auto_approved" | "pending";

type DldEnvelope<T> = {
  Code?: string;
  Message?: string;
  Response?: T | null;
};

type DldBrokerDetails = {
  EmployeeNumber?: number | null;
  EmployeeNameEn?: string | null;
  EmployeeNameAr?: string | null;
  Phone?: string | null;
  Mobile?: string | null;
  Email?: string | null;
  OfficeNumber?: number | null;
  OfficeNameEn?: string | null;
  OfficeNameAr?: string | null;
  LicenseExpDate?: string | null;
};

export type BrokerVerificationResult = {
  broker_found: boolean;
  email_match: boolean;
  phone_match: boolean;
  status: BrokerVerificationStatus;
  broker_name: string;
  broker_number: string;
  official_email: string;
  official_phone: string;
  office_name: string;
  office_number: string;
  verification_source: "DLD";
  raw_payload: DldBrokerDetails | null;
};

const DLD_SOURCE = "DLD" as const;
const DLD_BROKER_DETAILS_URL = "https://b2c.dubailand.gov.ae/properties.wallet/api/tabu/GetEmployeeCardDetails";

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function digitsOnly(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function phoneCandidates(value?: string | null) {
  const raw = digitsOnly(value);
  const candidates = new Set<string>();

  const add = (candidate?: string | null) => {
    if (candidate) {
      candidates.add(candidate);
    }
  };

  if (!raw) {
    return candidates;
  }

  add(raw);

  if (raw.startsWith("00")) {
    add(raw.slice(2));
  }

  Array.from(candidates).forEach((candidate) => {
    if (candidate.startsWith("971") && candidate.length > 3) {
      add(candidate.slice(3));
      add(`0${candidate.slice(3)}`);
    }

    if (candidate.startsWith("0") && candidate.length > 1) {
      add(candidate.slice(1));
      add(`971${candidate.slice(1)}`);
    }

    if (candidate.length > 10) {
      add(candidate.slice(-10));
    }

    if (candidate.length > 9) {
      add(candidate.slice(-9));
    }
  });

  return candidates;
}

function phonesMatch(left?: string | null, right?: string | null) {
  const leftCandidates = phoneCandidates(left);
  const rightCandidates = phoneCandidates(right);

  if (!leftCandidates.size || !rightCandidates.size) {
    return false;
  }

  return Array.from(leftCandidates).some((candidate) => rightCandidates.has(candidate));
}

function toText(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function getDldBrokerDetails(brokerNumber: string) {
  const url = new URL(DLD_BROKER_DETAILS_URL);
  url.searchParams.set("employeenumber", brokerNumber);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DLD verification request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as DldEnvelope<DldBrokerDetails>;
  return payload.Response || null;
}

export async function verifyBrokerRegistration(params: {
  brokerNumber: string;
  email: string;
  mobileNumber: string;
}): Promise<BrokerVerificationResult> {
  const brokerNumber = toText(params.brokerNumber);

  if (!brokerNumber) {
    return {
      broker_found: false,
      email_match: false,
      phone_match: false,
      status: "pending",
      broker_name: "",
      broker_number: "",
      official_email: "",
      official_phone: "",
      office_name: "",
      office_number: "",
      verification_source: DLD_SOURCE,
      raw_payload: null,
    };
  }

  const broker = await getDldBrokerDetails(brokerNumber);

  if (!broker) {
    return {
      broker_found: false,
      email_match: false,
      phone_match: false,
      status: "pending",
      broker_name: "",
      broker_number: brokerNumber,
      official_email: "",
      official_phone: "",
      office_name: "",
      office_number: "",
      verification_source: DLD_SOURCE,
      raw_payload: null,
    };
  }

  const officialEmail = normalizeEmail(broker.Email);
  const officialPhone = broker.Mobile || broker.Phone || "";
  const emailMatch = !!normalizeEmail(params.email) && normalizeEmail(params.email) === officialEmail;
  const phoneMatch = phonesMatch(params.mobileNumber, officialPhone);
  const status: BrokerVerificationStatus = emailMatch || phoneMatch ? "auto_approved" : "pending";

  return {
    broker_found: true,
    email_match: emailMatch,
    phone_match: phoneMatch,
    status,
    broker_name: toText(broker.EmployeeNameEn || broker.EmployeeNameAr),
    broker_number: brokerNumber,
    official_email: toText(broker.Email),
    official_phone: toText(officialPhone),
    office_name: toText(broker.OfficeNameEn || broker.OfficeNameAr),
    office_number: toText(broker.OfficeNumber),
    verification_source: DLD_SOURCE,
    raw_payload: broker,
  };
}
