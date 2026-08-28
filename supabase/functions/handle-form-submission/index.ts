// ============================================================================
// handle-form-submission
//
// Purpose: send transactional email (via Resend) whenever a visitor submits
// the Contact form (-> `inquiries` row) or books a property tour
// (-> `tour_bookings` row).
//
// This function is NOT called from the browser. It is called server-to-server
// by a Supabase Database Webhook that fires on INSERT into `inquiries` and
// `tour_bookings` (see supabase/webhooks/README.md for the exact dashboard
// setup). The browser only ever talks to Supabase directly via the anon key
// + RLS (see javascript/supabase-client.js) — it never calls this function.
//
// Expected request shape: Supabase's default Database Webhook payload —
//   {
//     "type": "INSERT",
//     "table": "inquiries" | "tour_bookings",
//     "record": { ...the new row... },
//     "schema": "public",
//     "old_record": null
//   }
//
// Auth: this function has JWT verification disabled (see supabase/config.toml)
// because Database Webhooks are not end-user requests. Instead it checks a
// shared secret header (`x-webhook-secret`) set on the webhook config in the
// dashboard, so only Supabase's webhook can successfully call it.
//
// Required secrets (Project Settings -> Edge Functions -> Secrets, or
// `supabase secrets set`):
//   RESEND_API_KEY      - Resend transactional email API key
//   ADMIN_EMAIL         - Mrs. Piper's inbox; receives every notification
//   DB_WEBHOOK_SECRET   - shared secret the webhook must present
//   RESEND_FROM_EMAIL   - optional; "from" address (defaults to Resend's
//                          shared test sender until a domain is verified)
//
// Auto-provided by the Supabase Edge Runtime (no setup needed):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Aumnia Group Inc. <onboarding@resend.dev>";

interface WebhookPayload {
  type: string;
  table: string;
  record: Record<string, unknown>;
  schema: string;
  old_record: Record<string, unknown> | null;
}

interface EmailRequest {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function sendEmail(email: EmailRequest): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(email),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}

// Best-effort property title lookup so emails read "Loving Hills" instead of
// a bare UUID. Uses the service role key (server-side only) so it works
// regardless of RLS. Never throws — a lookup failure just omits the title.
async function fetchPropertyTitle(propertyId: unknown): Promise<string | null> {
  if (!propertyId || typeof propertyId !== "string") return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/properties?id=eq.${propertyId}&select=title`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

// ADMIN_EMAIL may hold several comma-separated addresses, so every admin gets
// notified. Resend expects an array of addresses, not one comma-joined string.
function adminRecipients(): string[] {
  const raw = Deno.env.get("ADMIN_EMAIL");
  if (!raw) throw new Error("ADMIN_EMAIL is not set");

  const addresses = raw
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  if (addresses.length === 0) throw new Error("ADMIN_EMAIL is empty");
  return addresses;
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function handleInquiry(record: Record<string, unknown>): Promise<void> {
  const recipients = adminRecipients();
  const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || DEFAULT_FROM;
  const propertyTitle = await fetchPropertyTitle(record.property_id);

  const html = `
    <h2>New Website Inquiry</h2>
    <p><b>Name:</b> ${escapeHtml(record.name)}</p>
    <p><b>Email:</b> ${escapeHtml(record.email)}</p>
    <p><b>Phone:</b> ${escapeHtml(record.phone) || "(not provided)"}</p>
    <p><b>Regarding:</b> ${escapeHtml(record.inquiry_type) || "General"}</p>
    ${propertyTitle ? `<p><b>Property:</b> ${escapeHtml(propertyTitle)}</p>` : ""}
    <p><b>Message:</b><br>${escapeHtml(record.message)}</p>
  `;

  await sendEmail({
    from: fromAddress,
    to: recipients,
    subject: `New Inquiry from ${String(record.name ?? "a visitor")}`,
    html,
  });
}

async function handleTourBooking(record: Record<string, unknown>): Promise<void> {
  const recipients = adminRecipients();
  const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || DEFAULT_FROM;
  const propertyTitle = await fetchPropertyTitle(record.property_id);
  const dateLabel = escapeHtml(record.requested_date);
  const timeLabel = escapeHtml(record.requested_time);

  // Notify the admins.
  await sendEmail({
    from: fromAddress,
    to: recipients,
    subject: `New Tour Booking: ${dateLabel} ${timeLabel}`,
    html: `
      <h2>New Property Tour Booking</h2>
      <p><b>Name:</b> ${escapeHtml(record.name)}</p>
      <p><b>Email:</b> ${escapeHtml(record.email)}</p>
      <p><b>Phone:</b> ${escapeHtml(record.phone) || "(not provided)"}</p>
      ${propertyTitle ? `<p><b>Property:</b> ${escapeHtml(propertyTitle)}</p>` : ""}
      <p><b>Requested:</b> ${dateLabel} at ${timeLabel}</p>
    `,
  });

  // Confirm with the visitor, if they gave us an email.
  const visitorEmail = record.email;
  if (typeof visitorEmail === "string" && visitorEmail.includes("@")) {
    await sendEmail({
      from: fromAddress,
      to: [visitorEmail],
      subject: "Your Aumnia Group Inc. Tour Request",
      html: `
        <h2>Thanks for booking a tour!</h2>
        <p>We've received your request for <b>${dateLabel} at ${timeLabel}</b>${
        propertyTitle ? ` for <b>${escapeHtml(propertyTitle)}</b>` : ""
      }.</p>
        <p>Our team will follow up shortly to confirm.</p>
      `,
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("DB_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (payload.type !== "INSERT" || !payload.record) {
    // Not an insert we care about (e.g. UPDATE/DELETE) — acknowledge and skip.
    return jsonResponse({ skipped: true });
  }

  try {
    if (payload.table === "inquiries") {
      await handleInquiry(payload.record);
    } else if (payload.table === "tour_bookings") {
      await handleTourBooking(payload.record);
    } else {
      return jsonResponse({ error: `Unhandled table: ${payload.table}` }, 400);
    }
  } catch (err) {
    console.error("handle-form-submission error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  return jsonResponse({ ok: true });
});
