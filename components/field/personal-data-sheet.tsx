"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, KeyRound, Save, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { savePersonalDataSheet } from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PDS_SECTIONS, PDS_EMERGENCY, type PdsValues } from "@/lib/pds";

export function PersonalDataSheet({
  userId,
  email,
  initialPhotoUrl,
  initialData,
}: {
  userId: string;
  email: string;
  initialPhotoUrl: string | null;
  initialData: PdsValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PdsValues>(initialData);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  function setVal(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (photoRef.current) photoRef.current.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/pds-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("profiles")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("profiles").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      toast.success("Photo uploaded — remember to Save");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    const res = await savePersonalDataSheet({ photoUrl, data: values });
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Personal data sheet saved");
      router.refresh();
    }
  }

  // Position & Date Hired are filled by HR only.
  const HR_ONLY = new Set(["position", "date_hired"]);

  const field = (key: string, label: string, type?: string) => {
    const locked = HR_ONLY.has(key);
    const lockLabel = locked ? (
      <Label htmlFor={`pds-${key}`} className="text-xs">
        {label}{" "}
        <span className="text-[10px] font-normal text-muted-foreground">
          (set by HR)
        </span>
      </Label>
    ) : (
      <Label htmlFor={`pds-${key}`} className="text-xs">
        {label}
      </Label>
    );
    return type === "textarea" ? (
      <div key={key} className="space-y-1.5 sm:col-span-2">
        {lockLabel}
        <Textarea
          id={`pds-${key}`}
          value={values[key] ?? ""}
          disabled={locked}
          onChange={(e) => setVal(key, e.target.value)}
        />
      </div>
    ) : (
      <div key={key} className="space-y-1.5">
        {lockLabel}
        <Input
          id={`pds-${key}`}
          type={type === "date" ? "date" : "text"}
          value={values[key] ?? ""}
          disabled={locked}
          className={locked ? "bg-secondary text-muted-foreground" : ""}
          onChange={(e) => setVal(key, e.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Email + change password, upper right */}
      <div className="flex flex-col items-end gap-1 rounded-lg border bg-secondary/30 p-3">
        <p className="flex items-center gap-1.5 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{email}</span>
        </p>
        <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
          <KeyRound className="h-3.5 w-3.5" /> Change password
        </Button>
      </div>

      {/* 3:4 photo, centered above the sheet */}
      <div className="flex flex-col items-center gap-2">
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          className="relative aspect-[3/4] w-40 overflow-hidden rounded-lg border-2 border-dashed bg-secondary/40 transition hover:border-primary"
          title="Tap to upload a 3:4 photo"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Personal photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
              {uploading ? "Uploading…" : "Add 3:4 photo"}
            </span>
          )}
        </button>
        <p className="text-xs text-muted-foreground">
          Tap the box to upload a 3:4 ID photo.
        </p>
      </div>

      {/* Personal data sheet sections */}
      {PDS_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-bold">{section.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((f) => field(f.key, f.label, f.type))}
          </div>
        </div>
      ))}

      {/* In case of emergency */}
      <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/50 p-4">
        <h4 className="text-sm font-bold">{PDS_EMERGENCY.title}</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {PDS_EMERGENCY.fields.map((f) => field(f.key, f.label, f.type))}
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} size="lg" className="w-full">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save
      </Button>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password"));
    const confirm = String(f.get("confirm"));
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (pw !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPending(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password changed");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
