import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type FooterLink = {
  label: string;
  href: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const legalColumns: FooterColumn[] = [
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", href: "/terms-of-use" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Refund & Subscription Policy", href: "/refund-policy" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
  {
    title: "Broker Policies",
    links: [
      { label: "Verification Policy", href: "/verification-policy" },
      { label: "Listing Standards", href: "/listing-standards" },
      { label: "Co-Broke Policy", href: "/co-broke-policy" },
      { label: "Community Guidelines", href: "/community-guidelines" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Complaints & Compliance", href: "/complaints-compliance" },
      { label: "Maintenance Policy", href: "/maintenance-policy" },
    ],
  },
];

const socialItems = [
  { label: "Instagram", icon: <InstagramIcon /> },
  { label: "LinkedIn", icon: <LinkedInIcon /> },
  { label: "X", icon: <XIcon /> },
  { label: "YouTube", icon: <YouTubeIcon /> },
];

function FooterIcon({
  children,
  className = "h-[18px] w-[18px]",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <FooterIcon className={className}>
      <path
        d="M12 21s7-6.24 7-12.25A7 7 0 0 0 5 8.75C5 14.76 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="8.75" r="2.35" stroke="currentColor" strokeWidth="1.8" />
    </FooterIcon>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <FooterIcon className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4.25 7 7.75 6.15L19.75 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </FooterIcon>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <FooterIcon className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.75 12h16.5M12 3.5c2.15 2.32 3.25 5.15 3.25 8.5s-1.1 6.18-3.25 8.5C9.85 18.18 8.75 15.35 8.75 12S9.85 5.82 12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </FooterIcon>
  );
}

function HeadsetIcon({ className }: { className?: string }) {
  return (
    <FooterIcon className={className}>
      <path
        d="M4.25 13.1v-1.45a7.75 7.75 0 0 1 15.5 0v1.45"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.1 12.15H5.3a1.8 1.8 0 0 0-1.8 1.8v2.1a1.8 1.8 0 0 0 1.8 1.8h.8c.72 0 1.3-.58 1.3-1.3v-3.1c0-.72-.58-1.3-1.3-1.3ZM17.9 12.15h.8a1.8 1.8 0 0 1 1.8 1.8v2.1a1.8 1.8 0 0 1-1.8 1.8h-.8c-.72 0-1.3-.58-1.3-1.3v-3.1c0-.72.58-1.3 1.3-1.3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M19.75 17.05c0 2.1-1.65 3.2-4.55 3.2H13.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </FooterIcon>
  );
}

function InstagramIcon() {
  return (
    <FooterIcon>
      <rect x="5" y="5" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.25" cy="7.75" r="0.85" fill="currentColor" />
    </FooterIcon>
  );
}

function LinkedInIcon() {
  return (
    <FooterIcon>
      <path d="M7.25 10v7M11 17v-4.1c0-1.9 1.1-3.05 2.72-3.05 1.54 0 2.53 1.03 2.53 3.05V17M11 12.2V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.25" cy="7.25" r="1.1" fill="currentColor" />
    </FooterIcon>
  );
}

function XIcon() {
  return (
    <FooterIcon>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </FooterIcon>
  );
}

function YouTubeIcon() {
  return (
    <FooterIcon>
      <path
        d="M21 12s0-3.15-.4-4.55a2.55 2.55 0 0 0-1.8-1.8C17.4 5.25 12 5.25 12 5.25s-5.4 0-6.8.4a2.55 2.55 0 0 0-1.8 1.8C3 8.85 3 12 3 12s0 3.15.4 4.55a2.55 2.55 0 0 0 1.8 1.8c1.4.4 6.8.4 6.8.4s5.4 0 6.8-.4a2.55 2.55 0 0 0 1.8-1.8c.4-1.4.4-4.55.4-4.55Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m10.4 9.25 4.15 2.75-4.15 2.75v-5.5Z" fill="currentColor" />
    </FooterIcon>
  );
}

function FooterContactItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#a5a8ad]">{icon}</span>
      <div className="min-w-0 break-words text-[13px] font-semibold leading-[1.45] text-[#47536a]">{children}</div>
    </div>
  );
}

