# Backend Status

Last updated: 2026-08-28

Backend work for the Aumnia site. The front end is being revised separately —
**nothing here restyles or restructures existing pages.** Backend changes are
limited to minimal hooks: a form attribute, an empty status element, script
tags, and new files under `javascript/` and `supabase/`.

## Progress: 3 of 7 steps complete

| # | Step | Status |
|---|---|---|
| 1 | Database schema + security rules | ✅ Complete, live |
| 2 | Email notifications (Edge Function + triggers) | ⚠️ Built & wired — needs a Resend API key to actually send |
| 3 | Contact form → database | ✅ Complete, verified end to end |
| 4 | Tour scheduling calendar | ⬜ Not started |
| 5 | Admin page (property management) | ⬜ Not started |
| 6 | Properties page → live data | ⬜ Not started |
| 7 | Full README + setup guide | ⬜ Not started |

## What works right now

Submitting the contact form on `Contact.html` writes a real row to the
`inquiries` table. This was verified in a browser against the live database,
including the failure path — if the insert fails, the visitor sees an error
rather than a false "Inquiry Received".

A trigger on that table calls the email function on every insert. The whole
chain is confirmed working; the final send fails only because no Resend API
key has been added yet.

## Architecture

Supabase free tier for everything, no custom server:

- **Postgres** — all data
- **Auth** — admin login (Step 5)
- **Storage** — property images, bucket `property-images` (ready, unused so far)
- **Edge Function** — outbound email via Resend

The browser talks to Supabase directly using the public anon key in
`javascript/supabase-client.js`. That key is *meant* to be public — Row Level
Security decides what it can actually touch. Those policies are the real
security boundary, so treat `supabase/schema.sql` with care.

### Database

| Table | Purpose | Public access |
|---|---|---|
| `properties` | Listings | Read only when `status = 'active'` |
| `property_images` | Images per property | Read only for active properties |
| `inquiries` | Contact form submissions | Insert only — cannot be read back |
| `tour_bookings` | Tour requests | Insert only — cannot be read back |
| `tour_slots_public` (view) | Which slots are taken | Read only; date/time/status, no personal details |

Visitors can submit an inquiry but cannot read anyone else's. The calendar can
show that a slot is taken without exposing who booked it. Only a logged-in
admin can read full submissions or edit listings.

`tour_bookings` has a uniqueness rule on date + time, so the database itself
rejects a double-booking even if two people submit at the same moment.

## Files added

```
supabase/
  schema.sql                    tables, policies, view  (run once; safe to re-run)
  config.toml                   CLI config for deploying the function
  functions/
    handle-form-submission/     Deno function that sends email via Resend
  migrations/
    001_add_inquiry_type.sql    adds the contact form's category column
    002_email_notification_webhooks.sql   triggers that call the function
  webhooks/README.md            how email works + how to finish setup

javascript/
  supabase-client.js            shared client setup — load before other scripts
  contact-form.js               contact form submit handler

BACKEND-STATUS.md               this file
.gitignore                      excludes local secrets and CLI state
```

### Changes to existing files

Deliberately kept to a minimum:

- **`Contact.html`** — added `data-backend="supabase"` to the form, an empty
  `<p id="formStatus">`, and three `<script>` tags before `</body>`. No markup
  or styling touched.
- **`javascript/main.js`** — the placeholder submit handler showed the success
  modal unconditionally, which would have told visitors their message was
  received even when it failed to save. It now skips forms marked
  `data-backend="supabase"` and lets the real handler decide. Seven lines.

## If you're picking this up

**Don't rename** these without updating the JS: the form's `data-backend`
attribute, the field names `name` / `email` / `phone` / `inquiry` / `message`,
`#formStatus`, and `#form-modal`. Restyling them is fine — the JS selects by
name and id, not by class or position.

**The calendar widget on `Contact.html`** currently uses placeholder logic in
`main.js` and doesn't save anything. Step 4 replaces that with real booking.
Its existing element ids (`#daysGrid`, `#timeSlot`, `#confirmTimeBtn`, etc.)
will be reused, so keep them.

**`Properties.html`** is hardcoded to one listing today. Step 6 makes it render
from the database.

Local setup: no build step. Serve the folder over HTTP and open
`Contact.html` — opening the file directly with `file://` will not work.

```bash
npx http-server . -p 5500 -c-1
```

## Outstanding

Needed to finish Step 2:

- **Resend API key** — the only thing blocking email. See
  `supabase/webhooks/README.md`.
- **A verified sending domain in Resend** — until then, email only reaches the
  address the Resend account was registered with. Visitor confirmation emails
  will not be delivered.

Needed before Step 5:

- **An admin user** — created manually in Supabase (Authentication → Users).
  There is no signup flow by design; the site has one operator.
