import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import MaintenanceNotifyForm from "./MaintenanceNotifyForm";

const maintenanceItems = [
  {
    title: "Improving Performance",
    description: "Faster, smoother and more reliable experience.",
    icon: PerformanceIcon,
  },
  {
    title: "Enhancing Security",
    description: "Stronger protection for your data and deals.",
    icon: ShieldIcon,
  },
  {
    title: "Adding Powerful New Features",
    description: "More tools. More value. More opportunities.",
    icon: RocketIcon,
  },
] as const;

// const trustedLogos = [
//   { name: "EMAAR", subtitle: "PROPERTIES", className: "font-serif tracking-[0.14em]" },
//   { name: "DAMAC", subtitle: "", className: "font-heading italic tracking-[0.08em]" },
//   { name: "SOBHA", subtitle: "REALTY", className: "font-serif tracking-[0.18em]" },
//   { name: "NAKHEEL", subtitle: "", className: "font-heading tracking-[0.04em]" },
//   { name: "ELLINGTON", subtitle: "PROPERTIES", className: "font-heading tracking-[0.16em]" },
//   { name: "& many more", subtitle: "", className: "text-base font-medium tracking-normal" },
// ] as const;

export default function MaintenancePage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-white via-[#faf7f2] to-[#f3efe7] text-[#0F172A]">
      <section className="relative w-full overflow-hidden min-h-[640px] sm:min-h-[680px] md:min-h-[720px] lg:min-h-[720px]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-full">
          <Image
            src="/assets/maintenance.png"
            alt="DXB Deal Flow under maintenance visual"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[72%_center] opacity-35 sm:opacity-45 md:opacity-60 lg:object-right lg:opacity-100"
          />

          <div className="absolute inset-y-0 left-0 w-[60%] lg:w-[52%] bg-gradient-to-r from-[#faf7f2] via-[#f3efe7]/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f3efe7] via-[#f3efe7]/85 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(212,160,23,0.12),transparent_18%)]" />
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

          <div className="shell pb-10 pt-4 sm:pb-12 sm:pt-6 lg:pb-12 lg:pt-8 xl:max-2xl:px-20 xl:max-2xl:pb-20 xl:max-2xl:pt-10">
            <div className="max-w-[760px] lg:max-w-[52%] xl:max-w-[50%]">
              <div className="max-w-[620px] text-center lg:text-left">
                <div className="inline-flex items-center gap-3 rounded-full border border-[#EFD8A3] bg-[#FFF8EA] px-5 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#D49F17] shadow-[0_8px_24px_rgba(212,175,55,0.08)]">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#F1D69A] bg-white text-[#D49F17]">
                    <WrenchIcon className="h-6 w-6" />
                  </span>
                  UNDER MAINTENANCE
                </div>

                <h1 className="mt-7 font-heading text-[2.8rem] font-bold leading-[0.94] tracking-[-0.06em] text-[#0F2A5F] sm:text-[3.2rem] md:text-[3.8rem] lg:text-[4.2rem]">
                  <span className="block">We&apos;re Down For</span>
                  <span className="mt-2 block text-[#D49F17]">A Tune-Up.</span>
                </h1>

                <p className="mx-auto mt-6 max-w-[560px] text-lg leading-9 text-slate-500 lg:mx-0">
                  DXB Deal Flow is getting an upgrade to serve you better, faster
                  and smarter.
                </p>

                <div className="mx-auto mt-9 h-px w-14 bg-[#D4A017] lg:mx-0" />

                <div className="mt-8 space-y-6">
                  {maintenanceItems.map((item) => (
                    <FeatureRow
                      key={item.title}
                      title={item.title}
                      description={item.description}
                      icon={<item.icon className="h-8 w-8" />}
                    />
                  ))}
                </div>
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
        <section className="mt-8 overflow-hidden rounded-[12px] border border-[#E7DEC9] bg-white/92 shadow-[0_18px_46px_rgba(15,23,42,0.06)]">
          <div className="grid md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <div className="flex items-center gap-5 px-6 py-7 sm:px-8">
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#EAD9BA] bg-[#FFFBF2] text-[#D4A017]">
                <ClockIcon className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-500">Estimated Time</p>
                <h2 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.04em] text-[#0F2A5F]">
                  Back Soon
                </h2>
                <p className="mt-2 text-base text-slate-500">
                  We appreciate your patience.
                </p>
              </div>
            </div>

            <div className="border-t border-[#EFE6D6] px-6 py-7 sm:px-8 md:border-l md:border-t-0">
              <p className="max-w-[440px] text-[1rem] leading-9 text-[#22345F]">
                We&apos;re working hard to bring you a better DXB Deal Flow.
              </p>
              <p className="mt-2 font-heading text-[1.6rem] font-semibold tracking-[-0.04em] text-[#0F2A5F]">
                Stay tuned!
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[12px] border border-[#E7DEC9] bg-white/88 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,540px)] lg:items-center">
            <div className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:gap-6 lg:text-left">
              <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#EDD8A7] bg-[#FFF9EE] text-[#D49F17] shadow-[0_12px_28px_rgba(212,175,55,0.08)]">
                <MailIcon className="h-9 w-9" />
              </span>

              <div className="mt-5 lg:mt-1">
                <h3 className="font-heading text-[1.6rem] font-semibold tracking-[-0.04em] text-[#0F2A5F]">
                  Be the first to know when we&apos;re back.
                </h3>
                <p className="mt-3 max-w-[420px] text-base leading-8 text-slate-500">
                  Leave your details and we&apos;ll notify you the moment we&apos;re live.
                </p>
              </div>
            </div>

            <MaintenanceNotifyForm />
          </div>
        </section>

        {/* <section className="mt-8 rounded-[12px] border border-[#E7DEC9] bg-white/88 px-6 py-8 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#D49F17] sm:text-sm">
            TRUSTED BY LEADING BROKERS &amp; AGENCIES
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-y-6">
            {trustedLogos.map((logo, index) => (
              <div
                key={logo.name}
                className={`px-6 text-center sm:px-8 lg:px-10 ${
                  index < trustedLogos.length - 1 ? "lg:border-r lg:border-[#EAE0CE]" : ""
                }`}
              >
                <p className={`text-[1.75rem] leading-none text-[#14213E] ${logo.className}`}>
                  {logo.name}
                </p>
                {logo.subtitle ? (
                  <p className="mt-2 text-[0.68rem] font-medium uppercase tracking-[0.26em] text-slate-500">
                    {logo.subtitle}
                  </p>
                ) : (
                  <p aria-hidden="true" className="mt-2 text-[0.68rem] uppercase tracking-[0.26em] text-transparent">
                    &nbsp;
                  </p>
                )}
              </div>
            ))}
          </div>
        </section> */}

      </div>
    </main>
  );
}

