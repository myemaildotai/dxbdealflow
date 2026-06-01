export type ListingMediaPreview =
  | {
      kind: "youtube";
      sourceUrl: string;
      embedUrl: string;
      actionLabel: string;
    }
  | {
      kind: "direct_video";
      sourceUrl: string;
      actionLabel: string;
    }
  | {
      kind: "vimeo";
      sourceUrl: string;
      embedUrl: string;
      actionLabel: string;
    }
  | {
      kind: "unknown";
      sourceUrl: string;
      actionLabel: string;
    };

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"] as const;

function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getYouTubeVideoId(url: URL) {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || "";
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    if (!pathParts.length) {
      return "";
    }

    if (["shorts", "embed", "live", "v"].includes(pathParts[0])) {
      return pathParts[1] || "";
    }
  }

  return "";
}

function getVimeoEmbedUrl(url: URL) {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "vimeo.com" && host !== "player.vimeo.com") {
    return "";
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const videoId = pathParts.find((part) => /^\d+$/.test(part)) || "";
  if (!videoId) {
    return "";
  }

  return `https://player.vimeo.com/video/${videoId}`;
}

export function getListingMediaPreview(rawUrl: string | null | undefined): ListingMediaPreview | null {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return null;
  }

  const pathname = parsedUrl.pathname.toLowerCase();

  const youTubeVideoId = getYouTubeVideoId(parsedUrl);
  if (youTubeVideoId) {
    return {
      kind: "youtube",
      sourceUrl: parsedUrl.toString(),
      embedUrl: `https://www.youtube.com/embed/${youTubeVideoId}?rel=0`,
      actionLabel: "Open YouTube",
    };
  }

  const vimeoEmbedUrl = getVimeoEmbedUrl(parsedUrl);
  if (vimeoEmbedUrl) {
    return {
      kind: "vimeo",
      sourceUrl: parsedUrl.toString(),
      embedUrl: vimeoEmbedUrl,
      actionLabel: "Open Vimeo",
    };
  }

  if (DIRECT_VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension))) {
    return {
      kind: "direct_video",
      sourceUrl: parsedUrl.toString(),
      actionLabel: "Open Video",
    };
  }

  return {
    kind: "unknown",
    sourceUrl: parsedUrl.toString(),
    actionLabel: "Open Link",
  };
}

export function normalizeListingMediaUrl(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}
