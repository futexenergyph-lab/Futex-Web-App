"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  GripVertical,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadPricingImage } from "@/lib/storage";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  upsertEnclosure,
  upsertAddon,
  upsertPackage,
  updateSetting,
  reorderPricing,
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
import { php, cn } from "@/lib/utils";
import type { Addon, Enclosure, Package } from "@/lib/types";

// ---------------------------------------------------------------------------
// Drag-to-reorder infrastructure (sets display order on public pages + forms)
// ---------------------------------------------------------------------------
type ReorderKind = "packages" | "enclosures" | "addons";

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background p-3",
        isDragging && "z-10 opacity-70 shadow-lg",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SortableList<T extends { id: string }>({
  kind,
  items,
  renderItem,
}: {
  kind: ReorderKind;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  const [order, setOrder] = useState(items);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => setOrder(items), [items]);

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((i) => i.id === active.id);
    const newIndex = order.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    const res = await reorderPricing(
      kind,
      next.map((i) => i.id),
    );
    if (res?.error) {
      toast.error(res.error);
      setOrder(items);
    } else {
      toast.success("Order saved");
      router.refresh();
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={order.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {order.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Image upload (admin-managed photo shown on the public pricing page)
// ---------------------------------------------------------------------------
function ImageUploadField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPricingImage(file);
      onChange(url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label>Photo (shown on the pricing page)</Label>
      {value && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Pricing"
            className="h-28 w-44 rounded-md border object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => ref.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {value ? "Replace photo" : "Upload photo"}
      </Button>
    </div>
  );
}

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
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Drag <GripVertical className="inline h-3 w-3" /> to set the order shown
          to customers.
        </p>
        <SimpleItemDialog kind={kind} />
      </div>
      <SortableList
        kind={kind === "enclosure" ? "enclosures" : "addons"}
        items={items}
        renderItem={(it) => (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{it.name}</p>
              <p className="text-xs text-muted-foreground">{php(it.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              {!it.active && <Badge variant="secondary">Inactive</Badge>}
              <SimpleItemDialog kind={kind} item={it} />
            </div>
          </div>
        )}
      />
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
  const [imageUrl, setImageUrl] = useState<string | null>(
    item?.image_url ?? null,
  );
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      id: item?.id,
      name: String(f.get("name")),
      price: Number(f.get("price")),
      active: f.get("active") === "on",
      image_url: imageUrl,
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
          <ImageUploadField value={imageUrl} onChange={setImageUrl} />
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
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Drag <GripVertical className="inline h-3 w-3" /> to set the order on the
          public pricing page &amp; booking form.
        </p>
        <PackageDialog templates={packages} />
      </div>
      <SortableList
        kind="packages"
        items={packages}
        renderItem={(p) => (
          <div className="flex items-center justify-between">
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
        )}
      />
    </div>
  );
}

function PackageDialog({
  pkg,
  templates,
}: {
  pkg?: Package;
  /** Existing packages offered as "duplicate from" starters (add mode). */
  templates?: Package[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(
    pkg?.image_url ?? null,
  );
  // When duplicating, the chosen package pre-fills the form (still saved as
  // a NEW package — the original is untouched).
  const [copyFrom, setCopyFrom] = useState<Package | null>(null);
  const base = pkg ?? copyFrom;
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
        image_url: imageUrl,
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setCopyFrom(null);
          setImageUrl(pkg?.image_url ?? null);
        }
      }}
    >
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
        {!pkg && templates && templates.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="copy-from">Duplicate existing package</Label>
            <select
              id="copy-from"
              value={copyFrom?.id ?? ""}
              onChange={(e) => {
                const t =
                  templates.find((x) => x.id === e.target.value) ?? null;
                setCopyFrom(t);
                setImageUrl(t?.image_url ?? null);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Start blank</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {php(t.base_price)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Picking one copies its details below — edit anything, then Save
              creates a new package (the original stays as is).
            </p>
          </div>
        )}
        <form
          key={base?.id ?? "blank"}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={
                copyFrom ? `${copyFrom.name} (Copy)` : pkg?.name
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={base?.description ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inclusions">Inclusions (one per line)</Label>
            <Textarea
              id="inclusions"
              name="inclusions"
              defaultValue={(base?.inclusions ?? []).join("\n")}
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
                defaultValue={base?.base_price ?? 0}
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
                defaultValue={base?.original_price ?? ""}
              />
            </div>
          </div>
          <ImageUploadField value={imageUrl} onChange={setImageUrl} />
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="enclosure_included"
                defaultChecked={base?.enclosure_included ?? false}
                className="h-4 w-4"
              />
              Enclosure included in this package
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_promo"
                defaultChecked={base?.is_promo ?? false}
                className="h-4 w-4"
              />
              Promo headline package
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                defaultChecked={base?.active ?? true}
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
