-- =============================================================================
-- Allow the approver (management/owner/limited admin) to DECLINE a field-
-- recorded payment so the field officer can correct and resubmit it.
-- =============================================================================
alter type public.payment_status add value if not exists 'declined';
