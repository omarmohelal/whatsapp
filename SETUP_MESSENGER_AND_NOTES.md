# TheNexus bot update notes

## WhatsApp
- Keep these env vars pointing to the real production WhatsApp account:
  - WHATSAPP_BUSINESS_ACCOUNT_ID
  - WHATSAPP_PHONE_NUMBER_ID
  - WHATSAPP_ACCESS_TOKEN
  - WHATSAPP_API_VERSION=v25.0 or your active Graph version
  - APP_BASE_URL
- Webhook callback stays:
  - https://whatsapp-production-7a63.up.railway.app/webhooks/whatsapp
- Subscribe to `messages` and keep the app Published for real customer messages.

## Messenger
Add these env vars on Railway:

```env
MESSENGER_VERIFY_TOKEN=use-the-same-token-or-a-new-random-one
MESSENGER_PAGE_ACCESS_TOKEN=paste-page-access-token-here
```

In Meta Developers > Messenger API settings:
- Callback URL: `https://whatsapp-production-7a63.up.railway.app/webhooks/messenger`
- Verify token: the same value in `MESSENGER_VERIFY_TOKEN`
- Subscribe the Page to messages/messaging_postbacks.
- Generate/copy the Page access token and put it in Railway as `MESSENGER_PAGE_ACCESS_TOKEN`.

## Groups
WhatsApp Cloud API is designed for business 1-to-1 customer chats, not normal WhatsApp group auto-replies. Do not use unofficial WhatsApp Web libraries on the same number because they can risk the number/business.

## What changed
- Better Egyptian Arabic responses.
- Better payment flow.
- Wild Rift skin/pass prices from the current price image.
- Wild Rift key/orange calculator.
- Better Riot gift instructions.
- Account buy/sell messages improved.
- Messenger webhook + sending support added.
