import {
  ACCOUNT_BUYING_REPLY,
  ACCOUNT_LISTING_REPLY,
  CREDENTIALS_REPLY,
  HUMAN_HANDOFF_REPLY,
  LEAGUE_SKIN_GIFT_REPLY,
  PAYMENT_METHODS_REPLY,
  PAYMENT_PROOF_REPLY,
  PRICE_SKUS,
  RIOT_GIFT_ADD_ACCOUNTS_REPLY,
  WILD_RIFT_CORE_PACKAGES,
  WILD_RIFT_KEY_TIERS
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
  league: ['league', 'league of legends', 'lol', 'ليج', 'ليج اوف ليجندز', 'rp', 'ار بي'],
  valorant: ['valorant', 'val', 'فالورانت', 'فال', 'vp']
};

const greetingKeywords = [
  'السلام عليكم',
  'سلام عليكم',
  'صباح الخير',
  'مساء الخير',
  'هاي',
  'هلا',
  'hi',
  'hello'
];
const paymentKeywords = ['طرق الدفع', 'الدفع', 'بدفع ازاي', 'ادفع ازاي', 'احول على ايه', 'payment', 'pay'];
const paymentProofKeywords = ['تم التحويل', 'حولت', 'دفعت', 'بعتلك', 'بعت لك', 'سكرين دفع', 'وصل؟'];
const delayKeywords = ['اتأخر', 'اتأخرت', 'لسه موصلش', 'موصلش', 'فين الطلب', 'فين الشحن', 'تأخير'];
const priceKeywords = ['اسعار', 'الاسعار', 'سعر', 'بكام', 'كام', 'price', 'prices', 'list', 'menu', 'packages', 'باقات'];
const handoffKeywords = ['ادمن', 'أدمن', 'اكلم حد', 'خدمة عملاء', 'refund', 'استرجاع', 'شكوى', 'مشكلة'];
const accountSellKeywords = ['ابيع اكونت', 'أبيع اكونت', 'اعرض اكونت', 'بيع اكونت', 'sell account', 'list account'];
const accountBuyKeywords = ['اشتري اكونت', 'عايز اكونت', 'اكونت للبيع', 'buy account', 'account available'];
const giftKeywords = ['gift', 'جيفت', 'هدية', 'هديه', 'skin', 'skins', 'سكن', 'سكنات'];
const wildRiftCoreKeywords = ['core', 'cores', 'wild core', 'wild cores', 'كور', 'كورز', 'كورس'];
const mythicKeywords = ['mythic', 'prestige', 'orange essence', 'orange', 'ميثك', 'برستيج', 'اورنج', 'مفاتيح', 'key', 'keys'];
const notAddedKeywords = ['مش مضاف', 'مش ضايف', 'ضيفكم', 'اضيف مين', 'add account', 'add accounts'];
const topUpKeywords = ['شحن', 'اشحن', 'عايز اشحن', 'top up', 'charge'];

function hasAny(text: string, keywords: string[]) {
  const normalized = normalizeForIntent(text);
  return keywords.some((keyword) => {
    const needle = normalizeForIntent(keyword);
    if (/^[a-z0-9]{1,3}$/i.test(needle)) {
      return new RegExp(`(^|\\s)${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`, 'i').test(
        normalized
      );
    }
    return normalized.includes(needle);
  });
}

function detectGame(text: string, mediaCatalog: MediaCatalogEntry[]) {
  const normalized = normalizeForIntent(text);

  for (const [game, aliases] of Object.entries(gameAliases) as Array<
    [Exclude<DetectedGame, 'general' | 'unknown'>, string[]]
  >) {
    if (aliases.some((alias) => normalized.includes(normalizeForIntent(alias)))) {
      return game;
    }
  }

  const catalogMatch = mediaCatalog.find((item) =>
    item.aliases.some((alias) => normalized.includes(normalizeForIntent(alias)))
  );
  if (catalogMatch?.key === 'wild_rift_shipping') return 'wild_rift';
  if (catalogMatch?.key === 'league_rp') return 'league';
  if (catalogMatch?.key === 'valorant_vp') return 'valorant';

  return undefined;
}

