"use client";

import { useState } from "react";
import { Images, X, Download, ZoomIn } from "lucide-react";

export interface DocPhoto {
  /** Inline signed URL for viewing/zooming (original quality). */
  url: string;
  /** Signed URL that forces a download with the original file. */
  downloadUrl: string;
  name: string;
}

/**
 * "See documentation" button for the Client Master List. Opens a modal of the
 * post-installation photos the field officer attached. Each photo can be
 * clicked to enlarge/zoom and downloaded at original quality.
 */
export function DocumentationViewer({ photos }: { photos: DocPhoto[] }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<DocPhoto | null>(null);

  if (photos.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        <Images className="h-3.5 w-3.5" />
        See documentation
        <span className="text-muted-foreground">({photos.length})</span>
      </button>

      {/* Gallery modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                Post-installation documentation
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-md border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.name}
                    onClick={() => setZoom(p)}
                    className="h-32 w-full cursor-zoom-in object-cover transition group-hover:opacity-90"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 px-2 py-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setZoom(p)}
                      className="inline-flex items-center gap-1 text-xs text-white hover:underline"
                    >
                      <ZoomIn className="h-3 w-3" /> Zoom
                    </button>
                    <a
                      href={p.downloadUrl}
                      className="inline-flex items-center gap-1 text-xs text-white hover:underline"
                    >
                      <Download className="h-3 w-3" /> Save
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Single-photo zoom view */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            onClick={() => setZoom(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <a
            href={zoom.downloadUrl}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            <Download className="h-4 w-4" /> Download
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom.url}
            alt={zoom.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
