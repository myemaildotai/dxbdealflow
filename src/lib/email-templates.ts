import { API_CONFIG } from "@/config";
import { formatCurrency, formatPropertyType } from "@/lib/deal-utils";

export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export type EmailListingSummary = {
  id: string;
  title: string;
  price: number | null;
  url: string;
  areaLabel?: string | null;
  imageUrl?: string | null;
  roiPercent?: number | null;
  belowMarketPercent?: number | null;
};

type EmailAction = {
  label: string;
  href: string | null | undefined;
};

type InfoRow = {
  label: string;
  value: string | number | null | undefined;
};

type LayoutOptions = {
  title: string;
  titleHighlight?: {
    text: string;
    color: string;
  };
  subtitle: string;
  iconLabel: string;
  bodyHtml?: string;
  primaryCta?: EmailAction | null;
  secondaryCta?: EmailAction | null;
  preheader?: string;
  buttonLayout?: "stacked" | "inline";
};

const BRAND_NAME = "DXB Deal Flow";
const NAVY = "#0B1D3A";
const GOLD = "#F5A623";
const LIGHT_BACKGROUND = "#F2F4F7";
const CONTENT_BACKGROUND = "#ffffff";
const CARD_BACKGROUND = "#f1f3f5";
const PANEL_BACKGROUND = "#F1F3F5";
const MUTED = "#6B7280";
const TEXT = "#111827";
const BORDER = "#E5E7EB";
const FOOTER_BACKGROUND = "#F7F8FA";
const SUCCESS_GREEN = "#16A34A";
const LOGO_PATH = "/assets/Logo-White.png";
const WELCOME_HERO_PATH = "/assets/coming-soon.png";
const LOCK_ICON_PATH = "/assets/lock.png";
const WELCOME_INSTAGRAM_ICON_PATH = "/assets/insta-gold.png";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const SOCIAL_HANDLE = "@dxbdealflow";
const BODY_FONT_STACK = "'Inter', Arial, Helvetica, sans-serif";
const DISPLAY_FONT_STACK = "'Poppins', 'Inter', Arial, Helvetica, sans-serif";
const BODY_TEXT_STYLE = `font-family:${BODY_FONT_STACK};font-weight:400;`;
const HEADING_TEXT_STYLE = `font-family:${DISPLAY_FONT_STACK};font-weight:600;`;
const LABEL_TEXT_STYLE = `font-family:${DISPLAY_FONT_STACK};font-weight:500;`;
// LinkedIn and YouTube use platform homes until official DXB Deal Flow pages are configured.
const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/dxbdealflow/",
  linkedin: "https://www.linkedin.com/",
  youtube: "https://www.youtube.com/",
} as const;
const SOCIAL_ICON_PATHS = {
  instagram: "/assets/instagram.png",
  linkedin: "/assets/linkedin.png",
  youtube: "/assets/youtube.png",
} as const;
const SOCIAL_ITEMS = [
  { label: "Instagram", href: SOCIAL_LINKS.instagram, iconPath: SOCIAL_ICON_PATHS.instagram },
  { label: "LinkedIn", href: SOCIAL_LINKS.linkedin, iconPath: SOCIAL_ICON_PATHS.linkedin },
  { label: "YouTube", href: SOCIAL_LINKS.youtube, iconPath: SOCIAL_ICON_PATHS.youtube },
] as const;

const INSTAGRAM_URL = SOCIAL_LINKS.instagram;

function normalizeBaseUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
  return withProtocol.replace(/\/+$/, "");
}

function getEmailBaseUrl() {
  const explicitBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    API_CONFIG.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  const normalizedBase = normalizeBaseUrl(explicitBase);

  if (normalizedBase) {
    return normalizedBase;
  }

  const vercelBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL);

  if (vercelBase) {
    return vercelBase;
  }

  return process.env.NODE_ENV === "production" ? "" : "http://localhost:3000";
}

function buildEmailUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getEmailBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}

function toAbsoluteUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/")) {
    const baseUrl = normalizeBaseUrl(BASE_URL);

    if (!baseUrl) {
      return null;
    }

    return `${baseUrl}${trimmedValue}`;
  }

  return null;
}

export function buildEmailAssetUrl(path: string) {
  const trimmedPath = path.trim();

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalizedPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
  const baseUrl = normalizeBaseUrl(BASE_URL);

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeMultiline(value: string | number | null | undefined) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}

function textTemplate(title: string, lines: Array<string | number | null | undefined>) {
  return [title, "", ...lines.map((line) => String(line ?? "")).filter((line) => line.length > 0)].join("\n");
}

function formatPercentValue(value: number | null | undefined, fallback = "Available on listing") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`;
}

function truncateText(value: string | null | undefined, maxLength = 220) {
  const normalized = value?.replace(/\s+/g, " ").trim() || "";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function renderEmailImageIcon(params: { path: string; altText: string; size: number; className: string }) {
  const iconUrl = buildEmailAssetUrl(params.path);

  return `<img class="${escapeHtml(params.className)}" src="${escapeHtml(iconUrl)}" width="${params.size}" height="${params.size}" alt="${escapeHtml(params.altText)}" border="0" style="display:block;width:${params.size}px;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;background:transparent;text-decoration:none;line-height:0;-ms-interpolation-mode:bicubic;" />`;
}

function renderLogo() {
  const logoUrl = buildEmailAssetUrl(LOGO_PATH);

  if (!logoUrl) {
    return `<span class="brand-logo-text" style="color:#ffffff;${HEADING_TEXT_STYLE}font-size:18px;letter-spacing:0.04em;line-height:24px;">${BRAND_NAME}</span>`;
  }

  return `<img class="brand-logo" src="${escapeHtml(logoUrl)}" width="132" alt="${BRAND_NAME}" style="display:block;width:132px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />`;
}

function renderPrivateNetworkBadge() {
  return `
    <table class="private-badge" role="presentation" align="right" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-left:auto;">
      <tr>
        <td align="center" valign="middle" style="width:20px;padding:0 7px 0 0;color:#ffffff;text-align:center;font-size:0;line-height:0;vertical-align:middle;">
          ${renderEmailImageIcon({ path: LOCK_ICON_PATH, altText: "Private network", size: 22, className: "private-icon" })}
        </td>
        <td class="private-label" valign="middle" align="left" style="padding:0;color:#ffffff;${LABEL_TEXT_STYLE}font-size:11px;line-height:13px;text-align:left;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;">
          PRIVATE NETWORK
          <br />
          <span class="private-sublabel" style="color:#DDE5F2;${LABEL_TEXT_STYLE}font-size:10px;line-height:12px;letter-spacing:0.06em;text-transform:none;">For Verified Brokers Only</span>
        </td>
      </tr>
    </table>`;
}

const BADGE_ICON_ASSET_PATHS = {
  VIP: "/assets/vip.png",
  OK: "/assets/ok.png",
  REV: "/assets/rev.png",
  SUB: "/assets/sub.png",
  LIVE: "/assets/live.png",
  NEW: "/assets/new.png",
  MSG: "/assets/msg.png",
  MTCH: "/assets/match.png",
  WEEK: "/assets/week.png",
  PRO: "/assets/pro.png",
  OTP: "/assets/otp.png",
  LEAD: "/assets/lead.png",
  REPLY: "/assets/reply.png",
} as const;

const BADGE_ICON_ALT_TEXT = {
  VIP: "VIP",
  OK: "OK",
  REV: "Review",
  SUB: "Submitted",
  LIVE: "Live",
  NEW: "New",
  MSG: "Message",
  MTCH: "Match",
  WEEK: "Weekly digest",
  PRO: "Profile",
  OTP: "OTP",
  LEAD: "Lead",
  REPLY: "Reply",
} as const;

type BadgeIconName = keyof typeof BADGE_ICON_ASSET_PATHS;

const BADGE_ICON_FALLBACK: BadgeIconName = "VIP";

function isBadgeIconName(iconName: string): iconName is BadgeIconName {
  return iconName in BADGE_ICON_ASSET_PATHS;
}

function getBadgeImageIcon(iconName: string, size = 40) {
  const resolvedIconName = isBadgeIconName(iconName) ? iconName : BADGE_ICON_FALLBACK;
  const altText = BADGE_ICON_ALT_TEXT[resolvedIconName];

  return renderEmailImageIcon({
    path: BADGE_ICON_ASSET_PATHS[resolvedIconName],
    altText,
    size,
    className: "badge-icon-image",
  });
}

function renderBadgeIcon(label: string) {
  return getBadgeImageIcon(label, 34);
}

function renderIconBadge(label: string) {
  return `
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto 18px;border-collapse:collapse;">
      <tr>
        <td class="badge-cell" align="center" valign="middle" width="56" height="56" style="width:56px;height:56px;padding:0;border-radius:999px;background:#EAF7EF;color:${SUCCESS_GREEN};text-align:center;vertical-align:middle;line-height:56px;mso-line-height-rule:exactly;font-size:0;">
          ${renderBadgeIcon(label)}
        </td>
      </tr>
    </table>`;
}

function renderButton(action: EmailAction, variant: "primary" | "secondary" = "primary") {
  const href = action.href?.trim();

  if (!href) {
    return "";
  }

  const isPrimary = variant === "primary";
  const background = isPrimary ? GOLD : "#ffffff";
  const color = isPrimary ? "#ffffff" : NAVY;
  const border = isPrimary ? GOLD : GOLD;

  return `
    <a class="email-button" href="${escapeHtml(href)}" style="display:inline-block;min-width:190px;max-width:320px;padding:14px 22px;border:1px solid ${border};border-radius:6px;background:${background};color:${color};${LABEL_TEXT_STYLE}font-size:14px;line-height:18px;mso-line-height-rule:exactly;text-align:center;text-decoration:none;box-sizing:border-box;">
      ${escapeHtml(action.label)}
    </a>`;
}

function renderButtonRow(primary?: EmailAction | null, secondary?: EmailAction | null, layout: LayoutOptions["buttonLayout"] = "stacked") {
  const primaryButton = primary ? renderButton(primary, "primary") : "";
  const secondaryButton = secondary ? renderButton(secondary, "secondary") : "";

  if (!primaryButton && !secondaryButton) {
    return "";
  }

  if (layout === "inline" && primaryButton && secondaryButton) {
    return `
    <table class="button-row button-row-inline" role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:22px auto 0;border-collapse:collapse;">
      <tr>
        <td class="button-cell" align="center" style="padding:0 6px 0 0;">${primaryButton}</td>
        <td class="button-cell" align="center" style="padding:0 0 0 6px;">${secondaryButton}</td>
      </tr>
    </table>`;
  }

  return `
    <table class="button-row" role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:22px auto 0;border-collapse:collapse;">
      ${primaryButton ? `<tr><td class="button-cell" align="center" style="padding:0 0 10px;">${primaryButton}</td></tr>` : ""}
      ${secondaryButton ? `<tr><td class="button-cell" align="center" style="padding:0;">${secondaryButton}</td></tr>` : ""}
    </table>`;
}

function renderSmallButton(
  label: string,
  href: string | null | undefined,
  options: { className?: string; marginTop?: number; minWidth?: number; targetBlank?: boolean } = {},
) {
  const safeHref = href?.trim();

  if (!safeHref) {
    return "";
  }

  const className = ["email-small-button", options.className].filter(Boolean).join(" ");
  const marginTop = options.marginTop ?? 12;
  const minWidthStyle = options.minWidth ? `min-width:${options.minWidth}px;` : "";
  const targetAttributes = options.targetBlank ? ` target="_blank" rel="noopener noreferrer"` : "";

  return `<a class="${className}" href="${escapeHtml(safeHref)}"${targetAttributes} style="display:inline-block;margin-top:${marginTop}px;${minWidthStyle}padding:10px 14px;border:1px solid ${GOLD};border-radius:6px;background:#ffffff;color:${NAVY};${LABEL_TEXT_STYLE}font-size:12px;line-height:16px;mso-line-height-rule:exactly;text-align:center;text-decoration:none;box-sizing:border-box;">${escapeHtml(label)}</a>`;
}

