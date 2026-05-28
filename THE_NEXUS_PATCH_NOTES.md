# TheNexus smart replies patch

## What changed

- Reduced aggressive deterministic replies.
- Fixed Wild Rift flow so after a customer asks for prices and then says `10 تلاف كور` / `10000 كور`, the bot gives the exact price instead of asking `Cores ولا Skin/Gift` again.
- The bot now remembers the selected game/service and keeps moving forward instead of restarting the menu.
- Better Egyptian Arabic prompts for Gemini.
- Safer fallback message without the annoying `حصلت مشكلة` wording.
- League Skin/Gift flow is separate from Wild Rift add accounts.
- TheNexus add accounts are only sent when the customer actually needs to add accounts.
- Payment proof and handoff replies are shorter and cleaner.
- Added clear rules for Wild Rift core and skin prices in the AI system context.

## Dashboard local run

Backend:

```bash
npm install
npx prisma generate
npm run dev
```

Dashboard:

```bash
cd dashboard
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 npm run dev
```

Open:

```text
http://localhost:3001
```

Login with your `ADMIN_API_KEY` from Railway env.

## Railway notes

Your current Railway backend service only runs the API/worker. The dashboard is a separate Next.js app in `dashboard/`.

The easiest production setup is to create a second Railway service from the same repo:

- Root directory: `dashboard`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Env:
  - `NEXT_PUBLIC_API_BASE_URL=https://whatsapp-production-7a63.up.railway.app`

Then set backend env:

```env
DASHBOARD_ORIGIN=https://YOUR-DASHBOARD-SERVICE.up.railway.app
```

## Messenger setup

Backend env required:

```env
MESSENGER_VERIFY_TOKEN=use_the_same_verify_token_or_new_random_string
MESSENGER_PAGE_ACCESS_TOKEN=PAGE_ACCESS_TOKEN_FROM_META
META_APP_SECRET=APP_SECRET_FROM_META
```

Meta Messenger webhook:

```text
Callback URL: https://whatsapp-production-7a63.up.railway.app/webhooks/messenger
Verify token: same value as MESSENGER_VERIFY_TOKEN
```

Subscribe the page to `messages`, `messaging_postbacks`, and `messaging_optins` if available.

## Important

Do not put passwords in WhatsApp. For account access, admin should handle the customer securely.
