"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authOperations } from "@/auth/authOperations";
import { useAuth } from "@/auth/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PublicHeader } from "@/components/PublicHeader";
import {
  BrokerStatusPageStatus,
  getBrokerStatusRedirectPath,
  getDefaultRouteForUser,
  isBlockedBrokerStatus,
  isBrokerStatusPageStatus,
} from "@/lib/route-access";

type IconProps = {
  className?: string;
};

function HourglassIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 3h10M7 21h10M8 3v4.2c0 .8.32 1.56.88 2.12L11.56 12l-2.68 2.68A3 3 0 0 0 8 16.8V21M16 3v4.2a3 3 0 0 1-.88 2.12L12.44 12l2.68 2.68A3 3 0 0 1 16 16.8V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 7h4M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 4.5h5.2L17 8.3v11.2H8V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 4.7V8.5h3.8M10.5 12h3M10.5 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m16.5 16.5 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3.5 18 6v5.1c0 3.8-2.44 7.2-6 8.4-3.56-1.2-6-4.6-6-8.4V6l6-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9.4 12 1.7 1.7 3.8-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserCheckIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9.5 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 18.5c.58-2.7 2.52-4.25 5-4.25 1.16 0 2.2.34 3.03.98" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m14.4 16.3 1.7 1.7 3.4-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.3l2.7 1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 7h14v10H5V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m6 8 6 5 6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m5 11 7-6 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10.5V19h10v-8.5M10 19v-4h4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m10 7 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type StatusStep = {
  title: string;
  detail: string;
  status: "complete" | "current" | "pending";
  icon: (props: IconProps) => JSX.Element;
};

type StatusInfoCard = {
  title: string;
  description: string;
  icon: (props: IconProps) => JSX.Element;
};

type StatusPageContent = {
  badge: string;
  headlineBefore: string;
  headlineAccent: string;
  headlineAfter?: string;
  description: string;
  finalTitle: string;
  finalDescription: string;
  badgeClassName: string;
  accentTextClassName: string;
  currentStepClassName: string;
  currentStepTextClassName: string;
  finalPanelClassName: string;
  finalIconClassName: string;
  finalTitleClassName: string;
  steps: StatusStep[];
  infoCards: StatusInfoCard[];
};

const pendingReviewSteps: StatusStep[] = [
  {
    title: "Application Submitted",
    detail: "Completed",
    status: "complete",
    icon: DocumentIcon,
  },
  {
    title: "Under Review",
    detail: "In Progress",
    status: "current",
    icon: SearchIcon,
  },
  {
    title: "Account Active",
    detail: "Pending",
    status: "pending",
    icon: ShieldIcon,
  },
] as const;

const pendingInfoCards: StatusInfoCard[] = [
  {
    title: "What's happening?",
    description: "Our admin team is verifying your broker details, license and documents.",
    icon: UserCheckIcon,
  },
  {
    title: "Typical review time",
    description: "Most applications are reviewed within 24-48 business hours.",
    icon: ClockIcon,
  },
  {
    title: "What's next?",
    description: "You'll receive an email once your account is approved and ready to access.",
    icon: MailIcon,
  },
] as const;

