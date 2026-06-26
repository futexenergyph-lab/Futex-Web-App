import { z } from "zod";

export const bookingFormSchema = z.object({
  client_name: z.string().min(2, "Please enter your name"),
  email: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .or(z.literal("")),
  address: z.string().min(5, "Please enter the installation address"),
  contact_number: z
    .string()
    .min(7, "Please enter a valid contact number")
    .max(20),
  preferred_date: z.string().optional().or(z.literal("")),
  preferred_time: z.string().optional().or(z.literal("")),
  preferred_package_id: z.string().uuid().optional().or(z.literal("")),
  preferred_enclosure_id: z.string().uuid().optional().or(z.literal("")),
  enclosure_protection_notes: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

export const jobWorkSchema = z.object({
  description: z.string().min(1, "Describe the work"),
  amount: z.coerce.number().min(0, "Amount must be ≥ 0"),
});

export const jobOrderSchema = z.object({
  package_id: z.string().uuid("Select a package"),
  enclosure_id: z.string().uuid().optional().or(z.literal("")),
  add_separate_enclosure: z.boolean().default(false),
  additional_wire_meters: z.coerce.number().min(0).default(0),
  additional_job_works: z.array(jobWorkSchema).default([]),
  notes: z.string().optional().or(z.literal("")),
});

export type JobOrderValues = z.infer<typeof jobOrderSchema>;

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be ≥ 0"),
  method: z.enum(["cash", "check", "credit_card", "bank_transfer"]),
  reference_no: z.string().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userFormSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["admin", "field_officer", "installer", "accounting"]),
  phone: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});
