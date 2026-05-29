import {
  ACCOUNT_BUYING_REPLY,
  ACCOUNT_LISTING_REPLY,
  CREDENTIALS_REPLY,
  HUMAN_HANDOFF_REPLY,
  LEAGUE_SKIN_GIFT_REPLY,
  ORDER_COMPLETED_REVIEW_REPLY,
  PAYMENT_METHODS_REPLY,
  PAYMENT_PROOF_REPLY,
  PRICE_SKUS,
  RIOT_GIFT_ADD_ACCOUNTS_REPLY,
  WILD_RIFT_CORE_PACKAGES,
  WILD_RIFT_KEY_TIERS,
  WILD_RIFT_SKIN_PRICES
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
  wild_rift: ['وايلد', 'وايلد ريفت', 'وايلدرفت', 'ريفت', 'wild rift', 'wildrift', 'wr'],
  league: ['league', 'league of legends', 'lol', 'ليج', 'لول', 'ليج اوف ليجندز', 'rp', 'ار بي'],
  valorant: ['valorant', 'val', 'فالورانت', 'فالورنت', 'فال', 'vp', 'في بي']
};

const greetingKeywords = ['السلام عليكم', 'سلام عليكم', 'سلامو', 'سلام', 'صباح الخير', 'صباحو', 'مساء الخير', 'هاي', 'هلا', 'hi', 'hello', 'ازيك', 'عامل ايه'];
const paymentKeywords = ['طرق الدفع', 'طريقه الدفع', 'طريقة الدفع', 'الدفع', 'بدفع ازاي', 'ادفع ازاي', 'احول على ايه', 'payment', 'pay'];
const paymentProofKeywords = ['تم التحويل', 'حولت', 'دفعت', 'بعتلك سكرين', 'بعت لك سكرين', 'سكرين دفع', 'وصل؟', 'وصل الدفع', 'ادي السكرين', 'ابعتلك السكرين'];
const orderDoneKeywords = ['وصلت', 'استلمت', 'تم الشحن', 'الشحن وصل', 'وصل يا باشا', 'وصل شكرا'];
const delayKeywords = ['اتأخر', 'اتأخرت', 'لسه موصلش', 'موصلش', 'فين الطلب', 'فين الشحن', 'تأخير'];
const priceKeywords = ['اسعار', 'الاسعار', 'أسعار', 'السعر', 'سعر', 'بكام', 'كام', 'price', 'prices', 'list', 'menu', 'packages', 'باقات'];
const handoffKeywords = ['ادمن', 'أدمن', 'اكلم حد', 'خدمة عملاء', 'refund', 'استرجاع', 'شكوى', 'مشكلة'];
const accountSellKeywords = ['ابيع اكونت', 'أبيع اكونت', 'اعرض اكونت', 'بيع اكونت', 'sell account', 'list account'];
const accountBuyKeywords = ['اشتري اكونت', 'عايز اكونت', 'اكونت للبيع', 'buy account', 'account available'];
const giftKeywords = ['gift', 'جيفت', 'جفت', 'هدية', 'هديه', 'skin', 'skins', 'سكن', 'سكنات', 'اسكن', 'اسكين', 'سكنه', 'سكين'];
const wildRiftCoreKeywords = ['core', 'cores', 'wild core', 'wild cores', 'كور', 'كورز', 'كورس', 'كوريز', 'ويلد كور'];
const mythicKeywords = ['mythic', 'prestige', 'orange essence', 'orange', 'ميثك', 'برستيج', 'اورنج', 'مفاتيح', 'key', 'keys'];
const notAddedKeywords = ['مش مضاف', 'مش ضايف', 'ضيفكم', 'اضيف مين', 'add account', 'add accounts', 'add'];
const topUpKeywords = ['شحن', 'اشحن', 'هشحن', 'عايز اشحن', 'عاوز اشحن', 'محتاج اشحن', 'اشتري', 'عايز اشتري', 'top up', 'charge'];
const leagueGiftAskKeywords = ['هشحن جيفت', 'جيفت ليج', 'سكن ليج', 'league gift', 'league skin'];
const explainGiftKeywords = ['مش فاهم', 'مش فاهمه', 'مش واضح', 'افهم', 'فهمني', 'ايه الاسكن الهديه', 'يعني ايه gift', 'يعني ايه جيفت', 'ازاي الجيفت', 'الهديه دي ايه'];
const confusionKeywords = ['مش عارف', 'مش فاهم', 'مش واضح', 'اعمل اي', 'ادوس فين', 'ازاي', 'اي المطلوب', 'يعني ايه', 'فهمني', 'وضحلي', 'مش فاهمك'];
const unsupportedOrNoiseKeywords = ['كلام مش عارف', 'مش عايز ادوس', 'مش عارف يدوس'];