const statusPageContent: Record<BrokerStatusPageStatus, StatusPageContent> = {
  pending: {
    badge: "Account Under Review",
    headlineBefore: "Your broker dashboard is currently",
    headlineAccent: "under review",
    description:
      "Thanks for applying! Your account has been created successfully and our team is now reviewing your details. You'll be notified by email once your account is fully approved.",
    finalTitle: "Thank you for your patience.",
    finalDescription: "We take security and compliance seriously to keep our network trustworthy.",
    badgeClassName:
      "border-[#f4dfa8] bg-[#fff8ea] text-[#c98806] shadow-[0_8px_18px_rgba(212,175,55,0.08)]",
    accentTextClassName: "text-[#c78906]",
    currentStepClassName: "border-[#f0d283] bg-[#fff7df] text-[#c88906]",
    currentStepTextClassName: "text-[#c88906]",
    finalPanelClassName: "border-[#dce9ff] bg-[#f5f9ff]",
    finalIconClassName: "bg-[#e5f0ff] text-[#3176df]",
    finalTitleClassName: "text-[#14346b]",
    steps: pendingReviewSteps,
    infoCards: pendingInfoCards,
  },
  rejected: {
    badge: "Application Not Approved",
    headlineBefore: "Your broker access was",
    headlineAccent: "not approved",
    description:
      "Your application has been reviewed and is not approved for broker workspace access. You can contact support if you think this needs another review.",
    finalTitle: "Broker workspace access is unavailable.",
    finalDescription: "You can still browse public listings while your account is in this status.",
    badgeClassName:
      "border-[#efc9c2] bg-[#fff4f1] text-[#b85546] shadow-[0_8px_18px_rgba(184,85,70,0.08)]",
    accentTextClassName: "text-[#b85546]",
    currentStepClassName: "border-[#efc9c2] bg-[#fff4f1] text-[#b85546]",
    currentStepTextClassName: "text-[#b85546]",
    finalPanelClassName: "border-[#f0d3cd] bg-[#fff7f5]",
    finalIconClassName: "bg-[#fde7e2] text-[#b85546]",
    finalTitleClassName: "text-[#8f3f35]",
    steps: [
      { title: "Application Submitted", detail: "Completed", status: "complete", icon: DocumentIcon },
      { title: "Review Complete", detail: "Not Approved", status: "current", icon: SearchIcon },
      { title: "Account Active", detail: "Unavailable", status: "pending", icon: ShieldIcon },
    ],
    infoCards: [
      {
        title: "What's happening?",
        description: "Your submitted broker details were reviewed and did not meet the current access criteria.",
        icon: UserCheckIcon,
      },
      {
        title: "Can I reapply?",
        description: "Contact support if your details have changed or you need the decision reviewed.",
        icon: ClockIcon,
      },
      {
        title: "What's next?",
        description: "Our team can share next steps by email if another review is available.",
        icon: MailIcon,
      },
    ],
  },
  deactivated: {
    badge: "Account Deactivated",
    headlineBefore: "Your broker dashboard is currently",
    headlineAccent: "deactivated",
    description:
      "This broker account is currently deactivated, so dashboard access and broker tools are unavailable. Contact support if you need help restoring access.",
    finalTitle: "Broker access is paused.",
    finalDescription: "Your public browsing experience remains available, but broker workspace features are disabled.",
    badgeClassName:
      "border-[#d8dfeb] bg-[#f6f8fb] text-[#5d6c88] shadow-[0_8px_18px_rgba(93,108,136,0.08)]",
    accentTextClassName: "text-[#5d6c88]",
    currentStepClassName: "border-[#d8dfeb] bg-[#f6f8fb] text-[#5d6c88]",
    currentStepTextClassName: "text-[#5d6c88]",
    finalPanelClassName: "border-[#dfe5ef] bg-[#f8fafc]",
    finalIconClassName: "bg-[#eef2f7] text-[#5d6c88]",
    finalTitleClassName: "text-[#344155]",
    steps: [
      { title: "Account Created", detail: "Completed", status: "complete", icon: DocumentIcon },
      { title: "Access Deactivated", detail: "Current", status: "current", icon: SearchIcon },
      { title: "Account Active", detail: "Paused", status: "pending", icon: ShieldIcon },
    ],
    infoCards: [
      {
        title: "What's happening?",
        description: "Your broker account is no longer active for platform workspace access.",
        icon: UserCheckIcon,
      },
      {
        title: "Need access?",
        description: "Contact support so the team can review whether the account can be restored.",
        icon: ClockIcon,
      },
      {
        title: "What's next?",
        description: "You'll receive an update if your access status changes.",
        icon: MailIcon,
      },
    ],
  },
  suspended: {
    badge: "Account Not Active",
    headlineBefore: "Your broker dashboard is currently",
    headlineAccent: "paused",
    description:
      "This broker account is not active, so dashboard access and broker tools are unavailable. Contact support if you need help with your account status.",
    finalTitle: "Broker workspace access is paused.",
    finalDescription: "Your account must be active before broker routes and tools become available again.",
    badgeClassName:
      "border-[#d8dfeb] bg-[#f6f8fb] text-[#5d6c88] shadow-[0_8px_18px_rgba(93,108,136,0.08)]",
    accentTextClassName: "text-[#5d6c88]",
    currentStepClassName: "border-[#d8dfeb] bg-[#f6f8fb] text-[#5d6c88]",
    currentStepTextClassName: "text-[#5d6c88]",
    finalPanelClassName: "border-[#dfe5ef] bg-[#f8fafc]",
    finalIconClassName: "bg-[#eef2f7] text-[#5d6c88]",
    finalTitleClassName: "text-[#344155]",
    steps: [
      { title: "Account Created", detail: "Completed", status: "complete", icon: DocumentIcon },
      { title: "Access Paused", detail: "Current", status: "current", icon: SearchIcon },
      { title: "Account Active", detail: "Paused", status: "pending", icon: ShieldIcon },
    ],
    infoCards: [
      {
        title: "What's happening?",
        description: "Your broker account is not active for platform workspace access.",
        icon: UserCheckIcon,
      },
      {
        title: "Need access?",
        description: "Contact support so the team can review the account status.",
        icon: ClockIcon,
      },
      {
        title: "What's next?",
        description: "You'll receive an update if your access status changes.",
        icon: MailIcon,
      },
    ],
  },
};

