import {
  ACCOUNT_BUYING_REPLY,
  ACCOUNT_LISTING_REPLY,
  CREDENTIALS_REPLY,
  EVENING_REPLIES,
  GENERAL_TOP_UP_REPLY,
  GREETING_REPLIES,
  HUMAN_HANDOFF_REPLY,
  MORNING_REPLIES,
  PAYMENT_METHODS_REPLY,
  RIOT_GIFT_REPLY
} from '../config/constants';
import { detectSensitiveCredentials } from './credentials';
import { normalizeForIntent } from './intent';
import { loadDefaultMediaCatalog, matchesMediaItem, type MediaCatalogEntry } from './mediaCatalog';
import { env } from '../config/env';

export interface QuickReplyResult {
  kind: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  caption?: string;
  intent: string;
  detectedGame?: string;
  needsHuman?: boolean;
  sensitive?: boolean;
  handoffReason?: string;
  lastAskedQuestion?: string;
}

const paymentKeywords = [
  'طرق الدفع',
  'الدفع',
  'بدفع ازاي',
  'ادفع ازاي',
  'payment',
  'pay',
  'فودافون',
  'انستا باي',
  'instapay',
  'paypal',
  'binance'
];

const topUpKeywords = [
  'شحن',
  'اشحن',
  'عايز اشحن',
  'بكام',
  'اسعار',
  'الاسعار',
  'متاح',
  'top up',
  'charge'
];

const riotGiftKeywords = [
  'جيفت',
  'جفت',
  'gift',
  'skin',
  'skins',
  'سكن',
  'سكنات',
  'هديه',
  'هدية'
];

const accountSellKeywords = [
  'ابيع اكونت',
  'اعرض اكونت',
  'اسعر اكونت',
  'تسعير اكونت',
  'بيع اكونت',
  'list account',
  'sell account'
];

const accountBuyKeywords = [
  'اشتري اكونت',
  'عايز اكونت',
  'اكونت للبيع',
  'account available',
  'buy account'
];

const handoffKeywords = ['ادمن', 'اكلم حد', 'خدمه عملاء', 'خدمة عملاء', 'مشكله', 'مشكلة', 'refund', 'استرجاع', 'شكوى', 'شكوي'];

function hasAny(normalized: string, keywords: string[]) {
  return keywords.some((keyword) => normalized.includes(normalizeForIntent(keyword)));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function greetingReply(normalized: string): QuickReplyResult | null {
  const compact = normalized.replace(/[!?.,،؟]/g, '').trim();

  if (compact === 'صباح الخير' || compact === 'صباح النور') {
    return { kind: 'text', text: pick(MORNING_REPLIES), intent: 'greeting' };
  }

  if (compact === 'مساء الخير' || compact === 'مساء النور') {
    return { kind: 'text', text: pick(EVENING_REPLIES), intent: 'greeting' };
  }

  if (
    ['السلام عليكم', 'سلام عليكم', 'سلام', 'ازيك', 'عامل ايه', 'hi', 'hello'].includes(compact)
  ) {
    return { kind: 'text', text: pick(GREETING_REPLIES), intent: 'greeting' };
  }

  return null;
}

export function detectQuickReply(
  text: string,
  mediaCatalog: MediaCatalogEntry[] = loadDefaultMediaCatalog(env)
): QuickReplyResult | null {
  const normalized = normalizeForIntent(text);
  const sensitive = detectSensitiveCredentials(text);

  if (sensitive.isSensitive || hasAny(normalized, ['يوزر', 'باس', 'باسورد', 'password', 'gmail', 'facebook', 'apple id', 'riot account'])) {
    return {
      kind: 'text',
      text: CREDENTIALS_REPLY,
      intent: 'credentials',
      needsHuman: true,
      sensitive: true,
      handoffReason: 'sensitive_credentials'
    };
  }

  const greeting = greetingReply(normalized);
  if (greeting) {
    return greeting;
  }

  if (hasAny(normalized, paymentKeywords)) {
    return { kind: 'text', text: PAYMENT_METHODS_REPLY, intent: 'payment_methods' };
  }

  if (hasAny(normalized, handoffKeywords)) {
    return {
      kind: 'text',
      text: HUMAN_HANDOFF_REPLY,
      intent: 'human_handoff',
      needsHuman: true,
      handoffReason: 'human_requested'
    };
  }

  if (hasAny(normalized, accountSellKeywords)) {
    return {
      kind: 'text',
      text: ACCOUNT_LISTING_REPLY,
      intent: 'account_sell',
      needsHuman: normalized.includes('اسعر') || normalized.includes('تسعير'),
      handoffReason: normalized.includes('اسعر') || normalized.includes('تسعير') ? 'needs_human_pricing' : undefined
    };
  }

  if (hasAny(normalized, accountBuyKeywords)) {
    return { kind: 'text', text: ACCOUNT_BUYING_REPLY, intent: 'account_buy' };
  }

  if (hasAny(normalized, riotGiftKeywords)) {
    return { kind: 'text', text: RIOT_GIFT_REPLY, intent: 'riot_gift' };
  }

  const mediaMatch = mediaCatalog.find(
    (item) => item.isActive !== false && item.key !== 'general_games' && matchesMediaItem(text, item)
  );

  if (mediaMatch?.imageUrl) {
    return {
      kind: 'image',
      imageUrl: mediaMatch.imageUrl,
      caption: mediaMatch.caption ?? mediaMatch.title,
      intent: mediaMatch.key === 'league_rp' ? 'league_rp' : 'top_up',
      detectedGame: mediaMatch.key
    };
  }

  if (hasAny(normalized, topUpKeywords)) {
    return {
      kind: 'text',
      text: GENERAL_TOP_UP_REPLY,
      intent: 'top_up',
      detectedGame: 'general',
      lastAskedQuestion: 'game_region_package'
    };
  }

  return null;
}
