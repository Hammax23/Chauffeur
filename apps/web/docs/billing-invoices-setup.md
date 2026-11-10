# Billing & Invoices — owner setup (sensitive)

## What shipped

- Canonical tax invoices on `PAID` (website, app, pay-later webhook)
- Immutable fare snapshot + sequential `INV-YYYY-######`
- PDF (primary Cloudinary) + customer email attachment
- Outbox jobs for QuickBooks Online + Dropbox (retryable)
- Credit notes on Stripe `charge.refunded`
- Supplement invoices when fare adjustments become `PAID`
- Admin role `OWNER` | `BILLING_ASSISTANT`
- Panel: `/admin/billing`

## Required env

```bash
# Tax invoice letterhead
BILLING_LEGAL_NAME="SARJ Worldwide Chauffeur Services"
BILLING_ADDRESS_LINE1="231 Oak Park Blvd"
BILLING_ADDRESS_LINE2="Oakville, ON L6H 7S8"
BILLING_HST_NUMBER="YOUR-CRA-HST-NUMBER"   # required for compliant PDFs
BILLING_EMAIL="reserve@sarjworldwide.ca"
BILLING_PHONE="+1 416-893-5779"

# Encrypt OAuth tokens at rest (32-byte hex preferred)
INTEGRATION_TOKEN_ENCRYPTION_KEY="paste-64-hex-chars-here"

# QuickBooks Online (owner OAuth)
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=https://YOUR_DOMAIN/api/admin/billing/oauth/quickbooks/callback
QUICKBOOKS_REALM_ID=                     # pin production company
QUICKBOOKS_ENV=production                # or sandbox
QUICKBOOKS_ITEM_INCOME_ID=               # accountant maps these
QUICKBOOKS_ITEM_GRATUITY_ID=
QUICKBOOKS_ITEM_HST_ID=
# QUICKBOOKS_ALLOW_NON_PROD=true         # only for sandbox testing

# Dropbox Business (owner OAuth)
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REDIRECT_URI=https://YOUR_DOMAIN/api/admin/billing/oauth/dropbox/callback
DROPBOX_INVOICES_ROOT=/SARJ/Invoices
# DROPBOX_ALLOW_NON_PROD=true

# Cron to drain outbox (32-byte hex). Never put this in URLs or client code.
CRON_SECRET=
# GET/POST /api/cron/invoice-jobs
# Header only: Authorization: Bearer $CRON_SECRET
# Query ?secret= is rejected on purpose
```

## Cron (email / QB / Dropbox retries)

Endpoint: `POST|GET /api/cron/invoice-jobs` every **5–15 minutes** (recommend **10**).

**Auth rules**
- Requires `CRON_SECRET` env on the server
- `Authorization: Bearer <CRON_SECRET>` only
- `?secret=` query is always **401** (log / Referer leak)

**Manual / local test** (dev server running):

```bash
cd apps/web
npm run cron:invoice-jobs
# or:
# CRON_BASE_URL=https://YOUR_DOMAIN npm run cron:invoice-jobs
```

Expected JSON: `{ "success": true, "claimed": N, "done": N, "failed": N, "at": "..." }`

**Linux / VPS crontab** (every 10 min):

```cron
*/10 * * * * cd /path/to/Chauffeur/apps/web && /usr/bin/node scripts/hit-invoice-cron.mjs >> /var/log/sarj-invoice-cron.log 2>&1
```

Ensure production `.env` / host env has the same `CRON_SECRET` and set `CRON_BASE_URL=https://YOUR_DOMAIN` (or `NEXT_PUBLIC_APP_URL`).

**Windows Task Scheduler** (local / Windows VPS): every 10 minutes run

`powershell -NoProfile -Command "cd C:\path\to\Chauffeur\apps\web; node scripts\hit-invoice-cron.mjs"`

**curl** (production):

```bash
curl -sS -X POST "https://YOUR_DOMAIN/api/cron/invoice-jobs" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Accept: application/json"
```

## DB

```bash
cd apps/web
npx prisma db push
npx prisma generate
```

## Hire billing assistant

1. Admin Users → Add user → role **Billing Assistant**
2. They see **Bookings** (Reservations, Live Auto, Custom Reservation, Quotes) + **Billing & Invoices**
3. Deactivate = immediate offboard (they cannot reconnect QB/Dropbox)

## Go-live checklist

- [ ] `BILLING_HST_NUMBER` set
- [ ] Accountant confirms QB item/tax mapping
- [ ] Owner connects QuickBooks on production (optional until accountant ready)
- [x] Dropbox prod redirect URI documented (`https://YOUR_DOMAIN/api/admin/billing/oauth/dropbox/callback`)
- [ ] Owner reconnects Dropbox on production after redirect URI is live in Dropbox console
- [ ] Staging cannot write prod QB/Dropbox (default blocked; do not set `*_ALLOW_NON_PROD` on prod)
- [x] Cron route hardened + `npm run cron:invoice-jobs` (schedule every 5–15 min on host)
- [x] Invoice email + PDF professional layout (logo, items table, Paid/Due, credit notes)
- [ ] Test one paid booking end-to-end (PDF email + Dropbox archive)
