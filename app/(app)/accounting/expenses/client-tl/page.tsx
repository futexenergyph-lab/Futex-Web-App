import { ScopedExpenses } from "../scoped-expenses";

export const metadata = { title: "Client/TL Expense" };
export const dynamic = "force-dynamic";

export default function ClientTlExpensesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  return (
    <ScopedExpenses
      scope="field"
      from={searchParams.from}
      to={searchParams.to}
    />
  );
}
