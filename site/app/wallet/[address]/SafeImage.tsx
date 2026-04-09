"use client";

import { useRef, useEffect } from "react";

export function AvatarImage({ src }: { src: string }) {
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
      className="w-10 h-10 rounded-full flex-shrink-0"
    />
  );
}

export function HeaderImage({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const handler = () => {
      (img.parentElement as HTMLElement).style.display = "none";
    };
    img.addEventListener("error", handler);
    if (img.complete && img.naturalWidth === 0) handler();
    return () => img.removeEventListener("error", handler);
  }, []);

  return (
    <div className="overflow-hidden mb-3 -mx-4 -mt-4">
      <img
        ref={ref}
        src={src}
        alt=""
        className="w-full h-20 object-cover"
      />
    </div>
  );
}
