# Database Webhooks — email notifications setup

This wires `inquiries` and `tour_bookings` INSERTs to the
`handle-form-submission` Edge Function, which emails Mrs. Piper (and, for
tour bookings, the visitor too) via Resend.

## 1. Deploy the Edge Function

From the `Aumnia-Group-Inc` folder, with the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in:

```bash
supabase functions deploy handle-form-submission --project-ref yxbmogimmvqczqufgqzy
```

## 2. Set the function's secrets

Set these once (Dashboard: **Project Settings → Edge Functions → Secrets**,
or via CLI):

```bash
supabase secrets set --project-ref yxbmogimmvqczqufgqzy \
  RESEND_API_KEY=your_resend_api_key_here \
  ADMIN_EMAIL=mrs.piper@example.com \
  DB_WEBHOOK_SECRET=generate_a_long_random_string_here
```

- `RESEND_API_KEY` — from your Resend dashboard (pending; use a placeholder
  until it's ready — the function will just fail to send until it's real).
- `ADMIN_EMAIL` — pending; Mrs. Piper's real inbox. Placeholder until given.
- `DB_WEBHOOK_SECRET` — you invent this value yourself (any long random
  string). It's how the function knows a request really came from Supabase's
  webhook and not a random POST from the internet — the webhook config in
  step 3 sends it as a header, and the function checks it matches. Generate
  one with `openssl rand -hex 32` or similar; save it somewhere, you'll paste
  it again in step 3.
- `RESEND_FROM_EMAIL` (optional) — e.g. `"Aumnia Group Inc. <hello@aumnia.com>"`.
  Until a sending domain is verified in Resend, omit this and the function
  falls back to Resend's shared test address, which only delivers to your
  own verified Resend account email — fine for testing, not for real visitor
  emails.

## 3. Create the two Database Webhooks

Dashboard → **Database → Webhooks → Create a new webhook**. Do this twice,
once per table — same target URL and secret header both times.

**Webhook A — on `inquiries`**
| Field | Value |
|---|---|
| Name | `notify-on-inquiry` |
| Table | `inquiries` |
| Events | `Insert` only |
| Type | `HTTP Request` |
| Method | `POST` |
| URL | `https://yxbmogimmvqczqufgqzy.supabase.co/functions/v1/handle-form-submission` |
| HTTP Headers | `Content-Type: application/json` and `x-webhook-secret: <the DB_WEBHOOK_SECRET value from step 2>` |

**Webhook B — on `tour_bookings`**
Same as above, except:
| Field | Value |
|---|---|
| Name | `notify-on-tour-booking` |
| Table | `tour_bookings` |

Leave the payload format as Supabase's default — the function expects the
standard `{ type, table, record, schema, old_record }` shape and does not
need a custom payload template.

## 4. Test it

Insert a test row directly in the Table Editor (Dashboard → Table Editor →
`inquiries` → Insert row, fill in name/email/message) and confirm an email
arrives at `ADMIN_EMAIL`. Do the same for `tour_bookings` with a
`requested_date`/`requested_time`, and confirm both the admin email and the
visitor confirmation email arrive.

Check **Edge Functions → handle-form-submission → Logs** in the dashboard if
nothing arrives — it will show the actual error (missing secret, bad Resend
key, etc.).
