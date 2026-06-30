// Shared application types mirroring the Supabase schema (Phase 1 migrations).

export type UserRole =
  | "owner"
  | "admin"
  | "admin_staff"
  | "field_officer"
  | "installer"
  | "accounting"
  | "hr";

export type BookingStatus =
  | "new"
  | "scheduled"
  | "deployed"
  | "on_site"
  | "in_progress"
  | "completed"
  | "paid"
  | "closed"
  | "declined";

export type BookingSource = "manual" | "web";
export type AttendanceType = "time_in" | "time_out";
export type JobOrderStatus = "draft" | "submitted" | "locked";
export type PaymentMethod = "cash" | "check" | "credit_card" | "bank_transfer";
export type PaymentStatus = "pending" | "confirmed" | "declined";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  photo_url: string | null;
  active: boolean;
  deletion_requested_at: string | null;
  deletion_requested_by: string | null;
  created_at: string;
  updated_at: string;
}

// Roles only the Owner may grant or modify.
export const ELEVATED_ROLES: UserRole[] = ["owner", "admin"];

export interface Package {
  id: string;
  name: string;
  description: string | null;
  inclusions: string[];
  base_price: number;
  enclosure_included: boolean;
  is_promo: boolean;
  original_price: number | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enclosure {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Addon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  client_number: string | null;
  client_name: string;
  email: string | null;
  address: string;
  contact_number: string;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_package_id: string | null;
  preferred_enclosure_id: string | null;
  enclosure_protection_notes: string | null;
  notes: string | null;
  source: BookingSource;
  status: BookingStatus;
  assigned_field_officer_id: string | null;
  assigned_installer_id: string | null;
  deployed_at: string | null;
  installer_confirmed_at: string | null;
  installer_declined_at: string | null;
  installation_done_at: string | null;
  field_officer_arrived_at: string | null;
  installer_arrived_at: string | null;
  installer_done_at: string | null;
  is_back_job_order: boolean;
  parent_booking_id: string | null;
  back_job_field_note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobWork {
  description: string;
  amount: number;
}

export interface JobOrder {
  id: string;
  booking_id: string;
  field_officer_id: string | null;
  package_id: string | null;
  enclosure_id: string | null;
  add_separate_enclosure: boolean;
  additional_wire_meters: number;
  wire_rate_per_meter: number;
  additional_job_works: JobWork[];
  computed_subtotal: number;
  final_total: number;
  notes: string | null;
  signature: string | null;
  status: JobOrderStatus;
  submitted_at: string | null;
  change_requested_at: string | null;
  change_request_reason: string | null;
  change_approved_at: string | null;
  change_approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingDocument {
  id: string;
  booking_id: string;
  kind: string;
  title: string;
  storage_path: string;
  data: unknown;
  created_by: string | null;
  created_at: string;
}

// Lightweight job-order shape embedded in booking queries so the Kanban can
// flag pending "request to change" approvals without a second round-trip.
export interface JobOrderChangeFlag {
  id: string;
  final_total: number;
  change_requested_at: string | null;
  change_request_reason: string | null;
  change_approved_at: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  booking_id: string | null;
  type: AttendanceType;
  timestamp: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface JobUpdate {
  id: string;
  booking_id: string;
  user_id: string;
  message: string | null;
  photo_urls: string[];
  created_at: string;
}

export interface Payment {
  id: string;
  job_order_id: string | null;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  reference_no: string | null;
  proof_url: string | null;
  confirmed_by_field_officer_id: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Documentation {
  id: string;
  booking_id: string;
  field_officer_id: string | null;
  file_urls: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Booking with joined relations commonly needed in the UI.
export interface BookingWithRelations extends Booking {
  preferred_package?: Pick<Package, "id" | "name" | "base_price"> | null;
  preferred_enclosure?: Pick<Enclosure, "id" | "name" | "price"> | null;
  assigned_field_officer?: Pick<Profile, "id" | "full_name"> | null;
  assigned_installer?: Pick<Profile, "id" | "full_name"> | null;
  job_orders?: JobOrderChangeFlag[] | null;
}

export const BOOKING_STATUSES: BookingStatus[] = [
  "new",
  "scheduled",
  "deployed",
  "on_site",
  "in_progress",
  "completed",
  "paid",
  "closed",
  "declined",
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: "New",
  scheduled: "Scheduled",
  deployed: "Deployed",
  on_site: "On-Site",
  in_progress: "In Progress",
  completed: "Completed",
  paid: "Paid",
  closed: "Closed",
  declined: "Declined",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Management",
  admin_staff: "Admin",
  field_officer: "Field Officer",
  installer: "Installer",
  accounting: "Accounting",
  hr: "HR",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
};

export const DAILY_SLOTS = ["09:00", "14:00"] as const;

// ---------------------------------------------------------------------------
// Expenses (payables / outflows)
// ---------------------------------------------------------------------------
export type ExpenseType =
  | "meals"
  | "transportation"
  | "utilities"
  | "labors"
  | "repairs_maintenance"
  | "supplies"
  | "rental"
  | "others";

export const EXPENSE_TYPES: ExpenseType[] = [
  "meals",
  "transportation",
  "utilities",
  "labors",
  "repairs_maintenance",
  "supplies",
  "rental",
  "others",
];

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  meals: "Meals",
  transportation: "Transportation",
  utilities: "Utilities",
  labors: "Labors",
  repairs_maintenance: "Repairs & Maintenance",
  supplies: "Supplies",
  rental: "Rental",
  others: "Others",
};

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "admin_reviewed"
  | "finalized";

export interface Expense {
  id: string;
  expense_date: string;
  type: ExpenseType;
  description: string | null;
  amount: number;
  status: ExpenseStatus;
  booking_id: string | null;
  submission_id: string | null;
  submitted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
