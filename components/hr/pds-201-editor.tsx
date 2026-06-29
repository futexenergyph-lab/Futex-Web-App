"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveEmployeePds } from "@/app/(app)/hr/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PDS_SECTIONS, PDS_EMERGENCY, type PdsValues } from "@/lib/pds";

/** HR/Management/Owner editor for an employee's Personal Data Sheet (201 files). */
export function Pds201Editor({
  employeeId,
  initialPhotoUrl,
  initialData,
}: {
  employeeId: string;
  initialPhotoUrl: string | null;
  initialData: PdsValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PdsValues>(initialData);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      const path = `${employeeId}/pds-${Date.now()}.${ext}`;
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
    const res = await saveEmployeePds({
      userId: employeeId,
      photoUrl,
      data: values,
    });
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Personal data sheet saved");
      router.refresh();
    }
  }

  const field = (key: string, label: string, type?: string) =>
    type === "textarea" ? (
      <div key={key} className="space-y-1 sm:col-span-2">
        <Label htmlFor={`e-${key}`} className="text-xs">
          {label}
        </Label>
        <Textarea
          id={`e-${key}`}
          value={values[key] ?? ""}
          onChange={(e) => setVal(key, e.target.value)}
        />
      </div>
    ) : (
      <div key={key} className="space-y-1">
        <Label htmlFor={`e-${key}`} className="text-xs">
          {label}
        </Label>
        <Input
          id={`e-${key}`}
          type={type === "date" ? "date" : "text"}
          value={values[key] ?? ""}
          onChange={(e) => setVal(key, e.target.value)}
        />
      </div>
    );

  return (
    <div className="space-y-4 rounded-md border bg-background p-3">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1.5">
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
            className="relative aspect-[3/4] w-24 overflow-hidden rounded border-2 border-dashed bg-secondary/40 hover:border-primary"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="ID photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                3:4 photo
              </span>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Edit this employee&apos;s details and 3:4 photo. Position &amp; Date
          Hired are maintained here by HR.
        </p>
      </div>

      {PDS_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {section.title}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {section.fields.map((f) => field(f.key, f.label, f.type))}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          {PDS_EMERGENCY.title}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PDS_EMERGENCY.fields.map((f) => field(f.key, f.label, f.type))}
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save personal data sheet
      </Button>
    </div>
  );
}
