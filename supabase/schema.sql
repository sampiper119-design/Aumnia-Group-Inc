-- ============================================================================
-- Aumnia Group Inc. — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto; it's preinstalled on Supabase, but be safe.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

-- properties -----------------------------------------------------------------
create table if not exists public.properties (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  price       numeric(12,2),
  address     text,
  bedrooms    integer,
  bathrooms   numeric(3,1),                 -- numeric to allow half-baths (2.5)
  amenities   text[] not null default '{}',
  status      text  not null default 'draft'
              check (status in ('draft','active','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- property_images ------------------------------------------------------------
create table if not exists public.property_images (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists property_images_property_id_idx
  on public.property_images(property_id);

-- inquiries ------------------------------------------------------------------
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  message     text,
  property_id uuid references public.properties(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists inquiries_property_id_idx
  on public.inquiries(property_id);

-- tour_bookings --------------------------------------------------------------
create table if not exists public.tour_bookings (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text,
  property_id    uuid references public.properties(id) on delete set null,
  requested_date date not null,
  requested_time time not null,
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','cancelled')),
  created_at     timestamptz not null default now(),
  -- prevents two visitors booking the same date+time slot
  constraint tour_bookings_slot_unique unique (requested_date, requested_time)
);
create index if not exists tour_bookings_property_id_idx
  on public.tour_bookings(property_id);
create index if not exists tour_bookings_date_idx
  on public.tour_bookings(requested_date);

-- ----------------------------------------------------------------------------
-- updated_at trigger for properties
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- PUBLIC VIEW: tour_slots_public
-- Exposes ONLY date/time/status so the public calendar can mark slots taken,
-- without leaking visitor name/email/phone. The view is owned by postgres and
-- runs with definer rights, so it bypasses tour_bookings' RLS and returns the
-- three safe columns. (Supabase's linter may flag this as a "security definer
-- view" — that is intentional and safe here: only non-sensitive columns are
-- selected.)
-- ----------------------------------------------------------------------------
create or replace view public.tour_slots_public as
  select requested_date, requested_time, status
  from public.tour_bookings;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.properties      enable row level security;
alter table public.property_images enable row level security;
alter table public.inquiries       enable row level security;
alter table public.tour_bookings   enable row level security;

-- NOTE ON "admin": there is no signup flow and only Mrs. Piper's account will
-- exist, so we treat ANY authenticated user as the admin. If you ever add more
-- logins, tighten these `to authenticated` policies to a specific uid/email or
-- an is_admin() check.

-- properties -----------------------------------------------------------------
drop policy if exists "Public can view active properties" on public.properties;
create policy "Public can view active properties"
  on public.properties for select
  to anon
  using (status = 'active');

drop policy if exists "Admin full access to properties" on public.properties;
create policy "Admin full access to properties"
  on public.properties for all
  to authenticated
  using (true)
  with check (true);

-- property_images ------------------------------------------------------------
drop policy if exists "Public can view images of active properties" on public.property_images;
create policy "Public can view images of active properties"
  on public.property_images for select
  to anon
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_images.property_id
        and p.status = 'active'
    )
  );

drop policy if exists "Admin full access to property_images" on public.property_images;
create policy "Admin full access to property_images"
  on public.property_images for all
  to authenticated
  using (true)
  with check (true);

-- inquiries ------------------------------------------------------------------
-- Public may INSERT but never SELECT.
drop policy if exists "Public can submit inquiries" on public.inquiries;
create policy "Public can submit inquiries"
  on public.inquiries for insert
  to anon
  with check (true);

drop policy if exists "Admin full access to inquiries" on public.inquiries;
create policy "Admin full access to inquiries"
  on public.inquiries for all
  to authenticated
  using (true)
  with check (true);

-- tour_bookings --------------------------------------------------------------
-- Public may INSERT but never SELECT (they read availability via the view).
drop policy if exists "Public can book tours" on public.tour_bookings;
create policy "Public can book tours"
  on public.tour_bookings for insert
  to anon
  with check (true);

drop policy if exists "Admin full access to tour_bookings" on public.tour_bookings;
create policy "Admin full access to tour_bookings"
  on public.tour_bookings for all
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- GRANTS
-- Supabase usually pre-grants table privileges to anon/authenticated and lets
-- RLS do the gating, but we set them explicitly so intent is clear.
-- ----------------------------------------------------------------------------
grant select on public.properties      to anon, authenticated;
grant select on public.property_images to anon, authenticated;
grant insert on public.inquiries       to anon;
grant insert on public.tour_bookings   to anon;
grant select, insert, update, delete
  on public.properties, public.property_images, public.inquiries, public.tour_bookings
  to authenticated;

-- The public calendar reads availability from here only.
grant select on public.tour_slots_public to anon, authenticated;
