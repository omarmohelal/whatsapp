export const DEFAULT_BUSINESS = {
  name: 'TheNexus',
  slug: 'thenexus'
} as const;

export const GREETING_REPLIES = [
  'وعليكم السلام ورحمة الله ❤️ تحت أمرك، تحب تشحن إيه؟',
  'أهلاً بيك يا فندم ❤️ ابعتلي الخدمة اللي محتاجها.',
  'نورتنا ❤️ محتاج شحن، جيفت، ولا أكونت؟'
] as const;

export const MORNING_REPLIES = [
  'صباح النور ❤️ تحت أمرك.',
  'صباح الفل ❤️ تحب نساعدك في إيه؟'
] as const;

export const EVENING_REPLIES = [
  'مساء الفل ❤️ تحت أمرك.',
  'مساء النور ❤️ محتاج شحن ولا أكونت؟'
] as const;

export const PAYMENT_METHODS_REPLY = `طرق الدفع المتاحة ❤️

- Crypto / Binance
- Credit Card
- PayPal
- Payoneer
- Vodafone Cash: 01007208978
- InstaPay: 01014094664

لو معاك طريقة دفع تانية قولنا عليها وهنوفرهالك إن شاء الله.`;

export const GENERAL_TOP_UP_REPLY =
  'تمام ❤️ ابعتلي اسم اللعبة والباقه اللي محتاجها.';

export const UNKNOWN_GAME_TOP_UP_REPLY =
  'تمام ❤️ بنشحن أغلب الألعاب.\nابعتلي اسم اللعبة كامل + الباقة المطلوبة، ولو محتاجة ريجون ابعته كمان.';

export const WILD_RIFT_GAME_REPLY =
  'تمام ❤️ Wild Rift.\nتحب تشحن أنهي باقة؟ ولو محتاج الأسعار أبعتهالك.';

export const WILD_RIFT_TOP_UP_REPLY =
  'تمام ❤️ ابعتلي الباقة اللي محتاجها في Wild Rift.';

export const WILD_RIFT_PRICE_CAPTION =
  'دي أسعار Wild Rift ❤️\nاختار الباقة اللي محتاجها وابعتها لنا.';

export const LEAGUE_RP_TOP_UP_REPLY =
  'تمام ❤️ ابعتلي السيرفر والباقه المطلوبة للـ RP.';

export const LEAGUE_RP_PRICE_CAPTION =
  'دي أسعار League RP ❤️\nالـ RP فوري. ابعت السيرفر والباقه المطلوبة.';

export const VALORANT_TOP_UP_REPLY =
  'تمام ❤️ ابعتلي الريجون والباقه المطلوبة للـ VP.';

export const VALORANT_PRICE_CAPTION =
  'دي أسعار Valorant VP ❤️\nابعت الريجون والباقه المطلوبة.';

export const WILD_RIFT_PACKAGE_CONFIRMATION = (packageName: string) =>
  `تمام ❤️ باقة ${packageName} لـ Wild Rift.\nتحب تدفع بإيه؟`;

export const VODAFONE_PAYMENT_REPLY =
  'تمام ❤️ فودافون كاش على الرقم:\n01007208978\nبعد التحويل ابعتلنا سكرين التحويل.';

export const GAME_DISPLAY_NAMES = {
  wild_rift: 'Wild Rift',
  league: 'League RP',
  valorant: 'Valorant VP',
  general: 'اللعبة',
  unknown: 'اللعبة'
} as const;

export const PACKAGE_PAYMENT_PROMPT = (packageName: string, gameName: string) =>
  `تمام ❤️ باقة ${packageName} لـ ${gameName}.\nتحب تدفع بإيه؟`;

export const VALORANT_REGION_AFTER_PACKAGE_REPLY =
  'تمام ❤️ ابعتلي الريجون عشان نكمل طلب Valorant.';

export const LEAGUE_SERVER_AFTER_PACKAGE_REPLY =
  'تمام ❤️ ابعتلي السيرفر عشان نكمل طلب الـ RP.';

export const PRICE_LIST_NEEDS_GAME_REPLY =
  'تمام ❤️ ابعتلي اسم اللعبة الأول عشان أبعتهالك.';

