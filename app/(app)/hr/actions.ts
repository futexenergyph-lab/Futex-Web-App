"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

/**
 * HR / Management / Owner save (upsert) an employee's Personal Data Sheet from
 * the 201 files — including Position & Date Hired, which only these roles fill.
 */
export async function saveEmployeePds(input: {
  userId: string;
  photoUrl: string | null;
  data: Record<string, string>;
}) {
  await requireRole(["hr", "admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("personal_data_sheets").upsert(
    {
      user_id: input.userId,
      photo_url: input.photoUrl,
      data: input.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/hr/201-files");
  return { ok: true };
}
