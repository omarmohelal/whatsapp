import {
  hasClearIntent,
  isEmojiOnly,
  isLowSignalText,
  isShortAck,
  isUnclearMessage,
  isWithinCooldown,
  repliesAreSimilar
} from '../src/services/antiSpam';

describe('anti-spam helpers', () => {
  it('detects short acknowledgements that should not trigger new replies', () => {
    expect(isShortAck('تمام')).toBe(true);
    expect(isShortAck('اوكي')).toBe(true);
    expect(isShortAck('عايز اشحن')).toBe(false);
  });

  it('detects emoji-only and sticker-like unclear messages', () => {
    expect(isEmojiOnly('❤️')).toBe(true);
    expect(isUnclearMessage('', 'sticker')).toBe(true);
    expect(isUnclearMessage('عايز اشحن', 'text')).toBe(false);
  });

  it('treats low-signal chat filler as unsafe for auto replies', () => {
    expect(isLowSignalText('ده')).toBe(true);
    expect(isLowSignalText('لا')).toBe(true);
    expect(isLowSignalText('عايز اشحن')).toBe(false);
  });

  it('detects clear purchase/payment intent for cooldown bypass', () => {
    expect(hasClearIntent('عايز اشحن وايلد', 'text')).toBe(true);
    expect(hasClearIntent('تم التحويل', 'text')).toBe(true);
    expect(hasClearIntent('تمام', 'text')).toBe(false);
    expect(hasClearIntent('', 'image')).toBe(false);
  });

  it('detects similar repeated bot replies', () => {
    expect(repliesAreSimilar('تمام ❤️ ابعت اسم اللعبة', 'تمام ابعت اسم اللعبة ❤️')).toBe(true);
    expect(repliesAreSimilar('طرق الدفع المتاحة', 'عايز تشحن ايه؟')).toBe(false);
  });

  it('applies cooldown windows', () => {
    const now = new Date('2026-05-28T10:00:30.000Z');
    expect(isWithinCooldown(new Date('2026-05-28T10:00:10.000Z'), 30, now)).toBe(true);
    expect(isWithinCooldown(new Date('2026-05-28T09:59:30.000Z'), 30, now)).toBe(false);
  });
});
