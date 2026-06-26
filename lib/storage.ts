"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Upload a file into a private bucket under the current user's folder
 * ({uid}/...). Returns the stored object path (NOT a public URL).
 */
export async function uploadToBucket(
  bucket: string,
  file: File,
  userId: string,
  subPath?: string,
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const path = [userId, subPath, `${stamp}.${ext}`].filter(Boolean).join("/");

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/**
 * Upload an image into the public `pricing` bucket and return its public URL.
 * Used for admin-managed pricing photos shown on the marketing site.
 */
export async function uploadPricingImage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from("pricing").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("pricing").getPublicUrl(path);
  return data.publicUrl;
}

/** Create a short-lived signed URL for a private object. */
export async function signedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
