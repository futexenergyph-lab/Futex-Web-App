"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createUser,
  updateUser,
  deleteUser,
} from "@/app/(app)/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS, type Profile, type UserRole } from "@/lib/types";

const ROLES: UserRole[] = [
  "owner",
  "admin",
  "field_officer",
  "installer",
  "accounting",
  "hr",
];

type UserRow = Profile & { email?: string };

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <UserDialog />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.email || "—"}
                </TableCell>
                <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                <TableCell>{u.phone ?? "—"}</TableCell>
                <TableCell>
                  {u.active ? (
                    <Badge variant="accent">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <UserDialog user={u} isSelf={u.id === currentUserId} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UserDialog({
  user,
  isSelf,
}: {
  user?: UserRow;
  isSelf?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = user
        ? await updateUser({
            id: user.id,
            full_name: String(f.get("full_name")),
            role: f.get("role") as UserRole,
            phone: String(f.get("phone") ?? ""),
            active: f.get("active") === "on",
            email: String(f.get("email") ?? "") || undefined,
            password: String(f.get("password") ?? "") || undefined,
          })
        : await createUser({
            email: String(f.get("email")),
            password: String(f.get("password")),
            full_name: String(f.get("full_name")),
            role: f.get("role") as UserRole,
            phone: String(f.get("phone") ?? ""),
          });
      if (res?.error) toast.error(res.error);
      else {
        toast.success(user ? "User updated" : "User created");
        setOpen(false);
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!user) return;
    if (
      !confirm(
        `Remove ${user.full_name}'s account and credentials? This cannot be undone.`,
      )
    )
      return;
    startDelete(async () => {
      const res = await deleteUser(user.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Account removed");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {user ? (
          <Button size="icon" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add user
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "New user account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={user?.full_name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email ?? ""}
              required={!user}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? "New password (leave blank to keep)" : "Temporary password"}
            </Label>
            <Input
              id="password"
              name="password"
              type="text"
              minLength={user ? undefined : 6}
              placeholder={user ? "••••••••" : ""}
              required={!user}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue={user?.role ?? "field_officer"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={user?.phone ?? ""} />
            </div>
          </div>
          {user && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                defaultChecked={user.active}
                className="h-4 w-4"
              />
              Active
            </label>
          )}
          <DialogFooter className="sm:justify-between">
            {user ? (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={deleting || pending || isSelf}
                title={isSelf ? "You can't remove your own account" : undefined}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove account
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending || deleting}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
