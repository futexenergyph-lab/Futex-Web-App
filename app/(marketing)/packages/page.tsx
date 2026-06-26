import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { php } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Addon, Enclosure, Package } from "@/lib/types";

export const metadata = { title: "Packages & Pricing" };
export const revalidate = 60; // refresh pricing from DB at most once a minute

// Map a promo package to its official flyer image by protection type.
function promoFlyer(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("2-way")) return "/images/promo-standard.jpg";
  if (n.includes("3-way")) return "/images/promo-smart.jpg";
  return null;
}

// Map a standard installation package to its official flyer image.
function packageFlyer(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("package 1")) return "/images/pkg-1.jpg";
  if (n.includes("package 2")) return "/images/pkg-2.jpg";
  if (n.includes("package 3")) return "/images/pkg-3.jpg";
  if (n.includes("package 4")) return "/images/pkg-4.jpg";
  return null;
}

export default async function PackagesPage() {
  const supabase = createPublicClient();
  const [{ data: packages }, { data: enclosures }, { data: addons }] = supabase
    ? await Promise.all([
        supabase
          .from("packages")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("enclosures")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("addons")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const pkgs = (packages ?? []) as Package[];
  const promos = pkgs.filter((p) => p.is_promo);
  const standard = pkgs.filter((p) => !p.is_promo);

  return (
    <>
      <section className="bg-futex-gradient py-16 text-white">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold">Packages &amp; Pricing</h1>
          <p className="mt-4 text-lg text-white/90">
            Transparent pricing in Philippine Peso. Final totals are confirmed
            on site based on your installation requirements.
          </p>
        </div>
      </section>

      {promos.length > 0 && (
        <section className="container py-12">
          <h2 className="text-2xl font-bold">Promo packages</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {promos.map((p) => {
              const flyer = p.image_url || promoFlyer(p.name);
              return (
                <Card
                  key={p.id}
                  className="overflow-hidden border-futex-green/40"
                >
                  {flyer ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flyer} alt={p.name} className="w-full" />
                      <CardContent className="flex items-center justify-between gap-4 pt-6">
                        <div>
                          <p className="text-2xl font-bold text-futex-blue">
                            {php(p.base_price)}
                          </p>
                          {p.original_price && (
                            <p className="text-sm text-muted-foreground line-through">
                              {php(p.original_price)}
                            </p>
                          )}
                        </div>
                        <Button asChild size="lg">
                          <Link href="/contact#book">Book this promo</Link>
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <>
                      <CardHeader>
                        <Badge variant="accent" className="w-fit">
                          Promo
                        </Badge>
                        <CardTitle className="mt-2">{p.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-futex-blue">
                            {php(p.base_price)}
                          </span>
                          {p.original_price && (
                            <span className="text-lg text-muted-foreground line-through">
                              {php(p.original_price)}
                            </span>
                          )}
                        </div>
                        <ul className="mt-4 space-y-2">
                          {p.inclusions.map((inc) => (
                            <li
                              key={inc}
                              className="flex items-center gap-2 text-sm"
                            >
                              <CheckCircle2 className="h-4 w-4 text-futex-green" />
                              {inc}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="container py-6">
        <h2 className="text-2xl font-bold">Installation packages</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {standard.map((p) => {
            const flyer = p.image_url || packageFlyer(p.name);
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden">
                {flyer ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flyer} alt={p.name} className="w-full" />
                    <CardContent className="flex items-center justify-between gap-4 pt-6">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-2xl font-bold text-futex-blue">
                          {php(p.base_price)}
                        </p>
                      </div>
                      <Button asChild>
                        <Link href="/contact#book">Book now</Link>
                      </Button>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle>{p.name}</CardTitle>
                      <span className="text-2xl font-bold text-futex-blue">
                        {php(p.base_price)}
                      </span>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                      <ul className="space-y-2">
                        {p.inclusions.map((inc) => (
                          <li
                            key={inc}
                            className="flex items-start gap-2 text-sm"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-futex-green" />
                            {inc}
                          </li>
                        ))}
                      </ul>
                      {p.enclosure_included && (
                        <Badge variant="secondary" className="mt-3 w-fit">
                          Enclosure included
                        </Badge>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-2xl font-bold">Enclosure protection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your preferred metal/glass enclosure protection.
        </p>
        <Image
          src="/images/enclosures.jpg"
          alt="Choose your enclosure — Full Glass Premium Box, Full Metal Cybertruck, Standard Glass"
          width={1254}
          height={1254}
          className="mx-auto mt-6 w-full max-w-3xl rounded-xl border shadow-sm"
        />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">Enclosure options</h3>
            <div className="mt-4 space-y-3">
              {(enclosures as Enclosure[] | null)?.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border bg-background p-4"
                >
                  <span className="flex items-center gap-3 text-sm font-medium">
                    {e.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.image_url}
                        alt={e.name}
                        className="h-12 w-12 rounded-md border object-cover"
                      />
                    )}
                    {e.name}
                  </span>
                  <span className="font-semibold text-futex-blue">
                    {php(e.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Add-ons</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional box-only add-ons.
            </p>
          <div className="mt-4 space-y-3">
            {(addons as Addon[] | null)?.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border bg-background p-4"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  {a.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.image_url}
                      alt={a.name}
                      className="h-12 w-12 rounded-md border object-cover"
                    />
                  )}
                  {a.name}
                </span>
                <span className="font-semibold text-futex-blue">
                  {php(a.price)}
                </span>
              </div>
            ))}
          </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Additional wire is charged per linear meter and assessed on site.
              Any additional job works are quoted by the field officer during
              the on-site job order.
            </p>
          </div>
        </div>
      </section>

      <section className="container pb-16">
        <div className="rounded-2xl bg-secondary/60 px-8 py-10 text-center">
          <h2 className="text-2xl font-bold">Ready to book?</h2>
          <p className="mt-2 text-muted-foreground">
            Tell us your preferred package and we&apos;ll handle the rest.
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link href="/contact#book">Book an Installation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
