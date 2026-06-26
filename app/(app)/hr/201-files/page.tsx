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
    .eq("role", "field_officer")
    .order("full_name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="201 Files"
        description="Employee files for registered field officers. Click a name to view and attach documents."
      />
      <Card>
        <CardContent className="pt-6">
          <Employee201List
            employees={(officers as Pick<Profile, "id" | "full_name" | "role" | "phone">[]) ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
