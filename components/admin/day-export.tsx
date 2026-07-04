"use client";

import { useState } from "react";
import { FileText, Images, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { getDayData, getDayPhotos } from "@/app/(app)/admin/database/actions";
import { buildDayReportPdf } from "@/lib/day-report-pdf";
import { Button } from "@/components/ui/button";

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function DayExport({ day }: { day: string }) {
  const [pdfPending, setPdfPending] = useState(false);
  const [zipPending, setZipPending] = useState(false);

  async function onPdf() {
    setPdfPending(true);
    try {
      const [sections, logo] = await Promise.all([
        getDayData(day),
        fetchDataUrl("/images/logo-stacked.png"),
      ]);
      const blob = buildDayReportPdf(day, sections, logo);
      download(blob, `futex-data-${day}.pdf`);
      toast.success("Data PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to build PDF");
    } finally {
      setPdfPending(false);
    }
  }

  async function onZip() {
    setZipPending(true);
    try {
      const photos = await getDayPhotos(day);
      if (photos.length === 0) {
        toast.info("No photos for this day");
        return;
      }
      const zip = new JSZip();
      let added = 0;
      await Promise.all(
        photos.map(async (p, i) => {
          try {
            const res = await fetch(p.url);
            if (!res.ok) return;
            const blob = await res.blob();
            // Prefix index to avoid name collisions within a folder.
            zip.folder(p.folder)!.file(`${String(i + 1).padStart(3, "0")}-${p.name}`, blob);
            added++;
          } catch {
            /* skip a failed photo */
          }
        }),
      );
      if (added === 0) {
        toast.error("Could not fetch any photos");
        return;
      }
      const content = await zip.generateAsync({ type: "blob" });
      download(content, `futex-photos-${day}.zip`);
      toast.success(`${added} photo(s) zipped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to build ZIP");
    } finally {
      setZipPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPdf}
        disabled={pdfPending}
      >
        {pdfPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        Data PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onZip}
        disabled={zipPending}
      >
        {zipPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Images className="h-3.5 w-3.5" />
        )}
        Photos ZIP
      </Button>
    </div>
  );
}
