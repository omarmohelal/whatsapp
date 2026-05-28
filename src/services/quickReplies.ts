import {
  ACCOUNT_BUYING_REPLY,
  ACCOUNT_LISTING_REPLY,
  ASK_PACKAGE_AGAIN_REPLY,
  CREDENTIALS_REPLY,
  EVENING_REPLIES,
  GENERAL_TOP_UP_REPLY,
  GAME_DISPLAY_NAMES,
  GREETING_REPLIES,
  HUMAN_HANDOFF_REPLY,
  INSTANT_PAYMENT_REPLIES,
  LEAGUE_RP_PRICE_CAPTION,
  LEAGUE_RP_TOP_UP_REPLY,
  LEAGUE_SERVER_AFTER_PACKAGE_REPLY,
  MORNING_REPLIES,
  PACKAGE_PAYMENT_PROMPT,
  PAYMENT_METHODS_REPLY,
  PRICE_LIST_NEEDS_GAME_REPLY,
  RIOT_GIFT_REPLY,
  UNKNOWN_GAME_TOP_UP_REPLY,
  VALORANT_PRICE_CAPTION,
  VALORANT_REGION_AFTER_PACKAGE_REPLY,
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
export type PaymentMethod = 'vodafone_cash' | 'instapay' | 'paypal' | 'payoneer' | 'binance' | 'card';

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
  meta?: Record<string, unknown>;
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
  wild_rift: [
    'وايلد',
    'وايلد ريفت',
    'وايلدرفت',
    'وايلد ريفتت',
    'وايلدريفت',
    'ويلد ريفت',
    'wild rift',
    'wildrift',
    'wr'
  ],
  league: ['league', 'league of legends', 'lol', 'ليج', 'ليج اوف ليجندز', 'rp', 'ار بي', 'اربي'],
  valorant: ['valorant', 'val', 'فالورانت', 'فال', 'vp', 'في بي']
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
  'price list',
  'list',
  'menu',
  'بعتلي الأسعار',
  'بعتلي الاسعار',
  'ابعت الأسعار',
  'ابعت الاسعار',
  'ابعتلي الاسعار',
  'ابعتلي الأسعار',
  'packages',
  'package',
  'الباقه',
  'الباقة',
  'الباقات',
  'باقات',
  'ابعت الباقه',
  'ابعت الباقة',
  'ابعت الباقات',
  'ابعتلي الباقه',
  'ابعتلي الباقة',
  'ابعتلي الباقات',
  'ابعتهالي',
  'ابعتها',
  'ابعتها يا باشا',
  'ابعت',
  'ابعته',
  'send prices',
  'send list'
];

const paymentKeywords = ['طرق الدفع', 'الدفع', 'بدفع ازاي', 'ادفع ازاي', 'payment', 'pay', 'pay methods'];
const topUpKeywords = ['شحن', 'اشحن', 'عايز اشحن', 'عاوز اشحن', 'محتاج اشحن', 'top up', 'charge', 'shipping'];
const wantKeywords = ['عايز', 'عاوز', 'محتاج', 'عايزه', 'عاوزه', 'عايزين', 'اشحن', 'شحن', 'top up', 'charge'];

const paymentMethodAliases: Record<PaymentMethod, string[]> = {
  vodafone_cash: ['فودافون', 'فودافون كاش', 'vodafone', 'vodafone cash', 'vcash'],
  instapay: ['انستا باي', 'انستاباي', 'instapay', 'insta pay'],
  paypal: ['paypal', 'بايبال', 'باي بال'],
  payoneer: ['payoneer', 'بايونير'],
  binance: ['binance', 'باينانس', 'crypto', 'كريبتو', 'usdt'],
  card: ['credit card', 'card', 'visa', 'mastercard', 'كارت', 'فيزا']
};

