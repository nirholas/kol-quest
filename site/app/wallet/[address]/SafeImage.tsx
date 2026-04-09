"use client";

import { useState } from "react";
import NextImage from "next/image";

export function AvatarImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <NextImage
      src={src}
      alt=""
      width={40}
      height={40}
      className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
      onError={() => setFailed(true)}
      unoptimized={src.startsWith("/")}
    />
  );
}

export function HeaderImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div className="overflow-hidden mb-3 -mx-4 -mt-4">
      <NextImage
        src={src}
        alt=""
        width={800}
        height={80}
        className="w-full h-20 object-cover"
        onError={() => setFailed(true)}
        unoptimized={src.startsWith("/")}
      />
    </div>
  );
}
