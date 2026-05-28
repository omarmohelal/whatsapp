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
  | 'human_handoff'
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
  return text
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
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

export function classifyIntent(text: string): IntentResult {
  const normalized = normalizeForIntent(text);
  const compact = normalized.replace(/[!?.,،؟]/g, '').trim();
  const entities: IntentResult['entities'] = {
    asksForPrice: asksForPrice(text),
    unknownAccountPrice: hasUnknownAccountPrice(text)
  };

  if (
    [
      'السلام عليكم',
      'سلام عليكم',
      'سلام',
      'ازيك',
      'عامل ايه',
      'hi',
      'hello',
      'صباح الخير',
      'صباح النور',
      'مساء الخير',
      'مساء النور'
    ].includes(compact)
  ) {
    return { name: 'greeting', confidence: 0.98, entities };
  }

  if (includesAny(normalized, ['wild rift', 'وايلد ريفت', 'وايلد', 'wr'])) {
    entities.game = 'wild_rift';
  } else if (includesAny(normalized, ['valorant', 'فالورانت', 'فال', 'val', 'vp'])) {
    entities.game = 'valorant';
  } else if (includesAny(normalized, ['league', 'lol', 'ليج', 'ليج اوف ليجندز', 'rp', 'ار بي'])) {
    entities.game = 'league';
  } else if (includesAny(normalized, ['clash', 'كلاش'])) {
    entities.game = 'clash';
  }

  if (
    includesAny(normalized, [
      'طرق الدفع',
      'الدفع',
      'بدفع ازاي',
      'ادفع ازاي',
      'payment',
      'pay',
      'فودافون',
      'انستا باي',
      'انستاباي',
      'instapay',
      'paypal',
      'binance'
    ])
  ) {
    return { name: 'payment_methods', confidence: 0.96, entities };
  }

  if (includesAny(normalized, ['refund', 'استرجاع', 'استرداد', 'رجع فلوسي'])) {
    return { name: 'refund', confidence: 0.95, entities };
  }

  if (includesAny(normalized, ['ادمن', 'اكلم حد', 'خدمه عملاء', 'خدمة عملاء'])) {
    return { name: 'human_handoff', confidence: 0.94, entities };
  }

  if (includesAny(normalized, ['مشكله', 'مشكلة', 'شكوي', 'شكوى', 'اتأخر', 'متاخر', 'غلط'])) {
    return { name: 'complaint', confidence: 0.88, entities };
  }

  if (includesAny(normalized, ['دفعت ومفيش', 'دفعت ولسه', 'وصل الدفع', 'حولت', 'payment issue'])) {
    return { name: 'payment_issue', confidence: 0.9, entities };
  }

  if (
    includesAny(normalized, [
      'ابيع اكونت',
      'اعرض اكونت',
      'اسعر اكونت',
      'تسعير اكونت',
      'بيع اكونت',
      'sell account',
      'list account'
    ])
  ) {
    return { name: 'account_sell', confidence: 0.95, entities };
  }

  if (
    includesAny(normalized, [
      'اشتري اكونت',
      'عايز اكونت',
      'اكونت للبيع',
      'account available',
      'buy account'
    ])
  ) {
    return { name: 'account_buy', confidence: 0.92, entities };
  }

  if (
    includesAny(normalized, [
      'جيفت',
      'جفت',
      'gift',
      'skin',
      'skins',
      'سكن',
      'سكنات',
      'هديه',
      'هدية'
    ])
  ) {
    return { name: 'riot_gift', confidence: 0.9, entities };
  }

  if (entities.game === 'league' && includesAny(normalized, ['rp', 'ار بي'])) {
    return { name: 'league_rp', confidence: 0.92, entities };
  }

  if (
    entities.game ||
    includesAny(normalized, [
      'شحن',
      'اشحن',
      'عايز اشحن',
      'بكام',
      'اسعار',
      'الاسعار',
      'متاح',
      'top up',
      'charge',
      'shipping'
    ])
  ) {
    entities.game ??= 'general';
    return { name: 'top_up', confidence: 0.9, entities };
  }

  if (includesAny(normalized, ['homework', 'weather', 'سياسه', 'اخبار', 'recipe', 'medical'])) {
    return { name: 'unrelated', confidence: 0.8, entities };
  }

  return { name: 'general', confidence: 0.45, entities };
}