function normalizeMemoryGame(value?: string | null): DetectedGame | undefined {
  if (!value) return undefined;
  if (value === 'wild_rift_shipping' || value === 'wild_rift') return 'wild_rift';
  if (value === 'league_rp' || value === 'league') return 'league';
  if (value === 'valorant_vp' || value === 'valorant') return 'valorant';
  if (value === 'general_games' || value === 'general') return 'general';
  return undefined;
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

function aiResult(intent = 'general', priceRequest = false): QuickReplyResult {
  return { matched: false, intent, priceRequest, responseType: 'ai' };
}

function handoffResult(args: Omit<QuickReplyResult, 'matched' | 'responseType' | 'priceRequest'>) {
  return {
    matched: true,
    responseType: 'handoff' as const,
    priceRequest: false,
    ...args
  };
}

function pendingFields(base: Record<string, unknown> | null | undefined, next: Record<string, unknown>) {
  return { ...(base ?? {}), ...next };
}

function imageUrlForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>, mediaCatalog: MediaCatalogEntry[]) {
  const item = mediaCatalog.find((catalogItem) => catalogItem.key === catalogKeys[game]);
  return item?.imageUrl ?? imageFallbacks[game];
}

function priceCaptionForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>) {
  if (game === 'wild_rift') {
    return 'دي أسعار Wild Rift ❤️\nاختار الباقة اللي محتاجها وابعتها لنا.';
  }
  if (game === 'league') {
    return 'دي أسعار League RP ❤️\nالـ RP فوري. ابعت السيرفر والباقه المطلوبة.';
  }
  return 'دي أسعار Valorant VP ❤️\nابعت الريجون والباقه المطلوبة.';
}

function detectedNumbers(text: string) {
  return Array.from(text.matchAll(/\d+/g)).map((match) => Number(match[0])).filter(Boolean);
}

function detectSpecificPrice(text: string, game?: DetectedGame) {
  const normalized = normalizeForIntent(text);
  const numbers = detectedNumbers(text);
  return PRICE_SKUS.find((sku) => {
    if (game && game !== 'general' && game !== 'unknown' && sku.game !== game) {
      return false;
    }
    const aliasMatch = sku.aliases.some((alias) => normalized.includes(normalizeForIntent(alias)));
    const numberMatch = numbers.includes(sku.amount);
    const unitMatch =
      (sku.unit === 'WC' && hasAny(text, wildRiftCoreKeywords)) ||
      (sku.unit === 'RP' && hasAny(text, ['rp', 'ار بي'])) ||
      (sku.unit === 'VP' && hasAny(text, ['vp', 'في بي']));
    return aliasMatch || (numberMatch && unitMatch);
  });
}

function priceReplyText(sku: (typeof PRICE_SKUS)[number]) {
  const region = sku.region ? ` ${sku.region}` : '';
  const usd = sku.usd ? ` / ${sku.usd}` : '';
  return `تمام ❤️ ${sku.amount} ${sku.unit}${region} سعرها ${sku.egp}${usd}.\nتحب تدفع Instapay ولا Vodafone Cash ولا طريقة تانية؟`;
}

function wildRiftUnknownCoreReply(text: string) {
  const number = detectedNumbers(text)[0];
  if (!number || WILD_RIFT_CORE_PACKAGES.some((pack) => pack.amount === number)) {
    return undefined;
  }

  return `مش لاقي باقة ${number} كور في الأسعار المؤكدة عندي ❤️\nاختار باقة من صورة الأسعار أو أسيبها للأدمن يراجع السعر بدل ما أديك رقم غلط.`;
}

