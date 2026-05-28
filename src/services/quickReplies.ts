import {
  ACCOUNT_BUYING_REPLY,
  ACCOUNT_LISTING_REPLY,
  ACCOUNT_SELLING_HELP_REPLY,
  COMING_SOON_REPLY,
  COMPLAINT_REPLY,
  CREDENTIALS_REPLY,
  DELAY_REPLY,
  EVENING_REPLIES,
  FIRST_EMAIL_EXPLAIN_REPLY,
  GENERAL_TOP_UP_REPLIES,
  GREETING_REPLIES,
  HUMAN_HANDOFF_REPLY,
  INSTAPAY_PAYMENT_REPLIES,
  LEAGUE_MENU_REPLIES,
  LEAGUE_RP_PACKAGE_CONFIRMATION_REPLIES,
  LEAGUE_RP_PRICE_CAPTION_REPLIES,
  LEAGUE_RP_TOP_UP_REPLIES,
  LEAGUE_SKIN_GIFT_REPLY,
  MORNING_REPLIES,
  PAYMENT_METHODS_REPLIES,
  PAYMENT_PROOF_REPLY,
  PRICE_SKUS,
  RIOT_GIFT_REPLY,
  UNKNOWN_GAME_TOP_UP_REPLIES,
  VALORANT_PACKAGE_CONFIRMATION_REPLIES,
  VALORANT_PRICE_CAPTION_REPLIES,
  VALORANT_TOP_UP_REPLIES,
  VODAFONE_PAYMENT_REPLIES,
  WILD_RIFT_ACCOUNT_INTRO_REPLIES,
  WILD_RIFT_FIND_EMAIL_REPLY,
  WILD_RIFT_FORGOT_PASSWORD_REPLY,
  WILD_RIFT_FORGOT_USERNAME_REPLY,
  WILD_RIFT_GAME_REPLIES,
  WILD_RIFT_HAVE_LOGIN_REPLY,
  WILD_RIFT_PACKAGE_CONFIRMATION_REPLIES,
  WILD_RIFT_PRICE_CAPTION_REPLIES,
  WILD_RIFT_RIOT_ID_REPLY
} from '../config/constants';
import { env } from '../config/env';
import { compactArabic, normalizeForIntent } from './intent';
import { detectSensitiveCredentials } from './credentials';
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
  wild_rift: ['وايلد', 'وايلد ريفت', 'وايلدرفت', 'wild rift', 'wr'],
  league: ['league', 'league of legends', 'lol', 'ليج', 'ليج اوف ليجندز', 'rp', 'ار بي'],
  valorant: ['valorant', 'val', 'فالورانت', 'فالورنت', 'فال', 'vp']
};

const comingSoonGames = [
  'pubg',
  'ببجي',
  'free fire',
  'فري فاير',
  'efootball',
  'فيفا',
  'ea fc',
  'fortnite',
  'فورتنايت',
  'mobile legends',
  'موبا',
  'clash',
  'كلاش'
];

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
  'ابعت الاسعار',
  'ابعت الأسعار',
  'بعتلي الاسعار',
  'بعتلي الأسعار',
  'ابعت الباقه',
  'ابعت الباقة',
  'الباقات',
  'باقات'
];

const paymentKeywords = ['طرق الدفع', 'الدفع', 'بدفع ازاي', 'ادفع ازاي', 'payment', 'pay'];
const topUpKeywords = ['شحن', 'اشحن', 'عايز اشحن', 'عاوز اشحن', 'محتاج اشحن', 'top up', 'charge', 'shipping'];
const wantKeywords = ['عايز', 'عاوز', 'محتاج', 'ابعت', 'هات'];
const vodafoneKeywords = ['فودافون', 'vodafone', 'vodafone cash'];
const instapayKeywords = ['instapay', 'insta pay', 'انستا باي', 'انستاباي'];

