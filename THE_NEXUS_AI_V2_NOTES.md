# TheNexus AI Sales Agent V2

This build changes the bot from rigid templates to an AI-first sales assistant with deterministic guardrails only where they are needed.

## What changed

- Gemini now handles greetings and most natural sales/support messages so replies feel human and contextual.
- Deterministic replies remain only for exact prices, payment numbers, sensitive credentials, images/catalogs, and handoff-critical events.
- Quick deterministic replies can be rewritten by Gemini before sending, while preserving prices, IDs, links, and policy.
- Wild Rift context is remembered: after a price image, `10 الاف كور`, `10000`, or `10000 كور` now goes straight to the exact price and payment step.
- The bot no longer asks `كورز ولا جيفت ولا اكونت` after the customer already chose cores or a core amount.
- League gifts are separated from Wild Rift. TheNexus#0001..0008 are only sent when the customer actually needs add accounts.
- Payment choices are crisp: `انستا باي` returns only InstaPay details, `فودافون` returns only Vodafone Cash details.
- Non-local payment methods are handed to admin because details can change.
- Less spam: greetings go to AI, short acknowledgements are ignored if no real follow-up is needed, and repeated similar replies are skipped.
- Gemini temperature raised to make replies less robotic without inventing facts.

## Required environment

Use the same existing variables plus Gemini:

```env
GEMINI_API_KEY=your_key
GEMINI_CHAT_MODEL=gemini-1.5-flash
WHATSAPP_BUSINESS_ACCOUNT_ID=764970189288092
WHATSAPP_PHONE_NUMBER_ID=744566188730505
WHATSAPP_API_VERSION=v25.0
APP_BASE_URL=https://whatsapp-production-7a63.up.railway.app
```

For Messenger:

```env
MESSENGER_VERIFY_TOKEN=your_verify_token
MESSENGER_PAGE_ACCESS_TOKEN=your_page_token
META_APP_SECRET=your_meta_app_secret
```

## Quick checks after deploy

1. Send: `السلام عليكم`  
   Expected: a natural greeting asking what the customer needs, not a menu.

2. Send: `عايز اسعار وايلد ريفت`  
   Expected: Wild Rift price image.

3. Then send: `10 الاف كور`  
   Expected: `10000 Wild Cores سعرها 4935 EGP` and payment method question.

4. Send: `انستا باي`  
   Expected: only InstaPay number and proof request.

5. Send: `هشحن جيفت ليج`  
   Expected: ask for Riot ID, server, skin/item name, and mention 7-day wait.

6. Send a sticker twice.  
   Expected: one clarification max, then no spam.

## Dashboard

Run API:

```bash
npm install
npx prisma generate
npm run dev
```

Run dashboard:

```bash
cd dashboard
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 npm run dev
```

Open:

```text
http://localhost:3001
```
