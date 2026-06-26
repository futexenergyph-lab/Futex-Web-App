import Link from "next/link";
import Image from "next/image";
import {
  Home as HomeIcon,
  Building2,
  Factory,
  ShieldCheck,
  Zap,
  Sun,
  Plug,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Smartphone,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  COMPANY,
  ACCREDITATION,
  KEY_FEATURES,
  OUR_PROMISE,
  PARTNERS,
} from "@/lib/company";

const pillars = [
  {
    icon: Plug,
    title: "EV Charger Installation",
    desc: "Certified wall-charger installation for homes, condominiums and commercial sites.",
  },
  {
    icon: Sun,
    title: "Solar Power Energy Installation",
    desc: "Clean solar energy systems — where our journey began in 2023.",
  },
  {
    icon: Zap,
    title: "Electrical Solutions",
    desc: "Smart, safe electrical work backed by 3-way protection.",
  },
];

const audiences = [
  { icon: HomeIcon, title: "Home", desc: "Residential EV charging installed safely at your doorstep." },
  { icon: Building2, title: "Condominium", desc: "Shared and dedicated charging for condo parking." },
  { icon: Factory, title: "Commercial", desc: "Fleet and commercial-grade charging infrastructure." },
];

const featureIcons = [ShieldAlert, Smartphone, Box];

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
              <ShieldCheck className="h-4 w-4" /> {ACCREDITATION.title}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              {COMPANY.tagline}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-white/90">
              Professional EV charger installation for <strong>Home</strong>,{" "}
              <strong>Condominium</strong> and <strong>Commercial</strong> sites
              across the Philippines — with smart monitoring, 3-way protection
              and complete after-sales support.
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
            <p className="mt-6 text-xs text-white/70">
              DOE Accreditation No. {ACCREDITATION.number}
            </p>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="grid h-64 w-64 place-items-center rounded-3xl bg-white/10 backdrop-blur">
              <Zap className="h-32 w-32" fill="currentColor" />
            </div>
          </div>
        </div>
      </section>

      {/* Banner image */}
      <section className="bg-secondary/40 py-8">
        <div className="container">
          <Image
            src="/images/banner.jpg"
            alt="FUTEX EV Charger Installation — Home, Condominium, Commercial"
            width={1600}
            height={639}
            className="mx-auto w-full max-w-5xl rounded-xl border shadow-sm"
            priority
          />
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-y bg-background">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-futex-green" /> DOE-Accredited
          </span>
          <span>Trusted partners:</span>
          {PARTNERS.map((p) => (
            <span key={p} className="font-semibold text-foreground">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* Three pillars */}
      <section className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">What we do</h2>
          <p className="mt-3 text-muted-foreground">
            A complete clean-energy provider — charging, solar and electrical.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <Card key={p.title}>
              <CardContent className="pt-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-futex-gradient text-white">
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Key features */}
      <section className="bg-secondary/40 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Key features</h2>
            <p className="mt-3 text-muted-foreground">
              Built into every Futex installation.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {KEY_FEATURES.map((f, i) => {
              const Icon = featureIcons[i];
              return (
                <Card key={f.title}>
                  <CardContent className="pt-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-futex-blue">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="container py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="flex gap-4 rounded-lg border p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-futex-gradient text-white">
                <a.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
              </div>
            </div>
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

      {/* Our promise */}
      <section className="container py-16">
        <div className="rounded-2xl bg-futex-gradient px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-bold">Our promise</h2>
          <ul className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
            {OUR_PROMISE.map((b) => (
              <li
                key={b}
                className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {b}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button asChild size="lg" variant="accent">
              <Link href="/contact#book">Book Now</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm font-medium uppercase tracking-wide text-white/80">
            {COMPANY.closingLine}
          </p>
        </div>
      </section>
    </>
  );
}
