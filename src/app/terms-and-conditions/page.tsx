import { PublicHeader } from "@/components/PublicHeader";

const sections = [
  {
    title: "Eligibility",
    body:
      "Platform access is intended for licensed brokers and approved users only. By applying, you confirm that your registration details are accurate and that you are authorized to use the service.",
  },
  {
    title: "Broker Responsibilities",
    body:
      "You remain responsible for compliance with applicable laws, regulations, licensing rules, and advertising or deal-sharing requirements, including any RERA or Trakheesi obligations that apply to your activity.",
  },
  {
    title: "Acceptable Use",
    body:
      "You must not upload sensitive personal documents, misrepresent listings or credentials, misuse another party's information, scrape the platform, or use the service for unlawful, misleading, or abusive conduct.",
  },
  {
    title: "Access And Approval",
    body:
      "Applications may be approved, rejected, suspended, or revoked at the platform's discretion. Verification checks and admin review may be used before or after access is granted.",
  },
  {
    title: "Communications",
    body:
      "If you opt in, the platform may send deal-related updates and service communications using the contact details provided during registration.",
  },
];

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="shell page-section">
        <div className="panel mx-auto max-w-4xl p-5 sm:p-8 lg:p-10">
          <p className="page-kicker text-brand-gold">Terms &amp; Conditions</p>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl md:text-4xl">Broker platform use terms</h1>
          <p className="mt-4 max-w-3xl legal-copy">
            These terms summarize the core conditions for using the broker application and deal exchange experience. They can be expanded later with
            final legal language specific to the business.
          </p>

          <div className="mt-8 space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="subtle-panel p-4 sm:p-5">
                <h2 className="font-heading text-lg font-semibold text-brand-ink">{section.title}</h2>
                <p className="mt-2 legal-copy">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