function FeatureRow({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 text-left">
      <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#EDD6A6] bg-[#FFFBF3] text-[#D49F17] shadow-[0_12px_24px_rgba(212,175,55,0.08)]">
        {icon}
      </span>
      <div>
        <h2 className="font-heading text-[1.4rem] font-semibold tracking-[-0.04em] text-[#0F2A5F]">
          {title}
        </h2>
        <p className="text-base leading-8 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function LockIcon({ className = "h-5 w-5" }: { className?: string }) {
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

function WrenchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14.7 6.2A4.25 4.25 0 0 0 9.5 11.4L4.7 16.2a1.75 1.75 0 1 0 2.47 2.47l4.8-4.8a4.25 4.25 0 0 0 5.2-5.2l-2.18 2.17-2.8-.53-.53-2.8L14.7 6.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PerformanceIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5V12L15.5 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 5.8L6.25 4.55M17.75 4.55L16.5 5.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.25L18.25 5.65V10.35C18.25 15.2 15.35 19 12 20.75C8.65 19 5.75 15.2 5.75 10.35V5.65L12 3.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 11.95L11.15 13.85L14.95 10.05"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RocketIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14.5 5.25C17.95 5.35 19.55 7 19.75 10.5L13.5 16.75L7.25 10.5C7.45 7 9.05 5.35 12.5 5.25L13.5 4.25L14.5 5.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10.25 14.75L8 17C7.45 17.55 6.55 17.55 6 17L7.75 13.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.75 11.25C14.44 11.25 15 10.69 15 10C15 9.31 14.44 8.75 13.75 8.75C13.06 8.75 12.5 9.31 12.5 10C12.5 10.69 13.06 11.25 13.75 11.25Z"
        fill="currentColor"
      />
      <path
        d="M9.25 17.5L7.5 19.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.8V12.2L14.9 14.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.75 7.25L12 12.25L19.25 7.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
