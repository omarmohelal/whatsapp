# TheNexus V5 - Orange context and conversation fixes

This patch fixes the real bug from the screenshot:

- Customer asks about a Mythic/Orange skin.
- Bot asks for Orange amount.
- Customer says `1000`.
- Old V4 treated `1000` as `1000 Wild Cores` and quoted `575 EGP`.

## What changed

1. Orange/Mythic/Prestige context now has priority over Wild Cores numeric parsing.
   - If `lastAskedQuestion = orange_amount` or `pendingFields.product = mythic_orange_keys`, bare numbers are treated as Orange Essence.
   - Example: `700` then `1000` means current Orange then required Orange.

2. Orange calculator now stores state in `pendingFields`:
   - `orangeCurrent`
   - `orangeRequired`
   - `orangeMissing`

3. The bot now calculates missing Orange and price:
   - 1-299 keys: 5.8 EGP/key
   - 300-500 keys: 5.35 EGP/key
   - 501-1000 keys: 5.145 EGP/key

4. Short acknowledgements do not kill open flows anymore.
   - If the bot asked a question and the customer says `تمام / اه / اوكي`, the flow continues instead of being ignored.

5. Cooldown no longer blocks replies inside an open flow.

6. Anti-spam similarity was changed to Jaccard similarity, so short useful replies are not wrongly blocked.

7. The AI prompt was updated:
   - In Orange conversations, bare numbers are Orange, never Wild Cores.
   - Keep replies short and contextual.
   - Stop robotic menus and repeated text.

## Example after V5

Customer: `عندي 700 اورنج`
Bot: `تمام ❤️ معاك 700 Orange. السكن محتاج كام Orange إجماليًا؟ ابعت الرقم بس وأنا أحسبلك الناقص والسعر.`

Customer: `1000`
Bot: `ناقصك 300 Orange تقريبًا ❤️ تكلفتهم حوالي 1605 EGP على سعر المفاتيح الحالي. ابعت اسم السكن أو صورته، ولو تمام اختار طريقة الدفع: InstaPay ولا Vodafone Cash؟`