type SocialIconTheme = {
  align: "center" | "right";
  borderColor: string;
  containerSize: number;
  iconSize: number;
  imageClassName: string;
  linkClassName: string;
  spacing: number;
  tableClassName: string;
};

function renderSocialIconCell(item: (typeof SOCIAL_ITEMS)[number], index: number, theme: SocialIconTheme) {
  const iconUrl = buildEmailAssetUrl(item.iconPath);
  const spacingStyle = index > 0 ? `padding-left:${theme.spacing}px;` : "";

  return `
    <td class="${theme.linkClassName}-cell" align="center" valign="middle" style="${spacingStyle}text-align:center;vertical-align:middle;font-size:0;line-height:0;">
      <table role="presentation" width="${theme.containerSize}" height="${theme.containerSize}" cellspacing="0" cellpadding="0" border="0" style="width:${theme.containerSize}px;height:${theme.containerSize}px;border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td align="center" valign="middle" width="${theme.containerSize}" height="${theme.containerSize}" style="width:${theme.containerSize}px;height:${theme.containerSize}px;padding:0;text-align:center;vertical-align:middle;font-size:0;line-height:0;mso-line-height-rule:exactly;">
            <a class="${theme.linkClassName}" href="${escapeHtml(item.href)}" aria-label="${escapeHtml(item.label)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:${theme.iconSize}px;height:${theme.iconSize}px;line-height:0;text-decoration:none;border:0;outline:none;">
              <img class="${theme.imageClassName}" src="${escapeHtml(iconUrl)}" width="${theme.iconSize}" height="${theme.iconSize}" alt="${escapeHtml(item.label)}" style="display:block;width:${theme.iconSize}px;height:${theme.iconSize}px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
            </a>
          </td>
        </tr>
      </table>
    </td>`;
}

function renderSocialIcons(theme: SocialIconTheme) {
  const alignmentStyle = theme.align === "right" ? "margin:0 0 0 auto;" : "margin:0 auto;";

  return `
    <table class="${theme.tableClassName}" role="presentation" align="${theme.align}" cellspacing="0" cellpadding="0" border="0" style="${alignmentStyle}border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tr>
        ${SOCIAL_ITEMS.map((item, index) => renderSocialIconCell(item, index, theme)).join("")}
      </tr>
    </table>`;
}

function renderFooterSocialIcons() {
  return renderSocialIcons({
    align: "right",
    borderColor: "#D7DDE8",
    containerSize: 30,
    iconSize: 22,
    imageClassName: "social-icon-image",
    linkClassName: "social-icon",
    spacing: 8,
    tableClassName: "social-icons-table",
  });
}

function renderFooterInstagramBadge() {
  const iconUrl = buildEmailAssetUrl(SOCIAL_ICON_PATHS.instagram);

  return `<img class="footer-instagram-icon" src="${escapeHtml(iconUrl)}" width="24" height="24" alt="Instagram" style="display:block;width:24px;height:24px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />`;
}

function renderFooter() {
  return `
<tr>
  <td style="padding:0;background:${FOOTER_BACKGROUND};border-top:1px solid ${BORDER};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:${FOOTER_BACKGROUND};">

      <tr>
        <td class="footer-block" style="padding:22px 24px 18px;text-align:left;background:${FOOTER_BACKGROUND};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td class="footer-icon-cell" valign="middle" style="width:34px;padding:0 12px 0 0;text-align:left;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="center" valign="middle" style="width:35px;height:35px;text-align:center;vertical-align:middle;font-size:0;line-height:0;mso-line-height-rule:exactly;">
                      ${renderFooterInstagramBadge()}
                    </td>
                  </tr>
                </table>
              </td>

              <td class="footer-copy-cell" valign="middle" style="padding:0;text-align:left;">
                <p style="margin:0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:14px;line-height:20px;">
                  Stay ahead. Stay connected.
                </p>
                <p style="margin:4px 0 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:12px;line-height:18px;">
                  Follow us on Instagram for insights and updates.
                </p>
                <p style="margin:6px 0 0;color:${NAVY};${LABEL_TEXT_STYLE}font-size:14px;line-height:18px;">
                  ${SOCIAL_HANDLE}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:0;background:#ffffff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#ffffff;">
            <tr>
              <td class="footer-block" style="padding:16px 24px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td class="footer-note-cell" valign="middle" style="padding:0;color:${MUTED};${BODY_TEXT_STYLE}font-size:11px;line-height:17px;text-align:left;">
                      DXB Deal Flow is a private platform<br />
                      for verified real estate professionals only.
                    </td>

                    <td class="footer-social-cell" valign="middle" align="right" style="width:126px;padding:0;text-align:right;white-space:nowrap;">
                      ${renderFooterSocialIcons()}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td>
</tr>
`;
}

function renderInfoRows(rows: InfoRow[]) {
  if (!rows.length) {
    return "";
  }

  return `
    <table class="info-rows" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tbody>
        ${rows
          .map(
            (row, index) => {
              const dividerStyle = index > 0 ? `border-top:1px solid ${BORDER};` : "";

              return `
              <tr>
                <td class="info-label" valign="top" style="width:42%;padding:10px 0;${dividerStyle}color:${MUTED};${LABEL_TEXT_STYLE}font-size:12px;line-height:18px;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(row.label)}</td>
                <td class="info-value" valign="top" style="padding:10px 0 10px 12px;${dividerStyle}color:${TEXT};${BODY_TEXT_STYLE}font-size:14px;line-height:20px;text-align:right;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(displayValue(row.value))}</td>
              </tr>`;
            },
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderInfoCard(options: {
  title?: string;
  eyebrow?: string;
  text?: string;
  rows?: InfoRow[];
  childrenHtml?: string;
  background?: string;
}) {
  return `
    <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:18px 0 0;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;background:${options.background || CARD_BACKGROUND};box-shadow:0 10px 26px rgba(11,29,58,0.06);">
      <tr>
        <td class="email-card-cell" style="padding:16px 18px;text-align:left;">
          ${
            options.eyebrow
              ? `<p style="margin:0 0 6px;color:${GOLD};${LABEL_TEXT_STYLE}font-size:11px;line-height:16px;text-transform:uppercase;letter-spacing:0.14em;">${escapeHtml(options.eyebrow)}</p>`
              : ""
          }
          ${options.title ? `<h2 style="margin:0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:16px;line-height:22px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(options.title)}</h2>` : ""}
          ${options.text ? `<p style="margin:${options.title ? "8px" : "0"} 0 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:14px;line-height:22px;word-break:break-word;overflow-wrap:break-word;">${escapeMultiline(options.text)}</p>` : ""}
          ${renderInfoRows(options.rows || [])}
          ${options.childrenHtml || ""}
        </td>
      </tr>
    </table>`;
}

function renderMessagePanel(options: { title?: string; text: string; marginTop?: number }) {
  const marginTop = options.marginTop ?? 14;

  return `
    <table class="message-panel" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:${marginTop}px 0 0;border:1px solid ${BORDER};border-radius:7px;border-collapse:separate;background:${PANEL_BACKGROUND};">
      <tr>
        <td class="message-panel-cell" style="padding:13px 14px;text-align:left;">
          ${options.title ? `<h3 style="margin:0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:14px;line-height:20px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(options.title)}</h3>` : ""}
          <p style="margin:${options.title ? "7px" : "0"} 0 0;color:${TEXT};${BODY_TEXT_STYLE}font-size:14px;line-height:22px;word-break:break-word;overflow-wrap:break-word;">${escapeMultiline(options.text)}</p>
        </td>
      </tr>
    </table>`;
}

function renderWhatYouCanDoCard() {
  const iconUrl = buildEmailAssetUrl("/assets/you_can_do.png");
  const iconHtml = `<img src="${escapeHtml(iconUrl)}" width="13" height="13" alt="" border="0" style="display:block;width:13px;height:13px;max-width:13px;margin:0 auto;border:0;outline:none;background:transparent;text-decoration:none;line-height:0;vertical-align:middle;-ms-interpolation-mode:bicubic;" />`;
  const items = [
    {
      icon: iconHtml,
      text: "Browse exclusive off-market deals",
    },
    {
      icon: iconHtml,
      text: "Connect with verified brokers",
    },
    {
      icon: iconHtml,
      text: "Save and track opportunities",
    },
  ];

  return `
    <table class="action-list-card" role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:392px;margin:18px auto 0;border:1px solid #DADFE8;border-radius:7px;border-collapse:separate;background:#FAFBFC;box-shadow:none;">
      <tr>
        <td class="action-list-card-cell" style="padding:13px 20px 5px;text-align:left;">
          <p style="margin:0;color:#0B1D3A;${HEADING_TEXT_STYLE}font-size:14px;line-height:18px;font-weight:700;">
            What you can do now:
          </p>
        </td>
      </tr>

      ${items
        .map(
          (item, index) => `
            <tr>
              <td class="action-list-card-cell" style="padding:0 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;${index > 0 ? "border-top:1px solid #E4E7EE;" : ""}">
                  <tr>
                    <td valign="middle" style="width:22px;padding:10px 12px 10px 0;text-align:left;font-size:0;line-height:0;">
                      ${item.icon}
                    </td>
                    <td valign="middle" style="padding:10px 0;color:#1F2937;${BODY_TEXT_STYLE}font-size:12px;line-height:16px;font-weight:400;text-align:left;">
                      ${escapeHtml(item.text)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`,
        )
        .join("")}
    </table>`;
}

function renderImage(url: string | null | undefined, alt: string) {
  const imageUrl = toAbsoluteUrl(url);

  if (!imageUrl) {
    return "";
  }

  return `<img class="responsive-image" src="${escapeHtml(imageUrl)}" width="552" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:552px;height:auto;max-height:310px;object-fit:cover;border:0;border-radius:8px;" />`;
}

