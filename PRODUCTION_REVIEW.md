# TheNexus WhatsApp Agent - Production Review

## 1) Legality and operational risk

This is not legal advice. The model is a gaming top-up/account marketplace workflow and should be reviewed against local law, Meta WhatsApp policies, Riot terms, tax/payment requirements, and payment provider rules.

### Main risks

- **Account credentials:** Asking for passwords in WhatsApp is high-risk. The bot should never request or store raw passwords in chat. If temporary access is required, route to a human and delete access data after service completion.
- **Account selling:** Game account resale can conflict with game publisher terms. Keep the flow transparent: seller owns the account, seller confirms right to sell, buyer receives clear risk notice, and TheNexus keeps review logs.
- **Payment disputes:** Keep proof-of-payment, order status, and admin ownership visible in dashboard.
- **Meta quality:** Too many template-like or irrelevant replies can reduce quality. The bot should answer only supported services and hand off uncertain issues.
- **Data protection:** Store minimum data, mask sensitive values, apply TTL deletion, and restrict dashboard access.

## 2) Safer business workflow

### Selling account

Bot should send the seller to `https://www.thenexus.ink/` only for account sale submissions.

Seller must provide:
- game, server/region, current rank, peak rank
- skins/items/champions/agents count
- account level
- First/Original Email status
- 2FA status
- expected payout; write `0` if they do not know the price
- full screenshots or video/album showing account value
- login delivery details for private review

If seller asks “يعني ايه فيرست؟”, answer:
- First/Original Email is the first email used to create the Riot account.
- Search the mailbox for the first Riot Games email or `Welcome to Riot Games`.
- Having first email improves buyer confidence and account value.

If account is not first email:
- ask admin for a clean email to bind, or create a new Gmail and bind it before submission.

### Wild Rift Cores

- If customer asks for prices, send image or exact SKU price if recognized.
- If customer wants to buy cores, account access may be needed.
- Do not request passwords in chat. Route to admin for secure temporary access.
- If customer forgot details, guide through Riot recovery links.

### League PC

- RP is instant after payment confirmation.
- Skin/Gift: customer sends payment, Riot ID, and item name. Gift is delivered after 7 days from accepted friend add.

### Valorant

- VP is instant after payment confirmation.
- Ask for region and package.

## 3) Admin handoff workflow

Recommended statuses:
- `BOT_ACTIVE`
- `PAYMENT_REVIEW`
- `NEEDS_ACCESS`
- `DELAY_REVIEW`
- `COMPLAINT`
- `SELLER_REVIEW`
- `CLOSED`

Dashboard should show:
- conversation state
- detected game/product/package
- payment method and proof status
- sensitive flag
- assigned admin
- last customer message
- SLA timer for delay complaints

## 4) Production checklist

- Use a real production WhatsApp phone number ID, not the test number ID.
- Use a permanent system-user access token.
- Confirm web service and worker service both have the same env vars.
- Keep `npx prisma migrate deploy && npm run start` or equivalent predeploy/start flow.
- Use real image URLs from a public CDN/Supabase bucket.
- Keep `SECURE_FORM_URL` only for account sale form, not normal top-ups.
- Never commit `.env` or screenshots containing secrets.

