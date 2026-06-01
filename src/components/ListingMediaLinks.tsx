import { cn } from "@/lib/deal-utils";
import { getListingMediaPreview } from "@/lib/listing-media";

type ListingMediaLinksProps = {
  url: string | null | undefined;
  previewUrl?: string | null | undefined;
  editable?: boolean;
  inputId?: string;
  onUrlChange?: (value: string) => void;
  onPreviewClick?: () => void;
  className?: string;
};

function PreviewFrame({ url, compact = false }: { url: string; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#dbe4ef] bg-white shadow-[0_18px_34px_rgba(15,42,95,0.08)]">
      <iframe
        src={url}
        title="Property video preview"
        className={cn("w-full border-0 bg-[#eef3f8]", compact ? "aspect-[16/8.6]" : "aspect-[16/8.9]")}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function DirectVideoPreview({ url, compact = false }: { url: string; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#dbe4ef] bg-[#091a36] shadow-[0_18px_34px_rgba(15,42,95,0.08)]">
      <video className={cn("w-full", compact ? "aspect-[16/8.6]" : "aspect-[16/8.9]")} controls playsInline preload="metadata">
        <source src={url} />
      </video>
    </div>
  );
}

export function ListingMediaLinks({
  url,
  previewUrl,
  editable = false,
  inputId = "property-video-url-field",
  onUrlChange,
  onPreviewClick,
  className,
}: ListingMediaLinksProps) {
  const currentUrl = url || "";
  const currentPreview = getListingMediaPreview(previewUrl ?? url);
  const hasUrl = Boolean(currentUrl.trim());
  const hasEmbeddablePreview =
    currentPreview?.kind === "youtube" ||
    currentPreview?.kind === "vimeo" ||
    currentPreview?.kind === "direct_video";
  const openActionLabel = currentPreview?.actionLabel || "Open Link";
  const compactPreview = !editable;
  const previewShellClassName = editable
    ? "max-w-[200px] lg:max-w-[380px]"
    : "max-w-[320px] sm:max-w-[300px] md:max-w-[320px] xl:ml-auto";

  if (!editable && !hasUrl) {
    return null;
  }

  return (
    <section
  className={cn(
    "rounded-[12px] border border-[#dbe4ef] bg-white p-4 shadow-[0_22px_44px_rgba(15,42,95,0.08)] sm:p-6",
    className
  )}
>
  <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)] xl:items-start">
    <div className="max-w-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#97a4b8]">
        Property Video
      </p>

      <h3 className="mt-2 break-words text-xl font-semibold tracking-[-0.03em] text-brand-navy sm:mt-3 sm:text-[1.32rem]">
        YouTube video link
      </h3>

      <p className="mt-2 text-sm leading-6 text-brand-slate sm:mt-3 sm:leading-7">
        Add a YouTube, Vimeo, or direct video link to showcase this property with a video tour.
      </p>

      <div className={cn("flex flex-wrap items-center gap-3", editable ? "mt-4" : "mt-1")}>
        {currentPreview?.sourceUrl ? (
          <a
            href={currentPreview.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[42px] items-center justify-center rounded-[12px] border border-[#d6deea] bg-[#f7f9fc] px-4 text-sm font-semibold text-brand-navy transition hover:border-brand-blue/25 hover:bg-brand-panel-soft"
          >
            {openActionLabel}
          </a>
        ) : null}

        {editable ? (
          <p className="text-sm text-brand-slate">
            Supports YouTube, Vimeo, and direct video URLs.
          </p>
        ) : null}
      </div>
    </div>

    <div className="min-w-0 space-y-3 sm:space-y-5">
      {editable ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id={inputId}
            type="url"
            inputMode="url"
            value={currentUrl}
            onChange={(event) => onUrlChange?.(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-h-[42px] w-full min-w-0 rounded-md border border-[#dce4ee] bg-white px-3 py-2 text-sm font-medium text-brand-ink shadow-[0_10px_24px_rgba(15,42,95,0.05)] outline-none transition placeholder:text-[#9aa7b8] focus:border-[#d7b556] focus:ring-4 focus:ring-[#f5ecd0] sm:text-base md:min-h-[48px] md:rounded-[14px] md:px-4 md:py-3 md:text-sm"
          />

          <button
            type="button"
            onClick={onPreviewClick}
            disabled={!currentUrl.trim()}
            className="inline-flex min-h-[42px] w-full shrink-0 items-center justify-center rounded-md bg-[#163a76] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(22,58,118,0.22)] transition hover:bg-[#123166] disabled:cursor-not-allowed disabled:bg-[#7d93b8] md:min-h-[48px] md:rounded-[14px] md:px-5 sm:w-auto"
          >
            Preview Video
          </button>
        </div>
      ) : null}

      <div className={cn("min-w-0", previewShellClassName)}>
        
  
        {hasEmbeddablePreview ? (
          currentPreview.kind === "direct_video" ? (
            <DirectVideoPreview
              url={currentPreview.sourceUrl}
              compact={compactPreview}
            />
          ) : currentPreview.kind === "youtube" ||
            currentPreview.kind === "vimeo" ? (
            <PreviewFrame
              url={currentPreview.embedUrl}
              compact={compactPreview}
            />
          ) : null
        ) : null}
     
      </div>
    </div>
  </div>
</section>

  );
}
