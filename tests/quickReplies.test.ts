import {
  ACCOUNT_LISTING_REPLY,
  LEAGUE_SKIN_GIFT_REPLY,
  PAYMENT_METHODS_REPLY,
  PAYMENT_PROOF_REPLY
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
      matched: true,
      responseType: 'text',
      intent: 'wild_rift_game_only',
      game: 'wild_rift'
    });
    expect(reply.text).toContain('كورز');
    expect(reply.imageUrl).toBeUndefined();
  });

  it('does not send a Wild Rift price image for a generic top-up request', () => {
    const reply = detectQuickReply('عايز اشحن وايلد ريفت', catalog);

    expect(reply.responseType).toBe('text');
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
      matched: true,
      responseType: 'text',
      intent: 'league_intake',
      game: 'league'
    });
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
      matched: true,
      responseType: 'text',
      intent: 'valorant_intake',
      game: 'valorant'
    });
  });

  it('asks League gift fields without sending TheNexus accounts', () => {
    const reply = detectQuickReply('عايز skin gift في league', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'league_skin_gift',
      text: LEAGUE_SKIN_GIFT_REPLY
    });
    expect(reply.text).not.toContain('TheNexus#0001');
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

  it('asks mythic/orange essence details before pricing', () => {
    const reply = detectQuickReply('mythic skin', catalog);

    expect(reply).toMatchObject({
      matched: true,
      intent: 'mythic_orange_keys'
    });
    expect(reply.text).toContain('Orange');
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
    expect(reply.text).toContain('تملى الفورم');
    expect(reply.text).toContain('Title');
    expect(reply.text).toContain('100 أكونت');
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
