"use client";

import { RouteError } from "@/components/app/route-error";

export default function HrError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} label="the HR module" />;
}
