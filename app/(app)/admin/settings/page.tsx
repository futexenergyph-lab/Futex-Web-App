import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PackageList,
  SimpleItemList,
  WireRateEditor,
} from "@/components/admin/settings/pricing-editors";
import { UserManager } from "@/components/admin/settings/user-manager";
import type { Addon, Enclosure, Package, Profile } from "@/lib/types";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const [
    { data: packages },
    { data: enclosures },
    { data: addons },
    { data: wireSetting },
    { data: users },
  ] = await Promise.all([
    supabase.from("packages").select("*").order("sort_order"),
    supabase.from("enclosures").select("*").order("sort_order"),
    supabase.from("addons").select("*").order("sort_order"),
    supabase.from("settings").select("value").eq("key", "wire_rate_per_meter").single(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const wireRate = Number(wireSetting?.value ?? 200);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage pricing and user accounts. Changes to pricing update the public site live."
      />
      <Tabs defaultValue="packages">
        <TabsList className="flex-wrap">
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="enclosures">Enclosures</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>Installation packages</CardTitle>
            </CardHeader>
            <CardContent>
              <PackageList packages={(packages as Package[]) ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enclosures">
          <Card>
            <CardHeader>
              <CardTitle>Enclosure types</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleItemList
                kind="enclosure"
                items={(enclosures as Enclosure[]) ?? []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addons">
          <Card>
            <CardHeader>
              <CardTitle>Add-ons</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleItemList kind="addon" items={(addons as Addon[]) ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Variable rates</CardTitle>
            </CardHeader>
            <CardContent>
              <WireRateEditor rate={wireRate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User accounts &amp; roles</CardTitle>
            </CardHeader>
            <CardContent>
              <UserManager users={(users as Profile[]) ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
