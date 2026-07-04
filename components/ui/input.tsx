"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      onFocus={(e) => {
        // Select existing content so typing replaces it (no leftover digits
        // like a stray "0" when entering prices/quantities). Deferred so it
        // also works for number/date inputs on mobile Safari.
        const el = e.currentTarget;
        requestAnimationFrame(() => {
          try {
            el.select();
          } catch {
            /* some input types don't support select() */
          }
        });
        onFocus?.(e);
      }}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
