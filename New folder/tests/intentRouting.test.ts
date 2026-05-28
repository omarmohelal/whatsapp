import { classifyIntent } from '../src/services/intent';

describe('intent routing', () => {
  it('detects Wild Rift top-up requests', () => {
    const intent = classifyIntent('عايز اشحن وايلد ريفت');

    expect(intent.name).toBe('top_up');
    expect(intent.entities.game).toBe('wild_rift');
  });

  it('detects account selling with unknown price', () => {
    const intent = classifyIntent('عايز ابيع اكونت ومش عارف السعر');

    expect(intent.name).toBe('account_sell');
    expect(intent.entities.unknownAccountPrice).toBe(true);
  });

  it('detects Riot gifting requests', () => {
    const intent = classifyIntent('محتاج skin gift في League');

    expect(intent.name).toBe('riot_gift');
  });
});
