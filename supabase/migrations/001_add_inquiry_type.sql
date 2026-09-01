-- Adds inquiries.inquiry_type to match the "Select Inquiry/Request" dropdown
-- that already exists in Contact.html (general | investment | commercial | airbnb).
--
-- Needed because schema.sql was first run before this column was introduced.
-- Running the current schema.sql in full has the same effect; this file exists
-- so the change can be applied on its own to an already-provisioned database.
--
-- Safe to re-run.

alter table public.inquiries
  add column if not exists inquiry_type text;
