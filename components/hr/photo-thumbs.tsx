"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface Thumb {
  src: string;
  alt?: string;
}

/** Renders attendance photo thumbnails that enlarge in a lightbox on click. */
export function PhotoThumbs({
  photos,
  className = "h-10 w-10",
}: {
  photos: Thumb[];
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (photos.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={p.src}
            alt={p.alt ?? "Attendance photo"}
            onClick={() => setOpen(p.src)}
            className={`${className} cursor-zoom-in rounded object-cover transition hover:opacity-80`}
          />
        ))}
      </div>

      {open && (
        <div
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setOpen(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open}
            alt="Attendance photo enlarged"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
