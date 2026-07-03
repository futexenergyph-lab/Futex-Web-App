-- Structured payload for solar quotations (proposed cost rows + product detail
-- blocks with brand, inclusion and standard-material checklists).
alter table public.quotations
  add column if not exists details jsonb;
