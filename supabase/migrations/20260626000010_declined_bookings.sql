-- =============================================================================
-- Declined bookings
-- Adds a "declined" stage so management can accept or decline client-submitted
-- bookings; declined ones surface in their own Kanban column.
-- =============================================================================
alter type public.booking_status add value if not exists 'declined';
