# TheNexus WhatsApp Business AI Agent

Production WhatsApp sales/support agent for TheNexus. The bot handles deterministic business replies first, then uses approved knowledge with Google Gemini when needed. It stores all conversations, supports human handoff, sensitive credential handling, FAQ suggestions, and an admin dashboard.

## Local Install

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:generate
npm run migrate
npm run build
npm run seed
npm run start
```

Run the worker in a second terminal:

```bash
npm run worker
```

For local TypeScript development:

```bash
npm run dev
npm run worker:dev
npm run dashboard:dev
```

## Required Env Vars

- `DATABASE_URL`
- `REDIS_URL`
- `ADMIN_API_KEY`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `GEMINI_API_KEY`
- `GEMINI_CHAT_MODEL=gemini-1.5-flash`
- `GEMINI_EMBEDDING_MODEL=text-embedding-004`
- `ENCRYPTION_KEY`
- `SECURE_FORM_URL`
- `DASHBOARD_ORIGIN`

Do not commit `.env` or real secrets. `.env.example` contains placeholders only.

## Railway Web Service

Use the repo root as the service directory.

Build command:

```bash
npm ci && npx prisma generate && npm run build
```

Start command:

```bash
npm run start
```

The Dockerfile also works on Railway and runs:

```bash
npx prisma migrate deploy && node dist/src/index.js
```

## Railway Worker Service

Create a second Railway service from the same repo and env vars.

Start command:

```bash
npm run worker
```

The web service receives webhooks quickly and queues jobs. The worker must be running to send replies.

## PostgreSQL and Redis

Use Railway PostgreSQL plus Redis. PostgreSQL must support `pgvector`. The compose file uses `pgvector/pgvector:pg16` locally.

Run migrations:

```bash
npm run migrate
```

Seed TheNexus knowledge, media catalog, payment methods, and settings:

```bash
npm run build
npm run seed
```

If Gemini quota is unavailable during seed, set `SEED_REINDEX=false` and reindex later from the dashboard.

## Meta Webhook Setup

Webhook callback URL:

```text
https://YOUR_WEB_SERVICE.up.railway.app/webhooks/whatsapp
```

Verify token must equal `WHATSAPP_VERIFY_TOKEN`.

Subscribe to WhatsApp messages. The webhook always returns `200` for valid payloads after enqueue attempts so Meta does not retry unnecessarily.

Optional signature verification:

```text
META_APP_SECRET=your-meta-app-secret
```

When set, the app verifies `X-Hub-Signature-256`.

## Test Number Allowed Recipients

Meta test phone numbers can only message recipients added in the WhatsApp Cloud API test console. If sending fails with a recipient or allowed-list error:

1. Open Meta for Developers.
2. Go to WhatsApp > API Setup.
3. Add the recipient phone number.
4. Confirm the verification code.

## Permanent Token Setup

Temporary Meta tokens expire quickly. For production:

1. Create a Meta Business system user.
2. Assign WhatsApp Business assets.
3. Generate a permanent access token.
4. Grant WhatsApp messaging permissions.
5. Set `WHATSAPP_ACCESS_TOKEN` in Railway.

Expired or access-denied token errors are logged as `whatsapp_access_denied_or_expired_token`.

## Adding Production WhatsApp Number

1. Add a real phone number to the WhatsApp Business Account.
2. Complete display name review.
3. Copy the production phone number ID.
4. Set `WHATSAPP_PHONE_NUMBER_ID`.
5. Restart web and worker services.

## Gemini API Key Setup

Create a Google AI Studio / Gemini API key and set:

```text
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

If Gemini quota or API calls fail, the bot sends a safe fallback and marks the conversation for admin review instead of crashing the worker.

## Dashboard Setup

Dashboard lives in `/dashboard`.

Local:

```bash
npm run dashboard:dev
```

Set:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Login with `ADMIN_API_KEY`.

Pages included:

- Login
- Conversations inbox
- Conversation detail and manual reply
- Knowledge base
- Media catalog with image previews
- FAQ suggestions
- Analytics
- Settings

## Admin API

All `/admin/*` routes except `/admin/login` require `x-admin-api-key: ADMIN_API_KEY`.

Core routes:

- `POST /admin/login`
- `GET /admin/conversations`
- `GET /admin/conversations/:id`
- `GET /admin/conversations/:id/messages`
- `POST /admin/conversations/:id/reply`
- `POST /admin/conversations/:id/handoff`
- `POST /admin/conversations/:id/ai-toggle`
- `GET /admin/knowledge`
- `POST /admin/knowledge`
- `PATCH /admin/knowledge/:id`
- `DELETE /admin/knowledge/:id`
- `POST /admin/knowledge/:id/approve`
- `POST /admin/knowledge/reindex`
- `GET /admin/media`
- `POST /admin/media`
- `PATCH /admin/media/:id`
- `DELETE /admin/media/:id`
- `POST /admin/media/:id/test-send`
- `GET /admin/faq-suggestions`
- `POST /admin/faq-suggestions/:id/approve`
- `GET /admin/analytics`
- `GET /admin/settings`
- `PATCH /admin/settings`
- `GET /health`

## Deterministic Replies

These happen before Gemini:

- Greetings
- Morning/evening greetings
- Payment methods
- Wild Rift image and caption
- League RP image and caption
- Valorant image and caption
- Riot gifts waiting rules
- Account selling/listing form
- Buying account questions
- Credential/sensitive handoff
- Human/admin handoff

## Troubleshooting

Access denied:
Check `WHATSAPP_ACCESS_TOKEN`, token permissions, and whether it is permanent.

Recipient not in allowed list:
Add the number in Meta WhatsApp API Setup while using a test number.

Temporary token expired:
Generate a permanent system-user token and restart services.

Worker not running:
Webhook will show `200` but no reply is sent. Start `npm run worker`.

Webhook `200` but no reply:
Check Redis, BullMQ worker logs, `WHATSAPP_PHONE_NUMBER_ID`, and Meta send errors.

Gemini quota:
Bot returns a safe fallback and creates an unresolved/admin handoff path. Upgrade quota or retry later.

Prisma/OpenSSL:
Railway/Docker uses `node:20-bookworm-slim` with `openssl` and `ca-certificates`. Run `npx prisma generate` during build.

## Verification

```bash
npm run build
npm test
npm run lint
npm run dashboard:build
npx prisma validate
```

## Production behavior update

- `https://www.thenexus.ink/` is used for account-selling submissions only.
- Normal top-up credentials are never requested in WhatsApp chat; sensitive access goes to admin handoff.
- Specific known SKU prices can be answered in text. General price requests still send the pricing image.
- Payment proof, delays, and complaints are routed to admin review.
- Sellers who do not know an account price should enter `0` in expected payout.
- First/Original Email explanation is built into the bot.

