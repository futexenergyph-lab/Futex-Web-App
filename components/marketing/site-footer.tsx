import Link from "next/link";
import { Facebook, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="container grid gap-8 py-12 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Future-Ready Power Solutions. DOE-Accredited Certified EV Charger
            Installer building the Philippines&apos; complete energy ecosystem.
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
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> 0961-449-6825
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> 0968-477-2475
            </li>
            <li>
              <a
                href="https://facebook.com/futexenergyph"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Facebook className="h-4 w-4" /> facebook.com/futexenergyph
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} FUTEX Energy Solution. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
