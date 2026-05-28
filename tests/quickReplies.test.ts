import {
  ACCOUNT_LISTING_REPLY,
  LEAGUE_RP_TOP_UP_REPLY,
  PAYMENT_METHODS_REPLY,
  RIOT_GIFT_REPLY,
  VALORANT_TOP_UP_REPLY,
  VODAFONE_PAYMENT_REPLY,
  WILD_RIFT_GAME_REPLY,
  WILD_RIFT_PACKAGE_CONFIRMATION,
  WILD_RIFT_TOP_UP_REPLY
} from '../src/config/constants';
import { env } from '../src/config/env';
import { loadDefaultMediaCatalog } from '../src/services/mediaCatalog';
import { detectQuickReply } from '../src/services/quickReplies';

const catalog = loadDefaultMediaCatalog(env);

describe('hybrid deterministic WhatsApp routing', () => {
  it('answers payment methods without AI', () => {
    const reply = detectQuickReply('طرق الدفع', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'payment_methods',
      text: PAYMENT_METHODS_REPLY
    });
  });

  it('asks for Wild Rift package when only the game is mentioned', () => {
    const reply = detectQuickReply('وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift',
      text: WILD_RIFT_GAME_REPLY,
      lastAskedQuestion: 'package'
    });
    expect(reply.text).not.toContain('ريجون');
    expect(reply.imageUrl).toBeUndefined();
  });

  it('asks for Wild Rift package only for top-up requests', () => {
    const reply = detectQuickReply('عايز اشحن وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift',
      text: WILD_RIFT_TOP_UP_REPLY,
      lastAskedQuestion: 'package'
    });
    expect(reply.text).not.toContain('ريجون');
    expect(reply.imageUrl).toBeUndefined();
  });

  it('sends the Wild Rift image only for price requests', () => {
    const reply = detectQuickReply('اسعار وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'wild_rift',
      priceRequest: true
    });
    expect(reply.imageUrl).toContain('wrc.png');
  });

  it('asks for Valorant region and package without sending an image', () => {
    const reply = detectQuickReply('عايز فالورانت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'valorant',
      text: VALORANT_TOP_UP_REPLY,
      lastAskedQuestion: 'region_and_package'
    });
    expect(reply.imageUrl).toBeUndefined();
  });

  it('sends the Valorant image for price requests', () => {
    const reply = detectQuickReply('اسعار فالورانت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'valorant',
      priceRequest: true
    });
    expect(reply.imageUrl).toContain('valvp.png');
  });

  it('asks for League RP server and package', () => {
    const reply = detectQuickReply('عايز RP', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'league',
      text: LEAGUE_RP_TOP_UP_REPLY,
      lastAskedQuestion: 'server_and_package'
    });
  });

  it('sends the League RP image for price requests', () => {
    const reply = detectQuickReply('اسعار ليج', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'league',
      priceRequest: true
    });
    expect(reply.imageUrl).toContain('lolrp213.png');
  });

  it('answers greetings like هلا deterministically', () => {
    const reply = detectQuickReply('هلا', catalog);

    expect(reply.matched).toBe(true);
    expect(reply.responseType).toBe('text');
    expect(reply.intent).toBe('greeting');
    expect(reply.text).toContain('❤️');
  });

  it('handles unknown game top-up without inventing prices', () => {
    const reply = detectQuickReply('عايز اشحن ببجي', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'unknown',
      lastAskedQuestion: 'game_and_package'
    });
    expect(reply.text).toContain('بنشحن أغلب الألعاب');
    expect(reply.imageUrl).toBeUndefined();
  });

  it('does not send fixed price images unless prices are requested', () => {
    const reply = detectQuickReply('وايلد', catalog);

    expect(reply.responseType).toBe('text');
    expect(reply.imageUrl).toBeUndefined();
    expect(reply.priceRequest).toBe(false);
  });

  it('uses memory to treat the next Wild Rift message as the package', () => {
    const reply = detectQuickReply('500 كور', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'top_up',
      lastAskedQuestion: 'package',
      pendingFields: { game: 'wild_rift', missing: ['package'] }
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift',
      text: WILD_RIFT_PACKAGE_CONFIRMATION('500 كور'),
      lastAskedQuestion: 'payment_method'
    });
  });

  it('uses memory to answer Vodafone after package selection', () => {
    const reply = detectQuickReply('فودافون', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'top_up_package_received',
      lastAskedQuestion: 'payment_method',
      pendingFields: { game: 'wild_rift', package: '500 كور' }
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'payment_method_selected',
      text: VODAFONE_PAYMENT_REPLY
    });
  });

  it('answers Riot gifts with account and waiting rules', () => {
    const reply = detectQuickReply('جيفت ليج', catalog);

    expect(reply.text).toBe(RIOT_GIFT_REPLY);
    expect(reply.text).toContain('TheNexus#0001');
    expect(reply.text).toContain('14 يوم');
  });

  it('answers account selling with the form instructions', () => {
    const reply = detectQuickReply('عايز ابيع اكونت', catalog);

    expect(reply.text).toBe(ACCOUNT_LISTING_REPLY);
    expect(reply.text).toContain('https://www.thenexus.ink/');
  });

  it('marks credentials as sensitive and human handoff', () => {
    const reply = detectQuickReply('riot account user x password: secret', catalog);

    expect(reply.sensitive).toBe(true);
    expect(reply.needsHuman).toBe(true);
    expect(reply.handoffReason).toBe('sensitive_credentials');
  });

  it('detects human handoff requests', () => {
    const reply = detectQuickReply('عايز اكلم ادمن', catalog);

    expect(reply.needsHuman).toBe(true);
    expect(reply.intent).toBe('human_handoff');
  });


  it('uses memory to treat Arabic digit dollar package as Wild Rift package', () => {
    const reply = detectQuickReply('٥ دولار', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'top_up',
      lastAskedQuestion: 'package',
      pendingFields: { game: 'wild_rift', package: null }
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift',
      lastAskedQuestion: 'payment_method'
    });
    expect(reply.text).toContain('5 دولار');
    expect(reply.text).toContain('تحب تدفع');
  });

  it('uses memory to send Wild Rift image when customer says ابعت الباقة', () => {
    const reply = detectQuickReply('ابعت الباقة', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'top_up',
      lastAskedQuestion: 'package',
      pendingFields: { game: 'wild_rift', package: null }
    });

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'wild_rift',
      priceRequest: true
    });
    expect(reply.imageUrl).toContain('wrc.png');
  });

  it('asks for game when customer asks for a package list without context', () => {
    const reply = detectQuickReply('ابعت الباقة', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'price_list_needs_game'
    });
    expect(reply.text).toContain('اسم اللعبة');
  });

  it('detects misspelled Wild Rift aliases', () => {
    const reply = detectQuickReply('وايلدرفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift',
      lastAskedQuestion: 'package'
    });
  });

});
