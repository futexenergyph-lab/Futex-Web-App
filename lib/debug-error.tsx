// TEMPORARY debug helpers to surface real server errors on screen.
// Remove once the admin dashboard issue is diagnosed.

export function isNextControlFlow(e: unknown): boolean {
  const d = (e as { digest?: string } | null)?.digest;
  return (
    typeof d === "string" &&
    (d.startsWith("NEXT_REDIRECT") || d === "NEXT_NOT_FOUND")
  );
}

export function DebugError({ where, error }: { where: string; error: unknown }) {
  const msg =
    error instanceof Error
      ? (error.stack ?? error.message)
      : (() => {
          try {
            return JSON.stringify(error, null, 2);
          } catch {
            return String(error);
          }
        })();
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="text-lg font-bold text-destructive">
          Debug error — {where}
        </h2>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs">
          {msg}
        </pre>
      </div>
    </div>
  );
}
