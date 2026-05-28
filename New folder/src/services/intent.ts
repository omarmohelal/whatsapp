export type IntentName =
  | 'greeting'
  | 'payment_methods'
  | 'top_up'
  | 'league_rp'
  | 'riot_gift'
  | 'account_sell'
  | 'account_buy'
  | 'complaint'
  | 'refund'
  | 'payment_issue'
  | 'unrelated'
  | 'general';

export interface IntentResult {
  name: IntentName;
  confidence: number;
  entities: {
    game?: 'wild_rift' | 'league' | 'valorant' | 'clash' | 'general';
    asksForPrice?: boolean;
    unknownAccountPrice?: boolean;
  };
}

const includesAny = (text: string, needles: string[]) =>
  needles.some((needle) => text.includes(needle));

export function normalizeForIntent(text: string): string {
  return text.toLowerCase().replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
}

export function hasUnknownAccountPrice(text: string): boolean {
  const normalized = normalizeForIntent(text);
  return includesAny(normalized, [
    'مش عارف السعر',
    'مش عارف سعر',
    'معرفش السعر',
    'مش عارف ابيع بكام',
    'سعره كام',
    "don't know the price",
    'dont know the price',
    'not sure price',
    'price it for me'
  ]);
}

export function asksForPrice(text: string): boolean {
  const normalized = normalizeForIntent(text);
  return includesAny(normalized, ['price', 'cost', 'بكام', 'كام', 'سعر', 'اسعار', 'الاسعار']);
}

function isPureGreeting(normalized: string): boolean {
  const compact = normalized.replace(/[!؟?.,،]/g, '').trim();
  return [
    'hi',
    'hello',
    'hey',
    'السلام عليكم',
    'سلام عليكم',
    'سلام',
    'صباح الخير',
    'صباح النور',
    'مساء الخير',
    'مساء النور',
    'هاي',
    'اهلا',
    'اهلين'
  ].includes(compact);
}

export function classifyIntent(text: string): IntentResult {
  const normalized = normalizeForIntent(text);
  const entities: IntentResult['entities'] = {
    asksForPrice: asksForPrice(text),
    unknownAccountPrice: hasUnknownAccountPrice(text)
  };

  if (isPureGreeting(normalized)) {
    return { name: 'greeting', confidence: 0.98, entities };
  }

  if (includesAny(normalized, ['wild rift', 'وايلد ريفت', 'wildrift', 'وايلد', 'wr'])) {
    entities.game = 'wild_rift';
  } else if (includesAny(normalized, ['valorant', 'فالورانت', 'فال', 'val', 'vp'])) {
    entities.game = 'valorant';
  } else if (includesAny(normalized, ['league', 'lol', 'rp', 'ار بي', 'ليج', 'ليج اوف ليجندز'])) {
    entities.game = 'league';
  } else if (includesAny(normalized, ['clash', 'كلاش'])) {
    entities.game = 'clash';
  }

  if (
    includesAny(normalized, [
      'طرق الدفع',
      'طريقه الدفع',
      'طريقة الدفع',
      'ازاي ادفع',
      'ادفع ازاي',
      'دفع ازاي',
      'payment methods',
      'pay methods',
      'فودافون كاش',
      'vodafone cash',
      'instapay',
      'انستاباي',
      'انستا باي',
      'باينانس',
      'binance',
      'crypto',
      'كريبتو',
      'paypal',
      'بايبال',
      'payoneer',
      'بايونير',
      'credit card',
      'كريدت'
    ])
  ) {
    return { name: 'payment_methods', confidence: 0.96, entities };
  }

  if (
    includesAny(normalized, [
      'refund',
      'استرجاع',
      'رجع فلوسي',
      'عايز فلوسي',
      'chargeback',
      'استرداد'
    ])
  ) {
    return { name: 'refund', confidence: 0.95, entities };
  }

  if (
    includesAny(normalized, [
      'دفعت ومفيش',
      'دفعت ولسه',
      'وصل الدفع',
      'حولت',
      'تحويل اتاخر',
      'payment issue',
      'paid and'
    ])
  ) {
    return { name: 'payment_issue', confidence: 0.9, entities };
  }

  if (includesAny(normalized, ['complaint', 'شكوي', 'مشكله', 'اتأخر', 'متاخر', 'غلط'])) {
    return { name: 'complaint', confidence: 0.85, entities };
  }

  if (
    includesAny(normalized, [
      'sell account',
      'list account',
      'بيع اكونت',
      'ابيع اكونت',
      'اعرض اكونت',
      'اعرض الاكونت',
      'اكونتي للبيع',
      'بيع حساب',
      'اسعر اكونت',
      'تسعير اكونت'
    ])
  ) {
    return { name: 'account_sell', confidence: 0.95, entities };
  }

  if (
    includesAny(normalized, [
      'buy account',
      'buy an account',
      'اشتري اكونت',
      'عايز اكونت',
      'عايز اشتري حساب',
      'شراء حساب',
      'account to buy'
    ])
  ) {
    return { name: 'account_buy', confidence: 0.92, entities };
  }

  if (
    includesAny(normalized, [
      'skin',
      'skins',
      'gift',
      'gifting',
      'جيفت',
      'جفت',
      'هدية',
      'هديه',
      'سكنات',
      'سكن',
      'riot gift'
    ])
  ) {
    return { name: 'riot_gift', confidence: 0.88, entities };
  }

  if (entities.game === 'league' && includesAny(normalized, ['rp', 'ار بي', 'rp شحن'])) {
    return { name: 'league_rp', confidence: 0.92, entities };
  }

  if (
    entities.game ||
    includesAny(normalized, [
      'top up',
      'topup',
      'shipping',
      'charge',
      'شحن',
      'اشحن',
      'عايز اشحن',
      'باكدج',
      'بكدج',
      'package',
      'باقه',
      'باقة',
      'متاح'
    ])
  ) {
    entities.game ??= 'general';
    return { name: 'top_up', confidence: 0.9, entities };
  }

  if (
    includesAny(normalized, [
      'homework',
      'weather',
      'سياسه',
      'اخبار',
      'recipe',
      'طبخه',
      'medical',
      'doctor'
    ])
  ) {
    return { name: 'unrelated', confidence: 0.8, entities };
  }

  return { name: 'general', confidence: 0.45, entities };
}
