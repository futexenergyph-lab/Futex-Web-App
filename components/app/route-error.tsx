"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared graceful fallback for App Router `error.tsx` boundaries. Turns an
 * opaque server-side crash (white screen + "Application error … Digest") into a
 * friendly card with a working retry, and logs the error for diagnostics.
 * Most SSR failures on these pages are transient (cold start / upstream
 * hiccup), so a retry usually succeeds.
 */
export function RouteError({
  error,
  reset,
  label = "this page",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  label?: string;
}) {
  useEffect(() => {
    // Surfaces in the browser console and Vercel function logs.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold">Couldn’t load {label}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Something went wrong while loading. This is usually temporary — please
        try again.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
          Ref: {error.digest}
        </p>
      )}
      <div className="mt-6">
        <Button type="button" onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
