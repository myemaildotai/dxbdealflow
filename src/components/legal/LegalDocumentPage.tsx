import Image from "next/image";
import { PublicHeader } from "@/components/PublicHeader";
import type { LegalBlock, LegalInline, LegalPageContent } from "@/lib/legal-content";

function getInlineText(content: LegalInline[]) {
  return content.map((item) => item.text).join("");
}

function renderInline(content: LegalInline[]) {
  return content.map((item, index) =>
    item.bold ? (
      <strong key={`${item.text}-${index}`} className="font-semibold text-[#0F2A5F]">
        {item.text}
      </strong>
    ) : (
      <span key={`${item.text}-${index}`}>{item.text}</span>
    ),
  );
}

function LegalContentBlock({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "eyebrow":
      return (
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#D4A017]">
          {renderInline(block.content)}
        </p>
      );

    case "title":
      return (
        <h1 className="font-heading text-[2rem] font-bold leading-tight tracking-[-0.05em] text-[#0F2A5F] sm:text-[2.65rem] lg:text-[2.6rem]">
          {renderInline(block.content)}
        </h1>
      );

    case "heading":
      return (
        <h2 className="mt-10 border-t border-[#E7DEC9] pt-8 font-heading text-2xl font-semibold leading-snug tracking-[-0.04em] text-[#0F2A5F] sm:text-3xl">
          {renderInline(block.content)}
        </h2>
      );

    case "subheading":
      return (
        <h3 className="mt-6 font-heading text-lg font-semibold leading-8 tracking-[-0.03em] text-[#0F2A5F] sm:text-xl">
          {renderInline(block.content)}
        </h3>
      );

    case "paragraph":
      return (
        <p className="mt-4 text-[0.95rem] leading-8 text-[#263652] sm:text-base sm:leading-8">
          {renderInline(block.content)}
        </p>
      );

    case "lines":
      return (
        <div className="mt-5 grid gap-2 border-l-2 border-[#D4A017] pl-4 text-[0.95rem] leading-7 text-[#263652] sm:grid-cols-2 sm:text-base">
          {block.lines.map((line, index) => (
            <p key={`${getInlineText(line)}-${index}`}>{renderInline(line)}</p>
          ))}
        </div>
      );

    case "list":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[0.95rem] leading-8 text-[#263652] marker:text-[#D4A017] sm:text-base">
          {block.items.map((item, index) => (
            <li key={`${getInlineText(item)}-${index}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );

    case "symbolList":
      return (
        <ul className="mt-4 space-y-2 text-[0.95rem] leading-8 text-[#263652] sm:text-base">
          {block.items.map((item, index) => (
            <li key={`${getInlineText(item)}-${index}`} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {block.symbol}
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
  }
}

export function LegalDocumentPage({ content }: { content: LegalPageContent }) {
  const titleBlock = content.blocks.find((block) => block.type === "title");
  const title = titleBlock?.type === "title" ? getInlineText(titleBlock.content) : content.label;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-white via-[#faf7f2] to-[#f3efe7] text-[#0F172A]">
      <PublicHeader />

      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] overflow-hidden sm:h-[420px]">
          <Image
            src="/assets/city.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-20 sm:opacity-25"
          />
        </div>

        <section className="shell p-0 relative z-10 lg:py-14 xl:max-2xl:px-20">
          <article
            aria-label={title}
            className="mx-auto w-full max-w-[980px] border border-[#E7DEC9] px-5 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] bg-[#fbf9f5] sm:px-8 sm:py-9 lg:px-12 lg:py-12"
          >
            {content.blocks.map((block, index) => (
              <LegalContentBlock key={`${block.type}-${index}`} block={block} />
            ))}
          </article>
        </section>
      </main>
    </div>
  );
}
