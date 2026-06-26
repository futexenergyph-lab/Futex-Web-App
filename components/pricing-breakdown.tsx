import { php } from "@/lib/utils";
import type { PricingResult } from "@/lib/pricing";
import { Separator } from "@/components/ui/separator";

export function PricingBreakdown({
  pricing,
  className,
}: {
  pricing: PricingResult;
  className?: string;
}) {
  return (
    <div className={className}>
      <ul className="space-y-1.5 text-sm">
        {pricing.lines.map((line, i) => (
          <li key={i} className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-medium tabular-nums">{php(line.amount)}</span>
          </li>
        ))}
        {pricing.lines.length === 0 && (
          <li className="text-muted-foreground">No line items yet.</li>
        )}
      </ul>
      <Separator className="my-3" />
      <div className="flex items-center justify-between text-base font-semibold">
        <span>Final Total</span>
        <span className="text-futex-blue tabular-nums">
          {php(pricing.finalTotal)}
        </span>
      </div>
    </div>
  );
}
