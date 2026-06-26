import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Utilization" };
export const dynamic = "force-dynamic";

const SLOTS_PER_DAY = 2; // 9:00 AM & 2:00 PM baseline

export default async function UtilizationPage() {
  const supabase = createClient();

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["field_officer", "installer"])
    .eq("active", true)
    .order("full_name");

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, preferred_date, assigned_field_officer_id, assigned_installer_id, status",
    )
    .not("status", "in", "(closed)");

  // Tally assignments per person per day.
  type Key = string; // `${userId}|${date}`
  const counts = new Map<Key, number>();
  const dates = new Set<string>();
  for (const b of bookings ?? []) {
    const date = b.preferred_date ?? "Unscheduled";
    dates.add(date);
    for (const uid of [b.assigned_field_officer_id, b.assigned_installer_id]) {
      if (!uid) continue;
      const k = `${uid}|${date}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const sortedDates = [...dates].sort();

  const officers = (staff ?? []).filter((s) => s.role === "field_officer");
  const installers = (staff ?? []).filter((s) => s.role === "installer");

  function Section({
    title,
    people,
  }: {
    title: string;
    people: { id: string; full_name: string }[];
  }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Jobs assigned vs {SLOTS_PER_DAY} slots/day baseline.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {sortedDates.map((d) => (
                  <TableHead key={d} className="text-center">
                    {d === "Unscheduled" ? "Unscheduled" : formatDate(d)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  {sortedDates.map((d) => {
                    const n = counts.get(`${p.id}|${d}`) ?? 0;
                    const full = n >= SLOTS_PER_DAY;
                    const over = n > SLOTS_PER_DAY;
                    return (
                      <TableCell key={d} className="text-center">
                        <Badge
                          variant={
                            over
                              ? "destructive"
                              : full
                                ? "default"
                                : n > 0
                                  ? "accent"
                                  : "secondary"
                          }
                        >
                          {n}/{SLOTS_PER_DAY}
                        </Badge>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {people.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={sortedDates.length + 1}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No active staff.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilization"
        description="See who is underutilized across the 5 field officers and 5 installer teams."
      />
      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No scheduled bookings yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <Section title="Field Officers" people={officers} />
          <Section title="Installers" people={installers} />
        </>
      )}
    </div>
  );
}
