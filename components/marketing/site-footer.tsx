import Link from "next/link";
import { Facebook, Phone, MapPin, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { COMPANY, ACCREDITATION } from "@/lib/company";

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            {COMPANY.legalName} — {COMPANY.tagline}. {ACCREDITATION.title}{" "}
            building the Philippines&apos; complete energy ecosystem.
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-futex-green" />
            DOE Accreditation No. {ACCREDITATION.number}
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Company</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-foreground">About</Link></li>
            <li><Link href="/services" className="hover:text-foreground">Services</Link></li>
            <li><Link href="/packages" className="hover:text-foreground">Packages &amp; Pricing</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Get in touch</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {COMPANY.phones.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {p}
              </li>
            ))}
            <li>
              <a
                href={COMPANY.facebook}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Facebook className="h-4 w-4" /> {COMPANY.facebookHandle}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {COMPANY.address}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
