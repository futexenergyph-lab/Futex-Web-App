-- =============================================================================
-- Back Job Orders (after-sales support / maintenance tickets)
-- A back job order is a lightweight ticket raised for an already-completed
-- client who needs after-sales support or maintenance. It reuses the bookings
-- table so it flows through Deployment and the field officer dashboard, but is
-- flagged so the UI shows a simplified workflow (update, free-text job order,
-- optional payment, documentation, "Done Back Job Order").
-- =============================================================================
alter table public.bookings
  add column if not exists is_back_job_order boolean not null default false,
  add column if not exists parent_booking_id uuid
    references public.bookings(id) on delete set null,
  add column if not exists back_job_field_note text;

create index if not exists idx_bookings_back_job
  on public.bookings(is_back_job_order) where is_back_job_order;
