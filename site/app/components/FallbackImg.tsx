"use client";

import { useRef, useEffect } from "react";

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
