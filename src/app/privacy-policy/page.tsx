import { PublicHeader } from "@/components/PublicHeader";

const sections = [
  {
    title: "Information We Collect",
    body:
      "We collect the information you submit during registration, including your name, email address, phone number, agency details, broker registration details, covered areas, experience details, profile photo, and application preferences.",
  },
  {
    title: "How We Use Information",
    body:
      "We use your information to review broker applications, verify registration details, manage access to the platform, communicate service updates, and operate broker-to-broker deal exchange features.",
  },
  {
    title: "Sharing And Verification",
    body:
      "Application details may be checked against official broker verification sources and may be visible to platform administrators for approval, moderation, support, and compliance purposes.",
  },
  {
    title: "Storage And Retention",
    body:
      "Submitted data is stored in our platform systems and retained as long as reasonably necessary to operate the service, meet security needs, resolve disputes, and satisfy legal or compliance obligations.",
  },
  {
    title: "Your Choices",
    body:
      "You may contact the platform team to request updates to your account information or ask questions about how your application data is handled.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="shell page-section">
        <div className="panel mx-auto max-w-4xl p-5 sm:p-8 lg:p-10">
          <p className="page-kicker text-brand-gold">Privacy Policy</p>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl md:text-4xl">How broker application data is handled</h1>
          <p className="mt-4 max-w-3xl legal-copy">
            This page summarizes how application and account information is used on the platform. It should be replaced or supplemented with final
            counsel-approved policy language if required by your business.
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
