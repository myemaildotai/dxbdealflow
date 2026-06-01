"use client";

import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ListingImage } from "@/lib/deal-types";

const GALLERY_GAP_PX = 16;

function getColumnCount(width: number) {
  if (width < 768) {
    return 1;
  }

  if (width < 1024) {
    return 3;
  }

  return 3;
}

function getFallbackAspectRatio(isCover: boolean) {
  return isCover ? 0.74 : 1.38;
}

export function ListingMasonryGallery({
  images,
  listingTitle,
}: {
  images: ListingImage[];
  listingTitle: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(node.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const columnCount = getColumnCount(containerWidth);
  const usableWidth = containerWidth || 0;
  const columnWidth =
    usableWidth > 0 ? (usableWidth - GALLERY_GAP_PX * Math.max(columnCount - 1, 0)) / columnCount : 0;

  const columns = useMemo(() => {
    const nextColumns = Array.from({ length: columnCount }, () => ({
      height: 0,
      items: [] as Array<{ image: ListingImage; index: number }>,
    }));

    images.forEach((image, index) => {
      const ratio = aspectRatios[image.id] ?? getFallbackAspectRatio(image.is_cover);
      const estimatedHeight = columnWidth > 0 ? columnWidth / Math.max(ratio, 0.2) : 0;

      let targetColumn = nextColumns[0];
      for (const column of nextColumns) {
        if (column.height < targetColumn.height) {
          targetColumn = column;
        }
      }

      targetColumn.items.push({ image, index });
      targetColumn.height += estimatedHeight + GALLERY_GAP_PX;
    });

    return nextColumns.map((column) => column.items);
  }, [aspectRatios, columnCount, columnWidth, images]);

  const handleImageLoad =
    (imageId: string) => (event: SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (!naturalWidth || !naturalHeight) {
        return;
      }

      const nextRatio = Number((naturalWidth / naturalHeight).toFixed(4));
      setAspectRatios((current) => {
        if (current[imageId] === nextRatio) {
          return current;
        }

        return {
          ...current,
          [imageId]: nextRatio,
        };
      });
    };

  return (
    <div ref={containerRef} className="mt-4">
      <div
        className="grid items-start gap-2"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex min-w-0 flex-col gap-2">
            {column.map(({ image, index }) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-[8px] border border-brand-line/80 bg-white shadow-[0_10px_24px_rgba(15,42,95,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,42,95,0.12)]"
              >
                <div className="overflow-hidden bg-[linear-gradient(135deg,#EEF2F6_0%,#DCE4EE_100%)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.public_url}
                    alt={`${listingTitle} image ${index + 1}`}
                    loading="lazy"
                    onLoad={handleImageLoad(image.id)}
                    className="block h-auto w-full transition duration-500 group-hover:scale-[1.015]"
                  />
                </div>

                {image.is_cover ? (
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-3">
                    <span className="badge border-white/45 bg-[#0F2A5F]/78 text-white">Cover</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