export default function PendingPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Checking account status..." />}>
      <PendingPageContent />
    </Suspense>
  );
}

function PendingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const requestedStatus = useMemo(() => {
    const status = searchParams?.get("status");
    return isBrokerStatusPageStatus(status) ? status : null;
  }, [searchParams]);
  const userStatus = user?.role === "broker" && isBrokerStatusPageStatus(user.status) ? user.status : null;
  const pageStatus = requestedStatus || userStatus || "pending";
  const content = statusPageContent[pageStatus];

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user?.role === "broker" && isBlockedBrokerStatus(user.status)) {
      if (!requestedStatus) {
        router.replace(getBrokerStatusRedirectPath(user.status));
      }

      void authOperations.signOut().catch(() => undefined);
      return;
    }

    if (!user && !requestedStatus) {
      router.replace("/login");
      return;
    }

    if (user?.role === "admin") {
      router.replace("/admin");
      return;
    }

    if (user?.status && (user.status === "active" || user.status === "approved")) {
      router.replace(getDefaultRouteForUser(user));
    }
  }, [loading, requestedStatus, router, user]);

  if ((loading || !user) && !requestedStatus) {
    return <LoadingScreen label="Checking account status..." />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f8fafc] bg-[url('/assets/Login-Register-page-background.png')] bg-cover bg-center bg-no-repeat before:pointer-events-none before:absolute before:inset-0 before:bg-white/80 before:content-['']">
  <PublicHeader forceGuestState />

  <main className="relative z-10 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-6 sm:min-h-[calc(100dvh-4rem)] sm:px-6 sm:py-8 lg:min-h-[calc(100dvh-76px)] lg:py-11">
    <div className="w-full max-w-[770px] lg:max-w-[850px]">
      <section className="w-full rounded-[14px] border border-[#e6ebf3]/90 bg-white/95 px-3 pb-4 pt-4 text-center shadow-[0_24px_70px_rgba(15,42,95,0.14)] ring-1 ring-white/80 backdrop-blur-xl sm:px-6 sm:pb-5 sm:pt-5 md:px-8 lg:rounded-[16px] lg:px-9 lg:pb-6 lg:pt-6">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] sm:text-[10px] lg:gap-2 lg:px-3.5 lg:py-1.5 lg:text-[11px] ${content.badgeClassName}`}>
          <HourglassIcon className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
          {content.badge}
        </span>

        <h1 className="mx-auto mt-4 max-w-[510px] font-heading text-[23px] font-bold leading-[1.16] tracking-[-0.02em] text-[#102b5f] sm:text-[28px] md:text-[30px] lg:mt-5 lg:max-w-[560px] lg:text-[33px]">
          {content.headlineBefore} <span className={content.accentTextClassName}>{content.headlineAccent}</span>
          {content.headlineAfter ? ` ${content.headlineAfter}` : ""}
        </h1>

        <p className="mx-auto mt-3 max-w-[505px] text-[12px] font-medium leading-5 text-[#64728a] sm:text-[13px] sm:leading-[1.7] lg:mt-3.5 lg:max-w-[555px] lg:text-[14px] lg:leading-[1.75]">
          {content.description}
        </p>

        <div className="relative mx-auto mt-6 w-full max-w-[535px] sm:mt-7 lg:mt-8 lg:max-w-[590px]">
          <div className="absolute left-[16.66%] right-1/2 top-[21px] hidden border-t border-dashed border-[#d9aa31] sm:block lg:top-[24px]" />
          <div className="absolute left-1/2 right-[16.66%] top-[21px] hidden border-t border-dashed border-[#dfe6f0] sm:block lg:top-[24px]" />

          <div className="grid gap-3 sm:grid-cols-3 sm:gap-0">
            {content.steps.map((step) => {
              const StepIcon = step.icon;
              const isCurrent = step.status === "current";

              return (
                <div
                  key={step.title}
                  className="relative flex items-center gap-3 rounded-[10px] border border-[#e8eef6] bg-[#fbfdff] px-3 py-2.5 text-left sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:text-center lg:gap-3.5 lg:rounded-[11px] lg:px-3.5 lg:py-3"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={`relative z-10 mx-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-[0_10px_22px_rgba(15,42,95,0.08)] sm:mx-auto sm:h-[44px] sm:w-[44px] lg:h-[49px] lg:w-[49px] ${
                      isCurrent ? content.currentStepClassName : "border-[#dce5f1] bg-[#f5f8fc] text-[#536783]"
                    }`}
                  >
                    <StepIcon className="h-[22px] w-[22px] sm:h-5 sm:w-5 lg:h-[28px] lg:w-[28px]" />
                  </span>
                  <div className="min-w-0 sm:mt-3 lg:mt-3.5">
                    <p className="text-[11px] font-bold leading-4 text-[#102b5f] sm:text-[10px] md:text-[11px] lg:text-[12px] lg:leading-5">{step.title}</p>
                    <p className={`mt-0.5 text-[10px] font-medium sm:text-[10px] lg:mt-1 lg:text-[11px] ${isCurrent ? content.currentStepTextClassName : "text-[#8490a3]"}`}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid overflow-hidden rounded-[10px] border border-[#e7edf5] bg-white/95 text-left shadow-[0_10px_24px_rgba(15,42,95,0.04)] sm:mt-6 sm:grid-cols-3 lg:mt-7 lg:rounded-[11px]">
          {content.infoCards.map((card, index) => {
            const CardIcon = card.icon;

            return (
              <article
                key={card.title}
                className={`flex min-w-0 items-start gap-3 px-3.5 py-3 lg:gap-3.5 lg:px-4 lg:py-3.5 ${
                  index > 0 ? "border-t border-[#e7edf5] sm:border-l sm:border-t-0" : ""
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2f6ff] text-[#315da2] lg:h-9 lg:w-9">
                  <CardIcon className="h-6 w-6 lg:h-[26px] lg:w-[26px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-sans text-[11px] font-bold leading-4 tracking-normal text-[#102b5f] lg:text-[12px] lg:leading-5">{card.title}</h2>
                  <p className="mt-1 text-[10px] font-medium leading-4 text-[#64728a] lg:text-[11px] lg:leading-[18px]">{card.description}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className={`mt-4 flex items-start gap-3 rounded-[9px] border px-4 py-3 text-left sm:items-center sm:px-5 sm:py-4 lg:mt-5 lg:gap-3.5 lg:rounded-[10px] lg:px-5.5 lg:py-4.5 ${content.finalPanelClassName}`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full lg:h-11 lg:w-11 ${content.finalIconClassName}`}>
            <ShieldIcon className="h-6 w-6 lg:h-[30px] lg:w-[30px]" />
          </span>
          <div className="min-w-0">
            <p className={`text-[12px] font-bold lg:text-[13px] ${content.finalTitleClassName}`}>{content.finalTitle}</p>
            <p className="mt-1 text-[11px] font-medium leading-4 text-[#566782] lg:text-[12px] lg:leading-5">{content.finalDescription}</p>
          </div>
        </div>
      </section>

      <div className="mt-4 flex justify-center sm:mt-5 lg:mt-6">
        <Link
          href="/"
          className="inline-flex min-h-[44px] min-w-[158px] items-center justify-center gap-2 rounded-[9px] border border-[#6aa8f2] bg-white/90 px-5 text-[12px] font-bold text-[#143f79] shadow-[0_12px_24px_rgba(49,118,223,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#3176df] hover:bg-white sm:min-h-[46px] sm:min-w-[170px] lg:min-h-[51px] lg:min-w-[187px] lg:rounded-[10px] lg:px-6 lg:text-[13px]"
        >
          <HomeIcon className="h-5 w-5 lg:h-[28px] lg:w-[28px]" />
          Back to Home
        </Link>
      </div>

      <p className="mt-4 text-center text-[12px] font-medium text-[#64728a] lg:mt-5 lg:text-[13px]">
        Need help?{" "}
        <a href="mailto:support@dxbdealflow.com?subject=Broker%20Verification%20Support" className="inline-flex items-center gap-1 font-bold text-[#2f67b1] transition hover:text-[#143f79]">
          Contact Support
          <ChevronRightIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
        </a>
      </p>
    </div>
  </main>
</div>
  );
}
