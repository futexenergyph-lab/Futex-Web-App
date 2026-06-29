"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Upload,
  Download,
  Trash2,
  FileText,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { ROLE_LABELS, type Profile } from "@/lib/types";
import { Pds201Editor } from "@/components/hr/pds-201-editor";

const BUCKET = "employee-201";

export interface PdsView {
  photoUrl: string | null;
  data: Record<string, string>;
}

interface FileRow {
  name: string; // storage object name (timestamp-prefixed)
  label: string; // display name (prefix stripped)
  path: string; // full object path
  size: number;
  createdAt: string | null;
}

type Employee = Pick<Profile, "id" | "full_name" | "role" | "phone">;

export function Employee201List({
  employees,
  pdsById = {},
}: {
  employees: Employee[];
  pdsById?: Record<string, PdsView>;
}) {
  if (employees.length === 0) {
    return (
      <p className="rounded-md border bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No registered field staff yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {employees.map((e) => (
        <EmployeeRow key={e.id} employee={e} pds={pdsById[e.id]} />
      ))}
    </div>
  );
}

function EmployeeRow({
  employee,
  pds,
}: {
  employee: Employee;
  pds?: PdsView;
}) {
  const [open, setOpen] = useState(false);
  const [pdsOpen, setPdsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);

  async function loadFiles() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(employee.id, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    setLoading(false);
    setLoaded(true);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFiles(
      (data ?? [])
        .filter((o) => o.name !== ".emptyFolderPlaceholder")
        .map((o) => ({
          name: o.name,
          label: o.name.replace(/^\d+-/, ""),
          path: `${employee.id}/${o.name}`,
          size: (o.metadata?.size as number) ?? 0,
          createdAt: o.created_at ?? null,
        })),
    );
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) loadFiles();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${employee.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Attached ${file.name}`);
    loadFiles();
  }

  async function onDownload(f: FileRow) {
    setBusy(f.path);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(f.path, 3600);
    setBusy(null);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function onDelete(f: FileRow) {
    if (!confirm(`Delete ${f.label}? This cannot be undone.`)) return;
    setBusy(f.path);
    const supabase = createClient();
    const { error } = await supabase.storage.from(BUCKET).remove([f.path]);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("File deleted");
    setFiles((prev) => prev.filter((x) => x.path !== f.path));
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/50"
      >
        <span className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {pds?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pds.photoUrl}
              alt=""
              className="aspect-[3/4] h-10 shrink-0 rounded border object-cover"
            />
          ) : (
            <span className="flex aspect-[3/4] h-10 shrink-0 items-center justify-center rounded border bg-secondary/50 text-[9px] text-muted-foreground">
              3:4
            </span>
          )}
          <span>
            <span className="font-medium">{employee.full_name}</span>
            <span className="block text-xs text-muted-foreground">
              {ROLE_LABELS[employee.role]}
              {employee.phone ? ` · ${employee.phone}` : ""}
            </span>
          </span>
        </span>
        {loaded && (
          <Badge variant="secondary" className="gap-1">
            <FolderOpen className="h-3 w-3" />
            {files.length} file{files.length === 1 ? "" : "s"}
          </Badge>
        )}
      </button>

      {open && (
        <div className="border-t bg-secondary/20 px-4 py-3">
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setPdsOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm font-semibold hover:bg-secondary/50"
            >
              {pdsOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              Personal Data Sheet
              <span className="text-xs font-normal text-muted-foreground">
                — tap to view &amp; edit
              </span>
            </button>
            {pdsOpen && (
              <div className="mt-2">
                <Pds201Editor
                  employeeId={employee.id}
                  initialPhotoUrl={pds?.photoUrl ?? null}
                  initialData={pds?.data ?? {}}
                />
              </div>
            )}
          </div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              201 file — contracts, IDs, certificates, and other HR documents.
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Attach file
              <input
                type="file"
                className="hidden"
                onChange={onUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading files…
            </p>
          ) : files.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No files yet. Use “Attach file” to upload this employee’s documents.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li
                  key={f.path}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {f.label}
                      </span>
                      {f.createdAt && (
                        <span className="block text-[11px] text-muted-foreground">
                          {formatDateTime(f.createdAt)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDownload(f)}
                      disabled={busy === f.path}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60"
                    >
                      {busy === f.path ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(f)}
                      disabled={busy === f.path}
                      className="inline-flex items-center rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
