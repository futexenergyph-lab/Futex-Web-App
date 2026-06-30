"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth";

export interface UnreadAnnouncement {
  id: string;
  message: string;
  created_by_name: string | null;
  created_at: string;
}

/**
 * Owner / Management / Admin broadcast an announcement to everyone or to a
 * selected set of users. Returns the new id on success.
 */
export async function createAnnouncement(input: {
  message: string;
  audience: "all" | "specific";
  userIds: string[];
}) {
  const profile = await requireRole(["admin", "admin_staff"]); // owner inherits admin
  const supabase = createClient();

  const message = input.message.trim();
  if (!message) return { error: "Message is required." };
  if (input.audience === "specific" && input.userIds.length === 0) {
    return { error: "Select at least one user." };
  }

  const { data: created, error } = await supabase
    .from("announcements")
    .insert({
      message,
      audience: input.audience,
      created_by: profile.id,
      created_by_name: profile.full_name,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (input.audience === "specific") {
    const rows = input.userIds.map((user_id) => ({
      announcement_id: created.id,
      user_id,
    }));
    const { error: tErr } = await supabase
      .from("announcement_targets")
      .insert(rows);
    if (tErr) return { error: tErr.message };
  }

  revalidatePath("/announcements");
  revalidatePath("/notifications");
  return { ok: true };
}

/** Delete an announcement (Owner/Management/Admin). */
export async function deleteAnnouncement(id: string) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/announcements");
  revalidatePath("/notifications");
  return { ok: true };
}

/** Mark an announcement read for the current user (confirms the prompt). */
export async function markAnnouncementRead(id: string) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { error } = await supabase
    .from("announcement_reads")
    .upsert(
      { announcement_id: id, user_id: profile.id },
      { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
    );
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  return { ok: true };
}

/**
 * Announcements addressed to the current user that they have not yet confirmed.
 * Drives the centered prompt shown across the app.
 */
export async function getUnreadAnnouncements(): Promise<UnreadAnnouncement[]> {
  const profile = await requireProfile();
  const supabase = createClient();

  // RLS already limits visible announcements to ones addressed to this user.
  const { data: visible } = await supabase
    .from("announcements")
    .select("id, message, created_by_name, created_at")
    .order("created_at", { ascending: true });
  if (!visible || visible.length === 0) return [];

  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", profile.id);
  const readSet = new Set((reads ?? []).map((r) => r.announcement_id));

  return visible.filter((a) => !readSet.has(a.id)) as UnreadAnnouncement[];
}
