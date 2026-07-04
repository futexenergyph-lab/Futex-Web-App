"use client";

import { RouteError } from "@/components/app/route-error";

export default function AccountingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} label="this page" />;
}