function renderMetricGrid(metrics: InfoRow[]) {
  if (!metrics.length) {
    return "";
  }

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin-top:14px;border-collapse:collapse;">
      <tr>
        ${metrics
          .map(
            (metric) => `
              <td class="metric-cell" valign="top" style="width:${Math.floor(100 / metrics.length)}%;padding:0 4px;">
                <table class="metric-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid ${BORDER};border-radius:7px;border-collapse:separate;background:${PANEL_BACKGROUND};">
                  <tr>
                    <td align="center" style="padding:12px 8px;">
                      <p style="margin:0;color:${MUTED};${LABEL_TEXT_STYLE}font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(metric.label)}</p>
                      <p style="margin:4px 0 0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:14px;line-height:20px;">${escapeHtml(displayValue(metric.value))}</p>
                    </td>
                  </tr>
                </table>
              </td>`,
          )
          .join("")}
      </tr>
    </table>`;
}

function renderListingCard(listing: EmailListingSummary, options: { includeImage?: boolean; compact?: boolean } = {}) {
  const details = [listing.areaLabel, formatCurrency(listing.price)].filter(Boolean).join(" | ");
  const imageHtml = options.includeImage ? renderImage(listing.imageUrl, listing.title) : "";
  const metricHtml = options.compact
    ? ""
    : renderMetricGrid([
        { label: "Price", value: formatCurrency(listing.price) },
        { label: "ROI", value: formatPercentValue(listing.roiPercent) },
        { label: "Below Market", value: formatPercentValue(listing.belowMarketPercent) },
      ]);

  if (options.compact) {
    const actionButton = renderSmallButton("View Listing", listing.url, {
      className: "listing-action-button",
      marginTop: 0,
      minWidth: 112,
    });

    return `
    <table class="listing-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:14px 0 0;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;background:${CARD_BACKGROUND};overflow:hidden;">
      <tr>
        <td class="listing-card-cell" style="padding:14px 16px;text-align:left;">
          <table class="listing-row-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td class="listing-copy-cell" valign="top" style="padding:0 16px 0 0;text-align:left;">
                <h3 style="margin:0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:15px;line-height:21px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(listing.title)}</h3>
                ${details ? `<p style="margin:5px 0 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:13px;line-height:19px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(details)}</p>` : ""}
              </td>
              ${actionButton ? `<td class="listing-action-cell" valign="middle" align="right" style="width:128px;padding:0;text-align:right;">${actionButton}</td>` : ""}
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  return `
    <table class="listing-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:14px 0 0;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;background:${CARD_BACKGROUND};overflow:hidden;">
      ${imageHtml ? `<tr><td style="padding:0;">${imageHtml}</td></tr>` : ""}
      <tr>
        <td class="listing-card-cell" style="padding:16px 18px;text-align:left;">
          <h3 style="margin:0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:16px;line-height:22px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(listing.title)}</h3>
          ${details ? `<p style="margin:6px 0 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:13px;line-height:20px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(details)}</p>` : ""}
          ${metricHtml}
          ${renderSmallButton("View Listing", listing.url)}
        </td>
      </tr>
    </table>`;
}

function getApprovedListingMetaItems(params: { propertyType?: string | null; bedrooms?: number | null; sizeSqft?: number | null }) {
  const items: string[] = [];

  if (params.propertyType) {
    items.push(formatPropertyType(params.propertyType));
  }

  if (typeof params.bedrooms === "number" && Number.isFinite(params.bedrooms)) {
    items.push(params.bedrooms === 0 ? "Studio" : `${params.bedrooms} ${params.bedrooms === 1 ? "Bed" : "Beds"}`);
  }

  if (typeof params.sizeSqft === "number" && Number.isFinite(params.sizeSqft) && params.sizeSqft > 0) {
    items.push(`${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(params.sizeSqft)} sqft`);
  }

  return items;
}

function renderApprovedListingMeta(metaItems: string[]) {
  if (!metaItems.length) {
    return "";
  }

  return `<p class="approved-listing-meta" style="margin:6px 0 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:12px;line-height:18px;white-space:nowrap;word-break:normal;overflow-wrap:normal;">${metaItems
    .map((item) => escapeHtml(item))
    .join('<span style="color:#9CA3AF;">&nbsp;&bull;&nbsp;</span>')}</p>`;
}

function renderApprovedListingCard(params: {
  listingTitle: string;
  price: number | null;
  imageUrl: string | null;
  listingUrl: string;
  metaItems: string[];
}) {
  const imageWidth = 172;
  const imageUrl = toAbsoluteUrl(params.imageUrl);
  const priceLabel = formatCurrency(params.price);
  const imageCellBackground = imageUrl
    ? `background:${PANEL_BACKGROUND} url('${escapeHtml(imageUrl)}') center center / cover no-repeat;background-image:url('${escapeHtml(imageUrl)}');background-size:cover;background-position:center center;background-repeat:no-repeat;`
    : `background:${PANEL_BACKGROUND};`;
  const imageBackgroundAttribute = imageUrl ? ` background="${escapeHtml(imageUrl)}"` : "";
  const imageHtml = imageUrl
    ? `<img class="approved-listing-mobile-image" src="${escapeHtml(imageUrl)}" width="${imageWidth}" alt="${escapeHtml(params.listingTitle)}" style="display:none;width:0;max-width:0;height:0;max-height:0;overflow:hidden;border:0;outline:none;text-decoration:none;mso-hide:all;" />`
    : `<table class="approved-listing-image-placeholder" role="presentation" width="${imageWidth}" cellspacing="0" cellpadding="0" style="width:${imageWidth}px;border-collapse:collapse;background:${PANEL_BACKGROUND};">
        <tr>
          <td align="center" valign="middle" style="padding:48px 12px;color:${MUTED};${LABEL_TEXT_STYLE}font-size:12px;line-height:18px;text-align:center;">
            Listing image
          </td>
        </tr>
      </table>`;

  return `
    <table class="approved-listing-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0 0;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;background:${PANEL_BACKGROUND};overflow:hidden;box-shadow:0 10px 26px rgba(11,29,58,0.05);">
      <tr>
        <td class="approved-listing-image-cell" width="${imageWidth}" valign="top"${imageBackgroundAttribute} bgcolor="${PANEL_BACKGROUND}" style="width:${imageWidth}px;padding:0;${imageCellBackground}font-size:0;line-height:0;">
          ${imageHtml}
        </td>
        <td class="approved-listing-content-cell" valign="top" style="padding:13px 15px 12px;text-align:left;">
          <h2 style="margin:0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:16px;line-height:21px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(params.listingTitle)}</h2>
          ${renderApprovedListingMeta(params.metaItems)}
          <p style="margin:9px 0 0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:17px;line-height:22px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(priceLabel)}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:7px 0 0;border-collapse:separate;">
            <tr>
              <td style="padding:5px 8px;border:1px solid ${BORDER};border-radius:6px;background:#ffffff;color:${NAVY};${LABEL_TEXT_STYLE}font-size:12px;line-height:16px;white-space:nowrap;">
                Below Market
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function renderApprovedListingUrlBlock(listingUrl: string) {
  return `
    <table class="approved-copy-link-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0 0;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;background:#ffffff;">
      <tr>
        <td class="approved-copy-link-cell" style="padding:12px 14px;text-align:left;">
          <a class="breakable-text approved-listing-url" href="${escapeHtml(listingUrl)}" style="display:block;color:${NAVY};${BODY_TEXT_STYLE}font-size:12px;line-height:18px;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;-webkit-user-select:text;user-select:text;">
            ${escapeHtml(listingUrl)}
          </a>
        </td>
      </tr>
    </table>`;
}

function renderApprovedListingShareButtons(whatsappShareUrl: string, instagramStoryImageUrl: string | null | undefined) {
  return `
    <table class="approved-share-buttons" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:18px 0 0;border-collapse:collapse;">
      <tr>
        <td class="approved-share-button-cell" width="50%" align="center" style="width:50%;padding:0 6px 0 0;text-align:center;">
          ${renderSmallButton("Share on WhatsApp", whatsappShareUrl, { className: "approved-share-button", marginTop: 0, minWidth: 160 })}
        </td>
        <td class="approved-share-button-cell" width="50%" align="center" style="width:50%;padding:0 0 0 6px;text-align:center;">
          ${renderSmallButton("Share to Instagram Story", instagramStoryImageUrl, { className: "approved-share-button", marginTop: 0, minWidth: 160, targetBlank: true })}
        </td>
      </tr>
    </table>`;
}

function renderListingList(listings: EmailListingSummary[], emptyText: string) {
  if (!listings.length) {
    return renderMessagePanel({ text: emptyText, marginTop: 12 });
  }

  return listings.map((listing) => renderListingCard(listing, { compact: true })).join("");
}

function renderListingSection(title: string, listings: EmailListingSummary[], emptyText: string) {
  return `
    <table class="listing-section" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:22px 0 0;border-collapse:collapse;">
      <tr>
        <td class="listing-section-cell" style="padding:0;text-align:left;">
          <h2 style="margin:0 0 2px;color:${NAVY};${HEADING_TEXT_STYLE}font-size:17px;line-height:24px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(title)}</h2>
          ${renderListingList(listings, emptyText)}
        </td>
      </tr>
    </table>`;
}

function renderBodyContent(bodyHtml?: string) {
  if (!bodyHtml) {
    return "";
  }

  return `
    <table class="body-content" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:0 auto;border-collapse:collapse;">
      <tr>
        <td class="body-content-cell" style="padding:0 44px;text-align:left;">
          ${bodyHtml}
        </td>
      </tr>
    </table>`;
}

function renderTitleText(title: string, highlight?: LayoutOptions["titleHighlight"]) {
  const safeTitle = escapeHtml(title);

  if (!highlight?.text) {
    return safeTitle;
  }

  const safeHighlightText = escapeHtml(highlight.text);
  const highlightIndex = safeTitle.indexOf(safeHighlightText);

  if (highlightIndex < 0) {
    return safeTitle;
  }

  const beforeHighlight = safeTitle.slice(0, highlightIndex);
  const afterHighlight = safeTitle.slice(highlightIndex + safeHighlightText.length);

  return `${beforeHighlight}<span style="color:${escapeHtml(highlight.color)};">${safeHighlightText}</span>${afterHighlight}`;
}

function renderLayout(options: LayoutOptions) {
  const preheader = options.preheader || options.subtitle;

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${escapeHtml(options.title)}</title>
        <style type="text/css">
          table { border-collapse: collapse; }
          img { border: 0; outline: none; text-decoration: none; max-width: 100%; height: auto; }
          a { text-decoration: none; }
          @media screen and (min-width: 601px) and (max-width: 900px) {
            .email-shell { padding: 28px 18px !important; }
            .email-container { max-width: 600px !important; }
            .listing-copy-cell, .listing-action-cell { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; box-sizing: border-box !important; }
            .listing-action-cell { padding-top: 12px !important; text-align: left !important; }
            .listing-action-button { margin-top: 0 !important; }
          }
          @media screen and (max-width: 600px) {
            .email-shell { padding: 12px 10px !important; }
            .email-container { width: 100% !important; max-width: 100% !important; }
            .email-header { height: auto !important; padding: 12px 14px !important; }
            .header-logo-cell { width: 45% !important; }
            .header-private-cell { width: 55% !important; }
            .brand-logo { width: 112px !important; max-width: 112px !important; }
            .brand-logo-text { font-size: 15px !important; line-height: 20px !important; letter-spacing: 0.03em !important; }
            .private-badge { margin-left: auto !important; }
            .private-label { font-size: 10px !important; line-height: 12px !important; letter-spacing: 0.04em !important; }
            .private-sublabel { font-size: 9px !important; line-height: 11px !important; letter-spacing: 0.03em !important; }
            .content-cell { padding: 24px 14px 24px !important; }
            .email-title { font-size: 24px !important; line-height: 29px !important; max-width: 100% !important; }
            .email-subtitle { font-size: 14px !important; line-height: 22px !important; max-width: 100% !important; padding-top: 4px !important; }
            .badge-cell { width: 54px !important; height: 54px !important; line-height: 54px !important; }
            .button-row { width: 100% !important; margin-top: 18px !important; }
            .button-cell { display: block !important; width: 100% !important; padding: 0 0 10px !important; padding-left: 0 !important; padding-right: 0 !important; box-sizing: border-box !important; }
            .email-button { display: block !important; width: 100% !important; max-width: 100% !important; min-width: 0 !important; padding: 13px 18px !important; box-sizing: border-box !important; }
            .email-small-button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
            .body-content-cell { padding: 0 10px !important; }
            .email-card, .listing-card, .listing-section, .action-list-card, .deal-card, .otp-card { margin-top: 16px !important; }
            .email-card-cell, .listing-card-cell, .deal-card-cell, .message-panel-cell { padding: 14px !important; }
            .deal-alert-image-cell, .deal-alert-content-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; }
            .deal-alert-image-cell { height: 156px !important; background-size: cover !important; background-position: center center !important; }
            .deal-alert-image-spacer, .deal-alert-image-placeholder { display: block !important; width: 100% !important; max-width: 100% !important; height: 156px !important; max-height: none !important; }
            .deal-alert-content-cell { padding: 12px !important; }
            .deal-alert-meta { white-space: normal !important; }
            .deal-alert-metric-cell { display: table-cell !important; width: 50% !important; box-sizing: border-box !important; }
            .action-list-card { max-width: 100% !important; }
            .action-list-card-cell { padding-left: 14px !important; padding-right: 14px !important; }
            .info-label, .info-value { display: block !important; width: 100% !important; text-align: left !important; padding-left: 0 !important; padding-right: 0 !important; box-sizing: border-box !important; }
            .info-label { padding: 10px 0 2px !important; }
            .info-value { padding: 0 0 10px !important; border-top: 0 !important; }
            .listing-row-table, .listing-copy-cell, .listing-action-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; }
            .listing-copy-cell { padding: 0 !important; }
            .listing-action-cell { padding: 12px 0 0 !important; text-align: left !important; }
            .listing-action-button { margin-top: 0 !important; }
            .approved-listing-card, .approved-copy-link-card, .approved-share-buttons { margin-top: 16px !important; }
            .approved-listing-image-cell, .approved-listing-content-cell, .approved-share-button-cell { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; box-sizing: border-box !important; }
            .approved-listing-image-cell { height: auto !important; background-size: cover !important; background-position: center center !important; }
            .approved-listing-mobile-image { display: block !important; width: 100% !important; max-width: 100% !important; height: 170px !important; max-height: none !important; object-fit: cover !important; mso-hide: none !important; }
            .approved-listing-image-placeholder { width: 100% !important; max-width: 100% !important; }
            .approved-listing-content-cell, .approved-copy-link-cell { height: auto !important; padding: 13px 14px !important; }
            .approved-listing-meta { white-space: normal !important; word-break: normal !important; overflow-wrap: break-word !important; }
            .approved-share-button-cell { padding: 0 0 10px !important; }
            .approved-share-button { display: block !important; width: 100% !important; min-width: 0 !important; margin-top: 0 !important; box-sizing: border-box !important; }
            .metric-cell { display: block !important; width: 100% !important; padding: 4px 0 !important; box-sizing: border-box !important; }
            .responsive-image { width: 100% !important; max-width: 100% !important; height: auto !important; }
            .otp-card-cell { padding: 20px 14px !important; }
            .otp-code { font-size: 28px !important; line-height: 34px !important; letter-spacing: 0.10em !important; }
            .footer-block { padding-left: 16px !important; padding-right: 16px !important; }
            .footer-icon-cell, .footer-copy-cell, .footer-note-cell, .footer-social-cell { display: block !important; width: 100% !important; text-align: center !important; padding-left: 0 !important; padding-right: 0 !important; box-sizing: border-box !important; }
            .footer-icon-cell {
              display: block !important;
              width: 100% !important;
              padding: 0 0 10px !important;
              text-align: center !important;
            }
            .footer-icon-cell table {
              margin: 0 auto !important;
            }
            .footer-social-cell { padding-top: 12px !important; white-space: normal !important; }
            .social-icons-table { float: none !important; margin: 0 auto !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;width:100%;min-width:100%;background:${LIGHT_BACKGROUND};${BODY_TEXT_STYLE}color:${TEXT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
        <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;mso-hide:all;${BODY_TEXT_STYLE}">${escapeHtml(preheader)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;table-layout:fixed;background:${LIGHT_BACKGROUND};${BODY_TEXT_STYLE}">
          <tr>
            <td class="email-shell" align="center" style="padding:28px 12px;">
              <table class="email-container" role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-collapse:collapse;background:${CONTENT_BACKGROUND};border:1px solid ${BORDER};border-radius:10px;overflow:hidden;box-shadow:0 18px 45px rgba(11,29,58,0.12);${BODY_TEXT_STYLE}">
                <tr>
                  <td class="email-header" style="height:66px;padding:13px 22px;background:${NAVY};border-radius:10px 10px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;${BODY_TEXT_STYLE}">
                      <tr>
                        <td class="header-logo-cell" valign="middle" style="width:48%;padding:0;text-align:left;">${renderLogo()}</td>
                        <td class="header-private-cell" valign="middle" style="width:52%;padding:0;text-align:right;">${renderPrivateNetworkBadge()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="content-cell" align="center" style="padding:32px 24px 30px;text-align:center;background:${CONTENT_BACKGROUND};${BODY_TEXT_STYLE}">
                    ${renderIconBadge(options.iconLabel)}
                    <h1 class="email-title" style="margin:0 auto;color:${NAVY};${HEADING_TEXT_STYLE}font-size:30px;line-height:34px;text-align:center;letter-spacing:0;max-width:480px;word-break:break-word;overflow-wrap:break-word;">${renderTitleText(options.title, options.titleHighlight)}</h1>
                    <p class="email-subtitle" style="margin:12px auto 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:15px;line-height:24px;text-align:center;max-width:470px;padding-top:8px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(options.subtitle)}</p>
                    ${renderButtonRow(options.primaryCta, options.secondaryCta, options.buttonLayout)}
                    ${renderBodyContent(options.bodyHtml)}
                  </td>
                </tr>
                ${renderFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

const WELCOME_NAVY = "#06152D";
const WELCOME_NAVY_ALT = "#07162F";
const WELCOME_GOLD = "#C9961A";
const WELCOME_GOLD_ALT = "#D4A017";
const WELCOME_TEXT = "#07152D";
const WELCOME_MUTED = "#5E6675";
const WELCOME_BORDER = "#E8E2D5";
const WELCOME_CREAM = "#FBF7EF";

function renderWelcomeHeaderLogo(overviewUrl: string) {
  const logoUrl = buildEmailAssetUrl(LOGO_PATH);
  const logoHtml = logoUrl
    ? `<img class="welcome-logo" src="${escapeHtml(logoUrl)}" width="146" alt="${BRAND_NAME}" style="display:block;width:146px;max-width:146px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<span class="welcome-logo-text" style="display:block;color:#ffffff;${HEADING_TEXT_STYLE}font-size:20px;line-height:24px;letter-spacing:0.04em;">${BRAND_NAME}</span>`;

  return `<a class="welcome-logo-link" href="${escapeHtml(overviewUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;max-width:100%;text-decoration:none;border:0;outline:none;">${logoHtml}</a>`;
}

function renderWelcomeLockBadge() {
  return `
    <table class="welcome-private-badge" role="presentation" align="right" cellspacing="0" cellpadding="0" style="max-width:100%;border-collapse:collapse;margin-left:auto;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tr>
        <td class="welcome-private-icon-cell" valign="middle" align="center" style="width:34px;padding:0 12px 0 0;text-align:center;vertical-align:middle;">
          <table role="presentation" width="28" height="28" cellspacing="0" cellpadding="0" style="width:28px;height:28px;border-collapse:collapse;">
            <tr>
              <td align="center" valign="middle" style="width:28px;height:28px;text-align:center;vertical-align:middle;font-size:0;line-height:0;">
                ${renderEmailImageIcon({ path: LOCK_ICON_PATH, altText: "Private network", size: 22, className: "welcome-private-icon" })}
              </td>
            </tr>
          </table>
        </td>
        <td valign="middle" align="left" style="padding:0;text-align:left;vertical-align:middle;">
          <p class="welcome-private-title" style="margin:0;color:#ffffff;${HEADING_TEXT_STYLE}font-size:14px;line-height:18px;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;">PRIVATE NETWORK</p>
          <p class="welcome-private-copy" style="margin:2px 0 0;color:#ffffff;${BODY_TEXT_STYLE}font-size:12px;line-height:16px;white-space:nowrap;">For Verified Brokers Only</p>
        </td>
      </tr>
    </table>`;
}

function renderWelcomeFeatureIcon(icon: "building" | "tag" | "users" | "shield") {
  const icons: Record<string, { path: string; altText: string }> = {
    building: { path: "/assets/building.png", altText: "Building" },
    tag: { path: "/assets/tag.png", altText: "Tag" },
    users: { path: "/assets/user.png", altText: "Users" },
    shield: { path: "/assets/shield.png", altText: "Shield" },
  };
  const resolvedIcon = icons[icon] || { path: "/assets/building.png", altText: "Feature" };
  const iconUrl = buildEmailAssetUrl(resolvedIcon.path);

  return `<img src="${escapeHtml(iconUrl)}" width="28" height="28" alt="${escapeHtml(resolvedIcon.altText)}" border="0" style="display:block;width:28px;height:28px;max-width:28px;margin:0 auto;border:0;outline:none;background:transparent;text-decoration:none;line-height:0;vertical-align:middle;-ms-interpolation-mode:bicubic;" />`;
}

function renderWelcomeRoundIcon(iconHtml: string, size = 52) {
  return `
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto 13px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tr>
        <td
          align="center"
          valign="middle"
          width="${size}"
          height="${size}"
          style="
            width:${size}px;
            height:${size}px;
            min-width:${size}px;
            max-width:${size}px;
            padding:0;
            border:2px solid #EBD6A8;
            border-radius:50%;
            background:#ffffff;
            color:${WELCOME_GOLD};
            text-align:center;
            vertical-align:middle;
            font-size:0;
            line-height:0;
            mso-padding-alt:0;
            overflow:hidden;
          "
        >
          ${iconHtml}
        </td>
      </tr>
    </table>`;
}

function renderWelcomeFeatureCell(params: {
  icon: "building" | "tag" | "users" | "shield";
  title: string;
  copy: string;
  isFirst?: boolean;
}) {
  return `
    <td class="welcome-feature-col ${params.isFirst ? "welcome-feature-first" : ""}" width="25%" valign="top" style="width:25%;padding:0 22px;text-align:center;vertical-align:top;${params.isFirst ? "" : `border-left:1px solid ${WELCOME_BORDER};`}box-sizing:border-box;">
      ${renderWelcomeRoundIcon(renderWelcomeFeatureIcon(params.icon))}
      <p style="margin:0;color:${WELCOME_TEXT};${HEADING_TEXT_STYLE}font-size:13px;line-height:18px;text-align:center;">${escapeHtml(params.title)}</p>
      <p style="margin:8px 0 0;color:${WELCOME_TEXT};${BODY_TEXT_STYLE}font-size:12px;line-height:18px;text-align:center;">${escapeHtml(params.copy)}</p>
    </td>`;
}

function renderWelcomeStepCell(params: { number: string; title: string; copy: string }) {
  return `
    <td class="welcome-step-col" width="200" valign="middle" style="width:200px;padding:0;text-align:left;vertical-align:middle;">
      <table class="welcome-step-inner" role="presentation" width="200" cellspacing="0" cellpadding="0" style="width:200px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td class="welcome-step-number-cell" width="64" valign="middle" style="width:64px;padding:0 14px 0 0;vertical-align:middle;text-align:left;">
            <table role="presentation" width="50" height="50" cellspacing="0" cellpadding="0" style="width:50px;height:50px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr>
                <td align="center" valign="middle" style="width:50px;height:50px;border-radius:999px;background:${WELCOME_CREAM};color:${WELCOME_GOLD};${HEADING_TEXT_STYLE}font-size:18px;line-height:50px;mso-line-height-rule:exactly;text-align:center;vertical-align:middle;">${escapeHtml(params.number)}</td>
              </tr>
            </table>
          </td>
          <td class="welcome-step-copy-cell" width="136" valign="middle" style="width:136px;padding:0;text-align:left;vertical-align:middle;">
            <p style="margin:0;color:${WELCOME_TEXT};${HEADING_TEXT_STYLE}font-size:15px;line-height:20px;text-align:left;">${escapeMultiline(params.title)}</p>
            <p style="margin:8px 0 0;color:${WELCOME_TEXT};${BODY_TEXT_STYLE}font-size:12px;line-height:18px;text-align:left;">${escapeHtml(params.copy)}</p>
          </td>
        </tr>
      </table>
    </td>`;
}

function renderWelcomeStepArrow() {
  return `
    <td class="welcome-step-arrow" width="36" valign="middle" align="center" style="width:36px;padding:0;color:${WELCOME_GOLD};${HEADING_TEXT_STYLE}font-size:0;line-height:0;text-align:center;vertical-align:middle;">
      <table role="presentation" width="36" height="50" cellspacing="0" cellpadding="0" style="width:36px;height:50px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td align="center" valign="middle" style="width:36px;height:50px;padding:0;color:${WELCOME_GOLD};${HEADING_TEXT_STYLE}font-size:24px;line-height:50px;mso-line-height-rule:exactly;text-align:center;vertical-align:middle;">
            &#8594;
          </td>
        </tr>
      </table>
    </td>`;
}

function renderWelcomeInboxIcon() {
  const iconUrl = buildEmailAssetUrl("/assets/inbox.png");

  return `
    <img src="${escapeHtml(iconUrl)}" width="44" height="44" alt="Inbox" border="0" style="display:block;width:44px;height:auto;max-width:100%;margin:0 auto;border:0;outline:none;background:transparent;text-decoration:none;line-height:0;-ms-interpolation-mode:bicubic;" />`;
}

function renderWelcomeInstagramIcon() {
  return renderEmailImageIcon({
    path: WELCOME_INSTAGRAM_ICON_PATH,
    altText: "Instagram",
    size: 40,
    className: "welcome-instagram-icon",
  });
}

function renderWelcomeInfoIcon(iconHtml: string) {
  return `
    <td class="welcome-info-icon-cell" width="86" valign="top" style="width:86px;padding:0 24px 0 0;vertical-align:top;text-align:left;">
      <table class="welcome-info-icon-wrap" role="presentation" width="72" height="72" cellspacing="0" cellpadding="0" style="width:72px;height:72px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td class="welcome-info-icon-inner" align="center" valign="middle" style="width:72px;height:72px;border:1px solid ${WELCOME_GOLD_ALT};border-radius:999px;text-align:center;vertical-align:middle;font-size:0;line-height:0;">
            ${iconHtml}
          </td>
        </tr>
      </table>
    </td>`;
}

function renderWelcomeSocialIcons() {
  return renderSocialIcons({
    align: "center",
    borderColor: "#D8DEE8",
    containerSize: 28,
    iconSize: 24,
    imageClassName: "welcome-social-icon-image",
    linkClassName: "welcome-social-icon",
    spacing: 12,
    tableClassName: "welcome-social-icons-table",
  });
}

function renderWelcomeTrustedLogoCell(params: { html: string; width: number; isFirst?: boolean }) {
  return `
    <td class="welcome-brand-col ${params.isFirst ? "welcome-brand-first" : ""}" width="${params.width}" valign="middle" align="center" style="width:${params.width}%;padding:0 14px;text-align:center;vertical-align:middle;${params.isFirst ? "" : `border-left:1px solid ${WELCOME_BORDER};`}">
      ${params.html}
    </td>`;
}

function renderWelcomeEarlyInterestHtml(options: { overviewUrl: string; preheader: string }) {
  const heroUrl = buildEmailAssetUrl(WELCOME_HERO_PATH);
  const heroBackgroundAttribute = heroUrl ? ` background="${escapeHtml(heroUrl)}"` : "";
  const heroBackgroundStyle = heroUrl
    ? `background:${WELCOME_CREAM} url('${escapeHtml(heroUrl)}') center center / cover no-repeat;background-image:url('${escapeHtml(heroUrl)}');background-size:cover;background-position:center center;background-repeat:no-repeat;`
    : `background:${WELCOME_CREAM};`;
  const vmlOpen = heroUrl
    ? `<!--[if gte mso 9]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:760px;height:350px;">
        <v:fill type="frame" src="${escapeHtml(heroUrl)}" color="${WELCOME_CREAM}" />
        <v:textbox inset="0,0,0,0">
      <![endif]-->`
    : "";
  const vmlClose = heroUrl
    ? `<!--[if gte mso 9]>
        </v:textbox>
      </v:rect>
      <![endif]-->`
    : "";

  return `
    <!doctype html>
    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>Thanks for registering with ${BRAND_NAME}</title>
        <style type="text/css">
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; max-width: 100%; height: auto; }
          a { text-decoration: none; }
          body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; }
          @media screen and (max-width: 800px) {
            .welcome-shell { padding: 16px 10px !important; }
            .welcome-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
            .welcome-header { height: 68px !important; padding: 12px 24px !important; }
            .welcome-header-table { table-layout: fixed !important; }
            .welcome-header-logo-cell { display: table-cell !important; width: 38% !important; max-width: 38% !important; height: 68px !important; padding: 0 !important; text-align: left !important; vertical-align: middle !important; box-sizing: border-box !important; }
            .welcome-header-private-cell { display: table-cell !important; width: 62% !important; max-width: 62% !important; height: 68px !important; padding: 0 !important; text-align: right !important; vertical-align: middle !important; box-sizing: border-box !important; }
            .welcome-logo-link { display: inline-block !important; max-width: 100% !important; }
            .welcome-logo { display: block !important; width: 124px !important; max-width: 124px !important; height: auto !important; margin: 0 !important; }
            .welcome-private-badge { float: none !important; width: auto !important; max-width: 100% !important; margin: 0 0 0 auto !important; }
            .welcome-private-title { font-size: 10px !important; line-height: 13px !important; letter-spacing: 0.05em !important; text-align: left !important; white-space: nowrap !important; }
            .welcome-private-copy { font-size: 9px !important; line-height: 12px !important; white-space: nowrap !important; }
            .welcome-hero, .welcome-hero-table { height: auto !important; background-position: center top !important; }
            .welcome-hero-cell { padding: 42px 28px 36px !important; }
            .welcome-hero-title { font-size: 36px !important; line-height: 40px !important; max-width: 300px !important; }
            .welcome-hero-copy { font-size: 14px !important; line-height: 22px !important; max-width: 280px !important; }
            .welcome-section-cell { padding-left: 24px !important; padding-right: 24px !important; }
            .welcome-section-title { font-size: 13px !important; line-height: 18px !important; letter-spacing: 0.10em !important; }
            .welcome-feature-col { display: block !important; width: 100% !important; max-width: 100% !important; padding: 18px 0 !important; border-left: 0 !important; border-top: 1px solid #E8E2D5 !important; box-sizing: border-box !important; }
            .welcome-feature-first { border-top: 0 !important; padding-top: 4px !important; }
            .welcome-divider { margin: 6px 0 18px !important; }
            .welcome-steps-table { width: 100% !important; max-width: 100% !important; table-layout: auto !important; }
            .welcome-step-col, .welcome-step-arrow { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
            .welcome-step-col { padding: 0 0 18px !important; }
            .welcome-step-inner { width: 100% !important; max-width: 100% !important; }
            .welcome-step-arrow { display: none !important; }
            .welcome-step-number-cell { width: 60px !important; padding-right: 14px !important; }
            .welcome-step-copy-cell { width: auto !important; }
            .welcome-info-wrap { margin: 4px 0 0 !important; border-radius: 6px !important; }
            .welcome-info-box-cell { display: block !important; width: 100% !important; padding: 24px 22px !important; box-sizing: border-box !important; }
            .welcome-info-col { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; }
            .welcome-info-col-first { padding-top: 0 !important; padding-bottom: 22px !important; }
            .welcome-info-col-second { padding-top: 22px !important; padding-bottom: 0 !important; border-left: 0 !important; border-top: 1px solid rgba(212,160,23,0.55) !important; }
            .welcome-info-icon-cell { width: 70px !important; padding: 0 16px 0 0 !important; }
            .welcome-info-icon-wrap, .welcome-info-icon-inner { width: 64px !important; height: 64px !important; }
            .welcome-brand-col { display: block !important; width: 100% !important; max-width: 100% !important; padding: 12px 0 !important; border-left: 0 !important; border-top: 1px solid #E8E2D5 !important; box-sizing: border-box !important; }
            .welcome-brand-first { border-top: 0 !important; padding-top: 0 !important; }
            .welcome-footer-cell { padding: 20px 16px 22px !important; }
          }
          @media screen and (max-width: 420px) {
            .welcome-shell { padding: 10px 8px !important; }
            .welcome-header { height: 54px !important; padding: 10px 12px !important; }
            .welcome-header-table { table-layout: fixed !important; }
            .welcome-header-logo-cell { display: table-cell !important; width: 38% !important; max-width: 38% !important; height: 54px !important; padding: 0 !important; text-align: left !important; vertical-align: middle !important; box-sizing: border-box !important; }
            .welcome-header-private-cell { display: table-cell !important; width: 62% !important; max-width: 62% !important; height: 54px !important; padding: 0 !important; text-align: right !important; vertical-align: middle !important; box-sizing: border-box !important; }
            .welcome-logo { width: 104px !important; max-width: 104px !important; margin: 0 !important; }
            .welcome-private-badge { float: none !important; clear: none !important; width: auto !important; max-width: 172px !important; margin: 0 0 0 auto !important; }
            .welcome-private-icon-cell { width: 19px !important; padding: 0 6px 0 0 !important; }
            .welcome-private-icon { width: 14px !important; height: 14px !important; }
            .welcome-private-title { font-size: 9px !important; line-height: 11px !important; letter-spacing: 0.03em !important; text-align: left !important; white-space: nowrap !important; }
            .welcome-private-copy { font-size: 8px !important; line-height: 10px !important; white-space: nowrap !important; }
            .welcome-hero-cell { padding: 38px 22px 34px !important; }
            .welcome-hero-title { font-size: 34px !important; line-height: 38px !important; max-width: 260px !important; }
            .welcome-hero-copy { max-width: 245px !important; }
            .welcome-section-cell { padding: 20px 18px !important; }
            .welcome-info-box-cell { padding: 24px 20px !important; }
            .welcome-info-icon-cell { width: 66px !important; padding-right: 14px !important; }
            .welcome-info-icon-wrap, .welcome-info-icon-inner { width: 60px !important; height: 60px !important; }
          }
          @media screen and (max-width: 360px) {
            .welcome-header { height: 52px !important; padding-left: 8px !important; padding-right: 8px !important; }
            .welcome-header-logo-cell { display: table-cell !important; width: 38% !important; max-width: 38% !important; height: 52px !important; text-align: left !important; vertical-align: middle !important; }
            .welcome-header-private-cell { display: table-cell !important; width: 62% !important; max-width: 62% !important; height: 52px !important; text-align: right !important; vertical-align: middle !important; }
            .welcome-logo { width: 88px !important; max-width: 88px !important; }
            .welcome-private-badge { max-width: 172px !important; margin: 0 0 0 auto !important; }
            .welcome-private-icon-cell { width: 18px !important; padding-right: 5px !important; }
            .welcome-private-icon { width: 13px !important; height: 13px !important; }
            .welcome-private-title { font-size: 8px !important; line-height: 10px !important; letter-spacing: 0.02em !important; }
            .welcome-private-copy { font-size: 7px !important; line-height: 9px !important; }
            .welcome-section-cell { padding-left: 16px !important; padding-right: 16px !important; }
            .welcome-hero-cell { padding-left: 20px !important; padding-right: 20px !important; }
            .welcome-hero-title { font-size: 32px !important; line-height: 36px !important; }
            .welcome-info-box-cell { padding-left: 16px !important; padding-right: 16px !important; }
            .welcome-info-icon-cell { width: 62px !important; padding-right: 12px !important; }
            .welcome-info-icon-wrap, .welcome-info-icon-inner { width: 56px !important; height: 56px !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;width:100%;min-width:100%;background:${WELCOME_CREAM};${BODY_TEXT_STYLE}color:${WELCOME_TEXT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
        <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;${BODY_TEXT_STYLE}">${escapeHtml(options.preheader)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;table-layout:fixed;background:#f2f4f7;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <td class="welcome-shell" align="center" style="padding:24px 12px;">
              <table class="welcome-container" role="presentation" width="760" cellspacing="0" cellpadding="0" style="width:100%;max-width:760px;border-collapse:separate;background:#ffffff;border:1px solid ${WELCOME_BORDER};border-radius:8px;overflow:hidden;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td class="welcome-header" style="height:80px;padding:0 42px;background:${WELCOME_NAVY};border-radius:8px 8px 0 0;">
                    <table class="welcome-header-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;table-layout:fixed;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td class="welcome-header-logo-cell" width="43%" valign="middle" style="width:43%;height:80px;padding:0;text-align:left;vertical-align:middle;">${renderWelcomeHeaderLogo(options.overviewUrl)}</td>
                        <td class="welcome-header-private-cell" width="57%" valign="middle" align="right" style="width:57%;height:80px;padding:0;text-align:right;vertical-align:middle;">${renderWelcomeLockBadge()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="welcome-hero" height="350" valign="top"${heroBackgroundAttribute} bgcolor="${WELCOME_CREAM}" style="height:350px;padding:0;${heroBackgroundStyle}vertical-align:top;" role="img" aria-label="Dubai skyline at sunrise">
                    ${vmlOpen}
                    <table class="welcome-hero-table" role="presentation" width="100%" height="350" cellspacing="0" cellpadding="0" style="width:100%;height:350px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td class="welcome-hero-cell" valign="top" style="padding:50px 44px 38px;text-align:left;vertical-align:top;">
                          <h1 class="welcome-hero-title" style="margin:0;color:${WELCOME_TEXT};${HEADING_TEXT_STYLE}font-size:42px;line-height:48px;text-align:left;letter-spacing:0;max-width:330px;">
                            Thank You for<br />
                            <span style="color:${WELCOME_GOLD};">Registering!</span>
                          </h1>
                          <table role="presentation" width="30" cellspacing="0" cellpadding="0" style="width:30px;margin:22px 0 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr><td style="height:2px;background:${WELCOME_GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
                          </table>
                          <p class="welcome-hero-copy" style="margin:22px 0 0;color:${WELCOME_TEXT};${BODY_TEXT_STYLE}font-size:15px;line-height:24px;text-align:left;max-width:275px;">
                            You're now on the priority list for<br />
                            DXB Deal Flow.<br />
                            We'll be in touch as soon as we launch.
                          </p>
                          <p class="welcome-hero-copy" style="margin:26px 0 0;color:${WELCOME_TEXT};${HEADING_TEXT_STYLE}font-size:13px;line-height:20px;text-align:left;max-width:285px;">The DXB Deal Flow Team</p>
                          <p class="welcome-hero-copy" style="margin:2px 0 0;color:${WELCOME_TEXT};${BODY_TEXT_STYLE}font-size:13px;line-height:20px;text-align:left;max-width:285px;">
                            Building the future of real estate<br />
                            connections in Dubai.
                          </p>
                        </td>
                      </tr>
                    </table>
                    ${vmlClose}
                  </td>
                </tr>

                <tr>
                  <td class="welcome-section-cell" style="padding:22px 44px 0;background:#ffffff;text-align:center;">
                    <p class="welcome-section-title" style="margin:0;color:${WELCOME_TEXT};${HEADING_TEXT_STYLE}font-size:13px;line-height:18px;text-align:center;text-transform:uppercase;letter-spacing:0.16em;">HERE&rsquo;S WHAT MAKES DXB DEAL FLOW DIFFERENT</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        ${renderWelcomeFeatureCell({ icon: "building", title: "Off-Market Inventory", copy: "Access deals you won't find on public portals.", isFirst: true })}
                        ${renderWelcomeFeatureCell({ icon: "tag", title: "Better Margins", copy: "Average 15-20% below market value." })}
                        ${renderWelcomeFeatureCell({ icon: "users", title: "Verified Network", copy: "Connect directly with trusted brokers." })}
                        ${renderWelcomeFeatureCell({ icon: "shield", title: "Private & Secure", copy: "100% verified broker access. Always secure." })}
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="welcome-section-cell" style="padding:26px 44px 0;background:#ffffff;text-align:center;">
                    <table class="welcome-divider" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr><td style="height:1px;background:${WELCOME_BORDER};font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>
                    <p class="welcome-section-title" style="margin:0;color:${WELCOME_TEXT};${HEADING_TEXT_STYLE}font-size:13px;line-height:18px;text-align:center;text-transform:uppercase;letter-spacing:0.16em;">WHAT HAPPENS NEXT?</p>
                    <table class="welcome-steps-table" role="presentation" width="672" cellspacing="0" cellpadding="0" align="center" style="width:672px;max-width:100%;margin:23px auto 0;border-collapse:collapse;table-layout:fixed;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        ${renderWelcomeStepCell({ number: "01", title: "We Review\nYour Details", copy: "Our team will verify your information." })}
                        ${renderWelcomeStepArrow()}
                        ${renderWelcomeStepCell({ number: "02", title: "You Get\nEarly Access", copy: "We'll notify you as soon as we go live." })}
                        ${renderWelcomeStepArrow()}
                        ${renderWelcomeStepCell({ number: "03", title: "Start Sourcing\nSmarter", copy: "Access exclusive deals and grow your business." })}
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="welcome-section-cell" style="padding:20px 30px 0;background:#ffffff;text-align:center;">
                    <table class="welcome-info-wrap" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:0;border-collapse:separate;background:${WELCOME_NAVY_ALT};border-radius:6px;overflow:hidden;mso-table-lspace:0pt;mso-table-rspace:0pt;box-shadow:0 8px 18px rgba(6,21,45,0.18);">
                      <tr>
                        <td class="welcome-info-box-cell" style="padding:24px 30px;background:${WELCOME_NAVY_ALT};">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td class="welcome-info-col welcome-info-col-first" width="50%" valign="top" style="width:50%;padding:0 28px 0 0;text-align:left;vertical-align:top;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                  <tr>
                                    ${renderWelcomeInfoIcon(renderWelcomeInboxIcon())}
                                    <td valign="top" style="padding:4px 0 0;text-align:left;vertical-align:top;">
                                      <p style="margin:0;color:#ffffff;${HEADING_TEXT_STYLE}font-size:16px;line-height:22px;text-align:left;">Keep an Eye on Your Inbox</p>
                                      <p style="margin:10px 0 0;color:#ffffff;${BODY_TEXT_STYLE}font-size:12px;line-height:19px;text-align:left;">We'll send you the launch update, early access invite, and exclusive insights on off-market opportunities.</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td class="welcome-info-col welcome-info-col-second" width="50%" valign="top" style="width:50%;padding:0 0 0 30px;border-left:1px solid rgba(212,160,23,0.72);text-align:left;vertical-align:top;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                  <tr>
                                    ${renderWelcomeInfoIcon(renderWelcomeInstagramIcon())}
                                    <td valign="top" style="padding:0;text-align:left;vertical-align:top;">
                                      <p style="margin:0;color:#ffffff;${BODY_TEXT_STYLE}font-size:14px;line-height:22px;text-align:left;">In the meantime,<br />follow us on Instagram for market insights and updates.</p>
                                      <p style="margin:14px 0 0;color:${WELCOME_GOLD_ALT};${HEADING_TEXT_STYLE}font-size:15px;line-height:20px;text-align:left;">
                                        <a href="${escapeHtml(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer" style="color:${WELCOME_GOLD_ALT};text-decoration:none;">${SOCIAL_HANDLE}</a>
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="welcome-section-cell" style="padding:22px 30px 26px;background:#ffffff;text-align:center;">
                    <p style="margin:0 0 18px;color:${WELCOME_GOLD};${HEADING_TEXT_STYLE}font-size:11px;line-height:16px;text-align:center;text-transform:uppercase;letter-spacing:0.20em;">TRUSTED BY LEADING BROKERS &amp; AGENCIES</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        ${renderWelcomeTrustedLogoCell({
                          width: 15,
                          isFirst: true,
                          html: `<p style="margin:0;color:${WELCOME_TEXT};font-family:Georgia, 'Times New Roman', serif;font-size:20px;line-height:20px;letter-spacing:0.04em;text-align:center;">EMAAR</p><p style="margin:2px 0 0;color:${WELCOME_TEXT};${LABEL_TEXT_STYLE}font-size:7px;line-height:9px;letter-spacing:0.14em;text-align:center;text-transform:uppercase;">Properties</p>`,
                        })}
                        ${renderWelcomeTrustedLogoCell({
                          width: 17,
                          html: `<p style="margin:0;color:${WELCOME_TEXT};font-family:Arial Black, Arial, Helvetica, sans-serif;font-size:17px;line-height:22px;font-style:italic;letter-spacing:0.02em;text-align:center;">DAMAC</p>`,
                        })}
                        ${renderWelcomeTrustedLogoCell({
                          width: 17,
                          html: `<p style="margin:0;color:${WELCOME_TEXT};font-family:Georgia, 'Times New Roman', serif;font-size:19px;line-height:20px;letter-spacing:0.14em;text-align:center;">SOBHA</p><p style="margin:2px 0 0;color:${WELCOME_TEXT};${LABEL_TEXT_STYLE}font-size:7px;line-height:9px;letter-spacing:0.18em;text-align:center;text-transform:uppercase;">Realty</p>`,
                        })}
                        ${renderWelcomeTrustedLogoCell({
                          width: 17,
                          html: `<p style="margin:0;color:${WELCOME_TEXT};${HEADING_TEXT_STYLE}font-size:15px;line-height:20px;letter-spacing:0.02em;text-align:center;">NAKHEEL</p>`,
                        })}
                        ${renderWelcomeTrustedLogoCell({
                          width: 19,
                          html: `<p style="margin:0;color:${WELCOME_TEXT};${LABEL_TEXT_STYLE}font-size:15px;line-height:17px;letter-spacing:0.18em;text-align:center;">ELLINGTON</p><p style="margin:2px 0 0;color:${WELCOME_TEXT};${LABEL_TEXT_STYLE}font-size:7px;line-height:9px;letter-spacing:0.16em;text-align:center;text-transform:uppercase;">Properties</p>`,
                        })}
                        ${renderWelcomeTrustedLogoCell({
                          width: 15,
                          html: `<p style="margin:0;color:${WELCOME_TEXT};${BODY_TEXT_STYLE}font-size:12px;line-height:16px;text-align:center;">&amp; many<br />more</p>`,
                        })}
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="welcome-footer-cell" style="padding:20px 24px 22px;background:#FAFAFA;border-top:1px solid ${WELCOME_BORDER};text-align:center;">
                    ${renderWelcomeSocialIcons()}
                    <p style="margin:14px 0 0;color:${WELCOME_MUTED};${BODY_TEXT_STYLE}font-size:11px;line-height:17px;text-align:center;">DXB Deal Flow is a private platform for verified real estate professionals only.</p>
                    <p style="margin:10px 0 0;color:${WELCOME_MUTED};${BODY_TEXT_STYLE}font-size:11px;line-height:17px;text-align:center;">&copy; 2024 DXB Deal Flow. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

export function welcomeEarlyInterestTemplate(params: { overviewUrl?: string | null } = {}) {
  const subject = "Thanks for registering with DXB Deal Flow";
  const title = "Thank You for Registering!";
  const subtitle = "You're now on the priority list for DXB Deal Flow. We'll be in touch as soon as we launch.";
  const overviewUrl = params.overviewUrl || buildEmailUrl("/");

  return {
    subject,
    text: textTemplate(title, [
      subtitle,
      "The DXB Deal Flow Team",
      "Building the future of real estate connections in Dubai.",
      "Here's what makes DXB Deal Flow different:",
      "Off-Market Inventory: Access deals you won't find on public portals.",
      "Better Margins: Average 15-20% below market value.",
      "Verified Network: Connect directly with trusted brokers.",
      "Private & Secure: 100% verified broker access. Always secure.",
      "What happens next?",
      "01 We review your details. Our team will verify your information.",
      "02 You get early access. We'll notify you as soon as we go live.",
      "03 Start sourcing smarter. Access exclusive deals and grow your business.",
      "Keep an eye on your inbox for the launch update, early access invite, and exclusive insights.",
      `Follow us on Instagram: ${INSTAGRAM_URL}`,
      `Platform overview: ${overviewUrl}`,
    ]),
    html: renderWelcomeEarlyInterestHtml({
      overviewUrl,
      preheader: subtitle,
    }),
  };
}

export function maintenanceAvailabilityTemplate(params: { name: string; platformUrl: string }) {
  const subject = "DXB Deal Flow is available now";
  const title = "DXB Deal Flow Is Available Now";
  const subtitle = `Hi ${params.name}, DXB Deal Flow is back online. You can return to the platform now.`;
  const bodyHtml = renderInfoCard({
    title: "Maintenance complete",
    text: "Thanks for your patience while we worked on DXB Deal Flow. The platform is available again.",
  });

  return {
    subject,
    text: textTemplate(title, [
      subtitle,
      "Maintenance complete.",
      "DXB Deal Flow is available again.",
      `Open DXB Deal Flow: ${params.platformUrl}`,
    ]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "LIVE",
      bodyHtml,
      primaryCta: { label: "Open DXB Deal Flow", href: params.platformUrl },
      preheader: "DXB Deal Flow is back online.",
    }),
  };
}

export function brokerVerificationSuccessTemplate(params: { brokerName: string; profileUrl: string }) {
  const subject = "Your DXB Deal Flow account has been approved";
  const title = "Your Account Has Been Approved!";
  const subtitle = `Welcome ${params.brokerName}. Your broker account is approved for the private DXB Deal Flow network.`;
  const bodyHtml = renderWhatYouCanDoCard();

  return {
    subject,
    text: textTemplate(title, [subtitle, "Browse exclusive off-market deals",
"Connect with verified brokers",
"Save and track opportunities", `Complete Your Profile: ${params.profileUrl}`]),
    html: renderLayout({
      title,
      titleHighlight: { text: "Approved!", color: SUCCESS_GREEN },
      subtitle,
      iconLabel: "OK",
      bodyHtml,
      primaryCta: { label: "Complete Your Profile", href: params.profileUrl },
      preheader: "Your broker account has been approved.",
    }),
  };
}

export function manualReviewPendingTemplate(params: { brokerName: string; statusUrl?: string | null }) {
  const subject = "Your broker account is under review";
  const title = "Your Broker Account Is Under Review";
  const subtitle = `Hi ${params.brokerName}, our admin team is reviewing your broker details.`;
  const statusUrl = params.statusUrl || buildEmailUrl("/pending");
  const bodyHtml = renderInfoCard({
    title: "Review in progress",
    text: "You will be notified after your application is approved or if the team needs anything else from you.",
    rows: [{ label: "Application status", value: "Manual review pending" }],
  });

  return {
    subject,
    text: textTemplate(title, [subtitle, "Application status: Manual review pending", `View Application Status: ${statusUrl}`]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "REV",
      bodyHtml,
      primaryCta: { label: "View Application Status", href: statusUrl },
      preheader: "Your DXB Deal Flow broker account is under review.",
    }),
  };
}

export function listingSubmittedTemplate(params: { listingTitle: string; dashboardUrl: string }) {
  const subject = "Your listing is pending approval";
  const title = "Your Listing Is Pending Approval";
  const subtitle = "We received your listing submission. The admin team will review it before it goes live.";
  const bodyHtml = renderInfoCard({
    title: params.listingTitle,
    rows: [
      { label: "Listing status", value: "Pending approval" },
      { label: "Next step", value: "Admin review" },
    ],
  });

  return {
    subject,
    text: textTemplate(title, [subtitle, `Listing: ${params.listingTitle}`, "Listing status: Pending approval", `View Listing Submission: ${params.dashboardUrl}`]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "SUB",
      bodyHtml,
      primaryCta: { label: "View Listing Submission", href: params.dashboardUrl },
      preheader: "Your listing is pending admin approval.",
    }),
  };
}

export function listingApprovedTemplate(params: {
  listingTitle: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  sizeSqft?: number | null;
  price: number | null;
  imageUrl: string | null;
  instagramStoryImageUrl: string | null;
  listingUrl: string;
  whatsappShareUrl: string;
}) {
  const subject = "Your listing is now live";
  const title = "Your Listing Is Now Live";
  const subtitle = "Your listing has been approved and is live on DXB Deal Flow. Share it while it is fresh.";
  const listingMetaItems = getApprovedListingMetaItems({
    propertyType: params.propertyType,
    bedrooms: params.bedrooms,
    sizeSqft: params.sizeSqft,
  });
  const listingCard = renderApprovedListingCard({
    listingTitle: params.listingTitle,
    price: params.price,
    imageUrl: params.imageUrl,
    listingUrl: params.listingUrl,
    metaItems: listingMetaItems,
  });
  const copyLinkCard = renderApprovedListingUrlBlock(params.listingUrl);
  const shareButtons = renderApprovedListingShareButtons(params.whatsappShareUrl, params.instagramStoryImageUrl);

  return {
    subject,
    text: textTemplate(title, [
      subtitle,
      `Listing: ${params.listingTitle}`,
      listingMetaItems.length ? `Details: ${listingMetaItems.join(" | ")}` : "",
      `Price: ${formatCurrency(params.price)}`,
      `View listing: ${params.listingUrl}`,
      `Share to WhatsApp: ${params.whatsappShareUrl}`,
      params.instagramStoryImageUrl ? `Share to Instagram Story: ${params.instagramStoryImageUrl}` : "",
    ]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "LIVE",
      bodyHtml: `${copyLinkCard}${listingCard}${shareButtons}`,
      primaryCta: { label: "View Listing", href: params.listingUrl },
      preheader: "Your listing has been approved and is live.",
    }),
  };
}

export function newDealAlertTemplate(params: {
  subject: string;
  dealTitle: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  sizeSqft?: number | null;
  price: number | null;
  roiPercent: number | null;
  belowMarketPercent: number | null;
  heroImageUrl: string | null;
  limitedStockWarning: string;
  dealUrl: string;
}) {
  const title = "New Deal Alert!";
  const subtitle = "A new off-market deal is now available in the verified broker network.";
  const imageWidth = 196;
  const cardMinHeight = 188;
  const imageUrl = toAbsoluteUrl(params.heroImageUrl);
  const priceLabel = formatCurrency(params.price);
  const metaItems = getApprovedListingMetaItems({
    propertyType: params.propertyType,
    bedrooms: params.bedrooms,
    sizeSqft: params.sizeSqft,
  });
  const dealMetrics: InfoRow[] = [];

  if (typeof params.roiPercent === "number" && Number.isFinite(params.roiPercent)) {
    dealMetrics.push({ label: "ROI", value: formatPercentValue(params.roiPercent) });
  }

  if (typeof params.belowMarketPercent === "number" && Number.isFinite(params.belowMarketPercent)) {
    dealMetrics.push({ label: "Below Market", value: formatPercentValue(params.belowMarketPercent) });
  }
  const imageCellBackground = imageUrl
    ? `background:${PANEL_BACKGROUND} url('${escapeHtml(imageUrl)}') center center / cover no-repeat;background-image:url('${escapeHtml(imageUrl)}');background-size:cover;background-position:center center;background-repeat:no-repeat;`
    : `background:${PANEL_BACKGROUND};`;
  const imageBackgroundAttribute = imageUrl ? ` background="${escapeHtml(imageUrl)}"` : "";
  const imageHtml = imageUrl
    ? `<table class="deal-alert-image-spacer" role="presentation" width="${imageWidth}" height="${cardMinHeight}" cellspacing="0" cellpadding="0" style="display:block;width:${imageWidth}px;max-width:${imageWidth}px;height:${cardMinHeight}px;max-height:${cardMinHeight}px;border-collapse:collapse;">
        <tr>
          <td aria-label="${escapeHtml(params.dealTitle)}" style="padding:0;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
        </tr>
      </table>`
    : `<table class="deal-alert-image-placeholder" role="presentation" width="${imageWidth}" height="${cardMinHeight}" cellspacing="0" cellpadding="0" style="width:${imageWidth}px;height:${cardMinHeight}px;border-collapse:collapse;background:${PANEL_BACKGROUND};">
        <tr>
          <td align="center" valign="middle" style="padding:18px 12px;color:${MUTED};${LABEL_TEXT_STYLE}font-size:12px;line-height:18px;text-align:center;">
            Listing image
          </td>
        </tr>
      </table>`;
  const metricHtml = dealMetrics.length
    ? `
          <table class="deal-alert-metrics" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:10px 0 0;border-collapse:collapse;table-layout:fixed;">
            <tr>
              ${dealMetrics
                .map(
                  (metric, index) => `
                    <td class="deal-alert-metric-cell" width="${Math.floor(100 / dealMetrics.length)}%" valign="top" style="width:${Math.floor(100 / dealMetrics.length)}%;padding:0 ${index === dealMetrics.length - 1 ? "0" : "4px"} 0 ${index === 0 ? "0" : "4px"};">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid ${BORDER};border-radius:7px;border-collapse:separate;background:#ffffff;">
                        <tr>
                          <td style="padding:8px 8px;text-align:left;">
                            <p style="margin:0;color:${MUTED};${LABEL_TEXT_STYLE}font-size:9px;line-height:12px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">${escapeHtml(metric.label)}</p>
                            <p style="margin:3px 0 0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:14px;line-height:18px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(displayValue(metric.value))}</p>
                          </td>
                        </tr>
                      </table>
                    </td>`,
                )
                .join("")}
            </tr>
          </table>`
    : "";
  const dealCard = `
    <table class="deal-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0 0;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;background:${CARD_BACKGROUND};overflow:hidden;box-shadow:0 10px 26px rgba(11,29,58,0.06);">
      <tr>
        <td class="deal-alert-image-cell" width="${imageWidth}" height="${cardMinHeight}" valign="top"${imageBackgroundAttribute} bgcolor="${PANEL_BACKGROUND}" style="width:${imageWidth}px;height:${cardMinHeight}px;padding:0;${imageCellBackground}font-size:0;line-height:0;vertical-align:top;">
          ${imageHtml}
        </td>
        <td class="deal-alert-content-cell" valign="top" style="padding:13px 15px 12px;text-align:left;vertical-align:top;">
          <p style="margin:0 0 5px;color:${GOLD};${LABEL_TEXT_STYLE}font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:0.12em;">Off-market opportunity</p>
          <h2 style="margin:0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:17px;line-height:22px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(params.dealTitle)}</h2>
          ${
            metaItems.length
              ? `<p class="deal-alert-meta" style="margin:5px 0 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:12px;line-height:17px;word-break:normal;overflow-wrap:break-word;">${metaItems
                  .map((item) => escapeHtml(item))
                  .join('<span style="color:#9CA3AF;">&nbsp;&bull;&nbsp;</span>')}</p>`
              : ""
          }
          <p style="margin:9px 0 0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:19px;line-height:23px;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(priceLabel)}</p>
          ${metricHtml}
        </td>
      </tr>
    </table>`;

  return {
    subject: params.subject,
    text: textTemplate(title, [
      subtitle,
      `Deal: ${params.dealTitle}`,
      `Price: ${formatCurrency(params.price)}`,
      metaItems.length ? `Details: ${metaItems.join(" | ")}` : "",
      ...dealMetrics.map((metric) => `${metric.label}: ${displayValue(metric.value)}`),
      `View Deal: ${params.dealUrl}`,
    ]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "NEW",
      bodyHtml: dealCard,
      primaryCta: { label: "View Deal", href: params.dealUrl },
      preheader: subtitle,
    }),
  };
}

export function newMessageReceivedTemplate(params: {
  subject: string;
  senderName: string;
  listingTitle: string;
  conversationUrl: string;
}) {
  const title = "You Have a New Message";
  const subtitle = `${params.senderName} sent you a new message about ${params.listingTitle}.`;
  const bodyHtml = renderInfoCard({
    rows: [
      { label: "From", value: params.senderName },
      { label: "Listing", value: params.listingTitle },
    ],
    text: "Reply now before the lead goes cold.",
    background: PANEL_BACKGROUND,
  });

  return {
    subject: params.subject,
    text: textTemplate(title, [subtitle, "Reply now before the lead goes cold.", `View Message: ${params.conversationUrl}`]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "MSG",
      bodyHtml,
      primaryCta: { label: "View Message", href: params.conversationUrl },
      preheader: "Reply now before the lead goes cold.",
    }),
  };
}

export function requirementMatchFoundTemplate(params: {
  requirementSummary: string;
  matchCount: number;
  listings: EmailListingSummary[];
  matchesUrl: string;
}) {
  const subject = "New Match Found For Your Buyer Requirement";
  const title = "New Match Found For Your Buyer Requirement";
  const subtitle = `We found ${params.matchCount} matching listing${params.matchCount === 1 ? "" : "s"} for your buyer requirement.`;
  const bodyHtml = renderInfoCard({
    title: "Requirement Summary",
    rows: [
      { label: "Requirement", value: params.requirementSummary },
      { label: "Matches found", value: params.matchCount },
    ],
    childrenHtml: `
      <table class="listing-section" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0 0;border-collapse:collapse;">
        <tr>
          <td class="listing-section-cell" style="padding:14px 0 0;border-top:1px solid ${BORDER};text-align:left;">
            <h3 style="margin:0 0 2px;color:${NAVY};${HEADING_TEXT_STYLE}font-size:15px;line-height:22px;word-break:break-word;overflow-wrap:break-word;">Top Matching Listings</h3>
            ${renderListingList(params.listings, "No top listings are available in this alert.")}
          </td>
        </tr>
      </table>`,
  });

  return {
    subject,
    text: textTemplate(title, [
      subtitle,
      `Requirement summary: ${params.requirementSummary}`,
      `Number of matches: ${params.matchCount}`,
      "Top matching listings:",
      ...params.listings.map((listing) => `${listing.title} - ${formatCurrency(listing.price)} - ${listing.url}`),
      `View Matches: ${params.matchesUrl}`,
    ]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "MTCH",
      bodyHtml,
      primaryCta: { label: "View Matches", href: params.matchesUrl },
      preheader: subtitle,
    }),
  };
}

export function weeklyDealDigestTemplate(params: {
  topDeals: EmailListingSummary[];
  highestRoiDeal: EmailListingSummary | null;
  biggestDiscountDeal: EmailListingSummary | null;
  distressedDeals: EmailListingSummary[];
  newLaunches: EmailListingSummary[];
  allDealsUrl: string;
}) {
  const subject = "This Week's Best Off-Market Opportunities";
  const title = "This Week's Best Off-Market Opportunities";
  const subtitle = "Here are the strongest opportunities to review and share this week.";
  const renderDigestSection = (heading: string, listings: EmailListingSummary[], emptyText: string) =>
    renderListingSection(heading, listings, emptyText);
  const bodyHtml = [
    renderDigestSection("Top 5 deals", params.topDeals.slice(0, 5), "No top deals are available this week."),
    renderDigestSection("Highest ROI", params.highestRoiDeal ? [params.highestRoiDeal] : [], "No ROI leader is available this week."),
    renderDigestSection("Biggest discount", params.biggestDiscountDeal ? [params.biggestDiscountDeal] : [], "No discount leader is available this week."),
    renderDigestSection("Distressed stock", params.distressedDeals, "No distressed stock is available this week."),
    renderDigestSection("New launches", params.newLaunches, "No new launches are available this week."),
  ].join("");

  return {
    subject,
    text: textTemplate(title, [
      subtitle,
      "Top 5 deals:",
      ...params.topDeals.slice(0, 5).map((listing) => `${listing.title} - ${formatCurrency(listing.price)} - ${listing.url}`),
      `Highest ROI: ${params.highestRoiDeal?.title || "None"}`,
      `Biggest discount: ${params.biggestDiscountDeal?.title || "None"}`,
      `Distressed stock: ${params.distressedDeals.length}`,
      `New launches: ${params.newLaunches.length}`,
      `View All Deals: ${params.allDealsUrl}`,
    ]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "WEEK",
      bodyHtml,
      primaryCta: { label: "View All Deals", href: params.allDealsUrl },
      preheader: subtitle,
    }),
  };
}

export function profileCompletionReminderTemplate(params: { brokerName: string; profileUrl: string }) {
  const subject = "Complete your DXB Deal Flow profile";
  const title = "Complete Your Profile";
  const subtitle = "Profiles with photo + bio get more enquiries.";
  const bodyHtml = renderInfoCard({
    title: `Hi ${params.brokerName}`,
    text: "Add your profile image and a concise broker bio so other verified brokers can quickly trust who they are dealing with.",
    rows: [
      { label: "Profile photo", value: "Recommended" },
      { label: "Broker bio", value: "Recommended" },
    ],
  });

  return {
    subject,
    text: textTemplate(title, [subtitle, `Hi ${params.brokerName}`, "Add your profile image and a concise broker bio.", `Complete Profile: ${params.profileUrl}`]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "PRO",
      bodyHtml,
      primaryCta: { label: "Complete Profile", href: params.profileUrl },
      preheader: subtitle,
    }),
  };
}

export function brokerEmailVerificationOtpTemplate(params: {
  brokerName: string;
  otp: string;
  validityText: string;
  verifyUrl?: string | null;
}) {
  const subject = "Verify your email";
  const title = "Verify Your Email";
  const subtitle = `Hello ${params.brokerName}, use this OTP to verify your registered broker email.`;
  const otpCard = `
    <table class="otp-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0 0;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;background:${PANEL_BACKGROUND};">
      <tr>
        <td class="otp-card-cell" align="center" style="padding:24px 18px;">
          <p style="margin:0;color:${MUTED};${LABEL_TEXT_STYLE}font-size:11px;line-height:16px;text-transform:uppercase;letter-spacing:0.16em;">Verification code</p>
          <p class="otp-code" style="margin:10px 0 0;color:${NAVY};${HEADING_TEXT_STYLE}font-size:34px;line-height:40px;letter-spacing:0.16em;">${escapeHtml(params.otp)}</p>
          <p style="margin:12px 0 0;color:${MUTED};${BODY_TEXT_STYLE}font-size:13px;line-height:20px;">${escapeHtml(params.validityText)}</p>
        </td>
      </tr>
    </table>`;

  return {
    subject,
    text: textTemplate(title, [subtitle, `OTP code: ${params.otp}`, params.validityText, params.verifyUrl ? `Verify Email: ${params.verifyUrl}` : ""]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "OTP",
      bodyHtml: otpCard,
      primaryCta: params.verifyUrl ? { label: "Verify Email", href: params.verifyUrl } : null,
      preheader: "Use this OTP to verify your DXB Deal Flow email.",
    }),
  };
}

export function brokerPublicEnquiryNotificationTemplate(params: {
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  message?: string | null;
  listingTitle: string;
  enquiryDate: string;
  enquiryUrl: string;
}) {
  const subject = `New enquiry for ${params.listingTitle}`;
  const title = "New Public Enquiry Received";
  const subtitle = "A public user has submitted an enquiry for one of your listings.";
  const messagePreview = truncateText(params.message, 260) || "No message provided.";
  const bodyHtml = renderInfoCard({
    title: "Enquiry Details",
    rows: [
      { label: "Enquirer name", value: params.contactName },
      { label: "Enquirer email", value: params.contactEmail },
      { label: "Enquirer phone", value: params.contactPhone },
      { label: "Listing title", value: params.listingTitle },
      { label: "Message", value: messagePreview },
    ],
  });

  return {
    subject,
    text: textTemplate(title, [
      subtitle,
      `Enquirer name: ${params.contactName}`,
      `Enquirer email: ${params.contactEmail}`,
      `Enquirer phone: ${displayValue(params.contactPhone)}`,
      `Listing title: ${params.listingTitle}`,
      `Message preview: ${messagePreview}`,
      `View Enquiry: ${params.enquiryUrl}`,
    ]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "LEAD",
      bodyHtml,
      primaryCta: { label: "View Enquiry", href: params.enquiryUrl },
      preheader: subtitle,
    }),
  };
}

export function enquiryReplyEmailTemplate(params: {
  subject: string;
  brokerName: string;
  contactName?: string | null;
  listingTitle?: string | null;
  message: string;
  listingUrl?: string | null;
  replyUrl?: string | null;
}) {
  const title = "You Have a Reply From The Broker";
  const subtitle = params.listingTitle
    ? `${params.brokerName} replied to your enquiry about ${params.listingTitle}.`
    : `${params.brokerName} replied to your enquiry.`;
  const contextRows: InfoRow[] = [
    { label: "Broker", value: params.brokerName },
    { label: "Listing", value: params.listingTitle || "General enquiry" },
    { label: "Reply message", value: params.message },
  ];
  const bodyHtml = renderInfoCard({
    title: "Broker/listing context",
    rows: contextRows,
  });
  const greeting = params.contactName ? `Hi ${params.contactName},` : "Hi,";
  const primary = params.listingUrl
    ? { label: "View Listing", href: params.listingUrl }
    : params.replyUrl
      ? { label: "Reply", href: params.replyUrl }
      : null;
  const secondary = params.listingUrl && params.replyUrl ? { label: "Reply", href: params.replyUrl } : null;

  return {
    subject: params.subject,
    text: textTemplate(title, [
      subtitle,
      greeting,
      params.message,
      `Broker: ${params.brokerName}`,
      params.listingTitle ? `Listing: ${params.listingTitle}` : "",
      params.listingUrl ? `View Listing: ${params.listingUrl}` : "",
      params.replyUrl ? `Reply: ${params.replyUrl}` : "",
    ]),
    html: renderLayout({
      title,
      subtitle,
      iconLabel: "REPLY",
      bodyHtml,
      primaryCta: primary,
      secondaryCta: secondary,
      buttonLayout: "inline",
      preheader: subtitle,
    }),
  };
}
