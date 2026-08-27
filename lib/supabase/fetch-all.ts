// PostgREST caps a single select at 1,000 rows. Tables like client_financials
// grow past that, which silently truncates any "fetch everything" query and
// makes aggregates (per-client expenses, ledger totals) come up short.
// fetchAllRows pages through the full result set. Give the query a stable
// order (e.g. .order("id")) so pages never overlap or skip rows.
export async function fetchAllRows<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let i = 0; ; i += PAGE) {
    const { data } = await query(i, i + PAGE - 1);
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}
