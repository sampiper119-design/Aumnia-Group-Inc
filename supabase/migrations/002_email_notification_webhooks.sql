-- ============================================================================
-- Email notification webhooks
--
-- Fires the handle-form-submission Edge Function whenever a visitor submits
-- the contact form (`inquiries`) or books a tour (`tour_bookings`), so the
-- admins get an email.
--
-- This is the SQL equivalent of creating two Database Webhooks in the
-- dashboard. It is built directly on pg_net rather than the dashboard's
-- `supabase_functions.http_request` helper, because that schema only exists
-- once webhooks have been enabled through the UI at least once. Doing it here
-- keeps the whole setup reproducible from this repo.
--
-- The shared secret must match the DB_WEBHOOK_SECRET Edge Function secret, or
-- the function rejects every call with 401. It is kept in Supabase Vault
-- (encrypted at rest) and read at trigger runtime, so the real value never
-- appears in this migration and this file is safe to commit.
--
-- The Vault secret must exist before the triggers can send anything. Create it
-- once with:
--   select vault.create_secret('<the-secret>', 'webhook_secret', 'description');
-- Rotate it later with:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'webhook_secret'),
--     '<new-secret>'
--   );
-- then update the DB_WEBHOOK_SECRET Edge Function secret to match.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_form_submission()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  function_url text := 'https://yxbmogimmvqczqufgqzy.supabase.co/functions/v1/handle-form-submission';
  webhook_secret text;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'webhook_secret'
  limit 1;

  if webhook_secret is null or webhook_secret = '' then
    raise warning 'vault secret "webhook_secret" is not configured; skipping email notification';
    return new;
  end if;

  -- Fire-and-forget: pg_net queues the request and returns immediately, so a
  -- slow or failing email never blocks or rolls back the visitor's insert.
  perform net.http_post(
    url     := function_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', webhook_secret
               ),
    body    := jsonb_build_object(
                 'type', 'INSERT',
                 'table', tg_table_name,
                 'schema', tg_table_schema,
                 'record', to_jsonb(new),
                 'old_record', null
               ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists notify_on_inquiry on public.inquiries;
create trigger notify_on_inquiry
  after insert on public.inquiries
  for each row execute function public.notify_form_submission();

drop trigger if exists notify_on_tour_booking on public.tour_bookings;
create trigger notify_on_tour_booking
  after insert on public.tour_bookings
  for each row execute function public.notify_form_submission();
