-- =============================================================================
-- Done-installation automation: lets the app push a client's package cost
-- lines / wire / purchases into client_financials (owner-locked by RLS) when
-- the assigned field officer marks the installation done. Security definer
-- with an explicit assignment check; every line kind is deduped so repeat
-- calls can never double the values.
-- =============================================================================

create or replace function public.insert_internal_lines(p_booking uuid, p_lines jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  inserted int := 0;
  l jsonb;
  existing_projects text[];
begin
  if not exists (
    select 1 from bookings b
    where b.id = p_booking
      and (b.assigned_field_officer_id = auth.uid() or public.is_owner())
  ) then
    raise exception 'not allowed';
  end if;

  select coalesce(array_agg(distinct project_name), '{}')
    into existing_projects
    from client_financials
   where booking_id = p_booking and project_name is not null;

  for l in select * from jsonb_array_elements(p_lines) loop
    if l->>'project_name' is not null then
      -- Package template lines: skip if this template was already loaded.
      if l->>'project_name' = any(existing_projects) then continue; end if;
    elsif (l->>'description') like 'Additional wire%' then
      if exists (select 1 from client_financials cf
                  where cf.booking_id = p_booking
                    and cf.description like 'Additional wire%') then continue; end if;
    else
      if exists (select 1 from client_financials cf
                  where cf.booking_id = p_booking
                    and cf.description = l->>'description') then continue; end if;
    end if;

    insert into client_financials
      (booking_id, entry_date, project_name, expense_type, description,
       amount, remarks, created_by, created_by_name)
    values
      (p_booking,
       nullif(l->>'entry_date', '')::date,
       l->>'project_name',
       coalesce(l->>'expense_type', 'Materials'),
       coalesce(l->>'description', ''),
       coalesce((l->>'amount')::numeric, 0),
       l->>'remarks',
       auth.uid(),
       l->>'created_by_name');
    inserted := inserted + 1;
  end loop;
  return inserted;
end $$;

revoke all on function public.insert_internal_lines(uuid, jsonb) from public;
grant execute on function public.insert_internal_lines(uuid, jsonb) to authenticated;