const riotGiftKeywords = ['جيفت', 'جفت', 'gift', 'skin', 'skins', 'سكن', 'سكنات', 'هديه', 'هدية'];
const firstEmailKeywords = ['يعني اي فيرست', 'يعني ايه فيرست', 'ايه الفيرست', 'ما هو الفيرست', 'first email', 'original email', 'ازاي اتاكد من الفيرست', 'اتأكد من الفيرست'];
const accountSellingHelpKeywords = ['مش فاهم الفورم', 'واقف في الفورم', 'املى الفورم ازاي', 'اعمل الفورم ازاي', 'مش عارف ارفع الاكونت', 'مش عارف اسعر', 'مش عارف السعر', 'يعني ايه السعر'];
const paymentProofKeywords = ['حولت', 'دفعت', 'تم الدفع', 'بعت الفلوس', 'وصلت الفلوس', 'سكرين التحويل', 'رقم العمليه', 'رقم العملية', 'transaction'];
const delayKeywords = ['اتاخر', 'اتأخر', 'لسه موصلش', 'موصلش', 'الشحن اتاخر', 'فين الطلب', 'فين الشحن', 'تاخير', 'تأخير'];
const complaintKeywords = ['شكوى', 'شكوي', 'زعلان', 'مش راضي', 'غلط', 'نصب', 'مشكله', 'مشكلة'];
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
const credentialKeywords = [
  'يوزر',
  'username',
  'باس',
  'باسورد',
  'password',
  'gmail',
  'facebook',
  'google',
  'apple id',
  'riot account'
];
const forgotUsernameKeywords = ['نسيت اليوزر', 'مش عارف اليوزر', 'forget username', 'forgot username'];
const forgotPasswordKeywords = ['نسيت الباس', 'نسيت الباسورد', 'مش فاكر الباس', 'forgot password', 'forget password'];
const noEmailKeywords = ['مش عارف الايميل', 'مش فاكر الايميل', 'no email', 'unknown email'];
const haveLoginKeywords = ['معايا اليوزر', 'عندي اليوزر', 'معايا البيانات', 'عندي البيانات', 'عندي اليوزر والباس', 'معايا اليوزر والباس'];
const riotIdKeywords = ['riot id', 'رايوت id', 'رايوت اي دي', 'الرايوت id', 'الايدي'];
const leagueRpKeywords = ['rp', 'ار بي'];
const wildRiftCoresKeywords = ['core', 'cores', 'cors', 'curs', 'كور', 'كورز', 'كورس', 'كاور', 'wc', 'wild cores'];

function flexibleNormalize(text: string) {
  return compactArabic(text)
    .replace(/ph/g, 'f')
    .replace(/oo/g, 'u')
    .replace(/0/g, 'o');
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

function fuzzyContains(normalized: string, phrase: string) {
  if (!phrase) return false;

  const normalizedPhrase = normalizeForIntent(phrase);
  if (normalized.includes(normalizedPhrase)) {
    return true;
  }

  const compactText = flexibleNormalize(normalized);
  const compactPhrase = flexibleNormalize(normalizedPhrase);

  if (compactText.includes(compactPhrase)) {
    return true;
  }

  const tokens = compactText.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    const pseudoTokens = compactText.match(/[a-z]+|[\u0600-\u06ff]+|\d+/g) ?? [];
    tokens.push(...pseudoTokens);
  }

  if (compactPhrase.length >= 4) {
    return tokens.some((token) => Math.abs(token.length - compactPhrase.length) <= 2 && levenshtein(token, compactPhrase) <= 2);
  }

  return false;
}

function hasAny(normalized: string, keywords: string[]) {
  return keywords.some((keyword) => fuzzyContains(normalized, keyword));
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

function textResult(
  args: Omit<QuickReplyResult, 'matched' | 'responseType' | 'priceRequest'> & { priceRequest?: boolean }
): QuickReplyResult {
  return {
    matched: true,
    responseType: 'text',
    priceRequest: args.priceRequest ?? false,
    ...args
  };
}

function imageResult(args: Omit<QuickReplyResult, 'matched' | 'responseType'>): QuickReplyResult {
  return {
    matched: true,
    responseType: 'image',
    ...args
  };
}

function handoffResult(
  args: Omit<QuickReplyResult, 'matched' | 'responseType' | 'priceRequest'>
): QuickReplyResult {
  return {
    matched: true,
    responseType: 'handoff',
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

  if ([
    'السلام عليكم',
    'سلام عليكم',
    'سلام',
    'اهلا',
    'أهلا',
    'هلا',
    'مرحبا',
    'hi',
    'hello'
  ].map(normalizeForIntent).includes(compact)) {
    return textResult({ text: pick(GREETING_REPLIES), intent: 'greeting' });
  }

  return null;
}

function normalizeMemoryGame(value?: string | null): DetectedGame | undefined {
  if (!value) return undefined;
  if (value === 'wild_rift_shipping' || value === 'wild_rift') return 'wild_rift';
  if (value === 'league_rp' || value === 'league') return 'league';
  if (value === 'valorant_vp' || value === 'valorant') return 'valorant';
  if (value === 'general_games' || value === 'general') return 'general';
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
    if (!game || game === 'general' || game === 'unknown') continue;
    if (hasAny(normalized, item.aliases)) return game;
  }

  return undefined;
}

function detectComingSoonGame(normalized: string) {
  return hasAny(normalized, comingSoonGames);
}

function detectWildRiftCores(normalized: string) {
  return hasAny(normalized, wildRiftCoresKeywords);
}

function detectLeagueGiftOrSkin(normalized: string) {
  return hasAny(normalized, riotGiftKeywords);
}

function detectLeagueRp(normalized: string) {
  return hasAny(normalized, leagueRpKeywords);
}

function imageUrlForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>, mediaCatalog: MediaCatalogEntry[]) {
  const item = mediaCatalog.find((catalogItem) => catalogItem.key === catalogKeys[game]);
  return item?.imageUrl ?? imageFallbacks[game];
}

