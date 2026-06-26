import { Target, Eye, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <section className="bg-futex-gradient py-16 text-white">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold">About FUTEX Energy Solution</h1>
          <p className="mt-4 text-lg text-white/90">
            We are building the Philippines&apos; complete energy ecosystem —
            making future-ready power accessible, smart and reliable.
          </p>
        </div>
      </section>

      <section className="container max-w-3xl py-16">
        <h2 className="text-2xl font-bold">Our story</h2>
        <p className="mt-4 text-muted-foreground">
          FUTEX Energy Solution started with a simple belief: the shift to
          electric vehicles should be effortless for every Filipino household
          and business. As a DOE-Accredited Certified EV Charger Installer, we
          combine certified expertise with trusted hardware partners —
          Schneider Electric, TENGEN and Ewild — to deliver installations that
          are safe, smart and built to last.
        </p>
        <p className="mt-4 text-muted-foreground">
          Beyond charging, our vision is a complete energy ecosystem: solar
          integration, battery energy storage, energy monitoring and preventive
          maintenance, all working together to power a cleaner future.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <Target className="h-8 w-8 text-futex-blue" />
              <h3 className="mt-3 font-semibold">Mission</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Make future-ready power solutions accessible, smart and reliable
                for every Filipino home and business.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Eye className="h-8 w-8 text-futex-blue" />
              <h3 className="mt-3 font-semibold">Vision</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A Philippines powered by a complete, intelligent and sustainable
                energy ecosystem.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Network className="h-8 w-8 text-futex-blue" />
              <h3 className="mt-3 font-semibold">Ecosystem philosophy</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Charging, solar, storage and monitoring — designed to work
                together, not in isolation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
