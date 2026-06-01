"use client";

import Image from "next/image";
import Link from "next/link";
import PhoneInput, { type Value as PhoneNumberValue } from "react-phone-number-input";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { normalizeInstagramProfile } from "@/lib/broker-social";
import type { ComingSoonRegistrationErrors, ComingSoonRegistrationInput } from "@/lib/coming-soon";

type IconProps = {
  className?: string;
};

type RoleOption = {
  id: string;
  name: string;
  display_order: number;
};

type SubmitState = "idle" | "submitting" | "success";

const initialValues: ComingSoonRegistrationInput = {
  first_name: "",
  last_name: "",
  email: "",
  whatsapp_number: "",
  instagram_handle: "",
  company_agency_name: "",
  role_id: "",
  website: "",
};

const featureCards = [
  {
    title: "Off-Market Inventory",
    description: "Deals you won't find on portals",
    icon: BuildingIcon,
  },
  {
    title: "Better Margins",
    description: "Avg. 15-20% below market",
    icon: TagIcon,
  },
  {
    title: "Verified Network",
    description: "Connect with trusted brokers",
    icon: UsersIcon,
  },
  {
    title: "Private & Secure",
    description: "100% verified broker access",
    icon: ShieldIcon,
  },
] as const;

const benefitCards = [
  {
    title: "Exclusive Access",
    description: "View deals before they hit the market.",
    icon: LockIcon,
  },
  {
    title: "Higher Returns",
    description: "Buy below market and maximize ROI.",
    icon: MoneyIcon,
  },
  {
    title: "Close Faster",
    description: "Direct access to motivated sellers.",
    icon: ClockIcon,
  },
  {
    title: "Trusted Network",
    description: "Connect with verified brokers & investors.",
    icon: UsersIcon,
  },
] as const;

// const trustedLogos = [
//   { name: "EMAAR", subtitle: "PROPERTIES", className: "font-serif tracking-[0.14em]" },
//   { name: "DAMAC", subtitle: "", className: "font-heading italic tracking-[0.08em]" },
//   { name: "SOBHA", subtitle: "REALTY", className: "font-serif tracking-[0.18em]" },
//   { name: "NAKHEEL", subtitle: "", className: "font-heading tracking-[0.04em]" },
//   { name: "ELLINGTON", subtitle: "PROPERTIES", className: "font-heading tracking-[0.16em]" },
// ] as const;

const fieldBaseClass =
  "h-10 w-full min-w-0 rounded-[8px] border border-[#dbe1ea] bg-white px-3 py-2 text-[13px] text-[#0b1d3d] outline-none transition placeholder:text-[#9aa5b7] focus:border-[#d89b13] focus:ring-4 focus:ring-[#d89b13]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const instagramUrlPrefix = "instagram.com/";
const labelClass = "text-[13px] font-medium leading-none text-[#0b1d3d]";
const errorClass = "min-h-[16px] break-words text-[11px] leading-4 text-[#c94b4b]";

function getInstagramSubmissionValue(value: string) {
  try {
    return normalizeInstagramProfile(value) || "";
  } catch {
    return value.trim();
  }
}

