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
        { timeout: 8000 },
      );
    });
  }

  async function punch(type: "time_in" | "time_out") {
    if (!file) {
      toast.error("Please capture a photo first");
      return;
    }
    setPending(type);
    try {
      const photoPath = await uploadToBucket("attendance", file, userId);
      const geo = await getGeo();
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
        Photo + timestamp + location are recorded for HR.
      </p>
    </div>
  );
}