function hasAny(text: string, keywords: string[]) {
  const normalized = normalizeForIntent(text);
  return keywords.some((keyword) => {
    const needle = normalizeForIntent(keyword);
    if (/^[a-z0-9]{1,3}$/i.test(needle)) {
      return new RegExp(`(^|\\s)${needle.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}($|\\s)`, 'i').test(normalized);
    }
    return normalized.includes(needle);
  });
}

function detectGame(text: string, mediaCatalog: MediaCatalogEntry[]) {
  const normalized = normalizeForIntent(text);

  for (const [game, aliases] of Object.entries(gameAliases) as Array<[Exclude<DetectedGame, 'general' | 'unknown'>, string[]]>) {
    if (aliases.some((alias) => normalized.includes(normalizeForIntent(alias)))) return game;
  }

  const catalogMatch = mediaCatalog.find((item) => item.aliases.some((alias) => normalized.includes(normalizeForIntent(alias))));
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
  return { matched: true, responseType: 'text' as const, priceRequest: args.priceRequest ?? false, ...args };
}

function imageResult(args: Omit<QuickReplyResult, 'matched' | 'responseType'>) {
  return { matched: true, responseType: 'image' as const, ...args };
}

function aiResult(intent = 'general', priceRequest = false): QuickReplyResult {
  return { matched: false, intent, priceRequest, responseType: 'ai' };
}

function handoffResult(args: Omit<QuickReplyResult, 'matched' | 'responseType' | 'priceRequest'>) {
  return { matched: true, responseType: 'handoff' as const, priceRequest: false, ...args };
}

function pendingFields(base: Record<string, unknown> | null | undefined, next: Record<string, unknown>) {
  return { ...(base ?? {}), ...next };
}

function imageUrlForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>, mediaCatalog: MediaCatalogEntry[]) {
  const item = mediaCatalog.find((catalogItem) => catalogItem.key === catalogKeys[game]);
  return item?.imageUrl ?? imageFallbacks[game];
}

function priceCaptionForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>) {
  if (game === 'wild_rift') return 'دي أسعار Wild Rift ❤️\nلو هتشحن كورز ابعت العدد بس، ولو سكن ابعت اسم السكن أو صورته.';
  if (game === 'league') return 'دي أسعار League RP ❤️\nالـ RP فوري. ابعت السيرفر والباقة المطلوبة.';
  return 'دي أسعار Valorant VP ❤️\nابعت الريجون والباقة المطلوبة.';
}

function normalizeDigits(text: string) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return text.replace(/[٠-٩۰-۹]/g, (char) => {
    const arabicIndex = arabic.indexOf(char);
    if (arabicIndex >= 0) return String(arabicIndex);
    const persianIndex = persian.indexOf(char);
    return String(persianIndex);
  });
}

function detectedNumbers(text: string) {
  const normalized = normalizeDigits(text.replace(/,/g, ''));
  const numbers = Array.from(normalized.matchAll(/\d+/g)).map((match) => Number(match[0])).filter(Boolean);
  if (/10\s*(?:k|الف|الاف|ألف|آلاف|تلاف)/i.test(normalized)) numbers.push(10000);
  return Array.from(new Set(numbers));
}


function isBareGameOnly(text: string) {
  const normalized = normalizeForIntent(text);
  const withoutGameWords = normalized
    .replace(/wild rift|wildrift|وايلد ريفت|وايلدرفت|وايلد|wr|league of legends|league|ليج اوف ليجندز|ليج|lol|لول|valorant|فالورانت|فالورنت|فال|val|vp/gi, '')
    .replace(/\s+/g, '')
    .trim();
  return withoutGameWords.length === 0;
}

function isBarePriceNudge(text: string) {
  const normalized = normalizeForIntent(text);
  return ['الاسعار', 'اسعار', 'السعر', 'سعر', 'بكام', 'كام', 'price', 'prices'].includes(normalized);
}

function isAskingForGiftAccounts(text: string) {
  return hasAny(text, notAddedKeywords) || hasAny(text, ['ابعت اكونتات الاضافه', 'ابعت الاكونتات', 'اضيف مين', 'اضيفكم ازاي', 'هات الاكونتات']);
}

function isCustomerSayingAdded(text: string) {
  return hasAny(text, ['ضيفت', 'ضفت', 'عملت add', 'بعت ادد', 'بعت add', 'قبلت', 'تمت الاضافه', 'اتقبلت', 'مضاف']);
}

function hasWildRiftGiftContext(memory: ConversationMemory, pending: Record<string, unknown>) {
  return memory.detectedGame === 'wild_rift' || pending.game === 'wild_rift' || memory.lastAskedQuestion === 'wild_rift_gift_details' || pending.product === 'gift_or_skin';
}

