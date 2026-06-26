"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  upsertEnclosure,
  upsertAddon,
  upsertPackage,
  updateSetting,
} from "@/app/(app)/admin/settings/actions";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { php } from "@/lib/utils";
import type { Addon, Enclosure, Package } from "@/lib/types";

// ---------------------------------------------------------------------------
// Simple item (enclosure / addon)
// ---------------------------------------------------------------------------
type SimpleKind = "enclosure" | "addon";

export function SimpleItemList({
  kind,
  items,
}: {
  kind: SimpleKind;
  items: (Enclosure | Addon)[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <SimpleItemDialog kind={kind} />
      </div>
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="text-sm font-medium">{it.name}</p>
            <p className="text-xs text-muted-foreground">{php(it.price)}</p>
          </div>
          <div className="flex items-center gap-2">
            {!it.active && <Badge variant="secondary">Inactive</Badge>}
            <SimpleItemDialog kind={kind} item={it} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleItemDialog({
  kind,
  item,
}: {
  kind: SimpleKind;
  item?: Enclosure | Addon;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      id: item?.id,
      name: String(f.get("name")),
      price: Number(f.get("price")),
      active: f.get("active") === "on",
    };
    start(async () => {
      const res =
        kind === "enclosure"
          ? await upsertEnclosure(payload)
          : await upsertAddon(payload);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Saved");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button size="icon" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" /> Add {kind}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit" : "New"} {kind}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={item?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (₱)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={item?.price ?? 0}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={item?.active ?? true}
              className="h-4 w-4"
            />
            Active
          </label>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Package editor
// ---------------------------------------------------------------------------
export function PackageList({ packages }: { packages: Package[] }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <PackageDialog />
      </div>
      {packages.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="text-sm font-medium">
              {p.name}
              {p.is_promo && (
                <Badge variant="accent" className="ml-2">
                  Promo
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {php(p.base_price)}
              {p.enclosure_included ? " · enclosure included" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!p.active && <Badge variant="secondary">Inactive</Badge>}
            <PackageDialog pkg={p} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PackageDialog({ pkg }: { pkg?: Package }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const origRaw = String(f.get("original_price") ?? "");
    start(async () => {
      const res = await upsertPackage({
        id: pkg?.id,
        name: String(f.get("name")),
        description: String(f.get("description") ?? ""),
        inclusions: String(f.get("inclusions") ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        base_price: Number(f.get("base_price")),
        enclosure_included: f.get("enclosure_included") === "on",
        is_promo: f.get("is_promo") === "on",
        original_price: origRaw ? Number(origRaw) : null,
        active: f.get("active") === "on",
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Saved");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {pkg ? (
          <Button size="icon" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" /> Add package
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pkg ? "Edit" : "New"} package</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={pkg?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={pkg?.description ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inclusions">Inclusions (one per line)</Label>
            <Textarea
              id="inclusions"
              name="inclusions"
              defaultValue={(pkg?.inclusions ?? []).join("\n")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base price (₱)</Label>
              <Input
                id="base_price"
                name="base_price"
                type="number"
                min={0}
                defaultValue={pkg?.base_price ?? 0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="original_price">&quot;Was&quot; price (promo)</Label>
              <Input
                id="original_price"
                name="original_price"
                type="number"
                min={0}
                defaultValue={pkg?.original_price ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="enclosure_included"
                defaultChecked={pkg?.enclosure_included ?? false}
                className="h-4 w-4"
              />
              Enclosure included in this package
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_promo"
                defaultChecked={pkg?.is_promo ?? false}
                className="h-4 w-4"
              />
              Promo headline package
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                defaultChecked={pkg?.active ?? true}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Wire rate
// ---------------------------------------------------------------------------
export function WireRateEditor({ rate }: { rate: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const value = Number(f.get("rate"));
    start(async () => {
      const res = await updateSetting("wire_rate_per_meter", value);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Wire rate updated");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="rate">Wire rate (₱ per linear meter)</Label>
        <Input
          id="rate"
          name="rate"
          type="number"
          min={0}
          step="0.01"
          defaultValue={rate}
          className="w-48"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save
      </Button>
    </form>
  );
}
