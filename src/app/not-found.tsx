"use client";

import Image from "next/image";
import Link from "next/link";
import { ComponentType, FormEvent, ReactNode, useState } from "react";

type IconProps = {
  className?: string;
};

const actionLinks = [
  {
    href: "/",
    title: "Go to Homepage",
    description: "Back to where it all begins.",
    icon: HomeIcon,
  },
  {
    href: "/listings",
    title: "Browse Deals",
    description: "Explore exclusive off-market deals.",
    icon: CompassIcon,
  },
  {
    href: "/",
    title: "Contact Support",
    description: "We are here to help you out.",
    icon: HeadsetIcon,
  },
] as const;

// const brokerLogos = [
//   { name: "EMAAR", subtitle: "PROPERTIES", className: "font-serif tracking-[0.14em]" },
//   { name: "DAMAC", subtitle: "", className: "font-heading italic tracking-[0.08em]" },
//   { name: "SOBHA", subtitle: "REALTY", className: "font-serif tracking-[0.18em]" },
//   { name: "NAKHEEL", subtitle: "", className: "font-heading tracking-[0.04em]" },
//   { name: "ELLINGTON", subtitle: "PROPERTIES", className: "font-heading tracking-[0.16em]" },
// ] as const;


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NotFound() {
  const [priorityEmail, setPriorityEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handlePrioritySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = priorityEmail.trim();

    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailError("");

    const params = new URLSearchParams({
      subject: "Join Priority List",
      body: `Please add ${email} to the DXB Deal Flow priority list.`,
    });

    window.location.href = `mailto:support@dxbdealflow.com?${params.toString()}`;
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-white via-[#faf7f2] to-[#f3efe7] text-[#0F172A]">
  <section className="relative w-full overflow-hidden min-h-[640px] sm:min-h-[680px] md:min-h-[720px] lg:min-h-[720px]">
    <div className="pointer-events-none absolute inset-y-0 right-0 w-full">
      <Image
        src="/assets/404-image.png"
        alt="Dubai skyline"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[72%_center] opacity-35 sm:opacity-45 md:opacity-60 lg:object-right lg:opacity-100"
      />

      
      <div className="absolute inset-y-0 left-0 w-[65%] sm:w-[60%] md:w-[55%] lg:w-[50%] 
  bg-gradient-to-r 
  from-[#faf7f2] 
  via-[#f3efe7]/85 
  to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f3efe7] via-[#f3efe7]/85 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(212,160,23,0.12),transparent_18%)]" />

      <div className="absolute left-[58%] top-[20%] h-20 w-20 rounded-full bg-[#EBCB7A]/32 blur-[2px] sm:h-28 sm:w-28 md:h-32 md:w-32 lg:left-[64%] lg:top-[32%]" />

      <div className="absolute right-[10%] top-[26%] hidden sm:block lg:right-[14%]">
        <div className="flex gap-4 text-slate-400/70">
          <BirdIcon className="h-4 w-4" />
          <BirdIcon className="mt-8 h-4 w-4" />
          <BirdIcon className="mt-3 h-4 w-4" />
        </div>
      </div>
    </div>

    <div className="relative z-10">
      <div className="shell py-4 xl:max-2xl:px-20 xl:max-2xl:pt-6">
        <Link href="/" className="flex min-w-0 items-center gap-4">
          <div className="relative h-10 w-[158px] sm:h-11 sm:w-[198px]">
            <Image
              src="/assets/Logo-Blue.png"
              alt="DXB Deal Flow"
              fill
              className="object-contain object-left"
              sizes="198px"
              priority
            />
          </div>
        </Link>
      </div>

      <div className="shell pb-6 pt-4 sm:pb-6 sm:pt-6 lg:pb-6 lg:pt-8 xl:max-2xl:px-20 xl:max-2xl:pb-12 xl:max-2xl:pt-10">
        <div className="max-w-[760px] lg:max-w-[52%] xl:max-w-[50%]">
          <div className="relative mt-6 sm:mt-10 lg:mt-12">
            <p className="pointer-events-none absolute left-0 top-0 z-0 select-none font-heading text-[96px] font-bold leading-none text-[#D4A017]/20 sm:text-[150px] md:text-[190px] lg:text-[260px]">
              404
            </p>

            <div className="absolute right-0 top-4 hidden md:block lg:right-8 lg:top-8">
              <PaperPlaneTrail className="h-20 w-28 text-[#E7BF65]/70 lg:h-24 lg:w-36" />
            </div>

            <div className="relative z-10 pt-[92px] sm:pt-[132px] md:pt-[170px] lg:pt-[240px]">
              <h1 className="max-w-xl font-heading text-[1.7rem] font-semibold leading-tight tracking-[-0.04em] text-[#0F172A] sm:text-3xl md:text-4xl lg:text-5xl">
                Looks like the page you&apos;re looking for is{" "}
                <span className="text-[#D4A017]">not available.</span>
              </h1>

              <p className="mt-4 max-w-md text-sm leading-7 text-gray-500 sm:mt-6 sm:text-base md:text-lg">
                The page may have been moved, deleted, or you may have entered the
                wrong address.
              </p>
            </div>
          </div>

          <div className="mt-7 h-px w-16 bg-[#D4A017]" />

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:max-w-none lg:mt-10 lg:flex lg:max-w-none lg:flex-row lg:gap-6">
            {actionLinks.map((item) => (
              <ActionCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-6 lg:right-[10rem]">
        <div className="flex items-center gap-2 rounded-2xl border border-white/90 bg-white/78 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-md sm:gap-3 sm:px-4 sm:py-2 sm:text-sm">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#E9DFC9] bg-white text-[#0F172A]">
            <LockIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-[0.65rem] font-semibold tracking-[0.08em] text-[#0F172A] sm:text-xs">
              PRIVATE NETWORK
            </p>
            <p className="mt-0.5 whitespace-nowrap text-[0.62rem] text-slate-500 sm:text-xs">
              For Verified Brokers Only
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div className="shell-boundary flex w-full flex-col pb-6 xl:max-2xl:px-20 xl:max-2xl:pb-10">
    <section className="mt-5 rounded-[12px] border border-[#EADFCC] bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:mt-6 sm:p-6 md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4 sm:items-center sm:gap-6">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#F0DFC2] bg-[#FFF9ED] text-[#D4A017] sm:h-16 sm:w-16">
            <LockIcon className="h-7 w-7 sm:h-10 sm:w-10" />
          </span>

          <div>
            <h2 className="font-heading text-xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-2xl">
              Can&apos;t find what you&apos;re looking for?
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500 sm:text-base">
              Our team can help you get back on track.
            </p>
          </div>
        </div>

        <Link
          href="mailto:support@dxbdealflow.com?subject=DXB%20Deal%20Flow%20Support"
          className="inline-flex w-full items-center justify-center gap-3 rounded-[8px] bg-[#D4A017] px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-md transition duration-300 hover:bg-[#BB8E14] hover:shadow-lg lg:w-auto lg:min-w-[220px]"
        >
          <MailIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          Contact Support
        </Link>
      </div>
    </section>

    <section className="mt-6 rounded-[12px] border border-[#EADFCC] bg-[radial-gradient(circle_at_top_right,rgba(212,160,23,0.14),transparent_30%),linear-gradient(180deg,#FFFDFC_0%,#FFF9F0_100%)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[540px]">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF4DC] text-[#D4A017] sm:h-12 sm:w-12">
            <UsersIcon className="h-7 w-7 sm:h-10 sm:w-10" />
          </span>

          <h2 className="mt-5 font-heading text-2xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-3xl">
            Stay Ahead. Don&apos;t Miss Out.
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
            Join the priority list to get early access to our private deal flow.
          </p>
        </div>

        <div className="w-full max-w-[560px]">
          <form onSubmit={handlePrioritySubmit} noValidate className="w-full">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                name="email"
                value={priorityEmail}
                onChange={(event) => {
                  setPriorityEmail(event.target.value);
                  if (emailError) setEmailError("");
                }}
                placeholder="Enter your email address"
                aria-label="Email address"
                className="h-12 w-full rounded-xl border border-[#E5DECF] bg-white px-4 text-sm text-[#0F172A] outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#D4A017] focus:ring-4 focus:ring-[#D4A017]/10"
              />

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#D4A017] px-5 text-sm font-semibold text-[#0F172A] shadow-md transition duration-300 hover:bg-[#BB8E14] hover:shadow-lg sm:w-auto sm:min-w-[154px]"
              >
                Join Priority List
              </button>
            </div>

            <div className="mt-4 flex min-h-6 items-start gap-2 text-sm">
              {emailError ? (
                <p className="text-rose-500">{emailError}</p>
              ) : (
                <>
                  <PrivacyLockIcon className="h-6 w-6 shrink-0 text-slate-400" />
                  <p className="text-slate-500">
                    We respect your privacy. Your details are safe with us.
                  </p>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>

    {/* <section className="mt-6 rounded-[12px] border border-[#EADFCC] bg-white/88 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6 md:p-8">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#D4A017] sm:text-sm sm:tracking-[0.28em]">
        Trusted by Leading Brokers &amp; Agencies
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {brokerLogos.map((logo) => (
          <div
            key={logo.name}
            className="flex min-h-[88px] flex-col items-center justify-center rounded-2xl border border-[#F1E8D9] bg-[#FFFDF9] px-4 py-5 text-center sm:min-h-[96px]"
          >
            <p
              className={`text-[1.35rem] leading-none text-[#14213E] sm:text-[1.65rem] ${logo.className}`}
            >
              {logo.name}
            </p>

            {logo.subtitle ? (
              <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.26em] text-slate-500">
                {logo.subtitle}
              </p>
            ) : (
              <p
                aria-hidden="true"
                className="mt-2 text-[0.65rem] uppercase tracking-[0.26em] text-transparent"
              >
                &nbsp;
              </p>
            )}
          </div>
        ))}
      </div>
    </section> */}

    <footer className="mt-6 border-t border-[#E5DACA] px-1 pt-6">
      <div className="grid gap-6 text-center md:grid-cols-[1fr_auto_1fr] md:items-center md:text-left lg:flex lg:items-center lg:justify-between">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:text-left md:justify-start">
          <div className="relative h-10 w-[126px] shrink-0">
            <Image
              src="/assets/Logo-Blue.png"
              alt="DXB Deal Flow"
              fill
              sizes="126px"
              className="object-contain object-left"
            />
          </div>

          <p className="max-w-[320px] text-sm leading-6 text-slate-500">
            DXB Deal Flow is a private platform for verified real estate
            professionals only.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <SocialBadge icon={<InstagramIcon className="h-5 w-5" />} />
          <SocialBadge icon={<LinkedInIcon className="h-5 w-5" />} />
          <SocialBadge icon={<YouTubeIcon className="h-7 w-7" />} />
        </div>

        <p className="text-center text-sm leading-6 text-slate-500 md:text-right">
          &copy; 2024 DXB Deal Flow.
          <br />
          All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</main>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
}) {
  return (
    <Link
      href={href}
      className="group flex-1 rounded-2xl border border-transparent bg-white/65 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#E8DCC4] hover:shadow-lg"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#F0DFC2] bg-[#FFFBF4] text-[#D4A017] transition duration-300 group-hover:border-[#E2CA98] group-hover:bg-[#FFF5E1]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-5 font-heading text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">
        {title}
      </p>
      <p className="mt-2 max-w-[18ch] text-sm leading-7 text-slate-500">
        {description}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-[#D4A017]">
        <ArrowRightIcon className="h-5 w-5 transition duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function SocialBadge({ icon }: { icon: ReactNode }) {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#E5DACA] bg-white/80 text-slate-500 shadow-sm">
      {icon}
    </span>
  );
}

function HomeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.75 10.25L12 4.25L19.25 10.25V18.25C19.25 18.8 18.8 19.25 18.25 19.25H5.75C5.2 19.25 4.75 18.8 4.75 18.25V10.25Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 19.25V13.25H14.75V19.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompassIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M14.9 9.1L13.05 13.05L9.1 14.9L10.95 10.95L14.9 9.1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M15.9 8.1L14.9 9.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeadsetIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect
        x="4.25"
        y="11.75"
        width="4.25"
        height="6"
        rx="2.12"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="15.5"
        y="11.75"
        width="4.25"
        height="6"
        rx="2.12"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19 17.25C19 18.91 17.66 20.25 16 20.25H13.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M11.75 20.25H14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.5"
        stroke="#000000"
        strokeWidth="1.7"
      />
      <path
        d="M8 10V7.75C8 5.54 9.79 3.75 12 3.75C14.21 3.75 16 5.54 16 7.75V10"
        stroke="#000000"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 13V15.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="3.75"
        y="6.25"
        width="16.5"
        height="11.5"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4.75 7.75L12 13L19.25 7.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.25" cy="9.75" r="2.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 18.25C5.05 15.62 6.98 14.25 9 14.25C11.02 14.25 12.95 15.62 13.5 18.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14.25 18.25C14.64 16.57 15.82 15.5 17.37 15.12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrivacyLockIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect
        x="4"
        y="8"
        width="12"
        height="8"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 8V6.7C6.5 4.93 7.93 3.5 9.7 3.5H10.3C12.07 3.5 13.5 4.93 13.5 6.7V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 10H15.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.75 5.5L15.25 10L10.75 14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperPlaneTrail({ className = "h-20 w-28" }: IconProps) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <path
        d="M18 88C33 88 22 54 42 54C60 54 54 86 77 79C96 73 90 29 116 27"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6 9"
      />
      <path
        d="M104 26L138 17L121 46L117 32L104 26Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BirdIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 14C5.33 11.67 7.17 10.5 9 10.5C10.83 10.5 12.67 11.67 14.5 14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.5 14C11.17 11.91 12.83 10.86 14.5 10.86C16.17 10.86 17.83 11.91 19.5 14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InstagramIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="3.25"
        y="3.25"
        width="17.5"
        height="17.5"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="7" r="1.1" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="3.25"
        y="3.25"
        width="17.5"
        height="17.5"
        rx="3.75"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.2 10.2V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.2 8.1C8.78 8.1 9.25 7.63 9.25 7.05C9.25 6.47 8.78 6 8.2 6C7.62 6 7.15 6.47 7.15 7.05C7.15 7.63 7.62 8.1 8.2 8.1Z"
        fill="currentColor"
      />
      <path
        d="M12 16V12.8C12 11.36 12.86 10.2 14.52 10.2C16.18 10.2 16.8 11.31 16.8 12.99V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10.2V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function YouTubeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20.25 8.44C20.03 7.59 19.36 6.92 18.51 6.7C17 6.25 12 6.25 12 6.25C12 6.25 7 6.25 5.49 6.7C4.64 6.92 3.97 7.59 3.75 8.44C3.3 9.95 3.3 12 3.3 12C3.3 12 3.3 14.05 3.75 15.56C3.97 16.41 4.64 17.08 5.49 17.3C7 17.75 12 17.75 12 17.75C12 17.75 17 17.75 18.51 17.3C19.36 17.08 20.03 16.41 20.25 15.56C20.7 14.05 20.7 12 20.7 12C20.7 12 20.7 9.95 20.25 8.44Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10.25 9.75L14.5 12L10.25 14.25V9.75Z"
        fill="currentColor"
      />
    </svg>
  );
}
