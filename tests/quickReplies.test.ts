import { PAYMENT_METHODS_REPLY, RIOT_GIFT_REPLY, ACCOUNT_LISTING_REPLY } from '../src/config/constants';
import { detectQuickReply } from '../src/services/quickReplies';
import { loadDefaultMediaCatalog } from '../src/services/mediaCatalog';
import { env } from '../src/config/env';

const catalog = loadDefaultMediaCatalog(env);

describe('deterministic quick replies', () => {
  it('answers greetings without AI', () => {
    const reply = detectQuickReply('السلام عليكم', catalog);

    expect(reply?.kind).toBe('text');
    expect(reply?.intent).toBe('greeting');
    expect(reply?.text).toContain('❤️');
  });

  it('answers payment methods without AI', () => {
    const reply = detectQuickReply('طرق الدفع', catalog);

    expect(reply?.text).toBe(PAYMENT_METHODS_REPLY);
  });

  it.each([
    ['عايز اشحن وايلد ريفت', 'wild_rift_shipping', 'wrc.png'],
    ['عايز RP', 'league_rp', 'lolrp213.png'],
    ['عايز فالورانت', 'valorant_vp', 'valvp.png']
  ])('matches media for %s', (message, key, imageName) => {
    const reply = detectQuickReply(message, catalog);

    expect(reply?.kind).toBe('image');
    expect(reply?.detectedGame).toBe(key);
    expect(reply?.imageUrl).toContain(imageName);
  });

  it('answers Riot gifts with account and waiting rules', () => {
    const reply = detectQuickReply('جيفت ليج', catalog);

    expect(reply?.text).toBe(RIOT_GIFT_REPLY);
    expect(reply?.text).toContain('TheNexus#0001');
    expect(reply?.text).toContain('14 يوم');
  });

  it('answers account selling with the form instructions', () => {
    const reply = detectQuickReply('عايز ابيع اكونت', catalog);

    expect(reply?.text).toBe(ACCOUNT_LISTING_REPLY);
    expect(reply?.text).toContain('https://www.thenexus.ink/');
  });

  it('marks credentials as sensitive and human handoff', () => {
    const reply = detectQuickReply('riot account user x password: secret', catalog);

    expect(reply?.sensitive).toBe(true);
    expect(reply?.needsHuman).toBe(true);
    expect(reply?.handoffReason).toBe('sensitive_credentials');
  });

  it('detects human handoff requests', () => {
    const reply = detectQuickReply('عايز اكلم ادمن', catalog);

    expect(reply?.needsHuman).toBe(true);
    expect(reply?.intent).toBe('human_handoff');
  });
});
