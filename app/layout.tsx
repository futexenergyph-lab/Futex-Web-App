import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "FUTEX Energy Solution — Future-Ready Power Solutions",
    template: "%s · FUTEX Energy Solution",
  },
  description:
    "DOE-Accredited Certified EV Charger Installer. Residential, commercial and fleet EV charging, smart systems, solar integration and energy monitoring across the Philippines.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