function mythicOrangeReply(text: string) {
  const numbers = detectedNumbers(text);
  if (numbers.length >= 2) {
    const current = Math.min(numbers[0], numbers[1]);
    const required = Math.max(numbers[0], numbers[1]);
    const missing = required - current;
    if (missing <= 0) {
      return 'تمام ❤️ كده غالبًا معاك Orange Essence كفاية. ابعتلي اسم السكن المطلوب وصورته والأدمن يراجعلك التفاصيل.';
    }
    const tier = WILD_RIFT_KEY_TIERS.find((item) => missing >= item.min && missing <= item.max);
    if (!tier) {
      return 'محتاج أتأكد من السعر الحالي للكميات دي، هخلي الأدمن يراجعها لك بدل ما أديك رقم غلط.';
    }
    return `ناقصك تقريبًا ${missing} Orange Essence ❤️\nحسب سعر المفاتيح الحالي الإجمالي حوالي ${Math.round(missing * tier.pricePerKey)} EGP.\nابعت اسم السكن المطلوب والأدمن يراجع التفاصيل قبل التنفيذ.`;
  }

  return 'معاك كام Orange Essence حاليًا؟ واسم السكن المطلوب إيه؟';
}

function hasOrderDetails(memory: ConversationMemory) {
  const pending = memory.pendingFields ?? {};
  return Boolean(pending.game && (pending.package || pending.product || pending.service));
}

