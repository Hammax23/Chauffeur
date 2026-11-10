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

# Cron to drain outbox
CRON_SECRET=
# GET/POST /api/cron/invoice-jobs  Authorization: Bearer $CRON_SECRET
```

## DB

```bash
cd apps/web
npx prisma db push
npx prisma generate
```

## Hire billing assistant

1. Admin Users → Add user → role **Billing Assistant**
2. They only see **Billing & Invoices**
3. Deactivate = immediate offboard (they cannot reconnect QB/Dropbox)

## Go-live checklist

- [ ] `BILLING_HST_NUMBER` set
- [ ] Accountant confirms QB item/tax mapping
- [ ] Owner connects QuickBooks + Dropbox on production
- [ ] Staging cannot write prod QB/Dropbox (default blocked)
- [ ] Cron hits `/api/cron/invoice-jobs` every 5–15 min
- [ ] Test one paid booking end-to-end (PDF email + archives)
