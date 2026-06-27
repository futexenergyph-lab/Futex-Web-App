"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { completeInstallation } from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";

export interface ModuleStatus {
  label: string;
  ok: boolean;
}

/**
 * Green "Done installation" button shown at the bottom of the Docs tab. It is
 * disabled until every required module is complete (job order, commissioning,
 * confirmed payment, documentation). Pressing it moves the booking to
 * "completed".
 */
export function DoneInstallationButton({
  bookingId,
  modules,
  completed,
}: {
  bookingId: string;
  modules: ModuleStatus[];
  completed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (completed) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-green-600/10 p-3 text-sm font-medium text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Installation completed. This job has moved to your Client Master List.
      </div>
    );
  }

  const missing = modules.filter((m) => !m.ok);
  const ready = missing.length === 0;

  async function onDone() {
    setPending(true);
    try {
      const res = await completeInstallation(bookingId);
      if (res?.error) throw new Error(res.error);
      toast.success("Installation marked as completed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {!ready && (
        <div className="space-y-1.5 rounded-md border border-dashed p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Complete all modules to finish installation:
          </p>
          <ul className="space-y-1">
            {modules.map((m) => (
              <li
                key={m.label}
                className="flex items-center gap-2 text-xs"
              >
                {m.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className={m.ok ? "text-muted-foreground" : "text-red-600"}>
                  {m.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button
        onClick={onDone}
        disabled={!ready || pending}
        size="lg"
        className="w-full bg-green-600 text-white hover:bg-green-700 disabled:bg-green-600/40"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Done installation
      </Button>
    </div>
  );
}
