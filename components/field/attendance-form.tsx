"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { recordAttendance } from "@/app/(app)/field/actions";
import { uploadToBucket } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export function AttendanceForm({ userId }: { userId: string }) {
  const [pending, setPending] = useState<"time_in" | "time_out" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function getGeo(): Promise<{ lat: number | null; lng: number | null }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ lat: null, lng: null });
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Burn date, time (PHT, UTC+8) and GPS location onto the captured photo.
  async function stampPhoto(
    src: File,
    geo: { lat: number | null; lng: number | null },
  ): Promise<File> {
    const url = URL.createObjectURL(src);
    try {
      const img = await loadImage(url);
      const maxW = 1280;
      const scale = Math.min(1, maxW / (img.width || maxW));
      const w = Math.round((img.width || maxW) * scale);
      const h = Math.round((img.height || maxW) * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return src;
      ctx.drawImage(img, 0, 0, w, h);

      const now = new Date();
      const stamp =
        now.toLocaleString("en-PH", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Manila",
        }) + " PHT";
      const loc =
        geo.lat != null && geo.lng != null
          ? `GPS ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`
          : "GPS unavailable";
      const lines = ["FUTEX Energy Solution", stamp, loc];

      const fontSize = Math.max(14, Math.round(w * 0.032));
      const pad = Math.round(w * 0.02);
      const lineH = Math.round(fontSize * 1.35);
      const bandH = lineH * lines.length + pad;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, h - bandH, w, bandH);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.textBaseline = "alphabetic";
      lines.forEach((ln, i) => {
        const y = h - pad - (lines.length - 1 - i) * lineH;
        ctx.fillText(ln, pad, y);
      });

      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.85),
      );
      if (!blob) return src;
      return new File([blob], `attendance-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
    } catch {
      return src;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function punch(type: "time_in" | "time_out") {
    if (!file) {
      toast.error("Please capture a photo first");
      return;
    }
    setPending(type);
    try {
      // Capture location first so it can be stamped onto the photo.
      const geo = await getGeo();
      const stamped = await stampPhoto(file, geo);
      const photoPath = await uploadToBucket("attendance", stamped, userId);
      const res = await recordAttendance({
        type,
        photoPath,
        bookingId: null,
        lat: geo.lat,
        lng: geo.lng,
      });
      if (res?.error) throw new Error(res.error);
      toast.success(type === "time_in" ? "Timed in" : "Timed out");
      setFile(null);
      setPreview(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-secondary/40 text-muted-foreground"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Photo proof"
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <>
            <Camera className="h-8 w-8" />
            <span className="text-sm">Tap to capture photo proof</span>
            <span className="text-xs">Photo is required to clock in/out</span>
          </>
        )}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="accent"
          className="h-14"
          disabled={pending !== null}
          onClick={() => punch("time_in")}
        >
          {pending === "time_in" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          Time In
        </Button>
        <Button
          variant="outline"
          className="h-14"
          disabled={pending !== null}
          onClick={() => punch("time_out")}
        >
          {pending === "time_out" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          Time Out
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Your photo is stamped with the date, time (PHT) and GPS location, then
        recorded for HR. Allow location access for an accurate stamp.
      </p>
    </div>
  );
}
