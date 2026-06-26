-- =============================================================================
-- Booking email + client number
--   email          -> client email captured on submission
--   client_number  -> reference number assigned manually by admin/management
--                     before deployment
-- =============================================================================
alter table public.bookings
  add column if not exists email text,
  add column if not exists client_number text;
