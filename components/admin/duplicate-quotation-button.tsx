"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { duplicateQuotation } from "@/app/(app)/admin/quotations/actions";
import { Button } from "@/components/ui/button";

/** Duplicates a quotation into a new quote (new quote number). */
export function DuplicateQuotationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDuplicate() {
    setPending(true);
    const res = await duplicateQuotation(id);
    setPending(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(`Duplicated as ${res.quoteNo}`);
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onDuplicate}
      disabled={pending}
      title="Duplicate as new quote"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
