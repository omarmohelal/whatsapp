import {
  ACCOUNT_BUYING_REPLY,
  ACCOUNT_LISTING_REPLY,
  CREDENTIALS_REPLY,
  EVENING_REPLIES,
  GENERAL_TOP_UP_REPLY,
  GREETING_REPLIES,
  HUMAN_HANDOFF_REPLY,
  LEAGUE_RP_PRICE_CAPTION,
  LEAGUE_RP_TOP_UP_REPLY,
  MORNING_REPLIES,
  PAYMENT_METHODS_REPLY,
  RIOT_GIFT_REPLY,
  UNKNOWN_GAME_TOP_UP_REPLY,
  VALORANT_PRICE_CAPTION,
  VALORANT_TOP_UP_REPLY,
  VODAFONE_PAYMENT_REPLY,
  WILD_RIFT_GAME_REPLY,
  WILD_RIFT_PACKAGE_CONFIRMATION,
  WILD_RIFT_PRICE_CAPTION,
  WILD_RIFT_TOP_UP_REPLY
} from '../config/constants';
import { env } from '../config/env';
import { detectSensitiveCredentials } from './credentials';
import { normalizeForIntent } from './intent';
import { loadDefaultMediaCatalog, type MediaCatalogEntry } from './mediaCatalog';

export type DeterministicResponseType = 'text' | 'image' | 'ai' | 'handoff';
export type DetectedGame = 'wild_rift' | 'league' | 'valorant' | 'general' | 'unknown';

export interface ConversationMemory {
  lastIntent?: string | null;
  detectedGame?: string | null;
  lastAskedQuestion?: string | null;
  pendingFields?: Record<string, unknown> | null;
}

export interface QuickReplyResult {
  matched: boolean;
  intent: string;
  game?: DetectedGame;
  priceRequest: boolean;
  responseType: DeterministicResponseType;
  text?: string;
  imageUrl?: string;
  caption?: string;
  needsHuman?: boolean;
  sensitive?: boolean;
  handoffReason?: string;
  lastAskedQuestion?: string;
  pendingFields?: Record<string, unknown>;
}

const imageFallbacks = {
  wild_rift: 'https://zkxhnhckrwimheszycqr.supabase.co/storage/v1/object/public/whatsapp/wrc.png',
  league: 'https://zkxhnhckrwimheszycqr.supabase.co/storage/v1/object/public/whatsapp/lolrp213.png',
  valorant: 'https://zkxhnhckrwimheszycqr.supabase.co/storage/v1/object/public/whatsapp/valvp.png'
} as const;

const catalogKeys = {
  wild_rift: 'wild_rift_shipping',
  league: 'league_rp',
  valorant: 'valorant_vp'
} as const;

const gameAliases: Record<Exclude<DetectedGame, 'general' | 'unknown'>, string[]> = {
  wild_rift: ['وايلد', 'وايلد ريفت', 'wild rift', 'wr'],
  league: ['league', 'lol', 'ليج', 'ليج اوف ليجندز', 'rp', 'ار بي'],
  valorant: ['valorant', 'val', 'فالورانت', 'فال', 'vp']
};

const priceKeywords = [
  'اسعار',
  'الاسعار',
  'الأسعار',
  'سعر',
  'السعر',
  'بكام',
  'كام',
  'price',
  'prices',
  'list',
  'menu',
  'بعتلي الأسعار',
  'بعتلي الاسعار',
  'ابعت الأسعار',
  'ابعت الاسعار',
  'packages',
  'باقات'
];

const paymentKeywords = ['طرق الدفع', 'الدفع', 'بدفع ازاي', 'ادفع ازاي', 'payment', 'pay'];
const topUpKeywords = ['شحن', 'اشحن', 'عايز اشحن', 'عاوز اشحن', 'top up', 'charge', 'shipping'];
const wantKeywords = ['عايز', 'عاوز', 'محتاج', 'اشحن', 'شحن', 'top up', 'charge'];
const vodafoneKeywords = ['فودافون', 'vodafone', 'vodafone cash'];

