import Image from "next/image";
import { cn } from "@/lib/deal-utils";
import { getBrokerWhatsappProfileUrl } from "@/lib/broker-social";

type AdminBrokerSocialLinksProps = {
  whatsappNumber?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  className?: string;
};

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Image src="/assets/WhatsApp-Logo.svg" alt="WhatsApp" width={24} height={24} className={className} />
  );
}

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient
          id="instagramGradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(4 22) rotate(-55) scale(28)"
        >
          <stop stopColor="#FFD600" />
          <stop offset="0.18" stopColor="#FF7A00" />
          <stop offset="0.42" stopColor="#FF0069" />
          <stop offset="0.68" stopColor="#D300C5" />
          <stop offset="1" stopColor="#7638FA" />
        </radialGradient>

        <radialGradient
          id="instagramOverlay"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(20 3) rotate(135) scale(18)"
        >
          <stop stopColor="#7B61FF" />
          <stop offset="1" stopColor="#7B61FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        fill="url(#instagramGradient)"
      />

      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        fill="url(#instagramOverlay)"
      />

      <rect
        x="5.2"
        y="5.2"
        width="13.6"
        height="13.6"
        rx="4"
        stroke="white"
        strokeWidth="1.8"
      />

      <circle
        cx="12"
        cy="12"
        r="3.6"
        stroke="white"
        strokeWidth="1.8"
      />

      <circle
        cx="16.2"
        cy="8.1"
        r="0.8"
        fill="white"
      />
    </svg>
  );
}

function LinkedInIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="2.6" fill="#0A66C2" />

      <path
        fill="#FFFFFF"
        d="M5.35 9.02h3.12v9.98H5.35V9.02Zm1.56-4.95c1 0 1.81.81 1.81 1.81S7.91 7.69 6.91 7.69 5.1 6.88 5.1 5.88s.81-1.81 1.81-1.81ZM10.42 9.02h2.99v1.36h.04c.42-.79 1.43-1.62 2.95-1.62 3.15 0 3.73 2.07 3.73 4.76V19h-3.12v-4.86c0-1.16-.02-2.65-1.62-2.65-1.62 0-1.87 1.26-1.87 2.57V19h-3.1V9.02Z"
      />
    </svg>
  );
}

export function AdminBrokerSocialLinks({
  whatsappNumber,
  instagramUrl,
  linkedinUrl,
  className,
}: AdminBrokerSocialLinksProps) {
  const items = [
    {
      label: "",
      href: getBrokerWhatsappProfileUrl(whatsappNumber),
      icon: <WhatsAppIcon className="h-8 w-8" />,
      iconClassName: "bg-white shadow-[0_10px_18px_rgba(37,211,102,0.18)]",
    },
    {
      label: "",
      href: instagramUrl || null,
      icon: <InstagramIcon className="h-8 w-8" />,
      iconClassName: "bg-white shadow-[0_10px_18px_rgba(91,70,180,0.14)]",
    },
    {
      label: "",
      href: linkedinUrl || null,
      icon: <LinkedInIcon className="h-8 w-8" />,
      iconClassName: "bg-white shadow-[0_10px_18px_rgba(10,102,194,0.16)]",
    },
  ].filter((item) => item.href);

  if (!items.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[12px] border border-[#f0dfb0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8e8_100%)] p-4 shadow-[0_14px_30px_rgba(153,118,43,0.08)]",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c4932f]">Social Profiles</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-brand-navy "
          >
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", item.iconClassName)}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
