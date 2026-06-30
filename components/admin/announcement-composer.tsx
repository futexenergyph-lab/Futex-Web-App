"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Search } from "lucide-react";
import { toast } from "sonner";
import { createAnnouncement } from "@/app/(app)/announcements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

interface UserOption {
  id: string;
  full_name: string;
  role: UserRole;
}

export function AnnouncementComposer({ users }: { users: UserOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "specific">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q),
    );
  }, [users, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createAnnouncement({
        message,
        audience,
        userIds: audience === "specific" ? [...selected] : [],
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Announcement released");
      setMessage("");
      setSelected(new Set());
      setAudience("all");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Recipients</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAudience("all")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              audience === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
          >
            All users
          </button>
          <button
            type="button"
            onClick={() => setAudience("specific")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              audience === "specific"
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
          >
            Specific users
          </button>
        </div>
      </div>

      {audience === "specific" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select users</Label>
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or role"
              className="pl-8"
            />
          </div>
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
            {filtered.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{u.full_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {ROLE_LABELS[u.role]}
                </span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                No users found.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your announcement…"
          rows={5}
          required
        />
      </div>

      <Button
        type="submit"
        disabled={pending || !message.trim()}
        className="w-full sm:w-auto"
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Release announcement
      </Button>
    </form>
  );
}
