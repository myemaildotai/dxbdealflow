"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { EarlyAccessLeadErrors, EarlyAccessLeadInput, validateEarlyAccessLeadInput } from "@/lib/early-access";

type SubmitState = "idle" | "submitting" | "success";

const initialValues: EarlyAccessLeadInput = {
  name: "",
  email: "",
  whatsapp_number: "",
};

const accessHighlights = [
  {
    audience: "Public Users",
    message: "Fresh launch preview",
  },
  {
    audience: "Brokers",
    message: "Workspace access resumes soon",
  },
  {
    audience: "Admins",
    message: "Operations stay available",
  },
];

const launchPreviewUnits = ["Days", "Hours", "Minutes", "Seconds"];

const skylineBars = [
  { heightClass: "h-16", widthClass: "w-10" },
  { heightClass: "h-24", widthClass: "w-12" },
  { heightClass: "h-32", widthClass: "w-14" },
  { heightClass: "h-20", widthClass: "w-10" },
  { heightClass: "h-40", widthClass: "w-16" },
  { heightClass: "h-28", widthClass: "w-12" },
  { heightClass: "h-48", widthClass: "w-16" },
  { heightClass: "h-24", widthClass: "w-11" },
  { heightClass: "h-36", widthClass: "w-14" },
  { heightClass: "h-20", widthClass: "w-10" },
  { heightClass: "h-44", widthClass: "w-16" },
  { heightClass: "h-28", widthClass: "w-12" },
];

