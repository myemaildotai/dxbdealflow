import { sendEmail, getAdminNotificationRecipients, isValidEmailAddress } from "@/lib/email";
import type { EmailPayload, EmailSendResult } from "@/lib/email";
import { formatCurrency, formatDateTime, formatPropertyType } from "@/lib/deal-utils";

type FieldRow = {
  label: string;
  value: string | number | null | undefined;
};

type BrokerRegistrationEmail = {
  brokerName: string;
  email: string;
  phone: string;
  brn: string;
  company: string;
  registrationDate: string;
};

type BrokerApplicationDecisionEmail = {
  brokerName: string;
  email: string;
  status: "approved" | "rejected";
  notes?: string | null;
};

type ListingCreatedEmail = {
  brokerName: string;
  listingTitle: string;
  area: string | null;
  price: number | null;
  propertyType: string | null;
  createdDate: string;
};

type ListingDecisionEmail = {
  brokerName: string;
  brokerEmail: string;
  listingTitle: string;
  status: "approved" | "rejected";
  notes?: string | null;
};

type PublicEnquiryEmail = {
  brokerName: string;
  brokerEmail: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  message?: string | null;
  listingTitle: string;
  enquiryDate: string;
};

type ComingSoonInterestConfirmationEmail = {
  email: string;
};

type BrokerEmailOtpEmail = {
  brokerName: string;
  brokerEmail: string;
  otp: string;
  expiresAt: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayValue(value: FieldRow["value"]) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}

function buildText(title: string, intro: string, rows: FieldRow[], closing?: string) {
  return [
    title,
    "",
    intro,
    "",
    ...rows.map((row) => `${row.label}: ${displayValue(row.value)}`),
    ...(closing ? ["", closing] : []),
  ].join("\n");
}

