"use client";

import { useRef, useEffect, useState } from "react";
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
    <img
      src={src}
      alt=""
      className={`${size} rounded-full flex-shrink-0 object-cover ${className ?? ""}`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

export function AvatarImg({ src, fallbackChar: _fallbackChar, className }: { src: string; fallbackChar: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const handler = () => {
      img.style.display = "none";
      img.nextElementSibling?.classList.remove("hidden");
    };
    img.addEventListener("error", handler);
    if (img.complete && img.naturalWidth === 0) handler();
    return () => img.removeEventListener("error", handler);
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      className={className}
    />
  );
}

export function HeaderImg({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const handler = () => {
      const parent = img.parentElement as HTMLElement;
      if (parent) parent.style.display = "none";
    };
    img.addEventListener("error", handler);
    if (img.complete && img.naturalWidth === 0) handler();
    return () => img.removeEventListener("error", handler);
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      className={className}
    />
  );
}
