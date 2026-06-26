import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official FUTEX logo.
 * - default: full horizontal lockup (X mark + FUTEX + tagline)
 * - showText={false}: compact X mark only (tight spaces / mobile bars)
 */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  if (!showText) {
    return (
      <Image
        src="/images/logo-mark.png"
        alt="FUTEX"
        width={40}
        height={40}
        className={cn("h-9 w-9 object-contain", className)}
        priority
      />
    );
  }
  return (
    <Image
      src="/images/logo-horizontal.png"
      alt="FUTEX — Future-Ready Power Solutions"
      width={320}
      height={95}
      className={cn("h-10 w-auto object-contain", className)}
      priority
    />
  );
}
