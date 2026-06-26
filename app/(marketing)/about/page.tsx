import Image from "next/image";
import { Target, Eye, ShieldCheck, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  COMPANY,
  ACCREDITATION,
  MISSION,
  VISION,
  OUR_STORY,
  OUR_COMMITMENT,
  LEADERS,
} from "@/lib/company";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <section className="bg-futex-gradient py-16 text-white">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold">About {COMPANY.legalName}</h1>
          <p className="mt-4 text-lg text-white/90">
            {COMPANY.tagline} — building the Philippines&apos; complete energy
            ecosystem, from solar to EV charging.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container max-w-5xl py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <Target className="h-8 w-8 text-futex-blue" />
              <h2 className="mt-3 text-xl font-bold">Mission</h2>
              <p className="mt-2 text-sm text-muted-foreground">{MISSION}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Eye className="h-8 w-8 text-futex-blue" />
              <h2 className="mt-3 text-xl font-bold">Vision</h2>
              <p className="mt-2 text-sm text-muted-foreground">{VISION}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Our story + team photo */}
      <section className="bg-secondary/40 py-16">
        <div className="container grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Our story</h2>
            <p className="mt-4 text-muted-foreground">{OUR_STORY}</p>
            <div className="mt-6 rounded-lg border bg-background p-5">
              <h3 className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-5 w-5 text-futex-green" /> Our
                commitment
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {OUR_COMMITMENT}
              </p>
            </div>
          </div>
          <Image
            src="/images/team.jpg"
            alt="The FUTEX team"
            width={992}
            height={560}
            className="w-full rounded-xl border shadow-sm"
          />
        </div>
      </section>

      {/* Leaders */}
      <section className="container max-w-5xl py-16">
        <h2 className="text-center text-3xl font-bold">Our leaders</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {LEADERS.map((l) => (
            <Card key={l.name} className="overflow-hidden">
              <div className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
                <Image
                  src={l.photo}
                  alt={l.name}
                  width={140}
                  height={140}
                  className="h-32 w-32 shrink-0 rounded-full border object-cover"
                />
                <div>
                  <h3 className="text-lg font-bold">{l.name}</h3>
                  <p className="text-sm font-medium text-futex-blue">
                    {l.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{l.bio}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Accreditation */}
      <section className="bg-secondary/40 py-16">
        <div className="container grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-futex-green/15 px-3 py-1 text-xs font-semibold text-futex-green">
              <Award className="h-4 w-4" /> Accredited
            </span>
            <h2 className="mt-3 text-3xl font-bold">{ACCREDITATION.title}</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="font-medium">Accreditation No.</dt>
                <dd className="text-muted-foreground">{ACCREDITATION.number}</dd>
              </div>
              <div>
                <dt className="font-medium">Issuing authority</dt>
                <dd className="text-muted-foreground">
                  {ACCREDITATION.authority}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Level</dt>
                <dd className="text-muted-foreground">{ACCREDITATION.level}</dd>
              </div>
              <div>
                <dt className="font-medium">Valid until</dt>
                <dd className="text-muted-foreground">
                  {ACCREDITATION.validUntil}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Registered office</dt>
                <dd className="text-muted-foreground">{COMPANY.address}</dd>
              </div>
            </dl>
          </div>
          <Image
            src="/images/doe-certificate.jpg"
            alt="DOE Certificate of Accreditation"
            width={760}
            height={1000}
            className="mx-auto w-full max-w-sm rounded-xl border shadow-md"
          />
        </div>
      </section>
    </>
  );
}
