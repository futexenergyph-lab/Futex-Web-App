import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PersonalDataSheet } from "@/components/field/personal-data-sheet";
import type { PdsValues } from "@/lib/pds";

export const metadata = { title: "Personal Data Sheet" };
export const dynamic = "force-dynamic";

export default async function PdsPage() {
  const profile = await requireRole(["field_officer", "installer"]);
  const supabase = createClient();

  const [
    {
      data: { user },
    },
    { data: pds },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("personal_data_sheets")
      .select("photo_url, data")
      .eq("user_id", profile.id)
      .maybeSingle(),
  ]);

  const row = (pds as { photo_url: string | null; data: PdsValues } | null) ?? null;
  // Default the full name from the profile when the sheet is empty.
  const initialData: PdsValues = {
    full_name: profile.full_name,
    ...(row?.data ?? {}),
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Personal Data Sheet"
        description="Keep your personal and emergency details up to date for HR."
      />
      <Card>
        <CardContent className="pt-6">
          <PersonalDataSheet
            userId={profile.id}
            email={user?.email ?? ""}
            initialPhotoUrl={row?.photo_url ?? null}
            initialData={initialData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