function priceCaptionForGame(game: Exclude<DetectedGame, 'general' | 'unknown'>) {
  if (game === 'wild_rift') return pick(WILD_RIFT_PRICE_CAPTION_REPLIES);
  if (game === 'league') return pick(LEAGUE_RP_PRICE_CAPTION_REPLIES);
  return pick(VALORANT_PRICE_CAPTION_REPLIES);
}

function looksLikeGenericTopUpOnly(normalized: string) {
  return ['شحن', 'اشحن', 'عايز اشحن', 'عاوز اشحن', 'محتاج اشحن', 'top up', 'charge'].some(
    (phrase) => normalizeForIntent(phrase) === normalized
  );
}

function safeShortValue(text: string) {
  return text.trim().replace(/\s+/g, ' ').slice(0, 100);
}

function pendingFields(base: Record<string, unknown> | null | undefined, next: Record<string, unknown>) {
  return { ...(base ?? {}), ...next };
}


function detectSpecificPrice(text: string, activeGame?: DetectedGame) {
  const normalized = normalizeForIntent(text);
  const compact = compactArabic(text);
  const numbers = Array.from(text.matchAll(/\d+/g)).map((match) => Number(match[0]));
  const gameHint = activeGame && activeGame !== 'general' && activeGame !== 'unknown' ? activeGame : undefined;

  for (const sku of PRICE_SKUS) {
    if (gameHint && sku.game !== gameHint) continue;

    const aliasMatched = sku.aliases.some((alias) => {
      const aliasNorm = normalizeForIntent(alias);
      return normalized.includes(aliasNorm) || compact.includes(compactArabic(alias));
    });
    const amountMatched = numbers.includes(sku.amount);
    const unitMatched =
      (sku.unit === 'WC' && detectWildRiftCores(normalized)) ||
      (sku.unit === 'RP' && detectLeagueRp(normalized)) ||
      (sku.unit === 'VP' && hasAny(normalized, ['vp', 'في بي']));

    if (aliasMatched || (amountMatched && unitMatched)) {
      return sku;
    }
  }

  return undefined;
}

function priceReplyText(sku: (typeof PRICE_SKUS)[number]) {
  const regionText = sku.region ? ` (${sku.region})` : '';
  const usdText = sku.usd ? ` / ${sku.usd}` : '';
  const deliveryText = sku.game === 'league' && sku.product === 'RP'
    ? '\nالـ RP فوري بعد تأكيد الدفع.'
    : sku.game === 'valorant'
      ? '\nالشحن فوري بعد تأكيد الدفع.'
      : '';

  return `سعر ${sku.amount === 1 ? sku.unit : `${sku.amount} ${sku.unit}`}${regionText} هو ${sku.egp}${usdText} ❤️${deliveryText}\nتحب تكمل على أنهي طريقة دفع؟`;
}

function wildRiftAccountIntro(memory: ConversationMemory, packageName?: string) {
  const baseText = packageName
    ? pick(WILD_RIFT_PACKAGE_CONFIRMATION_REPLIES(packageName))
    : pick(WILD_RIFT_ACCOUNT_INTRO_REPLIES);

  return textResult({
    text: baseText,
    intent: 'wr_cores_account',
    game: 'wild_rift',
    lastAskedQuestion: 'wr_account_identify',
    pendingFields: pendingFields(memory.pendingFields, {
      game: 'wild_rift',
      flow: 'wr_account',
      product: 'cores',
      package: packageName ?? memory.pendingFields?.package ?? null
    })
  });
}

