"use client";

export function AvatarImage({ src, fallbackChar }: { src: string; fallbackChar: string }) {
  return (
    <img
      src={src}
      alt=""
      className="w-10 h-10 rounded-full flex-shrink-0"
      onError={(e) => {
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling?.classList.remove("hidden");
      }}
    />
  );
}

export function HeaderImage({ src }: { src: string }) {
  return (
    <div className="overflow-hidden mb-3 -mx-4 -mt-4">
      <img
        src={src}
        alt=""
        className="w-full h-20 object-cover"
        onError={(e) => {
          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
        }}
      />
    </div>
  );
}
