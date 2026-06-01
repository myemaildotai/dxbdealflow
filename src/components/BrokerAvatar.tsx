"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BROKER_PROFILE_PHOTO } from "@/lib/profile-photo";
import { cn } from "@/lib/deal-utils";

type BrokerAvatarProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
};

function resolveAvatarSource(src?: string | null) {
  const normalizedSource = typeof src === "string" ? src.trim() : "";
  return normalizedSource || DEFAULT_BROKER_PROFILE_PHOTO;
}

export function BrokerAvatar({
  src,
  alt = "Broker profile photo",
  className,
  imageClassName,
}: BrokerAvatarProps) {
  const [imageSrc, setImageSrc] = useState(resolveAvatarSource(src));

  useEffect(() => {
    setImageSrc(resolveAvatarSource(src));
  }, [src]);

  return (
    <div className={cn("overflow-hidden rounded-full bg-brand-panel-soft", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        className={cn("h-full w-full object-cover", imageClassName)}
        onError={() => {
          if (imageSrc !== DEFAULT_BROKER_PROFILE_PHOTO) {
            setImageSrc(DEFAULT_BROKER_PROFILE_PHOTO);
          }
        }}
      />
    </div>
  );
}
