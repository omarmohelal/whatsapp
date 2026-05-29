import { normalizeForIntent } from './intent';

export const UNCLEAR_MESSAGE_REPLY =
  'مش واضح قصدك يا صديقي، ابعتلي اسم اللعبة أو الخدمة اللي محتاجها ❤️';

const shortAckSet = new Set(
  [
    'تمام',
    'تم',
    'اوك',
    'اوكي',
    'أوكي',
    'ok',
    'okay',
    'ماشي',
    'حاضر',
    'تسلم',
    'شكرا',
    'شكراً',
    'thx',
    'thanks'
  ].map(normalizeForIntent)
);

const clearIntentKeywords = [
  '؟',
  '?',
  'عايز',
  'عاوز',
  'محتاج',
  'اشحن',
  'شحن',
  'سعر',
  'بكام',
  'كام',
  'ادفع',
  'دفع',
  'فودافون',
  'انستا',
  'instapay',
  'vodafone',
  'حولت',
  'دفعت',
  'تم التحويل',
  'بعتلك',
  'وصل',
  'مشكلة',
  'ادمن',
  'أدمن',
  'وايلد',
  'wild',
  'ليج',
  'league',
  'rp',
  'فالورانت',
  'valorant',
  'vp',
  'اكونت',
  'أكونت',
  'skin',
  'gift',
  'سكن',
  'جيفت',
  'mythic',
  'prestige',
  'orange',
  'مفاتيح',
  'id',
  'ايدي',
  'يوزر',
  'سيرفر',
  'server',
  'اورنج',
  'اورانج',
  'orange',
  'كور',
  'كورز',
  'cores'
];

const emojiPattern = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

export function isShortAck(text: string) {
  const normalized = normalizeForIntent(text).replace(/[.!؟?،,\s]+$/g, '').trim();
  return shortAckSet.has(normalized);
}

export function isEmojiOnly(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return !/[\p{L}\p{N}]/u.test(trimmed) && emojiPattern.test(trimmed);
}

export function isUnclearMessage(text: string, type: string) {
  if (type === 'sticker' || type === 'unknown') {
    return true;
  }
  return isEmojiOnly(text);
}

export function hasClearIntent(text: string, type: string) {
  if (type === 'image') {
    return true;
  }
  if (isShortAck(text)) {
    return false;
  }
  const normalized = normalizeForIntent(text);
  return clearIntentKeywords.some((keyword) => normalized.includes(normalizeForIntent(keyword)));
}

export function normalizeComparableReply(text: string) {
  return normalizeForIntent(text)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function repliesAreSimilar(a?: string | null, b?: string | null) {
  if (!a || !b) {
    return false;
  }

  const left = normalizeComparableReply(a);
  const right = normalizeComparableReply(b);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }

  const leftTokens = new Set(left.split(' ').filter((token) => token.length >= 2));
  const rightTokens = new Set(right.split(' ').filter((token) => token.length >= 2));
  if (!leftTokens.size || !rightTokens.size) {
    return false;
  }

  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = leftTokens.size + rightTokens.size - shared;
  const overlap = union === 0 ? 0 : shared / union;
  return overlap >= 0.82;
}

export function isWithinCooldown(lastOutboundAt: Date | null | undefined, cooldownSeconds: number, now = new Date()) {
  if (!lastOutboundAt) {
    return false;
  }
  return now.getTime() - lastOutboundAt.getTime() < cooldownSeconds * 1000;
}
