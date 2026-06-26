import Link from "next/link";
import {
  Home as HomeIcon,
  Building2,
  Factory,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const audiences = [
  { icon: HomeIcon, title: "Home", desc: "Residential EV charging installed safely at your doorstep." },
  { icon: Building2, title: "Condominium", desc: "Shared and dedicated charging for condo parking." },
  { icon: Factory, title: "Commercial", desc: "Fleet and commercial-grade charging infrastructure." },
];

const partners = ["Schneider Electric", "TENGEN", "Ewild"];

const steps = [
  "Consultation",
  "Design",
  "Installation",
  "Smart Monitoring",
  "Testing",
  "Orientation",
  "After-Sales",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-futex-gradient text-white">
        <div className="container grid gap-8 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <ShieldCheck className="h-4 w-4" /> DOE-Accredited Certified EV
              Charger Installer
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Future-Ready Power Solutions
            </h1>
            <p className="mt-4 max-w-lg text-lg text-white/90">
              Professional EV charger installation for homes, condominiums and
              commercial sites across the Philippines — backed by smart
              monitoring and complete after-sales support.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/contact#book">
                  Book an Installation <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/packages">View Packages &amp; Pricing</Link>
              </Button>
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="grid h-64 w-64 place-items-center rounded-3xl bg-white/10 backdrop-blur">
              <Zap className="h-32 w-32" fill="currentColor" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-b bg-secondary/40">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-futex-green" /> DOE-Accredited
          </span>
          <span>Trusted partners:</span>
          {partners.map((p) => (
            <span key={p} className="font-semibold text-foreground">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* What we do */}
      <section className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">What we do</h2>
          <p className="mt-3 text-muted-foreground">
            EV charger installation tailored to where you charge.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {audiences.map((a) => (
            <Card key={a.title}>
              <CardContent className="pt-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-futex-gradient text-white">
                  <a.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 7-step process */}
      <section className="bg-secondary/40 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Our 7-step process</h2>
            <p className="mt-3 text-muted-foreground">
              From first consult to lasting after-sales support.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div
                key={s}
                className="flex items-center gap-3 rounded-lg border bg-background p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-futex-blue text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="rounded-2xl bg-futex-gradient px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to go electric?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Book your EV charger installation today. Our team will reach out to
            confirm your schedule and finalize your package on site.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="accent">
              <Link href="/contact#book">Book Now</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/services">Explore Services</Link>
            </Button>
          </div>
          <ul className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {["Certified installers", "Smart app monitoring", "After-sales support"].map(
              (b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> {b}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>
    </>
  );
}