export default function ComingSoonPage() {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [values, setValues] = useState<ComingSoonRegistrationInput>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ComingSoonRegistrationErrors>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  useEffect(() => {
    let isMounted = true;

    const loadRoles = async () => {
      try {
        setRolesLoading(true);
        const response = await fetch("/api/coming-soon/roles", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as { roles?: RoleOption[]; error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load role options.");
        }

        if (isMounted) {
          setRoles(payload?.roles || []);
        }
      } catch (error) {
        if (isMounted) {
          setFormError(error instanceof Error ? error.message : "Failed to load role options.");
        }
      } finally {
        if (isMounted) {
          setRolesLoading(false);
        }
      }
    };

    void loadRoles();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field: keyof ComingSoonRegistrationInput, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setFormError("");
    setSuccessMessage("");

    if (submitState === "success") {
      setSubmitState("idle");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState("submitting");
    setFormError("");
    setSuccessMessage("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/coming-soon/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          ...values,
          instagram_handle: getInstagramSubmissionValue(values.instagram_handle),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            message?: string;
            error?: string;
            fieldErrors?: ComingSoonRegistrationErrors;
          }
        | null;

      if (!response.ok) {
        setFieldErrors(payload?.fieldErrors || {});
        setFormError(payload?.error || "Failed to submit your registration.");
        setSubmitState("idle");
        return;
      }

      setValues(initialValues);
      setSuccessMessage(payload?.message || "Thanks. You are on the early interest list.");
      setSubmitState("success");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to submit your registration.");
      setSubmitState("idle");
    }
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-white via-[#faf7f2] to-[#f3efe7] text-[#0F172A]">
  <section className="relative w-full overflow-hidden min-h-[640px] sm:min-h-[680px] md:min-h-[720px] lg:min-h-[720px]">
    <div className="pointer-events-none absolute inset-y-0 right-0 w-full">
          <Image
                  src="/assets/coming-soon.png"
                  alt="Dubai skyline"
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover object-[72%_center] opacity-100 lg:object-right"
                />
          <div className="absolute inset-y-0 left-0 w-[60%] lg:w-[52%] bg-gradient-to-r from-[#faf7f2] via-[#f3efe7]/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f3efe7] via-[#f3efe7]/85 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(212,160,23,0.12),transparent_18%)]" />
        </div>

        <div className="shell relative z-10 pb-12 pt-6 lg:pb-16 xl:max-2xl:px-20 xl:max-2xl:pb-20 xl:max-2xl:pt-10">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-start gap-8">
              <Link href="/" className="relative h-12 w-[164px] shrink-0 sm:h-[48px] sm:w-[178px]">
                <Image
                  src="/assets/Logo-Blue.png"
                  alt="DXB Deal Flow"
                  fill
                  className="object-contain object-left"
                  sizes="198px"
                  priority
                />
              </Link>

              <div className="inline-flex items-center gap-3 rounded-[10px] border border-[#dfe3ea] bg-white/78 px-4 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.05)] backdrop-blur-md">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3d7c3] bg-white text-[#0a1b3a]">
                  <LockIcon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block font-heading text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0a1b3a]">
                    Private Network
                  </span>
                  <span className="mt-1 block text-[12px] text-[#5e6a7d]">For Verified Brokers Only</span>
                </span>
              </div>
            </div>

            <div className="text-left sm:pt-1 sm:text-right">
              <p className="font-heading text-[15px] font-semibold text-[#d8920b]">Launching Soon</p>
              <p className="mt-1 text-[14px] text-[#22324f]">Stay Ahead. Stay Connected.</p>
            </div>
          </header>

          <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,510px)] lg:gap-14 xl:gap-20">
            <section className="max-w-[620px] lg:pt-12">
              <div className="inline-flex rounded-full border border-[#e3ba72] bg-white/72 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.26em] text-[#d8920b] shadow-[0_10px_24px_rgba(216,146,11,0.08)]">
                Coming Soon
              </div>

              <h1 className="mt-7 font-heading text-[2rem] font-bold leading-[0.98] tracking-[-0.065em] text-[#071d41] sm:text-[3rem] lg:text-[3.8rem] xl:text-[3.70rem] flex flex-col gap-4">
                <span>Off-Market Deals.</span>
                <span>Real Connections.</span>
                <span className="text-[#d8920b]">Exclusive Access.</span>
              </h1>

              <p className="mt-7 max-w-[560px] text-[18px] leading-9 text-[#22324f]">
                DXB Deal Flow is a private platform for serious real estate professionals. Access off-market and distressed property
                deals, connect directly, and close with confidence.
              </p>

              <div className="mt-11 grid grid-cols-2 gap-y-7 sm:grid-cols-4">
                {featureCards.map((feature, index) => (
                  <FeatureCard
                    key={feature.title}
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                    hasDivider={index < featureCards.length - 1}
                  />
                ))}
              </div>

              <div className="mt-12 max-w-[560px] overflow-hidden rounded-[12px] bg-[linear-gradient(135deg,#061d3e_0%,#09264f_55%,#03152f_100%)] px-6 py-6 text-white shadow-[0_18px_36px_rgba(6,29,62,0.28)] sm:px-8">
                <div className="flex items-center gap-6">
                  <span className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full text-[#f3b51c]">
                    <LaurelIcon className="absolute inset-0 h-full w-full" />
                    <StarIcon className="h-8 w-8" />
                  </span>
                  <span>
                    <span className="block font-heading text-[20px] font-semibold tracking-[-0.04em] text-white">
                      Early Members Get More
                    </span>
                    <span className="mt-2 block max-w-[420px] text-[14px] leading-7 text-white">
                      Be the first to access exclusive deals, priority features and special founder incentives as we grow.
                    </span>
                  </span>
                </div>
              </div>
            </section>

           <section className="flex justify-center lg:justify-end">
            <div className="panel w-full max-w-[700px] p-4 pb-4 sm:p-8 sm:pb-4 lg:p-10 lg:pb-6">
              <form className="grid gap-2 sm:gap-2.5" onSubmit={handleSubmit} noValidate>
                <input
                  type="text"
                  name="website"
                  value={values.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <div className="text-center">
                  <div className="relative mx-auto h-14 w-[210px]">
                    <Image
                      src="/assets/Logo-Blue.png"
                      alt="DXB Deal Flow"
                      fill
                      className="object-contain"
                      sizes="210px"
                      priority
                    />
                  </div>
                </div>

                <div>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-brand-navy sm:text-3xl">
                    Register For Early Interest
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-slate sm:text-base sm:leading-7">
                    Be the first to know when DXB Deal Flow launches.
                  </p>
                </div>

                {successMessage ? (
                  <div className="rounded-[12px] border border-[#bfe9d1] bg-[#edf9f2] px-4 py-3 text-sm leading-6 text-[#1f8a4d]">
                    {successMessage}
                  </div>
                ) : null}

                {formError ? (
                  <div className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm leading-6 text-rose-500">
                    {formError}
                  </div>
                ) : null}

                <div className="mt-2 grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                  <TextField
                    id="coming-soon-first-name"
                    label="First Name"
                    required
                    value={values.first_name}
                    error={fieldErrors.first_name}
                    onChange={(value) => updateField("first_name", value)}
                    placeholder="First name"
                    disabled={submitState === "submitting"}
                  />

                  <TextField
                    id="coming-soon-last-name"
                    label="Last Name"
                    required
                    value={values.last_name}
                    error={fieldErrors.last_name}
                    onChange={(value) => updateField("last_name", value)}
                    placeholder="Last name"
                    disabled={submitState === "submitting"}
                  />
                </div>

                  <TextField
                    id="coming-soon-email"
                    label="Email Address"
                    required
                    type="email"
                    value={values.email}
                    error={fieldErrors.email}
                    onChange={(value) => updateField("email", value)}
                    placeholder="you@example.com"
                    disabled={submitState === "submitting"}
                  />

                  <WhatsappField
                    value={values.whatsapp_number}
                    error={fieldErrors.whatsapp_number}
                    onChange={(value) => updateField("whatsapp_number", value)}
                    disabled={submitState === "submitting"}
                  />

                
                  <InstagramHandleField
                    value={values.instagram_handle}
                    error={fieldErrors.instagram_handle}
                    onChange={(value) => updateField("instagram_handle", value)}
                    disabled={submitState === "submitting"}
                  />

                  <TextField
                    id="coming-soon-company"
                    label="Company / Agency Name"
                    required
                    value={values.company_agency_name}
                    error={fieldErrors.company_agency_name}
                    onChange={(value) => updateField("company_agency_name", value)}
                    placeholder="Enter your company name"
                    disabled={submitState === "submitting"}
                  />
            

                <div>
                  <label htmlFor="coming-soon-role" className={labelClass}>
                    Role <span className="text-rose-400">*</span>
                  </label>

                  <div className="relative">
                    <select
                      id="coming-soon-role"
                      value={values.role_id}
                      onChange={(event) => updateField("role_id", event.target.value)}
                      disabled={submitState === "submitting" || rolesLoading || !roles.length}
                      className={`${fieldBaseClass} appearance-none pr-11 ${
                        fieldErrors.role_id
                          ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200/50"
                          : ""
                      }`}
                      aria-label="Role"
                    >
                      <option value="" className="text-brand-ink">
                        {rolesLoading ? "Loading roles..." : "Select your role"}
                      </option>

                      {roles.map((role) => (
                        <option key={role.id} value={role.id} className="text-brand-ink">
                          {role.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-slate" />
                  </div>

                  <p className={errorClass}>{fieldErrors.role_id || ""}</p>
                </div>

                <button
                  type="submit"
                  disabled={submitState === "submitting" || rolesLoading || !roles.length}
                  className="btn-primary mt-1 min-h-[52px] w-full"
                >
                  {submitState === "submitting" ? "Registering..." : "Register My Interest"}
                </button>

                <div className="flex items-start justify-center gap-2 pt-1 text-center text-xs text-brand-slate sm:items-center">
                  <LockIcon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">We respect your privacy. Your details are safe with us.</span>
                </div>
              </form>
            </div>
          </section>
          </div>
        </div>
      </section>

      <section className="shell-boundary pb-7">
        <div className="px-4 sm:px-6 lg:px-8 xl:max-2xl:px-20">
          <div className="pt-3 text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-[#d8920b]">
              Real Deals. Real Value. Real Advantage.
            </p>
            <h2 className="mt-3 font-heading text-[28px] font-semibold tracking-[-0.05em] text-[#071d41] sm:text-[34px]">
              Why Brokers Use DXB Deal Flow
            </h2>
            <p className="mt-2 text-[17px] text-[#5c6980]">Off-market opportunities with better pricing and higher returns.</p>
          </div>

          <DealComparisonCard />

          <section className="mt-5 rounded-[12px] border border-[#e5e0d6] bg-white/90 px-5 py-7 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {benefitCards.map((benefit, index) => (
                <BenefitCard
                  key={benefit.title}
                  icon={benefit.icon}
                  title={benefit.title}
                  description={benefit.description}
                  hasDivider={index < benefitCards.length - 1}
                />
              ))}
            </div>
          </section>

          {/* <section className="mt-7 rounded-[12px] border border-[#e5e0d6] bg-white/90 px-4 py-8 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
            <p className="text-center text-[13px] font-semibold uppercase tracking-[0.32em] text-[#d8920b]">
              Trusted By Leading Brokers &amp; Agencies
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-y-6">
              {trustedLogos.map((logo, index) => (
                <div
                  key={logo.name}
                  className={`px-5 text-center sm:px-8 lg:px-10 ${
                    index < trustedLogos.length - 1 ? "lg:border-r lg:border-[#e6dfd2]" : ""
                  }`}
                >
                  <p className={`text-[1.6rem] leading-none text-[#14213e] sm:text-[1.9rem] ${logo.className}`}>
                    {logo.name}
                  </p>
                  {logo.subtitle ? (
                    <p className="mt-2 text-[0.64rem] font-medium uppercase tracking-[0.26em] text-[#6a7282]">
                      {logo.subtitle}
                    </p>
                  ) : (
                    <p aria-hidden="true" className="mt-2 text-[0.64rem] uppercase tracking-[0.26em] text-transparent">
                      &nbsp;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section> */}
        </div>
      </section>

      <footer className="bg-[linear-gradient(135deg,#051a37_0%,#08244d_55%,#031328_100%)] px-4 py-6 text-white shadow-[0_-20px_54px_rgba(5,26,55,0.22)] sm:px-6 xl:max-2xl:px-20">
        <div className="mx-auto flex max-w-[1540px] flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 text-white/86">
              <LockIcon className="h-4 w-4" />
            </span>
            <p className="text-[14px] leading-6 text-white">
              DXB Deal Flow is a private platform for verified real estate professionals only.
            </p>
          </div>
          <p className="text-[12px] text-white/76">&copy; 2024 DXB Deal Flow. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  type = "text",
  icon,
  helper,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
  required?: boolean;
  type?: string;
  icon?: ReactNode;
  helper?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label} {required ? <span className="text-[#d93d3d]">*</span> : null}
      </label>
      <div className="relative">
        {icon ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#e34877]">{icon}</span> : null}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${fieldBaseClass} ${icon ? "pl-10" : ""} ${
            error ? "border-[#d36a6a] focus:border-[#d36a6a] focus:ring-[#d36a6a]/10" : ""
          }`}
        />
      </div>
      {helper ? <p className="break-words text-[12px] leading-5 text-[#667187]">{helper}</p> : null}
      <p className={errorClass}>{error || ""}</p>
    </div>
  );
}

function InstagramHandleField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor="coming-soon-instagram" className={labelClass}>
        Instagram Handle
      </label>
      <div className="relative">
        <input
          id="coming-soon-instagram"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="yourhandle"
          autoComplete="off"
          disabled={disabled}
          className={`${fieldBaseClass} pl-[140px] ${
            error ? "border-[#d36a6a] focus:border-[#d36a6a] focus:ring-[#d36a6a]/10" : ""
          }`}
        />
        <InstagramIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
        <span
          className={`pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 whitespace-nowrap text-[13px] font-medium ${
            disabled ? "text-slate-500" : "text-[#667187]"
          }`}
        >
          {instagramUrlPrefix}
        </span>
      </div>
      <p className={errorClass}>{error || ""}</p>
    </div>
  );
}

function WhatsappField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor="coming-soon-whatsapp" className={labelClass}>
        WhatsApp Number <span className="text-[#d93d3d]">*</span>
      </label>
      <PhoneInput
        id="coming-soon-whatsapp"
        international
        countryCallingCodeEditable={false}
        defaultCountry="AE"
        value={(value || undefined) as PhoneNumberValue | undefined}
        onChange={(nextValue) => onChange(nextValue || "")}
        placeholder="Enter WhatsApp number"
        autoComplete="tel"
        disabled={disabled}
        className={`phone-input rounded-[6px] px-3 py-2 md:py-[9px] ${
          error ? "border-[#d36a6a] focus-within:border-[#d36a6a] focus-within:ring-[#d36a6a]/10" : ""
        }`}
      />
      <p className={errorClass}>{error || ""}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  hasDivider,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  hasDivider: boolean;
}) {
  return (
    <div className={`relative pr-4 pl-6 ${hasDivider ? "sm:border-r sm:border-[#e6d8bd]" : ""}`}>
      <Icon className="h-9 w-9 text-[#d8920b]" />
      <h3 className="mt-5 font-heading text-[16px] font-semibold leading-6 tracking-[-0.03em] text-[#071d41]">{title}</h3>
      <p className="mt-3 max-w-[130px] text-[13px] leading-6 text-[#263652]">{description}</p>
    </div>
  );
}

function DealComparisonCard() {
  return (
    <section className="mt-7 rounded-[14px] border border-[#e5e0d6] bg-white/90 p-5 shadow-[0_24px_58px_rgba(15,23,42,0.08)] md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,410px)_minmax(0,1fr)_minmax(220px,280px)]">
        <div className="overflow-hidden rounded-[12px] border border-[#e5eaf2] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <div className="relative h-[184px] overflow-hidden rounded-t-[12px]">
            <Image
              src="/assets/homepage-1.png"
              alt="Luxury villa"
              fill
              sizes="410px"
              className="object-cover"
            />
            <div className="absolute left-4 top-3 rounded-full bg-[#071d41] px-3 py-1 text-[11px] font-semibold uppercase text-white">
              Off-Market Deal
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(7,29,65,0.16)_100%)]" />
          </div>

          <div className="px-5 py-4">
            <h3 className="font-heading text-[17px] font-semibold tracking-[-0.04em] text-[#071d41]">
              Luxury Villa - Palm Jumeirah
            </h3>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[#5d6b82]">
              <span className="inline-flex items-center gap-1.5">
                <BedIcon className="h-4 w-4" /> 5 Beds
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BathIcon className="h-4 w-4" /> 7 Baths
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AreaIcon className="h-4 w-4" /> 7,100 sqft
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PinIcon className="h-4 w-4" /> Frond M, Palm Jumeirah
              </span>
            </div>
          </div>
        </div>

        <div className="grid rounded-[12px] border border-[#e5eaf2] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-2 divide-x divide-[#dfe5ee] px-5 py-6">
            <div>
              <p className="text-[13px] text-[#253754]">Market Price</p>
              <p className="mt-2 font-heading text-[20px] font-semibold tracking-[-0.04em] text-[#071d41]">AED 28,500,000</p>
              <p className="mt-1 text-[12px] text-[#6c778b]">Publicly Listed</p>
            </div>
            <div className="pl-8">
              <p className="text-[13px] text-[#253754]">Off-Market Price</p>
              <p className="mt-2 font-heading text-[20px] font-semibold tracking-[-0.04em] text-[#0a9c46]">AED 22,500,000</p>
              <p className="mt-1 text-[12px] text-[#0a9c46]">DXB Deal Flow</p>
            </div>
          </div>

          <div className="border-y border-[#e5eaf2] px-5 py-6 text-center">
            <p className="text-[13px] font-semibold text-[#0a7f39]">You Save</p>
            <p className="mt-2 font-heading text-[28px] font-semibold tracking-[-0.05em] text-[#0b6a32]">AED 6,000,000</p>
            <span className="mt-2 inline-flex rounded-full bg-[#e8faee] px-3 py-1 text-[12px] font-semibold text-[#0b7a39]">
              21% Below Market
            </span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-[#e5eaf2] sm:grid-cols-4 sm:divide-y-0">
            <Metric label="Est. Gross ROI" value="32%" />
            <Metric label="Est. Net ROI" value="24%" />
            <Metric label="Est. Rental Yield" value="8.7%" />
            <Metric label="Est. Flip Profit" value="AED 5.2M" />
          </div>
        </div>

        <div className="rounded-[12px] border border-[#dcece1] bg-[linear-gradient(135deg,#f8fffb_0%,#f1fbf4_100%)] p-6">
          <h3 className="font-heading text-[16px] font-semibold tracking-[-0.03em] text-[#0c532b]">Why This Matters</h3>
          <div className="mt-5 space-y-4 text-[13px] leading-6 text-[#2f4259]">
            {["Access deals not available on public portals", "Significant margin advantage", "Higher ROI potential", "Close faster with fewer competitors"].map(
              (item) => (
                <p key={item} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#0a7f39]" />
                  <span>{item}</span>
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4">
      <p className="text-[11px] text-[#6e788b]">{label}</p>
      <p className="mt-1 font-heading text-[18px] font-semibold tracking-[-0.04em] text-[#0a9c46]">{value}</p>
    </div>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  description,
  hasDivider,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  hasDivider: boolean;
}) {
  return (
    <div className={`flex items-center gap-5 ${hasDivider ? "xl:border-r xl:border-[#e0e5ee]" : ""}`}>
      <span className="inline-flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full border border-[#e2e7f0] bg-white text-[#d8920b] shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
        <Icon className="h-9 w-9" />
      </span>
      <span>
        <span className="block font-heading text-[16px] font-semibold tracking-[-0.03em] text-[#071d41]">{title}</span>
        <span className="mt-2 block max-w-[190px] text-[13px] leading-6 text-[#30425f]">{description}</span>
      </span>
    </div>
  );
}

function LockIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7.75C8 5.54 9.79 3.75 12 3.75C14.21 3.75 16 5.54 16 7.75V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 13V15.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 19.5h16M5.5 19.5V11l5-2.6v11.1M10.5 19.5V5.8l8-2.5v16.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13h1M8 16h1M13 8h1.5M13 11h1.5M13 14h1.5M17 7h.7M17 10h.7M17 13h.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 12.5 12.8 4.2h6.5v6.5L11 19a2.1 2.1 0 0 1-3 0l-3.5-3.5a2.1 2.1 0 0 1 0-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="16.4" cy="7.3" r="1.2" fill="currentColor" />
      <path d="M9.3 13.9 14 9.2M12.7 14.2h2.6v2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.2" cy="9.3" r="2.3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.5 18.4c.6-2.8 2.5-4.2 4.5-4.2s3.9 1.4 4.5 4.2M14.3 18.4c.4-1.7 1.6-2.8 3.2-3.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3.3 18.4 5.8v4.9c0 4.7-2.8 8.2-6.4 10-3.6-1.8-6.4-5.3-6.4-10V5.8L12 3.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.3 12.1 11.1 13.9 14.8 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LaurelIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <path d="M24 60C13.5 52 11 38 18 25M56 60c10.5-8 13-22 6-35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 55c-5-1-8-4-9-8 5 0 8 2 9 8ZM18 45c-4.5-2-6.5-5.5-6-9.5 4.5 1 7 4 6 9.5ZM19 34c-3.5-3-4.3-7-2.4-10.5 3.7 2 5.2 5.6 2.4 10.5ZM60 55c5-1 8-4 9-8-5 0-8 2-9 8ZM62 45c4.5-2 6.5-5.5 6-9.5-4.5 1-7 4-6 9.5ZM61 34c3.5-3 4.3-7 2.4-10.5-3.7 2-5.2 5.6-2.4 10.5Z" fill="currentColor" />
    </svg>
  );
}

function StarIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="m12 2.9 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 2.9Z" />
    </svg>
  );
}

function InstagramIcon({ className = "h-6 w-6" }: IconProps) {
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

function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoneyIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 8.4 6.7 5.2h10.6l-1.8 3.2M5.5 14.3c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5c0 3.8-2.3 5.5-6.5 5.5s-6.5-1.7-6.5-5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 11.2v6M14.2 12.4c-.3-.7-1-1.2-2.1-1.2-1.2 0-2 .6-2 1.4 0 2.1 4.2.8 4.2 3 0 .9-.9 1.5-2.2 1.5-1.1 0-1.9-.5-2.3-1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.7v4.6l3 1.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BedIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 8.2h13a2 2 0 0 1 2 2v4.3h-17v-6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 14.5V16M16.5 14.5V16M4.5 8.2V5.5h5v2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BathIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 9.2h12v1.7a4.6 4.6 0 0 1-4.6 4.6H9.1a4.6 4.6 0 0 1-4.6-4.6V9.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.2 9.2V5.8a2.3 2.3 0 0 1 4.6 0M8.6 15.5 7.8 17M13.2 15.5l.8 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AreaIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4 4h5v5H4V4ZM11 4h5v5h-5V4ZM4 11h5v5H4v-5ZM11 11h5v5h-5v-5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 17s5-4.1 5-8.2A5 5 0 0 0 5 8.8C5 12.9 10 17 10 17Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="8.8" r="1.7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="m4.7 10.2 3.2 3.2 7.4-7.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
