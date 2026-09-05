import { ScopedExpenses } from "../scoped-expenses";

export const metadata = { title: "Operational Expense" };
export const dynamic = "force-dynamic";

export default function OperationalExpensesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  return (
    <ScopedExpenses
      scope="office"
      from={searchParams.from}
      to={searchParams.to}
    />
  );
}
