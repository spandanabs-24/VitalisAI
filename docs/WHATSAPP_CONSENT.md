# WhatsApp report sharing — Twilio consent flow (VITALIS)

This document describes the **auditable, consent-first** path for sending a health report over WhatsApp. SMS and in-app “copy text” remain client-only; **only the WhatsApp button** uses the backend + Twilio.

## Flow (sequence)

1. The user enters an **India mobile** number in the share panel and taps **Send via WhatsApp**.
2. The frontend calls `POST /api/whatsapp/send-consent` with `phone` and `reportText`. The backend validates the number, stores a **ConsentRequest** (`PENDING`), and sends the fixed consent template via Twilio:

   > Hi 👋 Is this your WhatsApp number? VITALIS wants permission to share your health report. Reply YES to continue.

3. Twilio delivers that message to the user’s WhatsApp thread from your configured sender.
4. When the user replies, Twilio calls **`POST /api/whatsapp/webhook`** on your public URL. The handler verifies the **Twilio signature**, logs the inbound body to the **message audit log**, and:
   - **NO** (or `nope` / `stop` / `cancel` as first token) → request **DECLINED**.
   - **YES** (case-insensitive: whole message `yes` / `y`, or first word `yes`) → sets **CONSENTED**, then sends the stored report text via WhatsApp, then **REPORT_SENT** or **FAILED** if Twilio errors.
5. The frontend polls **`GET /api/whatsapp/consent-status?request_id=…`** until a terminal state.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/whatsapp/send-consent` | Start consent; body JSON `{ "phone": "…", "reportText": "…" }` |
| `GET` | `/api/whatsapp/consent-status?request_id=<uuid>` | Poll status |
| `GET` | `/api/whatsapp/audit-logs?request_id=<uuid>` | Audit trail for this consent request |
| `POST` | `/api/whatsapp/webhook` | Twilio inbound (form-urlencoded) |

### `send-consent` body

- **`phone`**: Accepts `10` national digits (`6–9…`), `91XXXXXXXXXX`, or `+91…`. Normalized to **E.164** `+91…` for India.
- **`reportText`**: Full report string (min length **20** on server; truncated to backend max if needed).

### Consent status values

| Status | Meaning |
|--------|---------|
| `PENDING` | Consent message sent; awaiting reply |
| `CONSENTED` | User replied YES; consent recorded (report is being sent) |
| `REPORT_SENT` | User replied YES; report message sent |
| `FAILED` | Twilio error or send failure |
| `DECLINED` | User replied NO (or equivalent) |
| `EXPIRED` | `PENDING` older than **24h** (TTL) |

### Concurrency

- At most **one** `PENDING` request per national number (digits key). A second `send-consent` returns **409**.

## Data model (memory + persisted JSON store)

> **Note:** Storage is **in-process**, but snapshots are written to a JSON file so the latest consent/audit can survive process restarts. Production should use Redis/SQL with the same fields.

- **ConsentRequest**: `id`, `phone_e164`, `status`, `report_text`, `created_at`, `updated_at`, `consent_message_sid`, `report_message_sid`, `last_error`
- **MessageLogEntry** (audit, last 500): `id`, `direction` (`INBOUND` / `OUTBOUND`), `to_addr`, `from_addr`, `body` (preview), `timestamp`, `consent_request_id`, `twilio_message_sid`

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Auth token (used for API + signature validation) |
| `TWILIO_WHATSAPP_FROM` | Yes* | Sender, e.g. `whatsapp:+14155238886` (sandbox) |
| `TWILIO_WHATSAPP_NUMBER` | Alias | Same as `TWILIO_WHATSAPP_FROM` if the former unset |
| `TWILIO_WEBHOOK_PUBLIC_URL` | Yes* | **Exact** public URL of this service’s webhook (what Twilio POSTs to) |
| `WEBHOOK_URL` | Alias | Same as `TWILIO_WEBHOOK_PUBLIC_URL` if unset |
| `WHATSAPP_DATA_DIR` | Optional | Where to write `whatsapp_store.json` (default: backend/data; in serverless, falls back to tmp) |
| `TWILIO_SKIP_SIGNATURE_VALIDATION` | Optional (dev only) | If set to `1`, skips signature verification for local testing |

\*For local experiments without Twilio, omit these; `send-consent` returns **503** with a clear message.

**Signature check:** `TWILIO_WEBHOOK_PUBLIC_URL` / `WEBHOOK_URL` must match the URL Twilio signs **character-for-character** (including `https`, host, and path `/api/whatsapp/webhook`). If you use ngrok, paste the **https** forwarding URL + path.

## Local development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env   # fill keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
copy .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

### Expose the webhook (ngrok)

1. Run ngrok: `ngrok http 8000`
2. Set in backend `.env`:

   `TWILIO_WEBHOOK_PUBLIC_URL=https://<id>.ngrok-free.app/api/whatsapp/webhook`

3. In [Twilio Console](https://console.twilio.com/) → **Messaging** → **Senders** / your WhatsApp sandbox → set **When a message comes in** to that **same** URL (`POST`).

4. Restart `uvicorn` after env changes.

### Sandbox testing

1. Join the Twilio WhatsApp sandbox from your phone using the join code Twilio shows.
2. From the app, send consent to that phone; confirm the consent text arrives.
3. Reply **YES**; confirm the report arrives.
4. Optional: reply **NO** on a fresh consent and confirm status becomes **DECLINED**.

## Production notes

- Use a **stable HTTPS** URL (your API domain), not ngrok.
- Store consent + audit in a **database**; scale-out requires shared storage. The JSON snapshot is a best-effort dev aid.
- Restrict **CORS** (`ALLOWED_ORIGINS`) to your frontend origin(s).
- Rotate `TWILIO_AUTH_TOKEN` on compromise; signature validation uses the same token.

## Security checklist

- [ ] Webhook URL in Twilio matches `TWILIO_WEBHOOK_PUBLIC_URL` exactly.
- [ ] `X-Twilio-Signature` enforced (403 on mismatch).
- [ ] Secrets only in env / secret manager, not in git.
- [ ] HTTPS termination valid in production.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 403 on webhook | URL mismatch vs Twilio config; trailing slash; http vs https |
| 503 on send-consent | Missing Twilio env vars |
| 409 pending | Wait for YES/NO/expiry, or other channel |
| Poll stuck on PENDING | Webhook not reachable; Twilio debugger logs; ngrok running |
