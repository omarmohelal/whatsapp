import {
  ACCOUNT_LISTING_REPLY,
  COMING_SOON_REPLY,
  LEAGUE_SKIN_GIFT_REPLY,
  PAYMENT_METHODS_REPLIES,
  RIOT_GIFT_REPLY,
  WILD_RIFT_HAVE_LOGIN_REPLY,
  WILD_RIFT_FORGOT_PASSWORD_REPLY,
  WILD_RIFT_FIND_EMAIL_REPLY,
  WILD_RIFT_FORGOT_USERNAME_REPLY
} from '../src/config/constants';
import { env } from '../src/config/env';
import { loadDefaultMediaCatalog } from '../src/services/mediaCatalog';
import { detectQuickReply } from '../src/services/quickReplies';

const catalog = loadDefaultMediaCatalog(env);

describe('enhanced hybrid deterministic WhatsApp routing', () => {
  it('answers payment methods with natural variety', () => {
    const reply = detectQuickReply('طرق الدفع', catalog);

    expect(reply.matched).toBe(true);
    expect(reply.responseType).toBe('text');
    expect(reply.intent).toBe('payment_methods');
    expect(PAYMENT_METHODS_REPLIES).toContain(reply.text);
  });

  it('asks for Wild Rift package when only the game is mentioned', () => {
    const reply = detectQuickReply('وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift',
      lastAskedQuestion: 'package'
    });
    expect(reply.text).not.toContain('ريجون');
  });

  it('sends the Wild Rift price image when the customer wants to top up', () => {
    const reply = detectQuickReply('عايز اشحن وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'wild_rift'
    });
    expect(reply.imageUrl).toContain('wrc.png');
  });

  it('routes Wild Rift cores requests to the account flow', () => {
    const reply = detectQuickReply('عايز اشحن 500 كورز وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift',
      intent: 'wr_cores_account',
      lastAskedQuestion: 'wr_account_identify'
    });
    expect(reply.text).toContain('thenexus.ink');
  });

  it('guides the customer through Riot username recovery', () => {
    const reply = detectQuickReply('مش عارف اليوزر', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'wr_cores_account',
      lastAskedQuestion: 'wr_account_identify',
      pendingFields: { game: 'wild_rift', flow: 'wr_account' }
    });

    expect(reply.intent).toBe('wr_cores_recovery_username');
    expect(reply.text).toBe(WILD_RIFT_FORGOT_USERNAME_REPLY);
  });

  it('guides the customer through Riot password recovery', () => {
    const reply = detectQuickReply('نسيت الباسورد', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'wr_cores_account',
      lastAskedQuestion: 'wr_account_identify',
      pendingFields: { game: 'wild_rift', flow: 'wr_account' }
    });

    expect(reply.intent).toBe('wr_cores_recovery_password');
    expect(reply.text).toBe(WILD_RIFT_FORGOT_PASSWORD_REPLY);
  });

  it('guides the customer to find the linked email', () => {
    const reply = detectQuickReply('مش عارف الايميل', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'wr_cores_account',
      lastAskedQuestion: 'wr_account_identify',
      pendingFields: { game: 'wild_rift', flow: 'wr_account' }
    });

    expect(reply.intent).toBe('wr_cores_find_email');
    expect(reply.text).toBe(WILD_RIFT_FIND_EMAIL_REPLY);
  });

  it('routes customers with login info to the secure form', () => {
    const reply = detectQuickReply('عندي اليوزر والباس', catalog, {
      detectedGame: 'wild_rift',
      lastIntent: 'wr_cores_account',
      lastAskedQuestion: 'wr_account_identify',
      pendingFields: { game: 'wild_rift', flow: 'wr_account' }
    });

    expect(reply.intent).toBe('wr_cores_have_login');
    expect(reply.text).toBe(WILD_RIFT_HAVE_LOGIN_REPLY);
  });

  it('helps customers choose League mode', () => {
    const reply = detectQuickReply('عايز اشحن ليج', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'league',
      intent: 'league_menu',
      lastAskedQuestion: 'league_mode'
    });
  });

  it('answers League skin/gift flow', () => {
    const reply = detectQuickReply('عايز سكن في ليج', catalog);

    expect(reply.intent).toBe('league_skin_gift');
    expect(reply.text).toBe(LEAGUE_SKIN_GIFT_REPLY);
  });

  it('sends the League RP image when the customer asks for RP', () => {
    const reply = detectQuickReply('عايز RP', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'league',
      intent: 'league_rp'
    });
    expect(reply.imageUrl).toContain('lolrp213.png');
  });

  it('sends the Valorant price image when the customer wants to top up', () => {
    const reply = detectQuickReply('عايز اشحن فالورنت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'image',
      game: 'valorant'
    });
    expect(reply.imageUrl).toContain('valvp.png');
  });

  it('handles misspelled Wild Rift aliases', () => {
    const reply = detectQuickReply('وايلدرفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      game: 'wild_rift'
    });
  });

  it('handles misspelled cores aliases', () => {
    const reply = detectQuickReply('عايز اشحن 10 الاف cors وايلد ريفت', catalog);

    expect(reply.intent).toBe('wr_cores_account');
  });

  it('marks pasted credentials as sensitive and hands off', () => {
    const reply = detectQuickReply('riot account email: x@gmail.com password: secret', catalog);

    expect(reply.sensitive).toBe(true);
    expect(reply.needsHuman).toBe(true);
    expect(reply.handoffReason).toBe('sensitive_credentials');
  });

  it('returns the coming-soon reply for unsupported games', () => {
    const reply = detectQuickReply('عايز اشحن ببجي', catalog);

    expect(reply.intent).toBe('coming_soon');
    expect(reply.text).toBe(COMING_SOON_REPLY);
  });

  it('answers account selling with the form instructions', () => {
    const reply = detectQuickReply('عايز ابيع اكونت', catalog);

    expect(reply.text).toBe(ACCOUNT_LISTING_REPLY);
  });

  it('answers general Riot gifts', () => {
    const reply = detectQuickReply('جيفت', catalog);

    expect(reply.text).toBe(RIOT_GIFT_REPLY);
  });

  it('explains first email for account sellers', () => {
    const reply = detectQuickReply('يعني ايه فيرست', catalog, { lastIntent: 'account_sell' });

    expect(reply.intent).toBe('first_email_explain');
    expect(reply.text).toContain('Welcome to Riot Games');
  });

  it('answers a specific Wild Rift cores price without sending the full image', () => {
    const reply = detectQuickReply('10000 كورز بكام وايلد ريفت', catalog);

    expect(reply).toMatchObject({
      matched: true,
      responseType: 'text',
      intent: 'specific_price',
      game: 'wild_rift',
      priceRequest: true
    });
    expect(reply.text).toContain('4935 EGP');
  });

  it('routes payment proof to admin review', () => {
    const reply = detectQuickReply('حولت وبعت الفلوس', catalog);

    expect(reply.intent).toBe('payment_proof');
    expect(reply.needsHuman).toBe(true);
  });

  it('routes delivery delay complaints to admin review', () => {
    const reply = detectQuickReply('الشحن اتأخر ولسه موصلش', catalog);

    expect(reply.intent).toBe('delivery_delay');
    expect(reply.needsHuman).toBe(true);
  });

});