export function ComingSoonLeadCapture() {
  const searchParams = useSearchParams();
  const resolvedSearchParams = useMemo(() => searchParams ?? new URLSearchParams(), [searchParams]);
  const { user } = useAuth();
  const [values, setValues] = useState<EarlyAccessLeadInput>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<EarlyAccessLeadErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const redirectedFrom = useMemo(() => resolvedSearchParams.get("from"), [resolvedSearchParams]);

  const handleChange = (field: keyof EarlyAccessLeadInput, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateEarlyAccessLeadInput(values);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      
      return;
    }

    setSubmitState("submitting");
    setFormError("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/early-access-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(validation.values),
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string; error?: string; fieldErrors?: EarlyAccessLeadErrors }
        | null;

      if (!response.ok) {
        setFieldErrors(payload?.fieldErrors || {});
        setFormError(payload?.error || "Failed to submit your details.");
        setSubmitState("idle");
        return;
      }

      setValues(initialValues);
      setSuccessMessage(payload?.message || "Thanks. You are on the early access list.");
      setSubmitState("success");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to submit your details.");
      setSubmitState("idle");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#08101D_42%,#0B1A2B_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_30%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.18),transparent_24%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_22%,transparent_76%,rgba(2,6,23,0.72)_100%)]" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-64 items-end justify-between gap-2 px-4 opacity-70 sm:flex md:px-10"
      >
        {skylineBars.map((bar, index) => (
          <div
            key={`${bar.heightClass}-${index}`}
            className={`relative flex items-end overflow-hidden rounded-t-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] shadow-[0_0_40px_rgba(212,175,55,0.06)] ${bar.heightClass} ${bar.widthClass}`}
          >
            <div className="mx-auto mb-3 h-[72%] w-[68%] rounded-t-[16px] bg-[repeating-linear-gradient(180deg,rgba(212,175,55,0.22)_0,rgba(212,175,55,0.22)_1px,transparent_1px,transparent_12px),repeating-linear-gradient(90deg,rgba(212,175,55,0.2)_0,rgba(212,175,55,0.2)_1px,transparent_1px,transparent_10px)] opacity-55" />
          </div>
        ))}
      </div>

      <div className="shell relative z-10 flex min-h-screen flex-col pb-10 pt-6">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_20px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(212,175,55,0.3),rgba(212,175,55,0.08))] text-sm font-bold tracking-[0.3em] text-[#F5E4A0] shadow-[0_12px_32px_rgba(212,175,55,0.12)]">
              DX
            </div>
            <div>
              <p className="text-base font-semibold text-white sm:text-lg">Deal Exchange Platform</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Private Release</p>
            </div>
          </Link>

          {user?.role === "admin" ? (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:border-[#D4AF37]/40 hover:bg-white/10 hover:text-[#F5E4A0]"
            >
              Back to Admin
            </Link>
          ) : (
            <Link
              href="/login?adminOnly=1"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:border-[#D4AF37]/40 hover:bg-white/10 hover:text-[#F5E4A0]"
            >
              Admin Sign In
            </Link>
          )}
        </header>

        <main className="flex flex-1 items-center py-10 lg:py-16">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
            <section className="relative">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#F3DE93]">
                <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                DXB Deal Flow
              </div>

              <h1 className="mt-6 max-w-3xl text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-6xl">
                A{" "}
                <span className="bg-[linear-gradient(135deg,#F5E4A0_0%,#D4AF37_45%,#F7D770_100%)] bg-clip-text text-transparent">
                  sharper exchange experience
                </span>{" "}
                is on the way.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
                We are temporarily limiting platform access while the next release is being prepared. Join the early access list and we
                will notify you when the public and broker workflows reopen.
              </p>

              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">Launch Window</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  {launchPreviewUnits.map((unit) => (
                    <div
                      key={unit}
                      className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
                    >
                      <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">--</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.28em] text-gray-500">{unit}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-500">Launch timing will be announced with the next access wave.</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {accessHighlights.map((item) => (
                  <div
                    key={item.audience}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_12px_30px_rgba(2,6,23,0.18)] backdrop-blur-xl"
                  >
                    <div className="h-10 w-10 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">{item.audience}</p>
                    <p className="mt-3 text-lg font-semibold leading-7 text-white">{item.message}</p>
                  </div>
                ))}
              </div>

              {redirectedFrom ? (
                <div className="mt-8 max-w-xl rounded-2xl border border-[#D4AF37]/20 bg-white/[0.06] p-5 shadow-[0_18px_40px_rgba(2,6,23,0.24)] backdrop-blur-xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Current status</p>
                  <p className="mt-3 text-sm leading-7 text-gray-300">
                    Access is temporarily restricted while maintenance mode is active.
                  </p>
                </div>
              ) : null}
            </section>

            <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1A2B]/80 p-6 shadow-[0_30px_80px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-8">
              <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.8),transparent)]" />
              <div className="absolute -right-16 top-12 h-36 w-36 rounded-full bg-[#D4AF37]/10 blur-3xl" />
              <div className="absolute -left-16 bottom-12 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Early Access</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Get notified first</h2>
                <p className="mt-3 text-sm leading-7 text-gray-400">
                  Leave your details and we will reach out when the platform is ready for the next intake.
                </p>

                {successMessage ? (
                  <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                    {successMessage}
                  </div>
                ) : null}

                {formError ? (
                  <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{formError}</div>
                ) : null}

                <form className="mt-5 grid gap-3 sm:mt-6 sm:gap-5" onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-2">
                    <label htmlFor="coming-soon-name" className="text-sm font-medium text-gray-200">
                      Name
                    </label>
                    <input
                      id="coming-soon-name"
                      className={`h-11 w-full rounded-md border bg-white/10 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-400 focus:border-[#D4AF37]/60 focus:ring-2 focus:ring-[#D4AF37]/30 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:rounded-xl sm:px-4 ${
                        fieldErrors.name ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-500/20" : "border-white/15"
                      }`}
                      value={values.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Your full name"
                      disabled={submitState === "submitting"}
                    />
                    {fieldErrors.name ? <p className="break-words text-sm text-rose-300">{fieldErrors.name}</p> : null}
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="coming-soon-email" className="text-sm font-medium text-gray-200">
                      Email
                    </label>
                    <input
                      id="coming-soon-email"
                      type="email"
                      className={`h-11 w-full rounded-md border bg-white/10 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-400 focus:border-[#D4AF37]/60 focus:ring-2 focus:ring-[#D4AF37]/30 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:rounded-xl sm:px-4 ${
                        fieldErrors.email ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-500/20" : "border-white/15"
                      }`}
                      value={values.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      placeholder="name@example.com"
                      disabled={submitState === "submitting"}
                    />
                    {fieldErrors.email ? <p className="break-words text-sm text-rose-300">{fieldErrors.email}</p> : null}
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="coming-soon-whatsapp" className="text-sm font-medium text-gray-200">
                      WhatsApp Number
                    </label>
                    <input
                      id="coming-soon-whatsapp"
                      type="tel"
                      className={`h-11 w-full rounded-md border bg-white/10 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-400 focus:border-[#D4AF37]/60 focus:ring-2 focus:ring-[#D4AF37]/30 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:rounded-xl sm:px-4 ${
                        fieldErrors.whatsapp_number
                          ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-500/20"
                          : "border-white/15"
                      }`}
                      value={values.whatsapp_number}
                      onChange={(event) => handleChange("whatsapp_number", event.target.value)}
                      placeholder="+91 98765 43210"
                      disabled={submitState === "submitting"}
                    />
                    {fieldErrors.whatsapp_number ? <p className="break-words text-sm text-rose-300">{fieldErrors.whatsapp_number}</p> : null}
                  </div>

                  <button
                    type="submit"
                    className="h-11 w-full rounded-md bg-[linear-gradient(135deg,#F5D86D_0%,#D4AF37_55%,#C9A227_100%)] px-3 py-2 text-sm font-semibold text-[#08101D] transition duration-200 hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(212,175,55,0.24)] disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:rounded-xl"
                    disabled={submitState === "submitting"}
                  >
                    {submitState === "submitting" ? "Submitting..." : "Join Early Access"}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-gray-400">
                  We only store your name, email, and WhatsApp number so the team can contact you about launch access.
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="mt-auto pt-4 text-center text-xs text-gray-500">
          Privacy-first access updates for the next release wave. Admin operations remain available during maintenance windows.
        </footer>
      </div>
    </div>
  );
}