const riotGiftKeywords = ['جيفت', 'جفت', 'gift', 'skin', 'skins', 'سكن', 'سكنات', 'هديه', 'هدية'];
const accountSellKeywords = [
  'ابيع اكونت',
  'ابيع اكاونت',
  'أبيع اكونت',
  'اعرض اكونت',
  'اسعر اكونت',
  'تسعير اكونت',
  'بيع اكونت',
  'بيع اكاونت',
  'list account',
  'sell account'
];
const accountBuyKeywords = [
  'اشتري اكونت',
  'اشتري اكاونت',
  'عايز اكونت',
  'عايز اكاونت',
  'اكونت للبيع',
  'account available',
  'buy account'
];
const handoffKeywords = [
  'ادمن',
  'اكلم حد',
  'خدمة عملاء',
  'خدمه عملاء',
  'مشكله',
  'مشكلة',
  'refund',
  'استرجاع',
  'استرداد',
  'شكوى',
  'شكوي',
  'فلوسي',
  'اتأخر',
  'متاخر'
];
const credentialKeywords = ['يوزر', 'باس', 'باسورد', 'password', 'gmail', 'facebook', 'apple id', 'riot account'];
const shortAffirmations = ['اه', 'اها', 'تمام', 'اوك', 'اوكي', 'ok', 'ماشي', 'اشطا', 'حاضر'];
const priceSendOnly = ['ابعت', 'ابعته', 'ابعتها', 'ابعتهالي', 'هاتها', 'ورهالي', 'وريني'];

function normalizeArabicDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabic = '٠١٢٣٤٥٦٧٨٩'.indexOf(digit);
    if (arabic >= 0) {
      return String(arabic);
    }
    return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
  });
}