function hasLeagueGiftContext(memory: ConversationMemory, pending: Record<string, unknown>) {
  return memory.detectedGame === 'league' || pending.game === 'league' || memory.lastAskedQuestion === 'league_gift_details' || pending.product === 'skin_or_gift';
}

function detectWildRiftCorePackage(text: string) {
  const normalized = normalizeForIntent(normalizeDigits(text));
  const numbers = detectedNumbers(text);
  if (/10\s*(?:k|الف|الاف|ألف|آلاف|تلاف)/i.test(normalized)) numbers.push(10000);
  return WILD_RIFT_CORE_PACKAGES.find((pack) => numbers.includes(pack.amount));
}

function detectWildRiftSkinType(text: string) {
  const normalized = normalizeForIntent(text);
  return Object.values(WILD_RIFT_SKIN_PRICES).find((skin) =>
    skin.aliases.some((alias) => normalized.includes(normalizeForIntent(alias)))
  );
}

function detectSpecificPrice(text: string, game?: DetectedGame) {
  const normalized = normalizeForIntent(normalizeDigits(text));
  const numbers = detectedNumbers(text);
  return PRICE_SKUS.find((sku) => {
    if (game && game !== 'general' && game !== 'unknown' && sku.game !== game) return false;
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
  return `تمام ❤️ ${sku.amount} ${sku.unit}${region} سعرها ${sku.egp}${usd}.\nتحب تدفع InstaPay ولا Vodafone Cash؟ ولو طريقة تانية قولّي.`;
}

function wildRiftCorePriceReply(amount: number, egp: number) {
  return `تمام ❤️ ${amount} Wild Cores سعرها ${egp} EGP.\nاختار طريقة الدفع: InstaPay ولا Vodafone Cash؟\nبعد التحويل ابعت سكرين الدفع، وبعدها هنحتاج بيانات الأكونت بشكل آمن لإتمام الشحن.`;
}

function wildRiftUnknownCoreReply(text: string) {
  const number = detectedNumbers(text).sort((a, b) => b - a)[0];
  if (!number || WILD_RIFT_CORE_PACKAGES.some((pack) => pack.amount === number)) return undefined;
  return `مش لاقي باقة ${number} كور في الأسعار المؤكدة عندي ❤️\nابعتلي صورة الأسعار اللي معاك أو اختار باقة من الصورة، والأدمن يراجع لو محتاج كمية خاصة.`;
}

function getKeyTierPrice(missing: number) {
  return WILD_RIFT_KEY_TIERS.find((item) => missing >= item.min && missing <= item.max);
}

function orangeCostText(missing: number) {
  if (missing <= 0) return 'كده غالبًا معاك Orange كفاية ❤️ ابعت اسم السكن أو صورته ونأكد التنفيذ.';
  const tier = getKeyTierPrice(missing);
  if (!tier) return `ناقصك ${missing} Orange تقريبًا ❤️ الكمية دي ممكن يدخلها خصم كميات، فالأدمن يأكد السعر النهائي قبل الدفع.`;
  return `ناقصك ${missing} Orange تقريبًا ❤️ تكلفتهم حوالي ${Math.round(missing * tier.pricePerKey)} EGP على سعر المفاتيح الحالي.`;
}

function extractOrangeIntentNumber(text: string) {
  return detectedNumbers(text).sort((a, b) => b - a)[0];
}

function isOrangeContext(memory: ConversationMemory, pending: Record<string, unknown>) {
  return memory.lastAskedQuestion === 'orange_amount' || pending.product === 'mythic_orange_keys' || memory.lastIntent === 'mythic_orange_keys';
}

function classifyOrangeNumber(text: string, pending: Record<string, unknown>) {
  const normalized = normalizeForIntent(text);
  const amount = extractOrangeIntentNumber(text);
  if (!amount) return { amount: undefined, kind: undefined as undefined | 'current' | 'required' };

  const saysCurrent = hasAny(normalized, ['معايا', 'معي', 'عندي', 'معاك', 'عندك', 'رصيدي', 'اورنج معايا']);
  const saysRequired = hasAny(normalized, ['محتاج', 'عايز', 'تكلف', 'يتطلب', 'لازم', 'الاسكن ب', 'السكن ب', 'بيحتاج']);
  if (saysCurrent) return { amount, kind: 'current' as const };
  if (saysRequired) return { amount, kind: 'required' as const };

  if (typeof pending.orangeCurrent === 'number' && typeof pending.orangeRequired !== 'number') {
    return { amount, kind: 'required' as const };
  }
  if (typeof pending.orangeRequired === 'number' && typeof pending.orangeCurrent !== 'number') {
    return { amount, kind: 'current' as const };
  }
  return { amount, kind: 'current' as const };
}

function orangeFlowReply(text: string, memory: ConversationMemory) {
  const pending = memory.pendingFields ?? {};
  const { amount, kind } = classifyOrangeNumber(text, pending);
  const next = pendingFields(pending, { game: 'wild_rift', product: 'mythic_orange_keys' });

  if (amount && kind === 'current') next.orangeCurrent = amount;
  if (amount && kind === 'required') next.orangeRequired = amount;

  const current = typeof next.orangeCurrent === 'number' ? next.orangeCurrent : undefined;
  const required = typeof next.orangeRequired === 'number' ? next.orangeRequired : undefined;

  if (current !== undefined && required !== undefined) {
    const missing = Math.max(0, required - current);
    return {
      text: `${orangeCostText(missing)}\nابعت اسم السكن أو صورته، ولو تمام اختار طريقة الدفع: InstaPay ولا Vodafone Cash؟`,
      pendingFields: pendingFields(next, {
        orangeMissing: missing,
        awaitingPaymentMethod: true,
        product: 'mythic_orange_keys'
      }),
      lastAskedQuestion: 'payment_method'
    };
  }

  if (current !== undefined) {
    return {
      text: `تمام ❤️ معاك ${current} Orange. السكن محتاج كام Orange إجماليًا؟ ابعت الرقم بس وأنا أحسبلك الناقص والسعر.`,
      pendingFields: next,
      lastAskedQuestion: 'orange_amount'
    };
  }

  if (required !== undefined) {
    return {
      text: `تمام ❤️ السكن محتاج ${required} Orange. معاك كام Orange حاليًا؟ ابعت الرقم بس وأنا أحسبلك الناقص والسعر.`,
      pendingFields: next,
      lastAskedQuestion: 'orange_amount'
    };
  }

  return {
    text: 'تمام ❤️ عشان أحسب الميثك صح ابعتلي حاجتين: معاك كام Orange حاليًا؟ والسكن محتاج كام Orange إجماليًا؟',
    pendingFields: next,
    lastAskedQuestion: 'orange_amount'
  };
}

function mythicOrangeReply(text: string) {
  const numbers = detectedNumbers(text);
  if (numbers.length >= 2) {
    const current = Math.min(numbers[0], numbers[1]);
    const required = Math.max(numbers[0], numbers[1]);
    const missing = required - current;
    return `${orangeCostText(missing)}\nابعت اسم السكن أو صورته، ولو تمام اختار طريقة الدفع: InstaPay ولا Vodafone Cash؟`;
  }
  if (numbers.length === 1) {
    return `تمام ❤️ معاك ${numbers[0]} Orange. ابعت اسم السكن أو صورة المطلوب وقولي هو محتاج كام Orange إجماليًا، وأنا أحسب لك الناقص والسعر.`;
  }
  return 'تمام ❤️ الميثك/البرستيج بيتحسب بالـ Orange Essence والمفاتيح. ابعت اسم السكن أو صورته + معاك كام Orange حاليًا؟';
}

function pendingHelpReply(memory: ConversationMemory) {
  const pending = memory.pendingFields ?? {};

  const asked = memory.lastAskedQuestion;
  const game = normalizeMemoryGame(String(pending.game ?? memory.detectedGame ?? ''));

  if (asked === 'league_gift_details' || pending.product === 'skin_or_gift') {
    return 'ولا يهمك ❤️ لو ده League Skin/Gift المطلوب منك بس: Riot ID + السيرفر + اسم السكن أو صورته.\nبعد ما تضيفنا كصديق، الهدية بتتبعت بعد 7 أيام حسب نظام Riot.';
  }
  if (asked === 'wild_rift_gift_details' || pending.product === 'gift_or_skin') {
    return 'ولا يهمك ❤️ لو السكن Gift في Wild Rift ابعت اسم السكن أو صورته + الـ ID.\nلو محتاج تضيفنا اكتب: ابعت أكونتات الإضافة، ولو السكن من الشحن العادي ابعت اسم السكن بس.';
  }
  if (asked === 'payment_method' || pending.awaitingPaymentMethod) {
    return 'تمام ❤️ المطلوب دلوقتي تختار طريقة الدفع بس: InstaPay ولا Vodafone Cash؟\nلو هتدفع Crypto / PayPal / كارت، الأدمن هيبعتلك التفاصيل.';
  }
  if (asked === 'payment_proof' || pending.awaitingPaymentProof) {
    return 'المطلوب بعد التحويل تبعت سكرين الدفع + تفاصيل الطلب في رسالة واحدة ❤️\nمثال: Wild Rift - 10000 كور - ID/Username.';
  }
  if (game === 'wild_rift') {
    return 'ولا يهمك ❤️ ابعتلي بالظبط عايز إيه في Wild Rift: عدد الكورز، أو اسم السكن/صورة السكن. لو عايز الأسعار اكتب: أسعار وايلد ريفت.';
  }
  if (game === 'league') {
    return 'ولا يهمك ❤️ في League: لو RP ابعت السيرفر والباقه، ولو Skin/Gift ابعت Riot ID + السيرفر + اسم السكن.';
  }
  return undefined;
}

function isGenericConfusion(text: string) {
  return hasAny(text, confusionKeywords) || hasAny(text, unsupportedOrNoiseKeywords);
}

function isGiftExplanationRequest(text: string, memory: ConversationMemory) {
  const pending = memory.pendingFields ?? {};
  const giftContext = Boolean(memory.lastIntent?.includes('gift') || String(pending.product ?? '').includes('gift'));
  const mentionsGift = hasAny(text, ['gift', 'جيفت', 'جفت', 'هديه', 'هدية', 'اسكن هديه', 'سكن هديه', 'skin gift']);
  const asksToExplain = hasAny(text, ['مش فاهم', 'مش واضح', 'افهم', 'فهمني', 'يعني ايه', 'ازاي']);
  return (mentionsGift && asksToExplain) || (giftContext && asksToExplain);
}

function imageContextReply(memory: ConversationMemory) {
  const pending = memory.pendingFields ?? {};
  const game = normalizeMemoryGame(String(pending.game ?? memory.detectedGame ?? ''));
  if (pending.awaitingPaymentProof || memory.lastAskedQuestion === 'payment_proof') {
    return {
      text: 'وصلت صورة الدفع ❤️ هراجعها حالًا. ابعت في رسالة واحدة: اسم اللعبة + الباقة/السكن + الـ ID أو اليوزر المطلوب للشحن.',
      intent: 'payment_proof_image',
      needsHuman: true,
      handoffReason: 'payment_review'
    };
  }
  if (memory.lastAskedQuestion === 'skin_name_or_id' || memory.lastAskedQuestion === 'wild_rift_gift_details' || pending.product === 'gift_or_skin') {
    return {
      text: 'وصلت صورة السكن ❤️ ابعتلي اسم اللعبة + الـ ID/Username، وقولي هتدفع InstaPay ولا Vodafone Cash عشان أحسبها ونكمل.',
      intent: 'skin_image_received'
    };
  }
  if (game) {
    return {
      text: `وصلت الصورة ❤️ لو دي خاصة بـ ${game === 'wild_rift' ? 'Wild Rift' : game === 'league' ? 'League' : 'Valorant'} ابعت المطلوب في سطر واحد: سعر؟ شحن؟ مشكلة؟ عشان أرد عليك من غير لخبطة.`,
      intent: 'context_image_received'
    };
  }
  return {
    text: 'وصلت الصورة ❤️ محتاج أعرف المطلوب منها: تسعير، شحن، سكن، ولا مشكلة في طلب؟',
    intent: 'unknown_image_received'
  };
}

function hasOrderDetails(memory: ConversationMemory) {
  const pending = memory.pendingFields ?? {};
  return Boolean(pending.game && (pending.package || pending.product || pending.service));
}

function isLikelyPaymentProof(text: string, memory: ConversationMemory) {
  if (hasAny(text, paymentProofKeywords)) return true;
  if (!hasOrderDetails(memory)) return false;
  return /^(تم|خلصت|دفعت|حولت|بعت)$/i.test(normalizeForIntent(text));
}

export function detectQuickReply(
  text: string,
  mediaCatalog: MediaCatalogEntry[] = loadDefaultMediaCatalog(env),
  memory: ConversationMemory = {},
  options: { type?: 'text' | 'image' | 'sticker' | 'unknown' } = {}
): QuickReplyResult {
  const normalizedText = text.trim();
  const memoryGame = normalizeMemoryGame(memory.detectedGame);
  const explicitGame = detectGame(text, mediaCatalog);
  const game = explicitGame ?? memoryGame;
  const priceRequest = hasAny(text, priceKeywords);
  const sensitive = detectSensitiveCredentials(text);
  const hasCoreIntent = hasAny(text, wildRiftCoreKeywords);
  const hasGiftIntent = hasAny(text, giftKeywords) || hasAny(text, leagueGiftAskKeywords);
  const hasTopUpIntent = hasAny(text, topUpKeywords);
  const pending = memory.pendingFields ?? {};

  // If customer gives the next missing detail, keep moving instead of reopening the menu.
  if (isCustomerSayingAdded(text) && (hasWildRiftGiftContext(memory, pending) || hasLeagueGiftContext(memory, pending))) {
    return textResult({
      text: hasLeagueGiftContext(memory, pending)
        ? 'تمام ❤️ كده ناقصني Riot ID + السيرفر + اسم السكن/الجيفت، وبعد 7 أيام من قبول الإضافة نقدر نبعت الهدية حسب نظام Riot.'
        : 'تمام ❤️ كده ناقصني اسم السكن أو صورته + الـ ID، وقولي طريقة الدفع عشان نكمل الطلب.',
      intent: 'gift_added_followup',
      game: hasLeagueGiftContext(memory, pending) ? 'league' : 'wild_rift',
      lastAskedQuestion: hasLeagueGiftContext(memory, pending) ? 'league_gift_details' : 'wild_rift_gift_details',
      pendingFields: pendingFields(pending, { giftAccountAdded: true })
    });
  }

  if (isAskingForGiftAccounts(text) && (hasWildRiftGiftContext(memory, pending) || hasLeagueGiftContext(memory, pending))) {
    return textResult({
      text: RIOT_GIFT_ADD_ACCOUNTS_REPLY,
      intent: hasLeagueGiftContext(memory, pending) ? 'league_gift_accounts' : 'wild_rift_gift_accounts',
      game: hasLeagueGiftContext(memory, pending) ? 'league' : 'wild_rift',
      pendingFields: pendingFields(pending, { riotGiftAccountsSent: true })
    });
  }

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

  if (isGiftExplanationRequest(text, memory)) {
    return textResult({
      text: game === 'league' || memory.detectedGame === 'league'
        ? 'تمام ❤️ الـ Gift في League يعني السكن بيتبعت هدية من أكونت عندنا لأكونتك. المطلوب: Riot ID + السيرفر + اسم السكن. بعد ما تضيفنا صديق ونقبلك، Riot بتفرض انتظار 7 أيام قبل إرسال الهدية.'
        : 'تمام ❤️ الـ Gift/Skin يعني السكن بيتبعت لك على أكونتك عن طريق أكونتات TheNexus أو حسب طريقة اللعبة. ابعت اسم السكن أو صورته + الـ ID، ولو محتاج تضيفنا اكتب “ابعت أكونتات الإضافة”.',
      intent: 'gift_explanation',
      game: game ?? memoryGame,
      pendingFields: pendingFields(pending, { product: 'gift_or_skin' })
    });
  }

  if (isGenericConfusion(text)) {
    const help = pendingHelpReply(memory);
    if (help) {
      return textResult({
        text: help,
        intent: 'context_help',
        game: game ?? memoryGame,
        pendingFields: pending
      });
    }
  }

  if (hasAny(text, orderDoneKeywords)) {
    return textResult({
      text: ORDER_COMPLETED_REVIEW_REPLY,
      intent: 'order_completed_review',
      pendingFields: pendingFields(pending, { orderCompletedReviewSent: true })
    });
  }

  if (hasAny(text, delayKeywords)) {
    return handoffResult({
      text: 'حقك علينا ❤️ ابعت رقم الطلب أو سكرين الدفع واسم اللعبة، والأدمن هيراجعها فورًا.',
      intent: 'delivery_delay',
      needsHuman: true,
      handoffReason: 'delivery_delay'
    });
  }

  if (options.type === 'image' && !normalizedText) {
    const imageReply = imageContextReply(memory);
    return textResult({
      ...imageReply,
      game,
      pendingFields: pendingFields(pending, { imageReceived: true })
    });
  }

  if (isLikelyPaymentProof(text, memory)) {
    return textResult({
      text: hasOrderDetails(memory)
        ? 'وصل الدفع يا فندم ❤️ هراجعه حالًا. لو لسه ما بعتش بيانات التنفيذ ابعت الـ ID/اليوزر واسم الباقة في رسالة واحدة.'
        : PAYMENT_PROOF_REPLY,
      intent: 'payment_proof',
      game,
      needsHuman: true,
      handoffReason: 'payment_review'
    });
  }

  // Payment method choice should be crisp, not a full menu every time.
  if (hasAny(text, ['instapay', 'انستا باي', 'انستاباي'])) {
    return textResult({
      text: 'تمام ❤️ InstaPay على: 01014094664\nبعد التحويل ابعت سكرين الدفع + اسم اللعبة والطلب، ونكمل فورًا.',
      intent: 'payment_instapay',
      game,
      lastAskedQuestion: 'payment_proof',
      pendingFields: pendingFields(pending, { awaitingPaymentProof: true })
    });
  }

  if (hasAny(text, ['vodafone', 'فودافون', 'فودافون كاش'])) {
    return textResult({
      text: 'تمام ❤️ Vodafone Cash على: 01007208978\nبعد التحويل ابعت سكرين الدفع + تفاصيل الطلب.',
      intent: 'payment_vodafone',
      game,
      lastAskedQuestion: 'payment_proof',
      pendingFields: pendingFields(pending, { awaitingPaymentProof: true })
    });
  }

  if (hasAny(text, ['paypal', 'بايبال', 'payoneer', 'بايونير', 'crypto', 'binance', 'كريبتو', 'بينانس', 'credit card', 'كارت'])) {
    return handoffResult({
      text: 'متاح ❤️ الطريقة دي تفاصيلها الأدمن بيبعتها لك مباشرة عشان الحسابات بتتغير. ثواني وهيراجع معاك.',
      intent: 'payment_external',
      game,
      needsHuman: true,
      handoffReason: 'external_payment_method'
    });
  }

  if (hasAny(text, paymentKeywords)) {
    return textResult({
      text: PAYMENT_METHODS_REPLY,
      intent: 'payment_methods',
      game,
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(pending, { awaitingPaymentMethod: true })
    });
  }

  // Orange / Mythic context must win before any numeric Wild Cores parsing.
  // Example: customer says "معايا 700 اورنج" then "1000"; the second number means required Orange, not 1000 Wild Cores.
  if (hasAny(text, mythicKeywords) || isOrangeContext(memory, pending)) {
    const orange = orangeFlowReply(text, memory);
    return textResult({
      text: orange.text,
      intent: 'mythic_orange_keys',
      game: 'wild_rift',
      lastAskedQuestion: orange.lastAskedQuestion,
      pendingFields: orange.pendingFields
    });
  }

  // Exact Wild Rift core amount. This must win even if the customer did not repeat "Wild Rift",
  // but only outside Orange/Mythic flows.
  const expectsWildRiftCores =
    game === 'wild_rift' ||
    memoryGame === 'wild_rift' ||
    pending.game === 'wild_rift' ||
    pending.product === 'Wild Cores' ||
    hasCoreIntent ||
    memory.lastIntent === 'wild_rift_prices' ||
    memory.lastIntent === 'wild_rift_cores_intake' ||
    memory.lastIntent === 'specific_price';

  const wrPack = expectsWildRiftCores && (hasCoreIntent || detectedNumbers(text).length > 0) ? detectWildRiftCorePackage(text) : undefined;
  if (wrPack) {
    return textResult({
      text: wildRiftCorePriceReply(wrPack.amount, wrPack.egp),
      intent: 'specific_price',
      game: 'wild_rift',
      priceRequest: true,
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(pending, {
        game: 'wild_rift',
        product: 'Wild Cores',
        package: `${wrPack.amount} WC`,
        total: `${wrPack.egp} EGP`,
        awaitingPaymentMethod: true
      })
    });
  }

  const wrSkin = (game === 'wild_rift' || memoryGame === 'wild_rift' || !explicitGame) && hasGiftIntent ? detectWildRiftSkinType(text) : undefined;
  if (wrSkin && (game === 'wild_rift' || memoryGame === 'wild_rift' || hasAny(text, ['وايلد', 'wild']))) {
    return textResult({
      text: `تمام ❤️ ${wrSkin.label} في Wild Rift سعره ${wrSkin.egp} EGP.\nابعت اسم السكن أو صورته + الـ ID، ولو محتاج تضيفنا قولّي أبعتلك أكونتات الإضافة.`,
      intent: 'wild_rift_skin_price',
      game: 'wild_rift',
      priceRequest: true,
      lastAskedQuestion: 'skin_name_or_id',
      pendingFields: pendingFields(pending, { game: 'wild_rift', product: wrSkin.label, total: `${wrSkin.egp} EGP` })
    });
  }

  const sku = detectSpecificPrice(text, game);
  if (sku && (priceRequest || hasCoreIntent || hasGiftIntent || hasTopUpIntent || memoryGame === sku.game)) {
    return textResult({
      text: priceReplyText(sku),
      intent: 'specific_price',
      game: sku.game,
      priceRequest: true,
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(pending, {
        game: sku.game,
        product: sku.product,
        package: `${sku.amount} ${sku.unit}`,
        total: sku.egp,
        awaitingPaymentMethod: true
      })
    });
  }

  // Price lists / images only on explicit price request.
  if (game && game !== 'general' && game !== 'unknown' && priceRequest) {
    if (pending.shownPriceImage && pending.game === game) {
      return textResult({
        text: game === 'wild_rift'
          ? 'الصورة فوق يا فندم ❤️ ابعت عدد الكورز أو نوع السكن اللي محتاجه وأنا أحسبها لك فورًا.'
          : game === 'league'
            ? 'الصورة فوق يا فندم ❤️ ابعت السيرفر والباقه، ولو Skin/Gift ابعت Riot ID + السيرفر + اسم السكن.'
            : 'الصورة فوق يا فندم ❤️ ابعت الريجون والباقه المطلوبة ونكمل.',
        intent: 'price_image_already_sent',
        game,
        priceRequest,
        lastAskedQuestion: game === 'wild_rift' ? 'package' : 'region_and_package',
        pendingFields: pending
      });
    }
    return imageResult({
      imageUrl: imageUrlForGame(game, mediaCatalog),
      caption: priceCaptionForGame(game),
      intent: game === 'league' ? 'league_rp_prices' : `${game}_prices`,
      game,
      priceRequest,
      lastAskedQuestion: game === 'wild_rift' ? 'package' : 'region_and_package',
      pendingFields: pendingFields(pending, { game, shownPriceImage: true })
    });
  }

  // Asking to charge Wild Rift with no amount should ask one useful question, not a menu.
  if ((game === 'wild_rift' || memoryGame === 'wild_rift') && hasCoreIntent) {
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
    return textResult({
      text: 'تمام ❤️ Wild Rift Cores. ابعت عدد الكورز اللي محتاجه، ولو عايز الصورة اكتب “أسعار وايلد ريفت”.',
      intent: 'wild_rift_cores_intake',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_core_amount',
      pendingFields: pendingFields(pending, { game: 'wild_rift', product: 'Wild Cores' })
    });
  }

  if ((game === 'wild_rift' || memoryGame === 'wild_rift') && hasGiftIntent) {
    if (hasAny(text, notAddedKeywords) && !pending.riotGiftAccountsSent) {
      return textResult({
        text: RIOT_GIFT_ADD_ACCOUNTS_REPLY,
        intent: 'wild_rift_gift_accounts',
        game: 'wild_rift',
        pendingFields: pendingFields(pending, { game: 'wild_rift', product: 'gift_or_skin', riotGiftAccountsSent: true })
      });
    }
    return textResult({
      text: 'تمام ❤️ ابعت اسم السكن أو صورته + الـ ID. لو السكن Gift ومحتاج تضيفنا اكتبلي “ابعت أكونتات الإضافة”.',
      intent: 'wild_rift_gift',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_gift_details',
      pendingFields: pendingFields(pending, { game: 'wild_rift', product: 'gift_or_skin' })
    });
  }

  if (game === 'league' && hasGiftIntent) {
    return textResult({
      text: LEAGUE_SKIN_GIFT_REPLY,
      intent: 'league_skin_gift',
      game: 'league',
      lastAskedQuestion: 'league_gift_details',
      pendingFields: pendingFields(pending, { game: 'league', product: 'skin_or_gift' })
    });
  }

  if (hasAny(text, accountSellKeywords)) {
    return aiResult('account_sell', priceRequest);
  }

  if (hasAny(text, accountBuyKeywords)) {
    return aiResult('account_buy', priceRequest);
  }

  // Let Gemini handle greetings and normal sales chat for human tone.
  if (normalizedText && hasAny(text, greetingKeywords)) {
    return aiResult('greeting', false);
  }

  if (game === 'wild_rift' && hasTopUpIntent) {
    return textResult({
      text: 'تمام ❤️ Wild Rift. ابعت عدد الكورز لو شحن، أو اسم/صورة السكن لو Gift/Skin، وأنا أحسبها لك مباشرة.',
      intent: 'wild_rift_intake',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_service',
      pendingFields: pendingFields(pending, { game: 'wild_rift' })
    });
  }

  if (game === 'wild_rift' && isBareGameOnly(text)) {
    return textResult({
      text: 'Wild Rift تمام ❤️ محتاج كورز ولا سكن/جيفت؟ ابعت العدد أو اسم السكن مباشرة.',
      intent: 'wild_rift_game_only',
      game: 'wild_rift',
      lastAskedQuestion: 'wild_rift_service',
      pendingFields: pendingFields(pending, { game: 'wild_rift' })
    });
  }

  if (game === 'league' && !priceRequest) {
    return textResult({
      text: 'تمام ❤️ League PC. لو RP ابعت الباقة والسيرفر، ولو Skin/Gift ابعت Riot ID + السيرفر + اسم السكن.',
      intent: 'league_intake',
      game: 'league',
      lastAskedQuestion: 'league_service',
      pendingFields: pendingFields(pending, { game: 'league' })
    });
  }

  if (game === 'valorant' && !priceRequest) {
    return textResult({
      text: 'تمام ❤️ Valorant VP. ابعت الريجون والباقة المطلوبة، أو اكتب “أسعار فالورانت” لو عايز الصورة.',
      intent: 'valorant_intake',
      game: 'valorant',
      lastAskedQuestion: 'region_and_package',
      pendingFields: pendingFields(pending, { game: 'valorant' })
    });
  }

  if (priceRequest && !game && !memoryGame) {
    return textResult({
      text: 'أسعار أي لعبة يا فندم؟ ❤️ ابعت اسم اللعبة بس، ولو Wild Rift / League / Valorant هبعتلك الأسعار فورًا.',
      intent: 'price_game_missing',
      lastAskedQuestion: 'game_for_prices',
      pendingFields: pendingFields(pending, { awaitingGameForPrices: true })
    });
  }

  if (hasTopUpIntent) return aiResult('top_up', priceRequest);

  return aiResult('general', priceRequest);
}
