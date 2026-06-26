import { Facebook, Phone, MapPin } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { BookingForm } from "@/components/marketing/booking-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Contact & Book" };
export const revalidate = 60;

export default async function ContactPage() {
  const supabase = createPublicClient();
  const [{ data: packages }, { data: enclosures }] = await Promise.all([
    supabase
      .from("packages")
      .select("id,name")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("enclosures")
      .select("id,name")
      .eq("active", true)
      .order("sort_order"),
  ]);

  return (
    <>
      <section className="bg-futex-gradient py-16 text-white">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold">Contact &amp; Book</h1>
          <p className="mt-4 text-lg text-white/90">
            Book your installation online — no more back-and-forth on Messenger.
          </p>
        </div>
      </section>

      <section className="container grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Get in touch</h2>
          <Card>
            <CardContent className="space-y-4 pt-6 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-futex-blue" />
                <div>
                  <p className="font-medium">0961-449-6825</p>
                  <p className="text-muted-foreground">0968-477-2475</p>
                </div>
              </div>
              <a
                href="https://facebook.com/futexenergyph"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 hover:text-futex-blue"
              >
                <Facebook className="h-5 w-5 text-futex-blue" />
                <span className="font-medium">facebook.com/futexenergyph</span>
              </a>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-futex-blue" />
                <span className="text-muted-foreground">
                  Serving Metro Manila &amp; nearby provinces
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="book" className="scroll-mt-20">
          <h2 className="text-2xl font-bold">Book an installation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in your details and we&apos;ll confirm your schedule.
          </p>
          <div className="mt-6">
            <BookingForm
              packages={packages ?? []}
              enclosures={enclosures ?? []}
            />
          </div>
        </div>
      </section>
    </>
  );
}
