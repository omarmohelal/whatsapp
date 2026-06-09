import {
  ACCOUNT_BUYING_REPLY,
  ACCOUNT_LISTING_REPLY,
  ACCOUNT_SELLING_HELP_REPLY,
  CREDENTIALS_REPLY,
  GIVEAWAY_KEYS_REPLY,
  GIVEAWAY_USERNAME_RECEIVED_REPLY,
  PAYMENT_METHODS_REPLY,
  PAYMENT_PROOF_REPLY,
  THIRTY_KEYS_CLARIFY_REPLY
} from '../src/config/constants';
import { env } from '../src/config/env';
import { loadDefaultMediaCatalog } from '../src/services/mediaCatalog';
import { detectQuickReply } from '../src/services/quickReplies';

const catalog = loadDefaultMediaCatalog(env);

describe('smart deterministic routing before Gemini', () => {
  it('answers greetings briefly without a long menu', () => {
    const reply = detectQuickReply('السلام عليكم', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'greeting'
    });
    expect(reply.text).toContain('The Nexus');
  });

  it('answers payment methods deterministically', () => {
    const reply = detectQuickReply('الدفع ازاي؟', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'payment_methods',
      text: PAYMENT_METHODS_REPLY
    });
  });

  it('asks Wild Rift customers what service they need instead of sending prices', () => {
    const reply = detectQuickReply('وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: false,
      responseType: 'ai',
      intent: 'wild_rift_game_only',
      game: 'wild_rift'
    });
    expect(reply.agentGuidance).toContain('Wild Rift');
    expect(reply.imageUrl).toBeUndefined();
  });

  it('does not send a Wild Rift price image for a generic top-up request', () => {
    const reply = detectQuickReply('عايز اشحن وايلد ريفت', catalog);

    expect(reply.responseType).toBe('ai');
    expect(reply.agentGuidance).toContain('Wild Rift');
    expect(reply.imageUrl).toBeUndefined();
  });

  it('sends Wild Rift price image only for explicit price list requests', () => {
    const reply = detectQuickReply('اسعار وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'wild_rift',
      priceRequest: true
    });
    expect(reply.imageUrl).toContain('wrc.png');
  });

  it('calculates a known Wild Rift core package price', () => {
    const reply = detectQuickReply('عايز اشحن 1000 كور', catalog, { detectedGame: 'wild_rift' });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'specific_price',
      game: 'wild_rift'
    });
    expect(reply.text).toContain('575 EGP');
    expect(reply.text).toContain('InstaPay');
  });

  it('does not invent an unknown Wild Rift core price', () => {
    const reply = detectQuickReply('500 كور بكام', catalog, { detectedGame: 'wild_rift' });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'unknown_price',
      needsHuman: true
    });
    expect(reply.text).toContain('مش لاقي');
  });

  it('asks League RP customers for server and package without sending an image', () => {
    const reply = detectQuickReply('عايز RP', catalog);

    expect(reply).toMatchObject({
      matched: false,
      responseType: 'ai',
      intent: 'league_intake',
      game: 'league'
    });
    expect(reply.agentGuidance).toContain('League');
  });

  it('sends League RP image only for explicit price requests', () => {
    const reply = detectQuickReply('اسعار ليج', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'league',
      priceRequest: true
    });
  });

  it('asks Valorant customers for region and package without sending an image', () => {
    const reply = detectQuickReply('عايز اشحن فالورانت', catalog);

    expect(reply).toMatchObject({
      matched: false,
      responseType: 'ai',
      intent: 'valorant_intake',
      game: 'valorant'
    });
    expect(reply.agentGuidance).toContain('Valorant');
  });

  it('routes League gift to AI guidance without sending TheNexus accounts', () => {
    const reply = detectQuickReply('عايز skin gift في league', catalog);

    expect(reply).toMatchObject({
      matched: false,
      responseType: 'ai',
      intent: 'league_skin_gift'
    });
    expect(reply.agentGuidance).toContain('League');
    expect(reply.agentGuidance).not.toContain('TheNexus#0001');
  });

  it('sends Wild Rift gift accounts once when customer needs to add', () => {
    const first = detectQuickReply('مش مضاف عندكم wild rift gift', catalog);
    const second = detectQuickReply('مش مضاف عندكم wild rift gift', catalog, {
      detectedGame: 'wild_rift',
      pendingFields: { riotGiftAccountsSent: true }
    });

    expect(first.text).toContain('TheNexus#0001');
    expect(second.text).not.toContain('TheNexus#0001');
  });

  it('routes 30-key giveaway away from orange pricing and payment', () => {
    const reply = detectQuickReply('الـ 30 مفتاح دول بتوع الجيفاوي؟', catalog, {
      detectedGame: 'wild_rift'
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'giveaway_keys',
      game: 'wild_rift',
      text: GIVEAWAY_KEYS_REPLY
    });
    expect(reply.text).toContain('ابعت اليوزر');
    expect(reply.text).not.toContain('Orange');
    expect(reply.text).not.toContain('InstaPay');
    expect(reply.text).toContain('ترتيب الطلبات');
  });

  it('asks one clarification for ambiguous 30-key requests', () => {
    const reply = detectQuickReply('عايز الـ 30 مفتاح', catalog, {
      detectedGame: 'wild_rift'
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'thirty_keys_clarification',
      game: 'wild_rift',
      text: THIRTY_KEYS_CLARIFY_REPLY
    });
    expect(reply.text).toContain('جيفاوي');
    expect(reply.text).toContain('شراء');
    expect(reply.text).not.toContain('Orange');
    expect(reply.text).not.toContain('InstaPay');
  });

  it('routes explicit 30-key purchase to the paid key flow', () => {
    const reply = detectQuickReply('عايز اشتري 30 مفتاح', catalog, {
      detectedGame: 'wild_rift'
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'wild_rift_keys_purchase',
      game: 'wild_rift',
      priceRequest: true,
      lastAskedQuestion: 'payment_method'
    });
    expect(reply.text).toContain('174 EGP');
    expect(reply.text).toContain('InstaPay');
    expect(reply.text).not.toContain('الجيفاوي');
  });

  it('treats key top-up as normal keys, not mythic calculation', () => {
    const reply = detectQuickReply('عايز اشحن مفاتيح', catalog, {
      detectedGame: 'wild_rift'
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'wild_rift_keys_intake',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_key_amount'
    });
    expect(reply.text).toContain('كام مفتاح');
    expect(reply.text).not.toContain('الميثك');
    expect(reply.text).not.toContain('Orange');
  });

  it('prices key top-up when customer sends the key amount', () => {
    const reply = detectQuickReply('30', catalog, {
      detectedGame: 'wild_rift',
      lastAskedQuestion: 'wild_rift_key_amount',
      pendingFields: { flow: 'wild_rift_keys', game: 'wild_rift', product: 'Wild Rift Keys' }
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'wild_rift_keys_purchase',
      game: 'wild_rift',
      priceRequest: true
    });
    expect(reply.text).toContain('30 مفتاح');
    expect(reply.text).toContain('174 EGP');
    expect(reply.text).not.toContain('Orange');
  });

  it('explains 30 keys instead of forcing giveaway clarification when customer asks what it is', () => {
    const reply = detectQuickReply('ايه 30 مفتاح', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'mythic_orange_keys',
      pendingFields: { game: 'wild_rift', product: 'mythic_orange_keys' }
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'keys_explanation',
      game: 'wild_rift'
    });
    expect(reply.text).toContain('30 مفتاح');
    expect(reply.text).toContain('174 EGP');
    expect(reply.text).not.toContain('جيفاوي ولا شراء');
  });

  it('handles a 30-key clarification follow-up as purchase', () => {
    const reply = detectQuickReply('شراء', catalog, {
      lastAskedQuestion: 'giveaway_or_purchase',
      pendingFields: { flow: 'thirty_keys_clarification', subject: '30_keys' }
    });

    expect(reply).toMatchObject({
      intent: 'wild_rift_keys_purchase',
      game: 'wild_rift'
    });
    expect(reply.text).toContain('174 EGP');
  });

  it('accepts giveaway username follow-up without asking for payment', () => {
    const reply = detectQuickReply('AN 황 ELWEZA#ZOZ', catalog, {
      lastAskedQuestion: 'giveaway_or_purchase',
      pendingFields: { flow: 'thirty_keys_clarification', subject: '30_keys', awaitingGiveawayOrPurchase: true }
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'giveaway_username_received',
      game: 'wild_rift',
      text: GIVEAWAY_USERNAME_RECEIVED_REPLY
    });
    expect(reply.text).toContain('وصل اليوزر');
    expect(reply.text).not.toContain('الدفع');
  });

  it('does not warn customers not to send passwords when credentials arrive', () => {
    const reply = detectQuickReply('user test password abc123', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'handoff',
      intent: 'credentials',
      text: CREDENTIALS_REPLY,
      sensitive: true
    });
    expect(reply.text).not.toContain('بلاش');
    expect(reply.text).not.toContain('باسورد في الشات');
  });

  it('asks mythic/orange essence details before pricing', () => {
    const reply = detectQuickReply('mythic skin', catalog);

    expect(reply).toMatchObject({
      matched: true,
      intent: 'mythic_orange_keys'
    });
    expect(reply.text).toContain('Orange');
  });

  it('understands current and required Orange from one message', () => {
    const reply = detectQuickReply('معايا 500 وارنج الاسكن 400', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'mythic_orange_keys',
      pendingFields: { game: 'wild_rift', product: 'mythic_orange_keys' }
    });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'mythic_orange_keys',
      game: 'wild_rift',
      lastAskedQuestion: 'skin_name_or_id'
    });
    expect(reply.text).toContain('كفاية');
    expect(reply.text).not.toContain('InstaPay');
    expect(reply.text).not.toContain('Vodafone');
  });

  it('uses a bare follow-up number as required Orange when current Orange is known', () => {
    const reply = detectQuickReply('800', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'mythic_orange_keys',
      lastAskedQuestion: 'orange_amount',
      pendingFields: { game: 'wild_rift', product: 'mythic_orange_keys', orangeCurrent: 500 }
    });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'mythic_orange_keys',
      game: 'wild_rift',
      lastAskedQuestion: 'payment_method'
    });
    expect(reply.text).toContain('ناقصك 300 Orange');
    expect(reply.text).toContain('1605 EGP');
  });

  it('lets customers correct a wrong Orange assumption without continuing the flow', () => {
    const reply = detectQuickReply('انا مقولتش احسبلي حاجه', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'mythic_orange_keys',
      lastAskedQuestion: 'orange_amount',
      pendingFields: { game: 'wild_rift', product: 'mythic_orange_keys' }
    });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'flow_correction',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_service'
    });
    expect(reply.text).toContain('حقك عليا');
    expect(reply.text).toContain('مفاتيح');
    expect(reply.text).not.toContain('Orange');
    expect(reply.pendingFields).toMatchObject({ game: 'wild_rift', flow: 'service_clarification' });
  });

  it('handles payment proof without asking to pay again', () => {
    const reply = detectQuickReply('تم التحويل', catalog);

    expect(reply).toMatchObject({
      matched: true,
      intent: 'payment_proof',
      text: PAYMENT_PROOF_REPLY,
      needsHuman: true
    });
  });

  it('uses existing order context for payment proof', () => {
    const reply = detectQuickReply('بعتلك', catalog, {
      pendingFields: { game: 'wild_rift', package: '1000 WC', customerId: 'Ken#Lulu1' }
    });

    expect(reply.text).toContain('الطلب جاهز للمراجعة');
  });

  it('stores customer ID inside an open skin order instead of restarting the flow', () => {
    const reply = detectQuickReply('ID: Ken#Lulu1', catalog, {
      detectedGame: 'wild_rift',
      lastAskedQuestion: 'skin_name_or_id',
      pendingFields: { game: 'wild_rift', product: 'Epic Skin: Battle Dolphin Nami', total: '385 EGP' }
    });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'order_details_received',
      game: 'wild_rift'
    });
    expect(reply.pendingFields).toMatchObject({
      customerId: 'Ken#Lulu1',
      orderDetailsComplete: true,
      awaitingPaymentMethod: true
    });
    expect(reply.text).toContain('تحب تدفع');
  });

  it('does not ask for order details again after a complete order chooses InstaPay', () => {
    const reply = detectQuickReply('انستا باي', catalog, {
      pendingFields: {
        game: 'wild_rift',
        product: 'Epic Skin: Battle Dolphin Nami',
        total: '385 EGP',
        customerId: 'Ken#Lulu1',
        orderDetailsComplete: true
      }
    });

    expect(reply).toMatchObject({
      intent: 'payment_instapay',
      lastAskedQuestion: 'payment_proof'
    });
    expect(reply.text).toContain('سكرين الدفع بس');
    expect(reply.text).not.toContain('اسم اللعبة');
  });

  it('stores order details and payment method when they arrive in one message', () => {
    const reply = detectQuickReply('ID: Ken#Lulu1 انستا باي', catalog, {
      detectedGame: 'wild_rift',
      lastAskedQuestion: 'skin_name_or_id',
      pendingFields: { game: 'wild_rift', product: 'Epic Skin: Battle Dolphin Nami', total: '385 EGP' }
    });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'order_details_received',
      game: 'wild_rift',
      lastAskedQuestion: 'payment_proof'
    });
    expect(reply.pendingFields).toMatchObject({
      customerId: 'Ken#Lulu1',
      paymentMethod: 'instapay',
      orderDetailsComplete: true,
      awaitingPaymentProof: true
    });
    expect(reply.text).toContain('01014094664');
    expect(reply.text).toContain('سكرين الدفع بس');
    expect(reply.text).not.toContain('تحب تدفع');
  });

  it('uses a shorter payment menu when an order is already waiting for payment', () => {
    const reply = detectQuickReply('طرق الدفع', catalog, {
      detectedGame: 'wild_rift',
      lastAskedQuestion: 'payment_method',
      pendingFields: {
        game: 'wild_rift',
        product: 'Wild Rift Keys',
        package: '30 keys',
        total: '174 EGP',
        awaitingPaymentMethod: true
      }
    });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'payment_methods',
      lastAskedQuestion: 'payment_method'
    });
    expect(reply.text).toContain('اختار طريقة الدفع');
    expect(reply.text).toContain('01014094664');
    expect(reply.text).toContain('01007208978');
    expect(reply.text).not.toContain('Payoneer');
  });

  it('treats payment screenshot as review-ready when order details are already known', () => {
    const reply = detectQuickReply('', catalog, {
      lastAskedQuestion: 'payment_proof',
      pendingFields: {
        game: 'wild_rift',
        product: 'Epic Skin: Battle Dolphin Nami',
        total: '385 EGP',
        customerId: 'Ken#Lulu1',
        paymentMethod: 'instapay',
        awaitingPaymentProof: true,
        orderDetailsComplete: true
      }
    }, { type: 'image' });

    expect(reply).toMatchObject({
      intent: 'payment_proof_image',
      needsHuman: true
    });
    expect(reply.text).toContain('الطلب جاهز للمراجعة');
    expect(reply.text).not.toContain('اسم اللعبة');
  });

  it('ignores image-only noise when no active image request exists', () => {
    const reply = detectQuickReply('', catalog, {}, { type: 'image' });

    expect(reply).toMatchObject({
      matched: false,
      responseType: 'ai',
      intent: 'image_ignored'
    });
  });

  it('does not repeat image helper replies in the same flow', () => {
    const reply = detectQuickReply('', catalog, {
      lastAskedQuestion: 'skin_name_or_id',
      pendingFields: {
        game: 'wild_rift',
        product: 'Epic Skin',
        imageReplySent: true
      }
    }, { type: 'image' });

    expect(reply).toMatchObject({
      matched: false,
      intent: 'image_ignored'
    });
  });

  it('answers account selling with the improved form instructions', () => {
    const reply = detectQuickReply('عايز ابيع اكونتي', catalog);

    expect(reply.text).toBe(ACCOUNT_LISTING_REPLY);
    expect(reply.text).toContain('املأ الفورم');
    expect(reply.text).toContain('Title');
    expect(reply.text).toContain('الأدمن هيراجع');
  });

  it('prioritizes account valuation over game price images', () => {
    const reply = detectQuickReply('عايز اعرف الاكونت يتباع في رينج كام فالورانت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'account_sell'
    });
    expect(reply.text).toBe(ACCOUNT_LISTING_REPLY);
    expect(reply.imageUrl).toBeUndefined();
  });

  it('prioritizes account form help over old game context', () => {
    const reply = detectQuickReply('بعد اذنك مطلوب في الفورم مش فاهمه ممكن تساعد؟', catalog, {
      detectedGame: 'wild_rift',
      pendingFields: { game: 'wild_rift' }
    });

    expect(reply).toMatchObject({
      matched: true,
      intent: 'account_form_help',
      text: ACCOUNT_SELLING_HELP_REPLY
    });
    expect(reply.text).toContain('اللعبة والسيرفر');
    expect(reply.text).not.toContain('كورز');
  });

  it('answers form confusion in an account-selling flow instead of falling back to game help', () => {
    const reply = detectQuickReply('مش فاهم اعمل ايه', catalog, {
      detectedGame: 'wild_rift',
      lastAskedQuestion: 'account_form',
      pendingFields: { flow: 'account_sell', formSent: true, game: 'wild_rift' }
    });

    expect(reply).toMatchObject({
      intent: 'account_form_help',
      text: ACCOUNT_SELLING_HELP_REPLY
    });
  });

  it('keeps account form problems in form-help instead of handoff', () => {
    const reply = detectQuickReply('عندي مشكلة في الفورم مش فاهم خانة السعر', catalog, {
      detectedGame: 'wild_rift',
      pendingFields: { game: 'wild_rift' }
    });

    expect(reply).toMatchObject({
      intent: 'account_form_help'
    });
    expect(reply.needsHuman).toBeUndefined();
    expect(reply.text).toContain('السعر');
    expect(reply.text).not.toContain('الأدمن هيراجع معاك');
  });

  it('explains specific account form fields directly', () => {
    const reply = detectQuickReply('يعني ايه Title في الفورم؟', catalog, {
      pendingFields: { flow: 'account_sell', formSent: true }
    });

    expect(reply).toMatchObject({
      intent: 'account_form_help'
    });
    expect(reply.text).toContain('عنوان مختصر');
    expect(reply.text).toContain('EUNE');
  });

  it('answers clear account buying requests with useful required preferences', () => {
    const reply = detectQuickReply('عايز اشتري اكونت ليج', catalog);

    expect(reply).toMatchObject({
      matched: true,
      intent: 'account_buy',
      text: ACCOUNT_BUYING_REPLY
    });
    expect(reply.text).toContain('الميزانية');
  });

  it('routes delivery delay to handoff', () => {
    const reply = detectQuickReply('الشحن اتأخر ولسه موصلش', catalog);

    expect(reply).toMatchObject({
      intent: 'delivery_delay',
      needsHuman: true,
      handoffReason: 'delivery_delay'
    });
  });

  it('lets Gemini handle generic top-up text without a supported game', () => {
    const reply = detectQuickReply('عايز اشحن', catalog);

    expect(reply).toMatchObject({
      matched: false,
      responseType: 'ai',
      intent: 'top_up'
    });
  });
});
