# TheNexus AI Sales Agent V3 - Overall Reply Quality Patch

## What changed

- Images are no longer treated as payment proof automatically.
  - If the customer sends a skin screenshot, the bot asks for the relevant ID/details.
  - If the customer sends a payment screenshot only when payment is pending, it is treated as payment proof.

- Added context-help replies.
  - If the bot asked for Riot ID/server/payment and the customer says "مش فاهم / مش عارف / ازاي", it explains the exact pending step instead of resetting the whole flow.

- Added gift explanation logic.
  - If the customer asks "ممكن افهم الاسكن الهديه" or similar, the bot explains gift flow instead of repeating TheNexus#0001-0008.

- Reduced wrong add-account spam.
  - TheNexus add accounts are only sent when the customer asks how to add / says not added / needs gift accounts.
  - They are not sent for Wild Rift cores.

- More AI-like quick replies.
  - Gemini now rewrites most non-sensitive, non-payment, non-price deterministic replies into natural Egyptian sales language.
  - Exact prices and payment numbers stay deterministic so they do not drift.

- Stronger no-noise behavior.
  - Stickers/emoji/noise do not trigger random sales offers.
  - Vague confusion is answered from conversation memory.

## Important env

Make sure these exist in Railway:

```env
GEMINI_API_KEY=your_gemini_key
GEMINI_CHAT_MODEL=gemini-1.5-flash
WHATSAPP_BUSINESS_ACCOUNT_ID=764970189288092
WHATSAPP_PHONE_NUMBER_ID=744566188730505
WHATSAPP_API_VERSION=v25.0
APP_BASE_URL=https://whatsapp-production-7a63.up.railway.app
```

Without GEMINI_API_KEY the bot will still work, but replies will feel more templated.

## Deployment

Upload/commit this project, then let Railway redeploy. The Dockerfile runs:

```bash
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy
node dist/src/index.js
```
