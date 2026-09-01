# Email notifications — how they work

When a visitor submits the contact form or books a tour, a row is inserted into
`inquiries` or `tour_bookings`. A trigger on that table calls the
`handle-form-submission` Edge Function, which sends email through Resend.

```
browser → Supabase (insert row) → trigger → Edge Function → Resend → inbox
```

**This is already set up on the live project.** Nothing below needs doing
again unless you are rebuilding from scratch or rotating the secret.

## What's already configured

| Piece | Where it lives | Status |
|---|---|---|
| `handle-form-submission` function | `supabase/functions/` | deployed, ACTIVE |
| Triggers on both tables | `supabase/migrations/002_...sql` | applied |
| `DB_WEBHOOK_SECRET` | Edge Function secret + Vault | set, verified matching |
| `ADMIN_EMAIL` | Edge Function secret | set |
| `RESEND_API_KEY` | Edge Function secret | **NOT SET — blocks all email** |

The triggers are created in SQL (`pg_net`) rather than through the dashboard's
**Database → Webhooks** UI. Both approaches do the same thing, but the SQL
version lives in this repo and can be re-applied anywhere. If you look in the
dashboard's Webhooks tab you will see nothing listed — that is expected, and
does not mean it is broken. Check `information_schema.triggers` instead.

## The shared secret

The function refuses any request that doesn't present the right
`x-webhook-secret` header, so a random POST to its public URL can't send email
through it. The same value is stored in two places, which must match:

1. The `DB_WEBHOOK_SECRET` Edge Function secret
2. A Supabase Vault secret named `webhook_secret`, read by the trigger at runtime

Because it's read from Vault, the real value never appears in this repo.

To rotate it:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'webhook_secret'),
  'the-new-secret'
);
```

```bash
supabase secrets set --project-ref yxbmogimmvqczqufgqzy DB_WEBHOOK_SECRET=the-new-secret
```

## Finishing the setup (the one remaining step)

Email will not send until a Resend key exists. Create one at
[resend.com](https://resend.com) → **API Keys** → sending access, then:

```bash
supabase secrets set --project-ref yxbmogimmvqczqufgqzy RESEND_API_KEY=re_your_key_here
```

**Free-tier limitation worth knowing:** until a sending domain is verified in
Resend, you can only send to the address the Resend account was registered
with. Other recipients — including visitor confirmation emails — will not be
delivered. Verify a domain under Resend → **Domains** before launch.

Optionally set the "from" address once a domain is verified:

```bash
supabase secrets set --project-ref yxbmogimmvqczqufgqzy \
  RESEND_FROM_EMAIL="Aumnia Group Inc. <hello@yourdomain.com>"
```

## Testing and debugging

Insert a row and watch the queued HTTP call:

```sql
insert into public.inquiries (name, email, inquiry_type, message)
values ('Test', 'you@example.com', 'general', 'testing');

-- give it a few seconds, then:
select id, status_code, content from net._http_response order by id desc limit 1;
```

| Response | Meaning |
|---|---|
| `200` | Email sent |
| `401 Unauthorized` | Secret mismatch between Vault and the function secret |
| `500 RESEND_API_KEY is not set` | Expected until the Resend key is added |
| no row at all | Trigger didn't fire — check it exists on the table |

Function logs are under **Edge Functions → handle-form-submission → Logs** in
the dashboard.

## Redeploying the function after editing it

```bash
supabase functions deploy handle-form-submission --project-ref yxbmogimmvqczqufgqzy
```

The Docker warning is harmless — the deploy uploads through the API.
