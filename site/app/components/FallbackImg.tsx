"use client";

import { useState } from "react";
import NextImage from "next/image";
import { avatarFallbackStyle } from "@/lib/avatar";

/**
 * Renders an avatar image that falls back to a deterministically colored
 * circle with an initial letter when the image fails to load or src is null.
 *
 * @param seed  - stable unique key (wallet address, handle, etc.) for color
 * @param label - text shown inside the fallback circle (usually first char)
 * @param size  - tailwind size classes applied to both image and fallback
 */
export function AvatarFallback({
  src,
  seed,
  label,
  size = "w-8 h-8",
  textSize = "text-xs",
  className,
}: {
  src?: string | null;
  seed: string;
  label: string;
  size?: string;
  textSize?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`${size} rounded-full border flex items-center justify-center ${textSize} font-semibold flex-shrink-0 ${className ?? ""}`}
        style={avatarFallbackStyle(seed)}
      >
        {label.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <NextImage
      src={src}
      alt=""
      width={64}
      height={64}
      className={`${size} rounded-full flex-shrink-0 object-cover ${className ?? ""}`}
      onError={() => setFailed(true)}
      loading="lazy"
      unoptimized={src.startsWith("/")}
    />
  );
}

export function AvatarImg({ src, fallbackChar: _fallbackChar, className }: { src: string; fallbackChar: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <NextImage
      src={src}
      alt=""
      width={64}
      height={64}
      className={className}
      onError={() => setFailed(true)}
      unoptimized={src.startsWith("/")}
    />
  );
}

export function HeaderImg({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <NextImage
      src={src}
      alt=""
      width={600}
      height={200}
      className={className}
      onError={() => setFailed(true)}
      unoptimized={src.startsWith("/")}
    />
  );
}