function buildHtml(title: string, intro: string, rows: FieldRow[], closing?: string) {
  const rowHtml = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e6ebf2;color:#5c6780;font-size:13px;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6ebf2;color:#17213a;font-size:14px;font-weight:600;">${escapeHtml(displayValue(row.value))}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#17213a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e1e7f0;border-radius:8px;overflow:hidden;">
        <div style="padding:24px 24px 16px;border-bottom:1px solid #e6ebf2;">
          <h1 style="margin:0;color:#0f2a5f;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
          <p style="margin:12px 0 0;color:#4d5b73;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
          <tbody>${rowHtml}</tbody>
        </table>
        ${
          closing
            ? `<p style="margin:0;padding:18px 24px 24px;color:#4d5b73;font-size:14px;line-height:1.6;">${escapeHtml(closing)}</p>`
            : ""
        }
      </div>
    </div>`;
}

function getEmailErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown email send error.";
}

async function sendNotificationEmail(payload: EmailPayload, context: string): Promise<EmailSendResult> {
  try {
    const result = await sendEmail(payload);

    if (!result.ok) {
      const logMethod = result.skipped ? console.warn : console.error;
      logMethod("[email] Notification email was not sent.", {
        context,
        provider: result.provider,
        subject: payload.subject,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    const message = getEmailErrorMessage(error);
    console.error("[email] Notification email send failed.", {
      context,
      subject: payload.subject,
      error: message,
    });
    return { ok: false, error: message };
  }
}

async function sendAdminNotification(
  subject: string,
  title: string,
  intro: string,
  rows: FieldRow[],
  context: string
): Promise<EmailSendResult> {
  return sendNotificationEmail(
    {
      to: getAdminNotificationRecipients(),
      subject,
      text: buildText(title, intro, rows),
      html: buildHtml(title, intro, rows),
    },
    context
  );
}

async function sendBrokerNotification(
  recipientEmail: string,
  subject: string,
  title: string,
  intro: string,
  rows: FieldRow[],
  closing: string,
  context: string,
  replyTo?: string | null
): Promise<EmailSendResult> {
  return sendNotificationEmail(
    {
      to: recipientEmail,
      subject,
      text: buildText(title, intro, rows, closing),
      html: buildHtml(title, intro, rows, closing),
      replyTo: replyTo && isValidEmailAddress(replyTo) ? replyTo : undefined,
    },
    context
  );
}

export async function notifyAdminBrokerRegistrationSubmitted(data: BrokerRegistrationEmail): Promise<EmailSendResult> {
  return sendAdminNotification(
    `New broker application: ${data.brokerName}`,
    "New Broker Application",
    "A broker has submitted a registration application.",
    [
      { label: "Broker name", value: data.brokerName },
      { label: "Email", value: data.email },
      { label: "Phone", value: data.phone },
      { label: "BRN", value: data.brn },
      { label: "Company", value: data.company },
      { label: "Registration date", value: formatDateTime(data.registrationDate) },
    ],
    "broker-registration"
  );
}

export async function notifyBrokerApplicationDecision(data: BrokerApplicationDecisionEmail): Promise<EmailSendResult> {
  const approved = data.status === "approved";
  return sendBrokerNotification(
    data.email,
    approved ? "Your broker application has been approved" : "Your broker application was not approved",
    approved ? "Broker Application Approved" : "Broker Application Rejected",
    approved
      ? "Your broker application has been approved by the admin team."
      : "Your broker application has been reviewed and was not approved at this time.",
    [
      { label: "Broker name", value: data.brokerName },
      { label: "Status", value: approved ? "Approved" : "Rejected" },
      { label: "Reviewed date", value: formatDateTime(new Date().toISOString()) },
      ...(data.notes ? [{ label: "Admin notes", value: data.notes }] : []),
    ],
    approved ? "You can continue using your broker dashboard." : "Please contact the admin team if you need more information.",
    `broker-application-${data.status}`
  );
}

export async function notifyAdminListingCreated(data: ListingCreatedEmail): Promise<EmailSendResult> {
  return sendAdminNotification(
    `New listing submitted: ${data.listingTitle}`,
    "New Listing Submitted",
    "A broker has created a new listing for admin review.",
    [
      { label: "Broker name", value: data.brokerName },
      { label: "Listing title", value: data.listingTitle },
      { label: "Area", value: data.area },
      { label: "Price", value: data.price === null ? null : formatCurrency(data.price) },
      { label: "Property type", value: formatPropertyType(data.propertyType) },
      { label: "Created date", value: formatDateTime(data.createdDate) },
    ],
    "listing-created"
  );
}

export async function notifyBrokerListingDecision(data: ListingDecisionEmail): Promise<EmailSendResult> {
  const approved = data.status === "approved";
  return sendBrokerNotification(
    data.brokerEmail,
    approved ? `Listing approved: ${data.listingTitle}` : `Listing rejected: ${data.listingTitle}`,
    approved ? "Listing Approved" : "Listing Rejected",
    approved
      ? "Your listing has been approved and is now live where eligible."
      : "Your listing has been reviewed and was rejected by the admin team.",
    [
      { label: "Broker name", value: data.brokerName },
      { label: "Listing title", value: data.listingTitle },
      { label: "Status", value: approved ? "Approved" : "Rejected" },
      { label: "Reviewed date", value: formatDateTime(new Date().toISOString()) },
      ...(data.notes ? [{ label: "Admin notes", value: data.notes }] : []),
    ],
    approved ? "No further action is required." : "Please review the listing details before submitting it again.",
    `listing-${data.status}`
  );
}

export async function notifyBrokerPublicEnquiry(data: PublicEnquiryEmail): Promise<EmailSendResult> {
  return sendBrokerNotification(
    data.brokerEmail,
    `New enquiry for ${data.listingTitle}`,
    "New Public Enquiry",
    "A public user has submitted an enquiry for one of your listings.",
    [
      { label: "Public user name", value: data.contactName },
      { label: "Public user email", value: data.contactEmail },
      { label: "Phone", value: data.contactPhone },
      { label: "Message", value: data.message },
      { label: "Listing title", value: data.listingTitle },
      { label: "Enquiry date", value: formatDateTime(data.enquiryDate) },
    ],
    "Please follow up with the enquirer directly.",
    "public-listing-enquiry",
    data.contactEmail
  );
}

export async function notifyComingSoonInterestConfirmation(data: ComingSoonInterestConfirmationEmail): Promise<void> {
  const recipientEmail = data.email.trim().toLowerCase();

  if (!isValidEmailAddress(recipientEmail)) {
    return;
  }

  try {
    const subject = "Thank you for registering your interest";
    const text = [
      "Hi,",
      "",
      "Thank you for registering your interest in DXB Deal Flow.",
      "",
      "We have received your details and will keep you updated when the platform becomes available.",
      "",
      "Regards,",
      "DXB Deal Flow Team",
    ].join("\n");
    const html = `
      <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#17213a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e1e7f0;border-radius:8px;padding:24px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thank you for registering your interest in DXB Deal Flow.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We have received your details and will keep you updated when the platform becomes available.</p>
          <p style="margin:0;font-size:15px;line-height:1.6;">Regards,<br />DXB Deal Flow Team</p>
        </div>
      </div>`;

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html,
    });

    if (!result.ok) {
      const logMethod = result.skipped ? console.warn : console.error;
      logMethod("[coming-soon] Interest confirmation email was not sent.", {
        context: "coming-soon-interest-confirmation",
        provider: result.provider,
        subject,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[coming-soon] Failed to send interest confirmation email.", {
      context: "coming-soon-interest-confirmation",
      error: getEmailErrorMessage(error),
    });
  }
}

export async function sendBrokerEmailVerificationOtp(data: BrokerEmailOtpEmail): Promise<EmailSendResult> {
  const subject = "Verify your broker email";
  const title = "Email Verification OTP";
  const intro = `Hello ${data.brokerName}, use this OTP to verify your registered broker email.`;
  const rows: FieldRow[] = [
    { label: "OTP", value: data.otp },
    { label: "Expires at", value: formatDateTime(data.expiresAt) },
  ];
  const closing = "If you did not request this OTP, you can ignore this email.";

  try {
    const result = await sendEmail({
      to: data.brokerEmail,
      subject,
      text: buildText(title, intro, rows, closing),
      html: buildHtml(title, intro, rows, closing),
    });

    if (!result.ok) {
      const logMethod = result.skipped ? console.warn : console.error;
      logMethod("[broker-email-verification] OTP email was not sent.", {
        context: "broker-email-verification-otp",
        provider: result.provider,
        subject,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    const message = getEmailErrorMessage(error);
    console.error("[broker-email-verification] Failed to send OTP email.", {
      context: "broker-email-verification-otp",
      subject,
      error: message,
    });
    return { ok: false, error: message };
  }
}
