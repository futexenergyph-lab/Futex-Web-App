// Route access for the limited "Admin" (admin_staff) role.
// It may open only these modules; everything else (HR, 201 Files,
// Profitability, Settings, field area) is denied.

const ADMIN_STAFF_EXACT = new Set<string>([
  "/admin", // Bookings Kanban
  "/accounting", // Payments (current day only)
]);

const ADMIN_STAFF_PREFIX = [
  "/admin/clients",
  "/admin/deployment",
  "/admin/utilization",
  "/admin/live",
  "/admin/analytics",
  "/accounting/cashflow", // Accounting Overview
  "/accounting/expenses", // Expenses (input only)
];

/** Whether the limited Admin role may open the given path. */
export function adminStaffCanAccess(path: string): boolean {
  if (ADMIN_STAFF_EXACT.has(path)) return true;
  return ADMIN_STAFF_PREFIX.some(
    (p) => path === p || path.startsWith(p + "/"),
  );
}
