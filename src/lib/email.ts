import nodemailer, { type Transporter } from "nodemailer";

type EmailRecipient = string | string[];

export type EmailPayload = {
  to: EmailRecipient;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | string[] | null;
};

export type EmailSendResult = {
  ok: boolean;
  skipped?: boolean;
  provider?: string;
  messageId?: string | null;
  error?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey: string | null = null;

function normalizeEmailList(value: EmailRecipient | null | undefined) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,\s;]+/) : [];
  return values.map((email) => email.trim()).filter(Boolean);
}

export function isValidEmailAddress(value: string | null | undefined) {
  return Boolean(value && EMAIL_REGEX.test(value.trim()));
}

function filterValidEmailList(value: EmailRecipient | null | undefined) {
  return normalizeEmailList(value).filter(isValidEmailAddress);
}

function getEmailProviderConfig() {
  const port = Number(process.env.SMTP_PORT || 465);
  const secureValue = (process.env.SMTP_SECURE || "").trim().toLowerCase();

  return {
    provider: "smtp",
    host: process.env.SMTP_HOST?.trim() || "",
    port,
    secure: secureValue ? ["true", "1", "yes", "on"].includes(secureValue) : port === 465,
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM?.trim() || "",
  };
}

function buildMissingConfigMessage(missing: string[]) {
  return `Email provider is not configured. Missing: ${missing.join(", ")}.`;
}

function getSmtpTransporter(config: ReturnType<typeof getEmailProviderConfig>) {
  const cacheKey = [config.host, config.port, config.secure, config.user].join("|");

  if (cachedTransporter && cachedTransporterKey === cacheKey) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  cachedTransporterKey = cacheKey;

  return cachedTransporter;
}

function getSmtpErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "SMTP send failed.");
  }

  return "SMTP send failed.";
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  if (typeof window !== "undefined") {
    return { ok: false, skipped: true, provider: "smtp", error: "Email can only be sent from the server." };
  }

  const config = getEmailProviderConfig();
  const to = filterValidEmailList(payload.to);

  if (!to.length) {
    return { ok: false, skipped: true, provider: config.provider, error: "No valid email recipients were provided." };
  }

  if (!payload.subject.trim()) {
    return { ok: false, skipped: true, provider: config.provider, error: "Email subject is required." };
  }

  if (!payload.text.trim() && !payload.html?.trim()) {
    return { ok: false, skipped: true, provider: config.provider, error: "Email body is required." };
  }

  try {
    const missing = [
      !config.host ? "SMTP_HOST" : null,
      !Number.isFinite(config.port) || config.port <= 0 ? "SMTP_PORT" : null,
      !config.user ? "SMTP_USER" : null,
      !config.pass ? "SMTP_PASS" : null,
      !config.from ? "EMAIL_FROM" : null,
    ].filter(Boolean) as string[];

    if (missing.length) {
      return { ok: false, skipped: true, provider: config.provider, error: buildMissingConfigMessage(missing) };
    }

    const replyTo = filterValidEmailList(payload.replyTo || undefined);
    const transporter = getSmtpTransporter(config);
    const info = await transporter.sendMail({
      from: config.from,
      to: to.join(", "),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      ...(replyTo.length ? { replyTo: replyTo.join(", ") } : {}),
    });

    return { ok: true, provider: config.provider, messageId: typeof info.messageId === "string" ? info.messageId : null };
  } catch (error) {
    const message = getSmtpErrorMessage(error);
    console.error("[email] Failed to send email.", {
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      subject: payload.subject,
      error: message,
    });
    return { ok: false, provider: config.provider, error: message };
  }
}

export function sendEmailInBackground(payload: EmailPayload, context: string) {
  void sendEmail(payload).then((result) => {
    if (!result.ok) {
      const logMethod = result.skipped ? console.warn : console.error;
      logMethod("[email] Background email was not sent.", {
        context,
        provider: result.provider,
        subject: payload.subject,
        error: result.error,
      });
    }
  });
}
