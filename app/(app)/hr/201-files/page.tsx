import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Employee201List } from "@/components/hr/employee-201";
import type { Profile } from "@/lib/types";

export const metadata = { title: "201 Files" };
export const dynamic = "force-dynamic";

export default async function Files201Page() {
  await requireRole(["hr", "admin"]);
  const supabase = createClient();
  const { data: officers } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .in("role", ["field_officer", "installer"])
    .order("full_name");

  const employees =
    (officers as Pick<Profile, "id" | "full_name" | "role" | "phone">[]) ?? [];

  // Personal data sheets surface here for each employee.
  const pdsById: Record<
    string,
    { photoUrl: string | null; data: Record<string, string> }
  > = {};
  if (employees.length > 0) {
    const { data: sheets } = await supabase
      .from("personal_data_sheets")
      .select("user_id, photo_url, data")
      .in(
        "user_id",
        employees.map((e) => e.id),
      );
    for (const s of (sheets as
      | {
          user_id: string;
          photo_url: string | null;
          data: Record<string, string>;
        }[]
      | null) ?? [])
      pdsById[s.user_id] = { photoUrl: s.photo_url, data: s.data ?? {} };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="201 Files"
        description="Employee files for field staff — personal data sheets and HR documents."
      />
      <Card>
        <CardContent className="pt-6">
          <Employee201List employees={employees} pdsById={pdsById} />
        </CardContent>
      </Card>
    </div>
  );
}