export const ASK_PACKAGE_AGAIN_REPLY =
  'تمام ❤️ ابعتلي الباقة اللي محتاجها.';

export const INSTANT_PAYMENT_REPLIES = {
  vodafone_cash: 'تمام ❤️ فودافون كاش على الرقم:\n01007208978\nبعد التحويل ابعتلنا سكرين التحويل.',
  instapay: 'تمام ❤️ InstaPay على الرقم:\n01014094664\nبعد الدفع ابعتلنا سكرين التحويل.',
  paypal: 'تمام ❤️ PayPal متاح. ابعتلنا الإيميل أو اطلب من الأدمن لينك الدفع.',
  payoneer: 'تمام ❤️ Payoneer متاح. الأدمن هيبعتلك بيانات الدفع المناسبة.',
  binance: 'تمام ❤️ Crypto / Binance متاح. الأدمن هيبعتلك بيانات التحويل حسب العملة اللي هتدفع بيها.',
  card: 'تمام ❤️ الدفع بالكارت متاح. الأدمن هيبعتلك لينك الدفع المناسب.'
} as const;

export const CREDENTIALS_REPLY =
  'تمام، لأمانك بلاش تبعت الباسورد هنا لو مش ضروري ❤️\nلو الطلب محتاج بيانات دخول، الأدمن هيكمل معاك أو ابعت البيانات من الفورم الآمن:\nhttps://www.thenexus.ink/';

export const HUMAN_HANDOFF_REPLY = 'تمام ❤️ هحوّلك لأدمن يكمل معاك في أسرع وقت.';

export const ACCOUNT_LISTING_REPLY = `تمام ❤️ نقدر نعرض الأكونت بتاعك بسهولة.

املى الفورم ده:
https://www.thenexus.ink/

جوا الفورم اكتب:
- عدد الـ Blue Essence
- الرانك الحالي
- عدد السكينات
- السيرفر / Region
- Title واضح للأكونت
- Description فيه أهم التفاصيل
- صور أو فيديو للأكونت

لو عارف السعر اكتبه، ولو مش عارف سيبه وهنخلي أدمن يسعره.

مهم جدًا:
- شيل 2FA
- شيل أي رقم موبايل
- شيل أي Recovery Email
- اتأكد إن كل البيانات صح.`;

export const ACCOUNT_BUYING_REPLY = `تمام ❤️
ابعتلنا مواصفات الأكونت اللي محتاجه:
- اللعبة
- السيرفر / Region
- الرانك
- عدد السكينات أو أهم السكينات
- الميزانية
وهنرشحلك أنسب المتاح.`;

export const RIOT_GIFT_REPLY = `تمام ❤️
لو الجيفت Riot/League ابعت add على الأكونتات دي:

TheNexus#0001
TheNexus#0002
TheNexus#0003
TheNexus#0004
TheNexus#0005
TheNexus#0006
TheNexus#0007
TheNexus#0008

ملحوظة مهمة:
- League RP فوري.
- League Skins لازم تضيفنا الأول وبعد 7 أيام نقدر نبعت الجيفت.
- Riot Gifts العامة لازم ننتظر 14 يوم بعد قبول الإضافة بسبب سياسة Riot.`;

export const UNSURE_REPLY =
  'مش متأكد من المعلومة دي، فهخلي أدمن يراجعها معاك بدل ما أقول حاجة غلط. ممكن توضّح طلبك في جملة واحدة؟';

export const AI_FALLBACK_REPLY =
  'حصلت مشكلة مؤقتة في النظام، بس رسالتك وصلت ❤️ هخلي أدمن يتابع معاك بدل ما أديك معلومة غير مؤكدة.';

export const GEMINI_MISSING_KEY_REPLY = 'تمام ❤️ وصلت رسالتك، أدمن هيكمل معاك حالًا.';

export const UNRELATED_REPLY =
  'أقدر أساعدك في خدمات TheNexus بس: شحن ألعاب، RP، هدايا Riot، وبيع أو شراء أكونتات. تحب أساعدك في إيه منهم؟';
