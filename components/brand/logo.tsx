import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-futex-gradient text-white">
        <Zap className="h-5 w-5" fill="currentColor" />
      </span>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          <span className="text-futex-blue">FUTEX</span>{" "}
          <span className="text-futex-green">Energy</span>
        </span>
      )}
    </div>
  );
}