function normalizeText(value: string) {
  return normalizeForIntent(normalizeArabicDigits(value))
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(normalized: string, keywords: string[]) {
  return keywords.some((keyword) => containsPhrase(normalized, normalizeText(keyword)));
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

function aiResult(intent = 'general', priceRequest = false, meta?: Record<string, unknown>): QuickReplyResult {
  return {
    matched: false,
    intent,
    priceRequest,
    responseType: 'ai',
    meta
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
      'ازيك',
      'عامل ايه',
      'اهلا',
      'أهلا',
      'اهلين',
      'هلا',
      'يا هلا',
      'مرحبا',
      'هاي',
      'hi',
      'hello'
    ]
      .map(normalizeText)
      .includes(compact)
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
  const normalized = normalizeText(text);

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

function detectPaymentMethod(normalized: string): PaymentMethod | undefined {
  for (const [method, aliases] of Object.entries(paymentMethodAliases) as Array<[PaymentMethod, string[]]>) {
    if (hasAny(normalized, aliases)) {
      return method;
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

function missingFieldsForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>) {
  if (game === 'wild_rift') {
    return ['package'];
  }
  if (game === 'league') {
    return ['server', 'package'];
  }
  return ['region', 'package'];
}

function followUpForGame(
  game: Exclude<DetectedGame, 'general' | 'unknown'>,
  hasTopUpRequest: boolean
): Pick<QuickReplyResult, 'text' | 'lastAskedQuestion' | 'pendingFields'> {
  if (game === 'wild_rift') {
    return {
      text: hasTopUpRequest ? WILD_RIFT_TOP_UP_REPLY : WILD_RIFT_GAME_REPLY,
      lastAskedQuestion: 'package',
      pendingFields: { game, package: null, missing: ['package'] }
    };
  }

  if (game === 'league') {
    return {
      text: LEAGUE_RP_TOP_UP_REPLY,
      lastAskedQuestion: 'server_and_package',
      pendingFields: { game, server: null, package: null, missing: ['server', 'package'] }
    };
  }

  return {
    text: VALORANT_TOP_UP_REPLY,
    lastAskedQuestion: 'region_and_package',
    pendingFields: { game, region: null, package: null, missing: ['region', 'package'] }
  };
}

function looksLikeGenericTopUpOnly(normalized: string) {
  return ['شحن', 'اشحن', 'عايز اشحن', 'عاوز اشحن', 'محتاج اشحن', 'top up', 'charge'].some(
    (phrase) => normalized === normalizeText(phrase)
  );
}

function safeShortValue(text: string) {
  return normalizeArabicDigits(text).trim().replace(/\s+/g, ' ').slice(0, 80);
}

function looksLikePackageSelection(normalized: string, rawText: string) {
  const compact = normalized.replace(/[،,]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/\d+\s*(\$|دولار|usd|egp|جنيه|كور|core|cores|كي|key|keys|vp|rp|بوينت|نقطه|نقطة|شدات|جواهر|uc)\b/i.test(compact)) {
    return true;
  }

  if (/^(\$?\s*)?\d{1,6}\s*(\$)?$/.test(compact)) {
    return true;
  }

  return /[٠-٩0-9]/.test(rawText) && rawText.trim().length <= 40;
}

function looksLikeShortAffirmation(normalized: string) {
  return shortAffirmations.map(normalizeText).includes(normalized);
}

function looksLikeSendIt(normalized: string) {
  return priceSendOnly.map(normalizeText).includes(normalized);
}

function getMemoryValue(memory: ConversationMemory, key: string): string | undefined {
  const value = memory.pendingFields?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function gameDisplayName(game: DetectedGame) {
  return GAME_DISPLAY_NAMES[game];
}

function priceImageForContext(
  game: Exclude<DetectedGame, 'general' | 'unknown'>,
  mediaCatalog: MediaCatalogEntry[],
  memory: ConversationMemory,
  priceRequest: boolean
) {
  return imageResult({
    imageUrl: imageUrlForGame(game, mediaCatalog),
    caption: priceCaptionForGame(game),
    intent: gameIntent(game),
    game,
    priceRequest,
    lastAskedQuestion: game === 'wild_rift' ? 'package' : 'package',
    pendingFields: {
      ...(memory.pendingFields ?? {}),
      game,
      missing: missingFieldsForGame(game)
    },
    meta: { selectedHandler: 'price_image' }
  });
}

function packageReplyForGame(
  game: Exclude<DetectedGame, 'general' | 'unknown'>,
  packageName: string,
  memory: ConversationMemory
): QuickReplyResult {
  if (game === 'wild_rift') {
    return textResult({
      text: WILD_RIFT_PACKAGE_CONFIRMATION(packageName),
      intent: 'top_up_package_received',
      game,
      lastAskedQuestion: 'payment_method',
      pendingFields: { ...(memory.pendingFields ?? {}), game, package: packageName, missing: ['payment_method'] },
      meta: { packageSelectionDetected: true }
    });
  }

  if (game === 'valorant') {
    const region = getMemoryValue(memory, 'region');
    if (!region) {
      return textResult({
        text: VALORANT_REGION_AFTER_PACKAGE_REPLY,
        intent: 'top_up_package_received',
        game,
        lastAskedQuestion: 'region',
        pendingFields: { ...(memory.pendingFields ?? {}), game, package: packageName, missing: ['region'] },
        meta: { packageSelectionDetected: true, missing: ['region'] }
      });
    }

    return textResult({
      text: PACKAGE_PAYMENT_PROMPT(packageName, gameDisplayName(game)),
      intent: 'top_up_package_received',
      game,
      lastAskedQuestion: 'payment_method',
      pendingFields: { ...(memory.pendingFields ?? {}), game, package: packageName, region, missing: ['payment_method'] },
      meta: { packageSelectionDetected: true }
    });
  }

  const server = getMemoryValue(memory, 'server');
  if (!server) {
    return textResult({
      text: LEAGUE_SERVER_AFTER_PACKAGE_REPLY,
      intent: 'top_up_package_received',
      game,
      lastAskedQuestion: 'server',
      pendingFields: { ...(memory.pendingFields ?? {}), game, package: packageName, missing: ['server'] },
      meta: { packageSelectionDetected: true, missing: ['server'] }
    });
  }

  return textResult({
    text: PACKAGE_PAYMENT_PROMPT(packageName, gameDisplayName(game)),
    intent: 'top_up_package_received',
    game,
    lastAskedQuestion: 'payment_method',
    pendingFields: { ...(memory.pendingFields ?? {}), game, package: packageName, server, missing: ['payment_method'] },
    meta: { packageSelectionDetected: true }
  });
}

function regionOrServerReply(
  game: Exclude<DetectedGame, 'wild_rift' | 'general' | 'unknown'>,
  value: string,
  memory: ConversationMemory
): QuickReplyResult {
  const packageName = getMemoryValue(memory, 'package');
  if (game === 'valorant') {
    return textResult({
      text: packageName
        ? PACKAGE_PAYMENT_PROMPT(packageName, gameDisplayName(game))
        : 'تمام ❤️ ابعتلي الباقة المطلوبة للـ VP.',
      intent: 'top_up_region_received',
      game,
      lastAskedQuestion: packageName ? 'payment_method' : 'package',
      pendingFields: {
        ...(memory.pendingFields ?? {}),
        game,
        region: value,
        missing: packageName ? ['payment_method'] : ['package']
      }
    });
  }

  return textResult({
    text: packageName ? PACKAGE_PAYMENT_PROMPT(packageName, gameDisplayName(game)) : 'تمام ❤️ ابعتلي الباقة المطلوبة للـ RP.',
    intent: 'top_up_server_received',
    game,
    lastAskedQuestion: packageName ? 'payment_method' : 'package',
    pendingFields: {
      ...(memory.pendingFields ?? {}),
      game,
      server: value,
      missing: packageName ? ['payment_method'] : ['package']
    }
  });
}

function shouldTreatShortAsRegionOrServer(normalized: string, memory: ConversationMemory, game: DetectedGame | undefined) {
  if (!game || game === 'wild_rift' || game === 'general' || game === 'unknown') {
    return false;
  }
  if (!['region', 'server', 'region_and_package', 'server_and_package'].includes(memory.lastAskedQuestion ?? '')) {
    return false;
  }
  if (normalized.length > 24) {
    return false;
  }
  return /^[a-z0-9\s#_-]+$/i.test(normalized) || /^[\u0600-\u06FFa-z0-9\s#_-]+$/i.test(normalized);
}

export function detectQuickReply(
  text: string,
  mediaCatalog: MediaCatalogEntry[] = loadDefaultMediaCatalog(env),
  memory: ConversationMemory = {}
): QuickReplyResult {
  const normalized = normalizeText(text);
  const priceRequest = hasAny(normalized, priceKeywords);
  const hasTopUpRequest = hasAny(normalized, topUpKeywords);
  const game = detectGame(text, mediaCatalog);
  const memoryGame = normalizeMemoryGame(memory.detectedGame);
  const activeGame = game ?? memoryGame;
  const sensitive = detectSensitiveCredentials(text);
  const meta = {
    loadedConversationMemory: Boolean(memory.lastIntent || memory.detectedGame || memory.lastAskedQuestion),
    detectedGameFromMemory: !game && Boolean(memoryGame),
    pendingFieldsBefore: memory.pendingFields ?? null,
    priceRequestDetected: priceRequest
  };

  if (sensitive.isSensitive || hasAny(normalized, credentialKeywords)) {
    return handoffResult({
      text: CREDENTIALS_REPLY,
      intent: 'credentials',
      needsHuman: true,
      sensitive: true,
      handoffReason: 'sensitive_credentials',
      meta
    });
  }

  if (hasAny(normalized, handoffKeywords)) {
    return handoffResult({
      text: HUMAN_HANDOFF_REPLY,
      intent: 'human_handoff',
      needsHuman: true,
      handoffReason: 'human_requested',
      meta
    });
  }

  const greeting = greetingReply(normalized);
  if (greeting) {
    return { ...greeting, meta };
  }

  const paymentMethod = detectPaymentMethod(normalized);
  if (memory.lastAskedQuestion === 'payment_method' && paymentMethod) {
    return textResult({
      text: paymentMethod === 'vodafone_cash' ? VODAFONE_PAYMENT_REPLY : INSTANT_PAYMENT_REPLIES[paymentMethod],
      intent: 'payment_method_selected',
      game: memoryGame,
      pendingFields: { ...(memory.pendingFields ?? {}), paymentMethod, missing: [] },
      meta: { ...meta, paymentMethod }
    });
  }

  if (paymentMethod && !game && !hasTopUpRequest) {
    return textResult({
      text: paymentMethod === 'vodafone_cash' ? VODAFONE_PAYMENT_REPLY : INSTANT_PAYMENT_REPLIES[paymentMethod],
      intent: 'payment_method_selected',
      game: memoryGame,
      pendingFields: { ...(memory.pendingFields ?? {}), paymentMethod, missing: [] },
      meta: { ...meta, paymentMethod, directPaymentMethod: true }
    });
  }

  if (hasAny(normalized, paymentKeywords)) {
    return textResult({ text: PAYMENT_METHODS_REPLY, intent: 'payment_methods', meta });
  }

  if (hasAny(normalized, accountSellKeywords)) {
    const needsPricing = hasAny(normalized, ['اسعر', 'تسعير']);
    return textResult({
      text: ACCOUNT_LISTING_REPLY,
      intent: 'account_sell',
      needsHuman: needsPricing,
      handoffReason: needsPricing ? 'needs_human_pricing' : undefined,
      meta
    });
  }

  if (hasAny(normalized, accountBuyKeywords)) {
    return textResult({ text: ACCOUNT_BUYING_REPLY, intent: 'account_buy', meta });
  }

  if (hasAny(normalized, riotGiftKeywords)) {
    return textResult({ text: RIOT_GIFT_REPLY, intent: 'riot_gift', meta });
  }

  if (priceRequest) {
    if (activeGame && activeGame !== 'general' && activeGame !== 'unknown') {
      return priceImageForContext(activeGame, mediaCatalog, memory, priceRequest);
    }
    return textResult({
      text: PRICE_LIST_NEEDS_GAME_REPLY,
      intent: 'price_list_needs_game',
      priceRequest,
      lastAskedQuestion: 'game',
      pendingFields: { ...(memory.pendingFields ?? {}), missing: ['game'] },
      meta
    });
  }

  if (activeGame && activeGame !== 'general' && activeGame !== 'unknown') {
    if (looksLikeSendIt(normalized)) {
      return priceImageForContext(activeGame, mediaCatalog, memory, true);
    }

    if (looksLikePackageSelection(normalized, text) && (memory.lastAskedQuestion || memoryGame)) {
      return packageReplyForGame(activeGame, safeShortValue(text), memory);
    }

    if (looksLikeShortAffirmation(normalized) && ['package', 'server_and_package', 'region_and_package'].includes(memory.lastAskedQuestion ?? '')) {
      return textResult({
        text: ASK_PACKAGE_AGAIN_REPLY,
        intent: 'clarify_package',
        game: activeGame,
        lastAskedQuestion: 'package',
        pendingFields: { ...(memory.pendingFields ?? {}), game: activeGame, missing: ['package'] },
        meta
      });
    }

    if (shouldTreatShortAsRegionOrServer(normalized, memory, activeGame) && activeGame !== 'wild_rift') {
      return regionOrServerReply(activeGame, safeShortValue(text), memory);
    }
  }

  if (game) {
    const followUp = followUpForGame(game, hasTopUpRequest || hasAny(normalized, wantKeywords));
    return textResult({
      ...followUp,
      intent: gameIntent(game),
      game,
      priceRequest,
      meta: { ...meta, gameDetected: game }
    });
  }

  if (hasTopUpRequest) {
    const textReply = looksLikeGenericTopUpOnly(normalized) ? GENERAL_TOP_UP_REPLY : UNKNOWN_GAME_TOP_UP_REPLY;
    return textResult({
      text: textReply,
      intent: 'top_up',
      game: looksLikeGenericTopUpOnly(normalized) ? 'general' : 'unknown',
      priceRequest,
      lastAskedQuestion: 'game_and_package',
      pendingFields: { missing: ['game', 'package'] },
      meta
    });
  }

  return aiResult('general', priceRequest, meta);
}