function FooterLinkColumn({ title, links }: FooterColumn) {
  return (
    <nav className="min-w-0 border-t border-[#e3d9ca] pt-6 xl:border-l xl:border-t-0 xl:pl-8 2xl:pl-7" aria-label={title}>
      <h2 className="font-heading text-[14px] font-bold uppercase tracking-[0.02em] text-[#071d43]">{title}</h2>
      <ul className="mt-5 grid gap-3.5">
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              className="inline-flex max-w-full whitespace-normal break-words text-[14px] font-semibold leading-5 text-[#3f506d] transition duration-200 hover:text-[#c88622] focus-visible:rounded-sm"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function FooterLegalNavigation() {
  return (
    <footer className="border-t border-[#d8d0c2] bg-[#faf7f0] text-[#4f5d73]" aria-label="DXB Deal Flow legal navigation">
      <div className="mx-auto w-full max-w-[1660px] px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-[104px]">
        <div className="grid min-w-0 grid-cols-1 items-start gap-y-7 py-7 md:grid-cols-2 md:gap-x-8 md:gap-y-8 lg:grid-cols-[minmax(260px,1.15fr)_repeat(2,minmax(0,1fr))] lg:gap-x-8 xl:grid-cols-[minmax(250px,1.26fr)_minmax(140px,0.72fr)_minmax(196px,0.9fr)_minmax(160px,0.76fr)_minmax(222px,0.9fr)] xl:gap-x-0 xl:py-8 2xl:grid-cols-[minmax(290px,1.28fr)_minmax(156px,0.76fr)_minmax(220px,0.9fr)_minmax(178px,0.78fr)_minmax(238px,0.88fr)]">
          <section className="min-w-0 pr-0 md:col-span-2 lg:col-span-1 lg:pr-2 xl:pr-8" aria-label="DXB Deal Flow contact details">
            <Link href="/" className="inline-flex" aria-label="DXB Deal Flow home">
              <span className="relative block h-[36px] w-[126px] sm:h-[38px] sm:w-[132px]">
                <Image src="/assets/Logo-Blue.png" alt="DXB Deal Flow" fill sizes="132px" className="object-contain object-left" />
              </span>
            </Link>

            <p className="mt-3 max-w-[330px] break-words text-[13px] font-semibold leading-[1.55] text-[#42506a]">
              The private marketplace for licensed brokers and verified investors to connect, collaborate and close better deals.
            </p>

            <address className="mt-5 grid gap-3.5 not-italic">
              <FooterContactItem icon={<MapPinIcon className="h-[19px] w-[19px]" />}>
                <span className="block">DXB Deal Flow</span>
                <span className="block">Office 1001, Al Ameri Tower,</span>
                <span className="block">Barsha Heights (TECOM),</span>
                <span className="block">Dubai, UAE</span>
                <span className="block">P.O. Box: 455324</span>
              </FooterContactItem>

              <FooterContactItem icon={<MailIcon className="h-[18px] w-[18px]" />}>
                <a href="mailto:support@dxbdealflow.com" className="break-words transition duration-200 hover:text-[#c88622]">
                  support@dxbdealflow.com
                </a>
              </FooterContactItem>

              <FooterContactItem icon={<GlobeIcon className="h-[18px] w-[18px]" />}>
                <a
                  href="https://www.dxbdealflow.com"
                  target="_blank"
                  rel="noreferrer"
                  className="break-words transition duration-200 hover:text-[#c88622]"
                >
                  www.dxbdealflow.com
                </a>
              </FooterContactItem>
            </address>

            <div className="mt-4 flex flex-wrap items-center gap-2.5" aria-label="Social channels">
              {socialItems.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7d9dc] bg-[#fbfaf7] text-[#a6abb2]"
                  aria-label={item.label}
                  role="img"
                >
                  {item.icon}
                </span>
              ))}
            </div>
          </section>

          {legalColumns.map((column) => (
            <FooterLinkColumn key={column.title} {...column} />
          ))}

          <section className="min-w-0 border-t border-[#e3d9ca] pt-6 xl:border-l xl:border-t-0 xl:pl-8 2xl:pl-7" aria-labelledby="footer-need-help">
            <h2 id="footer-need-help" className="font-heading text-[14px] font-bold uppercase tracking-[0.02em] text-[#071d43]">
              Need Help?
            </h2>

            <div className="mt-5 flex min-w-0 items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[#d99a31]">
                <HeadsetIcon className="h-11 w-11" />
              </span>
              <p className="min-w-0 max-w-none break-words text-[14px] font-semibold leading-7 text-[#4d586d] sm:max-w-[190px] xl:max-w-[170px]">
                Our support team is here to help you.
              </p>
            </div>

            <a
              href="mailto:support@dxbdealflow.com"
              className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-[9px] border border-[#e5c389] bg-[#fffaf2] px-5 text-[14px] font-bold text-[#d48b23] shadow-[0_8px_18px_rgba(212,139,35,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-[#dba243] hover:bg-white focus-visible:rounded-[9px] sm:max-w-[228px] xl:max-w-full"
            >
              <MailIcon className="h-[19px] w-[19px]" />
              <span className="min-w-0 whitespace-normal text-center">Contact Support</span>
            </a>

            <p className="mt-5 min-w-0 break-words text-[14px] font-semibold leading-6 text-[#727984]">
              Email us anytime at
              <a href="mailto:support@dxbdealflow.com" className="mt-1 block break-words text-[15px] font-bold text-[#d48b23] transition duration-200 hover:text-[#b97816]">
                support@dxbdealflow.com
              </a>
            </p>
          </section>
        </div>
      </div>

      <div className="border-t border-[#ded6ca] bg-[#f8f5ee]">
        <div className="mx-auto flex w-full max-w-[1660px] flex-col items-center gap-2 px-4 py-3 text-center text-[11px] font-semibold leading-5 text-[#8a8f98] sm:px-6 md:flex-row md:items-center md:justify-between md:gap-4 md:px-8 lg:px-12 xl:px-20 2xl:px-[104px]">
          <p className="min-w-0 break-words md:w-1/4 md:text-left">© 2026 DXB Deal Flow. All rights reserved.</p>
          <p className="min-w-0 break-words md:w-1/2 md:text-center">DXB Deal Flow Real Estate L.L.C | License No: 1249299 | Register No: 2203902 | DCCI No: 492118</p>
          <p className="inline-flex min-w-0 items-center justify-center gap-2 md:w-1/4 md:justify-end md:text-right">
            <span>Made in Dubai</span>
            <span className="inline-flex h-3.5 w-5 overflow-hidden rounded-[2px] border border-[#d7d0c2] bg-white shadow-[0_1px_2px_rgba(15,42,95,0.08)]" aria-hidden="true">
              <span className="h-full w-[26%] bg-[#d32027]" />
              <span className="grid flex-1 grid-rows-3">
                <span className="bg-[#00732f]" />
                <span className="bg-white" />
                <span className="bg-[#000000]" />
              </span>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