export function detectQuickReply(
  text: string,
  mediaCatalog: MediaCatalogEntry[] = loadDefaultMediaCatalog(env),
  memory: ConversationMemory = {}
): QuickReplyResult {
  const normalized = normalizeForIntent(text);
  const priceRequest = hasAny(normalized, priceKeywords);
  const hasTopUpRequest = hasAny(normalized, topUpKeywords);
  const wantsSomething = hasTopUpRequest || hasAny(normalized, wantKeywords);
  const game = detectGame(text, mediaCatalog);
  const memoryGame = normalizeMemoryGame(memory.detectedGame);
  const activeGame = game ?? (priceRequest ? memoryGame : undefined);
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

  if (hasAny(normalized, handoffKeywords)) {
    return handoffResult({
      text: HUMAN_HANDOFF_REPLY,
      intent: 'human_handoff',
      needsHuman: true,
      handoffReason: 'human_requested'
    });
  }

  const greeting = greetingReply(normalized);
  if (greeting) return greeting;

  if (hasAny(normalized, paymentKeywords)) {
    return textResult({ text: pick(PAYMENT_METHODS_REPLIES), intent: 'payment_methods' });
  }

  if (hasAny(normalized, paymentProofKeywords)) {
    return textResult({
      text: PAYMENT_PROOF_REPLY,
      intent: 'payment_proof',
      game: memoryGame,
      needsHuman: true,
      handoffReason: 'payment_review'
    });
  }

  if (hasAny(normalized, delayKeywords)) {
    return textResult({
      text: DELAY_REPLY,
      intent: 'delivery_delay',
      game: memoryGame,
      needsHuman: true,
      handoffReason: 'delivery_delay'
    });
  }

  if (hasAny(normalized, complaintKeywords)) {
    return textResult({
      text: COMPLAINT_REPLY,
      intent: 'complaint',
      game: memoryGame,
      needsHuman: true,
      handoffReason: 'complaint'
    });
  }

  if (memory.lastAskedQuestion === 'payment_method' && hasAny(normalized, vodafoneKeywords)) {
    return textResult({
      text: pick(VODAFONE_PAYMENT_REPLIES),
      intent: 'payment_method_selected',
      game: memoryGame,
      pendingFields: pendingFields(memory.pendingFields, { paymentMethod: 'vodafone_cash' })
    });
  }

  if (memory.lastAskedQuestion === 'payment_method' && hasAny(normalized, instapayKeywords)) {
    return textResult({
      text: pick(INSTAPAY_PAYMENT_REPLIES),
      intent: 'payment_method_selected',
      game: memoryGame,
      pendingFields: pendingFields(memory.pendingFields, { paymentMethod: 'instapay' })
    });
  }

  if (memory.lastAskedQuestion === 'wr_account_identify') {
    if (hasAny(normalized, forgotUsernameKeywords)) {
      return textResult({
        text: WILD_RIFT_FORGOT_USERNAME_REPLY,
        intent: 'wr_cores_recovery_username',
        game: 'wild_rift',
        lastAskedQuestion: 'wr_account_identify',
        pendingFields: pendingFields(memory.pendingFields, { flow: 'wr_account', product: 'cores' })
      });
    }

    if (hasAny(normalized, forgotPasswordKeywords)) {
      return textResult({
        text: WILD_RIFT_FORGOT_PASSWORD_REPLY,
        intent: 'wr_cores_recovery_password',
        game: 'wild_rift',
        lastAskedQuestion: 'wr_account_identify',
        pendingFields: pendingFields(memory.pendingFields, { flow: 'wr_account', product: 'cores' })
      });
    }

    if (hasAny(normalized, noEmailKeywords)) {
      return textResult({
        text: WILD_RIFT_FIND_EMAIL_REPLY,
        intent: 'wr_cores_find_email',
        game: 'wild_rift',
        lastAskedQuestion: 'wr_account_identify',
        pendingFields: pendingFields(memory.pendingFields, { flow: 'wr_account', product: 'cores' })
      });
    }

    if (hasAny(normalized, haveLoginKeywords)) {
      return textResult({
        text: WILD_RIFT_HAVE_LOGIN_REPLY,
        intent: 'wr_cores_have_login',
        game: 'wild_rift',
        needsHuman: true,
        handoffReason: 'secure_credentials_followup',
        lastAskedQuestion: 'wr_account_identify',
        pendingFields: pendingFields(memory.pendingFields, { flow: 'wr_account', product: 'cores' })
      });
    }

    if (hasAny(normalized, riotIdKeywords)) {
      return textResult({
        text: WILD_RIFT_RIOT_ID_REPLY,
        intent: 'wr_cores_riot_id',
        game: 'wild_rift',
        lastAskedQuestion: 'wr_account_identify',
        pendingFields: pendingFields(memory.pendingFields, { flow: 'wr_account', product: 'cores', riotId: safeShortValue(text) })
      });
    }
  }

  if (hasAny(normalized, firstEmailKeywords)) {
    return textResult({ text: FIRST_EMAIL_EXPLAIN_REPLY, intent: 'first_email_explain' });
  }

  if (hasAny(normalized, accountSellingHelpKeywords) && (memory.lastIntent === 'account_sell' || normalized.includes('فورم') || normalized.includes('اكونت'))) {
    return textResult({ text: ACCOUNT_SELLING_HELP_REPLY, intent: 'account_selling_help' });
  }

  if (hasAny(normalized, accountSellKeywords)) {
    return textResult({
      text: ACCOUNT_LISTING_REPLY,
      intent: 'account_sell',
      lastAskedQuestion: 'account_form'
    });
  }

  if (hasAny(normalized, accountBuyKeywords)) {
    return textResult({ text: ACCOUNT_BUYING_REPLY, intent: 'account_buy' });
  }

  if (game === 'league' && detectLeagueGiftOrSkin(normalized)) {
    return textResult({ text: LEAGUE_SKIN_GIFT_REPLY, intent: 'league_skin_gift', game: 'league' });
  }

  if (hasAny(normalized, riotGiftKeywords) && !game) {
    return textResult({ text: RIOT_GIFT_REPLY, intent: 'riot_gift' });
  }

  const specificSku = detectSpecificPrice(text, game ?? memoryGame);
  if (priceRequest && specificSku) {
    return textResult({
      text: priceReplyText(specificSku),
      intent: 'specific_price',
      game: specificSku.game,
      priceRequest: true,
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(memory.pendingFields, {
        game: specificSku.game,
        product: specificSku.product,
        package: `${specificSku.amount} ${specificSku.unit}`,
        region: specificSku.region ?? null
      })
    });
  }

  if (activeGame && activeGame !== 'general' && activeGame !== 'unknown' && priceRequest) {
    return imageResult({
      imageUrl: imageUrlForGame(activeGame, mediaCatalog),
      caption: priceCaptionForGame(activeGame),
      intent: activeGame === 'league' ? 'league_rp' : 'top_up',
      game: activeGame,
      priceRequest,
      lastAskedQuestion: activeGame === 'wild_rift' ? 'package' : activeGame === 'league' ? 'server_and_package' : 'region_and_package',
      pendingFields: pendingFields(memory.pendingFields, {
        game: activeGame,
        missing: activeGame === 'wild_rift' ? ['package'] : activeGame === 'league' ? ['server', 'package'] : ['region', 'package']
      })
    });
  }

  if (game === 'wild_rift') {
    if (detectWildRiftCores(normalized) && (hasTopUpRequest || wantsSomething || /\d/.test(text))) {
      return wildRiftAccountIntro(memory);
    }

    if (hasTopUpRequest) {
      return imageResult({
        imageUrl: imageUrlForGame('wild_rift', mediaCatalog),
        caption: priceCaptionForGame('wild_rift'),
        intent: 'top_up',
        game: 'wild_rift',
        priceRequest: true,
        lastAskedQuestion: 'package',
        pendingFields: pendingFields(memory.pendingFields, { game: 'wild_rift', missing: ['package'] })
      });
    }

    return textResult({
      text: pick(WILD_RIFT_GAME_REPLIES),
      intent: 'top_up',
      game: 'wild_rift',
      lastAskedQuestion: 'package',
      pendingFields: pendingFields(memory.pendingFields, { game: 'wild_rift', missing: ['package'] })
    });
  }

  if (game === 'valorant') {
    if (hasTopUpRequest) {
      return imageResult({
        imageUrl: imageUrlForGame('valorant', mediaCatalog),
        caption: priceCaptionForGame('valorant'),
        intent: 'top_up',
        game: 'valorant',
        priceRequest: true,
        lastAskedQuestion: 'region_and_package',
        pendingFields: pendingFields(memory.pendingFields, { game: 'valorant', missing: ['region', 'package'] })
      });
    }

    return textResult({
      text: pick(VALORANT_TOP_UP_REPLIES),
      intent: 'top_up',
      game: 'valorant',
      lastAskedQuestion: 'region_and_package',
      pendingFields: pendingFields(memory.pendingFields, { game: 'valorant', missing: ['region', 'package'] })
    });
  }

  if (game === 'league') {
    if (detectLeagueRp(normalized) || priceRequest) {
      return imageResult({
        imageUrl: imageUrlForGame('league', mediaCatalog),
        caption: priceCaptionForGame('league'),
        intent: 'league_rp',
        game: 'league',
        priceRequest: true,
        lastAskedQuestion: 'server_and_package',
        pendingFields: pendingFields(memory.pendingFields, { game: 'league', missing: ['server', 'package'], product: 'rp' })
      });
    }

    if (hasTopUpRequest || wantsSomething) {
      return textResult({
        text: pick(LEAGUE_MENU_REPLIES),
        intent: 'league_menu',
        game: 'league',
        lastAskedQuestion: 'league_mode',
        pendingFields: pendingFields(memory.pendingFields, { game: 'league', missing: ['product'] })
      });
    }

    return textResult({
      text: pick(LEAGUE_MENU_REPLIES),
      intent: 'league_menu',
      game: 'league',
      lastAskedQuestion: 'league_mode',
      pendingFields: pendingFields(memory.pendingFields, { game: 'league', missing: ['product'] })
    });
  }

  if (memory.lastAskedQuestion === 'league_mode') {
    if (detectLeagueGiftOrSkin(normalized)) {
      return textResult({ text: LEAGUE_SKIN_GIFT_REPLY, intent: 'league_skin_gift', game: 'league' });
    }

    if (detectLeagueRp(normalized)) {
      return imageResult({
        imageUrl: imageUrlForGame('league', mediaCatalog),
        caption: priceCaptionForGame('league'),
        intent: 'league_rp',
        game: 'league',
        priceRequest: true,
        lastAskedQuestion: 'server_and_package',
        pendingFields: pendingFields(memory.pendingFields, { game: 'league', missing: ['server', 'package'], product: 'rp' })
      });
    }
  }

  if (memory.lastAskedQuestion === 'package' && memoryGame === 'wild_rift' && !priceRequest) {
    const packageName = safeShortValue(text);
    return wildRiftAccountIntro(memory, packageName);
  }

  if (memory.lastAskedQuestion === 'server_and_package' && memoryGame === 'league' && !priceRequest) {
    const packageName = safeShortValue(text);
    return textResult({
      text: pick(LEAGUE_RP_PACKAGE_CONFIRMATION_REPLIES(packageName)),
      intent: 'league_rp_package_received',
      game: 'league',
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(memory.pendingFields, { game: 'league', product: 'rp', package: packageName })
    });
  }

  if (memory.lastAskedQuestion === 'region_and_package' && memoryGame === 'valorant' && !priceRequest) {
    const packageName = safeShortValue(text);
    return textResult({
      text: pick(VALORANT_PACKAGE_CONFIRMATION_REPLIES(packageName)),
      intent: 'valorant_package_received',
      game: 'valorant',
      lastAskedQuestion: 'payment_method',
      pendingFields: pendingFields(memory.pendingFields, { game: 'valorant', package: packageName })
    });
  }

  if (detectComingSoonGame(normalized) && (hasTopUpRequest || wantsSomething || priceRequest)) {
    return textResult({ text: COMING_SOON_REPLY, intent: 'coming_soon', game: 'unknown' });
  }

  if (hasTopUpRequest || priceRequest) {
    const replyText = looksLikeGenericTopUpOnly(normalized)
      ? pick(GENERAL_TOP_UP_REPLIES)
      : pick(UNKNOWN_GAME_TOP_UP_REPLIES);
    return textResult({
      text: replyText,
      intent: 'top_up',
      game: looksLikeGenericTopUpOnly(normalized) ? 'general' : 'unknown',
      priceRequest,
      lastAskedQuestion: 'game_and_package',
      pendingFields: { missing: ['game', 'package'] }
    });
  }

  return aiResult('general', priceRequest);
}