export function detectQuickReply(
  text: string,
  mediaCatalog: MediaCatalogEntry[] = loadDefaultMediaCatalog(env),
  memory: ConversationMemory = {},
  options: { type?: 'text' | 'image' | 'sticker' | 'unknown' } = {}
): QuickReplyResult {
  const normalizedText = text.trim();
  const memoryGame = normalizeMemoryGame(memory.detectedGame);
  const game = detectGame(text, mediaCatalog) ?? memoryGame;
  const priceRequest = hasAny(text, priceKeywords);
  const sensitive = detectSensitiveCredentials(text);

  if (sensitive.isSensitive) {
    return handoffResult({
      text: CREDENTIALS_REPLY,
      intent: 'credentials',
      needsHuman: true,
      sensitive: true,
      handoffReason: 'sensitive_credentials'
    });
  }

  if (hasAny(text, handoffKeywords)) {
    return handoffResult({
      text: HUMAN_HANDOFF_REPLY,
      intent: 'human_handoff',
      needsHuman: true,
      handoffReason: 'human_requested'
    });
  }

  if (hasAny(text, delayKeywords)) {
    return handoffResult({
      text: 'حقك علينا ❤️ ابعتلي رقم الطلب أو سكرين الدفع واسم اللعبة، والأدمن هيراجع حالة الطلب فورًا.',
      intent: 'delivery_delay',
      needsHuman: true,
      handoffReason: 'delivery_delay'
    });
  }

  if (options.type === 'image' || hasAny(text, paymentProofKeywords)) {
    return textResult({
      text: hasOrderDetails(memory)
        ? 'تمام، كده الطلب جاهز للمراجعة. الأدمن هيأكد الدفع ويبدأ التنفيذ ❤️'
        : PAYMENT_PROOF_REPLY,
      intent: 'payment_proof',
      game,
      needsHuman: true,
      handoffReason: 'payment_review'
    });
  }

  if (normalizedText && hasAny(text, greetingKeywords)) {
    return textResult({
      text: 'وعليكم السلام ورحمة الله ❤️ أهلاً بيك في The Nexus، ابعتلي اسم اللعبة أو الخدمة اللي محتاجها وأنا أظبطهالك.',
      intent: 'greeting'
    });
  }

  if (hasAny(text, paymentKeywords) || hasAny(text, ['فودافون', 'انستا باي', 'instapay', 'vodafone'])) {
    return textResult({
      text: PAYMENT_METHODS_REPLY,
      intent: 'payment_methods',
      game,
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(memory.pendingFields, { awaitingPaymentMethod: true })
    });
  }

  if (hasAny(text, accountSellKeywords)) {
    return textResult({
      text: ACCOUNT_LISTING_REPLY,
      intent: 'account_sell',
      lastAskedQuestion: 'account_form'
    });
  }

  if (hasAny(text, accountBuyKeywords)) {
    return textResult({
      text: ACCOUNT_BUYING_REPLY,
      intent: 'account_buy',
      lastAskedQuestion: 'account_preferences'
    });
  }

  if (hasAny(text, mythicKeywords)) {
    return textResult({
      text: mythicOrangeReply(text),
      intent: 'mythic_orange_keys',
      game: game ?? 'wild_rift',
      lastAskedQuestion: 'orange_amount',
      pendingFields: pendingFields(memory.pendingFields, { product: 'mythic_orange_keys' })
    });
  }

  const sku = detectSpecificPrice(text, game);
  if (sku && (priceRequest || hasAny(text, wildRiftCoreKeywords))) {
    return textResult({
      text: priceReplyText(sku),
      intent: 'specific_price',
      game: sku.game,
      priceRequest: true,
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(memory.pendingFields, {
        game: sku.game,
        product: sku.product,
        package: `${sku.amount} ${sku.unit}`,
        total: sku.egp
      })
    });
  }

  if ((game === 'wild_rift' || !game) && hasAny(text, wildRiftCoreKeywords)) {
    const unknownCoreText = wildRiftUnknownCoreReply(text);
    if (unknownCoreText) {
      return textResult({
        text: unknownCoreText,
        intent: 'unknown_price',
        game: 'wild_rift',
        needsHuman: true,
        handoffReason: 'pricing_uncertainty'
      });
    }
  }

  if (game && game !== 'general' && game !== 'unknown' && priceRequest) {
    return imageResult({
      imageUrl: imageUrlForGame(game, mediaCatalog),
      caption: priceCaptionForGame(game),
      intent: game === 'league' ? 'league_rp_prices' : `${game}_prices`,
      game,
      priceRequest,
      lastAskedQuestion: game === 'wild_rift' ? 'package' : 'region_and_package',
      pendingFields: pendingFields(memory.pendingFields, { game })
    });
  }

  if (game === 'wild_rift' && hasAny(text, giftKeywords)) {
    if (hasAny(text, notAddedKeywords) && !memory.pendingFields?.riotGiftAccountsSent) {
      return textResult({
        text: RIOT_GIFT_ADD_ACCOUNTS_REPLY,
        intent: 'wild_rift_gift_accounts',
        game: 'wild_rift',
        pendingFields: pendingFields(memory.pendingFields, { riotGiftAccountsSent: true })
      });
    }
    return textResult({
      text: 'تمام ❤️ ابعتلي اسم السكن، الـ ID، وهل الأكونت مضاف عندنا ولا لأ؟',
      intent: 'wild_rift_gift',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_gift_details',
      pendingFields: pendingFields(memory.pendingFields, { game: 'wild_rift', product: 'gift_or_skin' })
    });
  }

  if (game === 'league' && hasAny(text, giftKeywords)) {
    return textResult({
      text: LEAGUE_SKIN_GIFT_REPLY,
      intent: 'league_skin_gift',
      game: 'league',
      lastAskedQuestion: 'league_gift_details',
      pendingFields: pendingFields(memory.pendingFields, { game: 'league', product: 'skin_or_gift' })
    });
  }

  if (game === 'wild_rift' && !priceRequest) {
    return textResult({
      text: 'تمام ❤️ Wild Rift. محتاج Cores ولا Skin/Gift ولا أكونت؟',
      intent: 'wild_rift_intake',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_service',
      pendingFields: pendingFields(memory.pendingFields, { game: 'wild_rift' })
    });
  }

  if (game === 'league' && !priceRequest) {
    return textResult({
      text: 'تمام ❤️ League. محتاج RP ولا Skin/Gift؟',
      intent: 'league_intake',
      game: 'league',
      lastAskedQuestion: 'league_service',
      pendingFields: pendingFields(memory.pendingFields, { game: 'league' })
    });
  }

  if (game === 'valorant' && !priceRequest) {
    return textResult({
      text: 'تمام ❤️ Valorant. ابعتلي الريجون والباقه المطلوبة للـ VP.',
      intent: 'valorant_intake',
      game: 'valorant',
      lastAskedQuestion: 'region_and_package',
      pendingFields: pendingFields(memory.pendingFields, { game: 'valorant' })
    });
  }

  if (hasAny(text, topUpKeywords)) {
    return aiResult('top_up', priceRequest);
  }

  return aiResult('general', priceRequest);
}