const riotGiftKeywords = ['جيفت', 'جفت', 'gift', 'skin', 'skins', 'سكن', 'سكنات', 'هديه', 'هدية'];
const accountSellKeywords = [
  'ابيع اكونت',
  'أبيع اكونت',
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
const handoffKeywords = [
  'ادمن',
  'اكلم حد',
  'خدمة عملاء',
  'مشكله',
  'مشكلة',
  'refund',
  'استرجاع',
  'شكوى',
  'شكوي'
];
const credentialKeywords = ['يوزر', 'باس', 'باسورد', 'password', 'gmail', 'facebook', 'apple id', 'riot account'];

function hasAny(normalized: string, keywords: string[]) {
  return keywords.some((keyword) => containsPhrase(normalized, normalizeForIntent(keyword)));
}

function containsPhrase(normalized: string, phrase: string) {
  if (!phrase) {
    return false;
  }

  if (/^[a-z0-9]{1,3}$/i.test(phrase)) {
    return new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`, 'i').test(
      normalized
    );
  }

  return normalized.includes(phrase);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function aiResult(intent = 'general', priceRequest = false): QuickReplyResult {
  return {
    matched: false,
    intent,
    priceRequest,
    responseType: 'ai'
  };
}

function textResult(args: Omit<QuickReplyResult, 'matched' | 'responseType' | 'priceRequest'> & { priceRequest?: boolean }) {
  return {
    matched: true,
    responseType: 'text' as const,
    priceRequest: args.priceRequest ?? false,
    ...args
  };
}

function imageResult(args: Omit<QuickReplyResult, 'matched' | 'responseType'>) {
  return {
    matched: true,
    responseType: 'image' as const,
    ...args
  };
}

function handoffResult(args: Omit<QuickReplyResult, 'matched' | 'responseType' | 'priceRequest'>) {
  return {
    matched: true,
    responseType: 'handoff' as const,
    priceRequest: false,
    ...args
  };
}

function greetingReply(normalized: string): QuickReplyResult | null {
  const compact = normalized.replace(/[!?.,،؟]/g, '').trim();

  if (compact === 'صباح الخير' || compact === 'صباح النور') {
    return textResult({ text: pick(MORNING_REPLIES), intent: 'greeting' });
  }

  if (compact === 'مساء الخير' || compact === 'مساء النور') {
    return textResult({ text: pick(EVENING_REPLIES), intent: 'greeting' });
  }

  if (
    [
      'السلام عليكم',
      'سلام عليكم',
      'سلام',
      'اهلا',
      'أهلا',
      'هلا',
      'مرحبا',
      'hi',
      'hello'
    ].map(normalizeForIntent).includes(compact)
  ) {
    return textResult({ text: pick(GREETING_REPLIES), intent: 'greeting' });
  }

  return null;
}

function normalizeMemoryGame(value?: string | null): DetectedGame | undefined {
  if (!value) {
    return undefined;
  }

  if (value === 'wild_rift_shipping' || value === 'wild_rift') {
    return 'wild_rift';
  }
  if (value === 'league_rp' || value === 'league') {
    return 'league';
  }
  if (value === 'valorant_vp' || value === 'valorant') {
    return 'valorant';
  }
  if (value === 'general_games' || value === 'general') {
    return 'general';
  }

  return undefined;
}

function detectGame(text: string, mediaCatalog: MediaCatalogEntry[]): Exclude<DetectedGame, 'general' | 'unknown'> | undefined {
  const normalized = normalizeForIntent(text);

  for (const [game, aliases] of Object.entries(gameAliases) as Array<
    [Exclude<DetectedGame, 'general' | 'unknown'>, string[]]
  >) {
    if (hasAny(normalized, aliases)) {
      return game;
    }
  }

  for (const item of mediaCatalog) {
    const game = normalizeMemoryGame(item.key);
    if (!game || game === 'general' || game === 'unknown') {
      continue;
    }
    if (hasAny(normalized, item.aliases)) {
      return game;
    }
  }

  return undefined;
}

function imageUrlForGame(
  game: Exclude<DetectedGame, 'general' | 'unknown'>,
  mediaCatalog: MediaCatalogEntry[]
) {
  const item = mediaCatalog.find((catalogItem) => catalogItem.key === catalogKeys[game]);
  return item?.imageUrl ?? imageFallbacks[game];
}

function priceCaptionForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>) {
  if (game === 'wild_rift') {
    return WILD_RIFT_PRICE_CAPTION;
  }
  if (game === 'league') {
    return LEAGUE_RP_PRICE_CAPTION;
  }
  return VALORANT_PRICE_CAPTION;
}

function gameIntent(game: Exclude<DetectedGame, 'general' | 'unknown'>) {
  return game === 'league' ? 'league_rp' : 'top_up';
}

function followUpForGame(
  game: Exclude<DetectedGame, 'general' | 'unknown'>,
  hasTopUpRequest: boolean
): Pick<QuickReplyResult, 'text' | 'lastAskedQuestion' | 'pendingFields'> {
  if (game === 'wild_rift') {
    return {
      text: hasTopUpRequest ? WILD_RIFT_TOP_UP_REPLY : WILD_RIFT_GAME_REPLY,
      lastAskedQuestion: 'package',
      pendingFields: { game, missing: ['package'] }
    };
  }

  if (game === 'league') {
    return {
      text: LEAGUE_RP_TOP_UP_REPLY,
      lastAskedQuestion: 'server_and_package',
      pendingFields: { game, missing: ['server', 'package'] }
    };
  }

  return {
    text: VALORANT_TOP_UP_REPLY,
    lastAskedQuestion: 'region_and_package',
    pendingFields: { game, missing: ['region', 'package'] }
  };
}

function looksLikeGenericTopUpOnly(normalized: string) {
  return [
    'شحن',
    'اشحن',
    'عايز اشحن',
    'عاوز اشحن',
    'محتاج اشحن',
    'top up',
    'charge'
  ].some((phrase) => normalized === normalizeForIntent(phrase));
}

function safeShortValue(text: string) {
  return text.trim().replace(/\s+/g, ' ').slice(0, 80);
}

export function detectQuickReply(
  text: string,
  mediaCatalog: MediaCatalogEntry[] = loadDefaultMediaCatalog(env),
  memory: ConversationMemory = {}
): QuickReplyResult {
  const normalized = normalizeForIntent(text);
  const priceRequest = hasAny(normalized, priceKeywords);
  const hasTopUpRequest = hasAny(normalized, topUpKeywords);
  const game = detectGame(text, mediaCatalog);
  const memoryGame = normalizeMemoryGame(memory.detectedGame);
  const activeGame = game ?? (priceRequest ? memoryGame : undefined);
  const sensitive = detectSensitiveCredentials(text);

  if (sensitive.isSensitive || hasAny(normalized, credentialKeywords)) {
    return handoffResult({
      text: CREDENTIALS_REPLY,
      intent: 'credentials',
      needsHuman: true,
      sensitive: true,
      handoffReason: 'sensitive_credentials'
    });
  }

  if (hasAny(normalized, handoffKeywords)) {
    return handoffResult({
      text: HUMAN_HANDOFF_REPLY,
      intent: 'human_handoff',
      needsHuman: true,
      handoffReason: 'human_requested'
    });
  }

  const greeting = greetingReply(normalized);
  if (greeting) {
    return greeting;
  }

  if (hasAny(normalized, paymentKeywords)) {
    return textResult({ text: PAYMENT_METHODS_REPLY, intent: 'payment_methods' });
  }

  if (memory.lastAskedQuestion === 'payment_method' && hasAny(normalized, vodafoneKeywords)) {
    return textResult({
      text: VODAFONE_PAYMENT_REPLY,
      intent: 'payment_method_selected',
      game: memoryGame,
      pendingFields: { ...(memory.pendingFields ?? {}), paymentMethod: 'vodafone_cash' }
    });
  }

  if (hasAny(normalized, accountSellKeywords)) {
    const needsPricing = hasAny(normalized, ['اسعر', 'تسعير']);
    return textResult({
      text: ACCOUNT_LISTING_REPLY,
      intent: 'account_sell',
      needsHuman: needsPricing,
      handoffReason: needsPricing ? 'needs_human_pricing' : undefined
    });
  }

  if (hasAny(normalized, accountBuyKeywords)) {
    return textResult({ text: ACCOUNT_BUYING_REPLY, intent: 'account_buy' });
  }

  if (hasAny(normalized, riotGiftKeywords)) {
    return textResult({ text: RIOT_GIFT_REPLY, intent: 'riot_gift' });
  }

  if (activeGame && activeGame !== 'general' && activeGame !== 'unknown' && priceRequest) {
    return imageResult({
      imageUrl: imageUrlForGame(activeGame, mediaCatalog),
      caption: priceCaptionForGame(activeGame),
      intent: gameIntent(activeGame),
      game: activeGame,
      priceRequest,
      lastAskedQuestion: activeGame === 'wild_rift' ? 'package' : 'server_and_package',
      pendingFields: {
        ...(memory.pendingFields ?? {}),
        game: activeGame,
        missing: activeGame === 'wild_rift' ? ['package'] : ['server', 'package']
      }
    });
  }

  if (game) {
    const followUp = followUpForGame(game, hasTopUpRequest || hasAny(normalized, wantKeywords));
    return textResult({
      ...followUp,
      intent: gameIntent(game),
      game,
      priceRequest
    });
  }

  if (memory.lastAskedQuestion === 'package' && memoryGame === 'wild_rift' && !priceRequest) {
    const packageName = safeShortValue(text);
    return textResult({
      text: WILD_RIFT_PACKAGE_CONFIRMATION(packageName),
      intent: 'top_up_package_received',
      game: 'wild_rift',
      lastAskedQuestion: 'payment_method',
      pendingFields: { ...(memory.pendingFields ?? {}), game: 'wild_rift', package: packageName }
    });
  }

  if (hasTopUpRequest || priceRequest) {
    const textReply = looksLikeGenericTopUpOnly(normalized) ? GENERAL_TOP_UP_REPLY : UNKNOWN_GAME_TOP_UP_REPLY;
    return textResult({
      text: textReply,
      intent: 'top_up',
      game: looksLikeGenericTopUpOnly(normalized) ? 'general' : 'unknown',
      priceRequest,
      lastAskedQuestion: 'game_and_package',
      pendingFields: { missing: ['game', 'package'] }
    });
  }

  return aiResult('general', priceRequest);
}
