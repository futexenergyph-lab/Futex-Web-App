import {
  Car,
  Building,
  Truck,
  Cpu,
  BatteryCharging,
  Sun,
  Server,
  Activity,
  Wrench,
  MessagesSquare,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KEY_FEATURES, OUR_PROMISE } from "@/lib/company";

export const metadata = { title: "Services" };

const services = [
  { icon: Car, title: "Residential EV Charging", desc: "Safe, certified home charger installation." },
  { icon: Building, title: "Commercial EV Charging", desc: "Charging infrastructure for businesses and properties." },
  { icon: Truck, title: "Fleet EV Charging", desc: "Scalable charging for commercial fleets." },
  { icon: Cpu, title: "Smart EV Systems", desc: "App-connected, intelligent charging and control." },
  { icon: BatteryCharging, title: "Portable Chargers", desc: "Flexible charging wherever you need it." },
  { icon: Sun, title: "Solar Integration", desc: "Pair EV charging with clean solar energy." },
  { icon: Server, title: "BESS", desc: "Battery Energy Storage Systems for resilience." },
  { icon: Activity, title: "Energy Monitoring", desc: "Real-time usage insights and optimization." },
  { icon: Wrench, title: "Preventive Maintenance", desc: "Keep your systems running at peak." },
  { icon: MessagesSquare, title: "Technical Consultation", desc: "Expert guidance for your energy needs." },
];

const process = [
  ["Consultation", "We assess your site and charging needs."],
  ["Design", "We design the right system for your space."],
  ["Installation", "Certified installers set everything up safely."],
  ["Smart Monitoring", "Connect to the Futex Smart App."],
  ["Testing", "We verify performance and safety."],
  ["Orientation", "We walk you through using your system."],
  ["After-Sales", "Ongoing support and maintenance."],
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-futex-gradient py-16 text-white">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold">Services</h1>
          <p className="mt-4 text-lg text-white/90">
            A complete energy ecosystem — from EV charging to solar, storage and
            monitoring.
          </p>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.title}>
              <CardContent className="flex gap-4 pt-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-futex-blue">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-16">
        <div className="container max-w-4xl">
          <h2 className="text-center text-3xl font-bold">Our 7-step process</h2>
          <div className="mt-10 space-y-4">
            {process.map(([title, desc], i) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-lg border bg-background p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-futex-blue text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key features */}
      <section className="container max-w-5xl py-16">
        <h2 className="text-center text-3xl font-bold">Key features</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {KEY_FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Our promise */}
      <section className="bg-futex-gradient py-16 text-white">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Our promise</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {OUR_PROMISE.map((p) => (
              <li
                key={p}
                className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
