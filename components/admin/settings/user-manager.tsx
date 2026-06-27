"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Clock, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  createUser,
  updateUser,
  deleteUser,
  requestUserDeletion,
  cancelUserDeletion,
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
import {
  ELEVATED_ROLES,
  ROLE_LABELS,
  type Profile,
  type UserRole,
} from "@/lib/types";

const ALL_ROLES: UserRole[] = [
  "owner",
  "admin",
  "admin_staff",
  "field_officer",
  "installer",
  "accounting",
  "hr",
];
// Roles management/admin (non-owner) may assign.
const NON_ELEVATED_ROLES: UserRole[] = ALL_ROLES.filter(
  (r) => !ELEVATED_ROLES.includes(r),
);

type UserRow = Profile & { email?: string };

export function UserManager({
  users,
  currentUserId,
  currentUserRole,
}: {
  users: UserRow[];
  currentUserId: string;
  currentUserRole: UserRole;
}) {
  const isOwner = currentUserRole === "owner";
  return (
    <div className="space-y-3">
      {!isOwner && (
        <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          Only the Owner can grant Owner/Management roles or remove accounts.
          Your removal requests are sent to the Owner for approval.
        </p>
      )}
      <div className="flex justify-end">
        <UserDialog isOwner={isOwner} />
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
                  {u.deletion_requested_at ? (
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="h-3 w-3" /> Removal requested
                    </Badge>
                  ) : u.active ? (
                    <Badge variant="accent">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <UserDialog
                    user={u}
                    isSelf={u.id === currentUserId}
                    isOwner={isOwner}
                  />
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
  isOwner,
}: {
  user?: UserRow;
  isSelf?: boolean;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [working, startWork] = useTransition();
  const router = useRouter();

  // A non-owner may not edit an elevated (owner/management) account at all.
  const targetElevated = user ? ELEVATED_ROLES.includes(user.role) : false;
  const locked = !!user && !isOwner && targetElevated;
  const roleOptions = isOwner ? ALL_ROLES : NON_ELEVATED_ROLES;
  const pendingRemoval = !!user?.deletion_requested_at;

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

  // Owner: hard delete. Management/Admin: raise a removal request.
  function onRemove() {
    if (!user) return;
    const msg = isOwner
      ? `Remove ${user.full_name}'s account and credentials? This cannot be undone.`
      : `Request the Owner to remove ${user.full_name}'s account?`;
    if (!confirm(msg)) return;
    startWork(async () => {
      const res = isOwner
        ? await deleteUser(user.id)
        : await requestUserDeletion(user.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(isOwner ? "Account removed" : "Removal request sent to Owner");
        setOpen(false);
        router.refresh();
      }
    });
  }

  function onCancelRequest() {
    if (!user) return;
    startWork(async () => {
      const res = await cancelUserDeletion(user.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Removal request cleared");
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

        {locked ? (
          <p className="rounded-md bg-secondary/60 px-3 py-4 text-sm text-muted-foreground">
            This is an Owner/Management account. Only the Owner can edit or
            remove it.
          </p>
        ) : (
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
                {user
                  ? "New password (leave blank to keep)"
                  : "Temporary password"}
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
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                {!isOwner && (
                  <p className="text-[11px] text-muted-foreground">
                    Owner/Management roles can only be set by the Owner.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={user?.phone ?? ""}
                />
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
                <RemovalControls
                  isOwner={isOwner}
                  isSelf={!!isSelf}
                  pendingRemoval={pendingRemoval}
                  working={working}
                  pending={pending}
                  onRemove={onRemove}
                  onCancelRequest={onCancelRequest}
                />
              ) : (
                <span />
              )}
              <Button type="submit" disabled={pending || working}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RemovalControls({
  isOwner,
  isSelf,
  pendingRemoval,
  working,
  pending,
  onRemove,
  onCancelRequest,
}: {
  isOwner: boolean;
  isSelf: boolean;
  pendingRemoval: boolean;
  working: boolean;
  pending: boolean;
  onRemove: () => void;
  onCancelRequest: () => void;
}) {
  const spin = working ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : null;

  // Owner reviewing a pending request: approve (delete) or reject (clear).
  if (isOwner && pendingRemoval) {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          onClick={onRemove}
          disabled={working || pending || isSelf}
        >
          {spin ?? <Check className="h-4 w-4" />}
          Approve removal
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancelRequest}
          disabled={working || pending}
        >
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
    );
  }

  // Non-owner with a request already pending: allow cancelling it.
  if (!isOwner && pendingRemoval) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onCancelRequest}
        disabled={working || pending}
      >
        {spin ?? <X className="h-4 w-4" />}
        Cancel removal request
      </Button>
    );
  }

  // Default: owner removes directly; management/admin requests removal.
  return (
    <Button
      type="button"
      variant={isOwner ? "destructive" : "outline"}
      onClick={onRemove}
      disabled={working || pending || isSelf}
      title={isSelf ? "You can't remove your own account" : undefined}
    >
      {spin ?? <Trash2 className="h-4 w-4" />}
      {isOwner ? "Remove account" : "Request removal"}
    </Button>
  );
}
