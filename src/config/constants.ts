export const DEFAULT_BUSINESS = {
  name: 'TheNexus',
  slug: 'thenexus'
} as const;

export const GREETING_REPLIES = [
  'وعليكم السلام ورحمة الله وبركاته ❤️ نورت TheNexus. قولّي محتاج إيه بالظبط وأنا أظبطك خطوة بخطوة.',
  'أهلًا وسهلًا بيك ❤️ ابعت اسم اللعبة أو الخدمة اللي محتاجها، ولو عارف الباقة ابعتها مباشرة.',
  'وعليكم السلام يا فندم ❤️ تحت أمرك. قولّي اللعبة والخدمة المطلوبة وهنكمل بأسرع شكل.',
  'منورنا ❤️ ابعت طلبك بالتفاصيل: اللعبة + الشحنة/السكن/الأكونت اللي محتاجه.'
] as const;

export const MORNING_REPLIES = [
  'صباح النور والفل ❤️ ابعتلي اللعبة أو الخدمة اللي محتاجها وهنظبطها.',
  'صباح الجمال ❤️ قولّي محتاج شحن ولا سكن ولا أكونت، وأنا أكملك.',
  'صباحك جميل ❤️ ابعت تفاصيل طلبك ولو عندك باقة معينة اكتبها.'
] as const;

export const EVENING_REPLIES = [
  'مساء النور ❤️ ابعت تفاصيل طلبك واللعبة اللي محتاجها.',
  'مساء الفل يا فندم ❤️ قولّي محتاج إيه وهنمشيها خطوة خطوة.',
  'مساء الجمال ❤️ ابعت اللعبة + الباقة/السكن/الأكونت المطلوب.'
] as const;

export const PAYMENT_METHODS_REPLIES = [
  `تمام ❤️ طرق الدفع المتاحة:

- Vodafone Cash: 01007208978
- InstaPay: 01014094664
- Credit Card
- PayPal
- Payoneer
- Crypto / Binance

اختار الطريقة اللي تناسبك، وبعد التحويل ابعت سكرين أو رقم العملية + اسم اللعبة والطلب.`,
  `أكيد ❤️ تقدر تدفع عن طريق:

Vodafone Cash: 01007208978
InstaPay: 01014094664
Credit Card / PayPal / Payoneer / Crypto

قولّي هتدفع على أنهي طريقة، وبعد الدفع ابعت إثبات التحويل ونكمل الطلب.`,
  `طرق الدفع عندنا ❤️

- فودافون كاش: 01007208978
- إنستا باي: 01014094664
- كارت / PayPal / Payoneer / Binance

بعد الدفع ابعت السكرين، والأدمن يراجع ويأكد الشحن.`
] as const;

export const GENERAL_TOP_UP_REPLIES = [
  'تمام ❤️ ابعتلي اسم اللعبة والباقه أو الشحنة اللي محتاجها.',
  'أكيد ❤️ ابعت اسم اللعبة + الباقة المطلوبة وأنا أكملك.',
  'ولا يهمك ❤️ قولّي اسم اللعبة والباقه المطلوبة.'
] as const;

export const UNKNOWN_GAME_TOP_UP_REPLIES = [
  'حاليًا الألعاب الأساسية عندنا هي Wild Rift وLeague وValorant ❤️ وباقي الألعاب هنضيفها قريب جدًا. لو تحب اختار واحدة منهم وأنا أكملك.',
  'تمام ❤️ دلوقتي المتاح عندنا Wild Rift وLeague وValorant، وباقي الألعاب coming soon إن شاء الله.',
  'الخدمات المتوفرة حاليًا: Wild Rift / League / Valorant ❤️ وباقي الألعاب قريب جدًا.'
] as const;

export const WILD_RIFT_GAME_REPLIES = [
  'تمام ❤️ Wild Rift. لو تحب أبعث لك صورة الأسعار ابعت: عايز اشحن وايلد ريفت أو أسعار وايلد ريفت.',
  'تمام ❤️ Wild Rift. أقدر أبعت لك قائمة الأسعار فورًا، أو لو عارف الباقة ابعتها مباشرة.',
  'حاضر ❤️ Wild Rift. قولّي لو تحب صورة الأسعار أو ابعت اسم الباقة المطلوبة.'
] as const;

export const WILD_RIFT_TOP_UP_REPLIES = [
  'تمام ❤️ دي شحنة Wild Rift. هبعت لك الأسعار، وبعد ما تختار الباقة هنكمل بيانات الأكونت.',
  'أكيد ❤️ هبعت لك أسعار Wild Rift، اختار الباقة وبعدها هنطلب بيانات الأكونت للشحن.',
  'حاضر ❤️ هبعت لك قائمة أسعار Wild Rift، اختار الشحنة اللي تناسبك.'
] as const;

export const WILD_RIFT_PRICE_CAPTION_REPLIES = [
  'دي أسعار Wild Rift ❤️\nاختار الباقة اللي محتاجها، وبعدها هنكمل بيانات الأكونت للشحن.',
  'قائمة أسعار Wild Rift ❤️\nابعت اسم الباقة أو عدد الـ cores اللي محتاجه، وبعدها هنكمل.',
  'أسعار Wild Rift ❤️\nاختار الباقة اللي تناسبك وابعتها لي.'
] as const;

export const WILD_RIFT_PACKAGE_CONFIRMATION_REPLIES = (packageName: string) => [
  `تمام ❤️ تم اختيار باقة ${packageName} لـ Wild Rift.\nالشحن بيتم على الأكونت، فهنحتاج طريقة دخول آمنة مع الأدمن:\n- Username + Password لو متاحين\n- أو الإيميل/فيسبوك/جوجل/أبل المربوط\n- أو Riot ID لو ده المتاح حاليًا`,
  `تمام ❤️ باقة ${packageName} جاهزة.\nعلشان نكمل شحن Wild Rift هنحوّل الطلب للأدمن يديك طريقة تسليم بيانات آمنة.`,
  `حلو جدًا ❤️ اخترت ${packageName}.\nدلوقتي محتاجين طريقة دخول الأكونت، والأدمن هيكمل معاك بشكل آمن بدل إرسال أي باسورد في الشات.`
] as const;

export const WILD_RIFT_ACCOUNT_INTRO_REPLIES = [
  `تمام ❤️ شحن Wild Rift Cores بيتم على الأكونت.\nعلشان نكمل هنحتاج واحدة من الطرق دي مع الأدمن بشكل آمن:\n- Username + Password لو متاحين\n- أو الإيميل / Facebook / Google / Apple المرتبط بالأكونت\n- أو Riot ID لو ده المتاح حاليًا\n\nولو مش عارف اليوزر أو الباس أو الإيميل قولّي وأنا أوجّهك خطوة بخطوة.`,
  `أكيد ❤️ علشان شحن Wild Rift Cores لازم نوصل للأكونت.\nممكن يكون معاك اليوزر والباس، أو وسيلة الربط، أو Riot ID.\nلو ناسي أي حاجة ابعت: نسيت اليوزر / نسيت الباس / مش عارف الإيميل.`,
  `تمام ❤️ شحن الكورز في Wild Rift بيكون على الأكونت نفسه.\nقولّي المتاح معاك: يوزر وباس، وسيلة ربط، ولا Riot ID؟ ولو في أي جزء ناقص هشرحلك تجيبه إزاي.`
] as const;

export const WILD_RIFT_HAVE_LOGIN_REPLY = `تمام ❤️ ممتاز.
بلاش تبعت الباسورد في الشات. هحوّلك لأدمن يديك طريقة تسليم آمنة ومؤقتة، وبعد الشحن غيّر الباسورد تاني فورًا لحماية حسابك.`;

export const RIOT_LINKS = {
  forgotUsername: 'https://recovery.riotgames.com/en/forgot-username',
  forgotPassword: 'https://recovery.riotgames.com/en/forgot-password',
  officialSite: 'https://www.riotgames.com/en'
} as const;

export const WILD_RIFT_FORGOT_USERNAME_REPLY = `تمام ❤️ لو معاك الإيميل بس مش فاكر اليوزر:
1) ادخل هنا:
${RIOT_LINKS.forgotUsername}
2) اكتب الإيميل المرتبط بالحساب.
3) هيوصلك اسم اليوزر على الإيميل.
4) بعد ما تعرفه ابعتلنا تم، والأدمن هيكمل معاك طريقة التسليم الآمنة.`;

export const WILD_RIFT_FORGOT_PASSWORD_REPLY = `تمام ❤️ لو نسيت الباسورد:
1) لو مش فاكر اليوزر الأول استخدم:
${RIOT_LINKS.forgotUsername}
2) وبعدها ادخل هنا:
${RIOT_LINKS.forgotPassword}
3) اكتب اليوزر، وهيجيلك إيميل تغيير الباسورد.
4) بعد ما تغيّر الباس ابعتلنا تم، والأدمن هيكمل معاك طريقة التسليم الآمنة.`;

export const WILD_RIFT_FIND_EMAIL_REPLY = `تمام ❤️ لو مش عارف الإيميل المرتبط بالحساب:
1) ادخل على موقع Riot الرسمي:
${RIOT_LINKS.officialSite}
2) سجّل دخول بالحساب لو تقدر.
3) من الإعدادات شوف خانة Email أو الإيميل اللي بيوصله الكود.
4) لو عرفت الإيميل استخدم استرجاع اليوزر ثم الباسورد، وبعدها ابعتلنا تم والأدمن يكمل معاك.`;

export const WILD_RIFT_RIOT_ID_REPLY = `تمام ❤️ لو المتاح عندك حاليًا Riot ID فقط ابعته لنا، ولو قدرت تجيب بيانات الدخول بعد كده هيكون أفضل وأسرع للشحن.
ولو محتاج مساعدة في الوصول لليوزر أو الباس قولّي.`;

export const LEAGUE_MENU_REPLIES = [
  'تمام ❤️ League PC. تحب RP فوري ولا Skin / Gift؟\n- لو RP أقدر أبعتلك الأسعار فورًا.\n- لو Skin/Gift ابعت اسم السكن أو الجيفت وأنا أوضح لك الخطوات.',
  'أكيد ❤️ بالنسبة لـ League فيه نوعين:\n1) RP وده فوري\n2) Skin/Gift وده بعد الإضافة\nقولّي محتاج أنهي واحد.',
  'حاضر ❤️ League PC. هل تريد RP ولا Skin / Gift؟'
] as const;

export const LEAGUE_RP_TOP_UP_REPLIES = [
  'تمام ❤️ شحن League RP فوري. هبعت لك صورة الأسعار، وبعد اختيار الباقة ابعت السيرفر وطريقة الدفع.',
  'أكيد ❤️ RP ليج بيوصل فوري. هبعت لك الأسعار، واختار السيرفر والباقه.',
  'حاضر ❤️ دي شحنة RP، والاستلام فوري بعد التأكيد.'
] as const;

export const LEAGUE_RP_PRICE_CAPTION_REPLIES = [
  'دي أسعار League RP ❤️\nالاستلام فوري. ابعت السيرفر والباقه المطلوبة.',
  'أسعار League RP ❤️\nاختار السيرفر والباقه، والـ RP بيوصل فورًا.',
  'قائمة أسعار RP ❤️\nابعت السيرفر والباقة اللي محتاجها.'
] as const;

export const LEAGUE_SKIN_GIFT_REPLY = `تمام ❤️ بالنسبة لـ League Skin / Gift:
- ابعت الفلوس أولاً
- ابعت Riot ID / الـ ID بتاعك
- ابعت اسم السكن أو الجيفت المطلوب

بعدها هنبعتلك أكونت للإضافة، وبعد 7 أيام من قبول الإضافة يوصل لك السكن / الجيفت إن شاء الله.`;

export const RIOT_GIFT_REPLY = `تمام ❤️ لو محتاج Riot / League Gift ابعت add على الأكونتات دي:

TheNexus#0001
TheNexus#0002
TheNexus#0003
TheNexus#0004
TheNexus#0005
TheNexus#0006
TheNexus#0007
TheNexus#0008

ملحوظة:
- League RP فوري.
- League Skin / Gift بعد 7 أيام من قبول الإضافة.
- الهدايا Riot العامة قد تحتاج انتظار حسب سياسة Riot.`;

export const VALORANT_TOP_UP_REPLIES = [
  'تمام ❤️ Valorant VP بيوصل فوري. هبعت لك صورة الأسعار، وبعدها ابعت الريجون والباقه المطلوبة.',
  'أكيد ❤️ شحن Valorant فوري. هبعت لك الأسعار، واختار الريجون والباقه.',
  'حاضر ❤️ Valorant VP متاح، والاستلام فوري بعد التأكيد.'
] as const;

export const VALORANT_PRICE_CAPTION_REPLIES = [
  'دي أسعار Valorant VP ❤️\nالاستلام فوري. ابعت الريجون والباقه المطلوبة.',
  'أسعار Valorant VP ❤️\nاختار الريجون والباقه، والشحن فوري.',
  'قائمة أسعار Valorant ❤️\nابعت الريجون والباقه اللي محتاجها.'
] as const;

export const WILD_RIFT_GAME_PRICE_FOLLOWUP_REPLIES = [
  'لو اخترت الباقة ابعتها لي مباشرة ❤️',
  'بعد ما تختار الباقة ابعتها لي ونكمل ❤️',
  'اختار الشحنة اللي تناسبك وابعتها لي ❤️'
] as const;

export const LEAGUE_RP_PACKAGE_CONFIRMATION_REPLIES = (packageName: string) => [
  `تمام ❤️ باقة ${packageName} في League RP. ابعت السيرفر وطريقة الدفع لو لسه ما ابعتهمش.`,
  `تمام ❤️ اخترت ${packageName} لـ League RP. ابعت السيرفر والدفع علشان نكمل.`,
  `حاضر ❤️ ${packageName} تمام. محتاج السيرفر وطريقة الدفع.`
] as const;

export const VALORANT_PACKAGE_CONFIRMATION_REPLIES = (packageName: string) => [
  `تمام ❤️ باقة ${packageName} لـ Valorant. ابعت الريجون وطريقة الدفع علشان نكمل.`,
  `حلو ❤️ اخترت ${packageName} في Valorant. محتاجين الريجون + الدفع.`,
  `تمام ❤️ ${packageName} جاهزة. ابعت الريجون وطريقة الدفع.`
] as const;

export const VODAFONE_PAYMENT_REPLIES = [
  'تمام ❤️ فودافون كاش على الرقم:\n01007208978\nبعد التحويل ابعت سكرين أو رقم العملية.',
  'أكيد ❤️ التحويل على فودافون كاش: 01007208978\nوبعدها ابعتلنا إثبات التحويل.',
  'حاضر ❤️ رقم فودافون كاش هو:\n01007208978\nأول ما تحوّل ابعت السكرين.'
] as const;

export const INSTAPAY_PAYMENT_REPLIES = [
  'تمام ❤️ InstaPay على الرقم / الحساب:\n01014094664\nبعد التحويل ابعت سكرين التحويل.',
  'أكيد ❤️ الدفع عبر InstaPay متاح على:\n01014094664\nوابعتلنا صورة التحويل بعد الدفع.'
] as const;

export const CREDENTIALS_REPLY =
  'تمام، لأمانك بلاش تبعت أي باسورد في الشات ❤️ لو الطلب محتاج بيانات دخول هحوّلك لأدمن يديك طريقة تسليم آمنة ومؤقتة.';

export const HUMAN_HANDOFF_REPLY = 'تمام ❤️ هحوّلك لأدمن يكمل معاك في أسرع وقت.';

export const COMING_SOON_REPLY =
  'الخدمة دي لسه مش متاحة عندنا حاليًا ❤️ لكن هنضيفها قريب جدًا إن شاء الله. لو حابب أقدر أساعدك في Wild Rift أو League أو Valorant.';

export const ACCOUNT_LISTING_REPLY = `وعليكم السلام ❤️
تمام، نقدر نعرض الأكونت بتاعك على TheNexus بسهولة.
الفورم ده مخصص لمراجعة وبيع الأكونتات فقط:
https://www.thenexus.ink/

علشان نراجعه ونسعره صح، املى أهم التفاصيل:
- اللعبة + السيرفر / Region
- الرانك الحالي وأعلى رانك
- عدد السكينات / الـ champions / المستوى
- هل الإيميل First / Original email موجود؟
- هل 2FA متشال؟
- السعر المتوقع، ولو مش عارف اكتب 0
- صور واضحة أو فيديو للأكونت من الداخل، ولو الصور كتير ارفعها على Imgur وابعت اللينك

مهم جدًا:
- الأكونت من غير اليوزر والباس غالبًا محدش هيشتريه أو سعره هيقل جدًا.
- لو الإيميل First موجود، اكتب بيانات الأكونت + الجيميل بتاعه في جزء Login Delivery.
- لو مش First، كلم الأدمن يديك إيميل يتربط بالأكونت، أو اعمل Gmail جديد واربطه، وبعدها ارفع البيانات.
- لو واقف في أي خانة ابعتلي اسم الخانة وأنا أشرحها لك.`;

export const ACCOUNT_BUYING_REPLY = `تمام ❤️ ابعتلي مواصفات الأكونت اللي بتدور عليه:

- اللعبة
- السيرفر / Region
- الرانك أو البادجات
- عدد السكينات أو أهم السكينات اللي تهمك
- الميزانية التقريبية

هنراجع المتاح، ولو مفيش حاجة مناسبة حاليًا الأدمن يعرض عليك أقرب اختيارات.`;

export const UNSURE_REPLY =
  'مش متأكد 100% من المعلومة دي، فهخلي أدمن يراجعها معاك بدل ما أقول حاجة غلط. ممكن توضّح طلبك في سطر واحد؟';

export const AI_FALLBACK_REPLY =
  'حصلت مشكلة مؤقتة في النظام، لكن رسالتك وصلت ❤️ هخلي أدمن يتابع معاك بدل ما أديك معلومة غير مؤكدة.';

export const GEMINI_MISSING_KEY_REPLY = 'تمام ❤️ وصلت رسالتك، أدمن هيكمل معاك حالًا.';

export const UNRELATED_REPLY =
  'أقدر أساعدك في خدمات TheNexus فقط: Wild Rift، League، Valorant، الهدايا، وبيع أو شراء الأكونتات. تحب أساعدك في إيه منهم؟';



export const FIRST_EMAIL_EXPLAIN_REPLY = `الـ First / Original Email يعني أول إيميل اتعمل عليه أكونت Riot ❤️

إزاي تتأكد؟
- افتح الإيميل اللي شاكك إنه مربوط بالأكونت.
- ابحث في الرسائل عن: Welcome to Riot Games
- أو ابحث عن أول رسالة جات من Riot Games وقت إنشاء الحساب.

لو لقيت أول رسالة إنشاء الحساب، غالبًا ده الـ First Email.
وجوده بيرفع قيمة الأكونت وبيخلي التسليم أأمن. لو مش موجود، السعر غالبًا يقل أو المشتري يطلب ضمانات أكتر.`;

export const ACCOUNT_SELLING_HELP_REPLY = `ولا يهمك ❤️ قولّي واقف في أنهي خانة في الفورم؟
أقدر أشرحلك: First Email، السعر، الصور/الفيديو، اليوزر والباس، 2FA، أو ربط الإيميل.`;

export const PAYMENT_PROOF_REPLY = `تمام ❤️ ابعت سكرين التحويل أو رقم العملية + اسم اللعبة والطلب المطلوب.
الأدمن هيراجع الدفع ويأكدلك قبل تنفيذ الشحن.`;

export const DELAY_REPLY = `حقك علينا ❤️ ابعت رقم الطلب أو سكرين الدفع واسم اللعبة، وهحوّلها لأدمن يتابع حالة الشحن فورًا.`;

export const COMPLAINT_REPLY = `آسفين جدًا على أي مشكلة ❤️ ابعت تفاصيل اللي حصل وسكرين إن وجد، وهحوّلك لأدمن يحلها معاك.`;


export const ORDER_COMPLETED_REVIEW_REPLY = `مبروك عليك الطلب ❤️
لو الخدمة وصلت تمام، هنكون مبسوطين جدًا لو تسيبلنا بوست صغير في الجروب أو ترشحنا لصحابك.
رأيك بيفرق معانا وبيطمن العملاء الجدد 🙏`;

export const RIOT_GIFT_ADD_ACCOUNTS_REPLY = `تمام ❤️ لو هتاخد Skin / Gift في Riot أو League، ابعت add على أكونت أو أكونتين من دول.
ولو ناوي تبعت أكتر من هدية، يفضل تضيفهم كلهم:

TheNexus#0001
TheNexus#0002
TheNexus#0003
TheNexus#0004
TheNexus#0005
TheNexus#0006
TheNexus#0007
TheNexus#0008

ملحوظة مهمة: بسبب سياسة Riot، لازم ننتظر مدة الإضافة قبل إرسال الهدايا. لو League PC غالبًا 7 أيام، ولو Wild Rift Gifts ممكن تحتاج 14 يوم حسب الحالة.`;

export const GROUP_AUTOPROMO_REPLIES = [
  `TheNexus موجودين معاكم لأي شحن أو أكونتات ألعاب ❤️
ابعت اسم اللعبة والباقة، أو ابعت صورة الأسعار لو محتاج تختار.` ,
  `أي حد محتاج شحن، سكنات، جيفتات، أو أكونتات ألعاب يبعتلنا التفاصيل ❤️
هنرد عليه بأسرع شكل ونوضح الأسعار والخطوات.`,
  `تذكير بسيط ❤️ قبل أي تحويل اتأكد من الطريقة والرقم مننا، وبعد الدفع ابعت سكرين التحويل عشان الأدمن يراجع الطلب.`
] as const;

export const WILD_RIFT_SKIN_PRICES = {
  legendary: { label: 'Legendary Skin', egp: 515, aliases: ['legendary', 'ليجندري', 'ليجيندري', 'اسكن ليجندري', 'سكن ليجندري'] },
  epic: { label: 'Epic Skin', egp: 385, aliases: ['epic', 'ايبك', 'إيبك', 'اسكن ايبك', 'سكن ايبك'] },
  rare: { label: 'Rare Skin', egp: 285, aliases: ['rare', 'رير', 'نادر', 'سكن نادر'] },
  common: { label: 'Common Skin', egp: 205, aliases: ['common', 'كومون', 'عادي', 'سكن عادي'] },
  premium_pass: { label: 'Premium Pass', egp: 535, aliases: ['premium pass', 'بريميوم باس'] },
  elite_pass: { label: 'Elite Pass', egp: 385, aliases: ['elite pass', 'اليت باس'] },
  normal_pass: { label: 'Normal Pass', egp: 160, aliases: ['normal pass', 'نورمال باس'] },
  elite_mini_pass: { label: 'Elite Mini Pass', egp: 220, aliases: ['elite mini pass', 'اليت ميني باس'] },
  mini_pass: { label: 'Mini Pass', egp: 150, aliases: ['mini pass', 'ميني باس'] }
} as const;

export const WILD_RIFT_CORE_PACKAGES = [
  { amount: 425, egp: 275 },
  { amount: 1000, egp: 575 },
  { amount: 1850, egp: 1040 },
  { amount: 3275, egp: 1765 },
  { amount: 4800, egp: 2520 },
  { amount: 10000, egp: 4935 }
] as const;

export const WILD_RIFT_KEY_TIERS = [
  { min: 1, max: 299, pricePerKey: 5.8 },
  { min: 300, max: 500, pricePerKey: 5.35 },
  { min: 501, max: 1000, pricePerKey: 5.145 }
] as const;

export interface PriceSku {
  game: 'wild_rift' | 'league' | 'valorant';
  product: string;
  aliases: string[];
  amount: number;
  unit: string;
  region?: string;
  usd?: string;
  egp: string;
  note?: string;
}

export const PRICE_SKUS: PriceSku[] = [
  { game: 'wild_rift', product: 'Wild Cores', aliases: ['425 wc', '425 core', '425 cores', '425 كور', '425 كورز'], amount: 425, unit: 'WC', egp: '275 EGP' },
  { game: 'wild_rift', product: 'Wild Cores', aliases: ['1000 wc', '1000 core', '1000 cores', '1000 كور', '1000 كورز'], amount: 1000, unit: 'WC', egp: '575 EGP' },
  { game: 'wild_rift', product: 'Wild Cores', aliases: ['1850 wc', '1850 core', '1850 cores', '1850 كور', '1850 كورز'], amount: 1850, unit: 'WC', egp: '1040 EGP' },
  { game: 'wild_rift', product: 'Wild Cores', aliases: ['3275 wc', '3275 core', '3275 cores', '3275 كور', '3275 كورز'], amount: 3275, unit: 'WC', egp: '1765 EGP' },
  { game: 'wild_rift', product: 'Wild Cores', aliases: ['4800 wc', '4800 core', '4800 cores', '4800 كور', '4800 كورز'], amount: 4800, unit: 'WC', egp: '2520 EGP' },
  { game: 'wild_rift', product: 'Wild Cores', aliases: ['10000 wc', '10000 core', '10000 cores', '10000 كور', '10000 كورز', '10 الاف كور', '10k cores'], amount: 10000, unit: 'WC', egp: '4935 EGP' },
  { game: 'wild_rift', product: 'Skin', aliases: ['legendary skin', 'ليجيندري', 'ليجندري'], amount: 1, unit: 'Legendary Skin', egp: '515 EGP' },
  { game: 'wild_rift', product: 'Skin', aliases: ['epic skin', 'ايبك'], amount: 1, unit: 'Epic Skin', egp: '385 EGP' },
  { game: 'league', product: 'RP', aliases: ['575 rp', '575 ار بي'], amount: 575, unit: 'RP', region: 'EU', usd: '$5', egp: '300 EGP' },
  { game: 'league', product: 'RP', aliases: ['1380 rp', '1380 ار بي'], amount: 1380, unit: 'RP', region: 'EU', usd: '$12', egp: '600 EGP' },
  { game: 'league', product: 'RP', aliases: ['1895 rp', '1895 ار بي'], amount: 1895, unit: 'RP', region: 'EU', usd: '$17', egp: '935 EGP' },
  { game: 'league', product: 'RP', aliases: ['2105 rp', '2105 ار بي'], amount: 2105, unit: 'RP', region: 'EU', usd: '$20', egp: '1100 EGP' },
  { game: 'league', product: 'RP', aliases: ['2800 rp', '2800 ار بي'], amount: 2800, unit: 'RP', region: 'EU', usd: '$23', egp: '1250 EGP' },
  { game: 'league', product: 'RP', aliases: ['3135 rp', '3135 ار بي'], amount: 3135, unit: 'RP', region: 'EU', usd: '$27', egp: '1485 EGP' },
  { game: 'league', product: 'RP', aliases: ['4500 rp', '4500 ار بي'], amount: 4500, unit: 'RP', region: 'EU', usd: '$36', egp: '2000 EGP' },
  { game: 'league', product: 'RP', aliases: ['6500 rp', '6500 ار بي'], amount: 6500, unit: 'RP', region: 'EU', usd: '$54', egp: '2970 EGP' },
  { game: 'league', product: 'Skin', aliases: ['1350 rp skin', '1350 skin', 'epic skin league', 'سكن ايبك ليج'], amount: 1350, unit: 'RP Skin', usd: '$8', egp: '440 EGP' },
  { game: 'league', product: 'Skin', aliases: ['1820 rp skin', '1820 skin', 'legendary skin league', 'سكن ليجندري ليج'], amount: 1820, unit: 'RP Skin', usd: '$12', egp: '660 EGP' },
  { game: 'league', product: 'Skin', aliases: ['3250 rp skin', '3250 skin', 'ultimate skin league', 'سكن التميت ليج'], amount: 3250, unit: 'RP Skin', usd: '$20', egp: '1100 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['475 vp', '475 في بي'], amount: 475, unit: 'VP', region: 'EU', usd: '$5', egp: '250 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['1000 vp', '1000 في بي'], amount: 1000, unit: 'VP', region: 'EU', usd: '$10', egp: '500 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['2050 vp', '2050 في بي'], amount: 2050, unit: 'VP', region: 'EU', usd: '$18', egp: '950 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['2950 vp', '2950 في بي'], amount: 2950, unit: 'VP', region: 'EU', usd: '$27', egp: '1485 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['3650 vp', '3650 في بي'], amount: 3650, unit: 'VP', region: 'EU', usd: '$31', egp: '1675 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['5350 vp', '5350 في بي'], amount: 5350, unit: 'VP', region: 'EU', usd: '$44', egp: '2375 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['7300 vp', '7300 في بي'], amount: 7300, unit: 'VP', region: 'EU', usd: '$60', egp: '3300 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['8900 vp', '8900 في بي'], amount: 8900, unit: 'VP', region: 'EU', usd: '$70', egp: '3850 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['11000 vp', '11000 في بي'], amount: 11000, unit: 'VP', region: 'EU', usd: '$88', egp: '4800 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['14600 vp', '14600 في بي'], amount: 14600, unit: 'VP', region: 'EU', usd: '$115', egp: '6325 EGP' },
  { game: 'valorant', product: 'VP', aliases: ['22000 vp', '22000 في بي'], amount: 22000, unit: 'VP', region: 'EU', usd: '$165', egp: '9075 EGP' }
];

// Backward-compatible single-value aliases used by older tests/callers.
export const PAYMENT_METHODS_REPLY = PAYMENT_METHODS_REPLIES[0];
export const GENERAL_TOP_UP_REPLY = GENERAL_TOP_UP_REPLIES[0];
export const UNKNOWN_GAME_TOP_UP_REPLY = UNKNOWN_GAME_TOP_UP_REPLIES[0];
export const WILD_RIFT_GAME_REPLY = WILD_RIFT_GAME_REPLIES[0];
export const WILD_RIFT_TOP_UP_REPLY = WILD_RIFT_TOP_UP_REPLIES[0];
export const WILD_RIFT_PRICE_CAPTION = WILD_RIFT_PRICE_CAPTION_REPLIES[0];
export const LEAGUE_RP_TOP_UP_REPLY = LEAGUE_RP_TOP_UP_REPLIES[0];
export const LEAGUE_RP_PRICE_CAPTION = LEAGUE_RP_PRICE_CAPTION_REPLIES[0];
export const VALORANT_TOP_UP_REPLY = VALORANT_TOP_UP_REPLIES[0];
export const VALORANT_PRICE_CAPTION = VALORANT_PRICE_CAPTION_REPLIES[0];
export const VODAFONE_PAYMENT_REPLY = VODAFONE_PAYMENT_REPLIES[0];
export const WILD_RIFT_CORES_INTRO_REPLY = WILD_RIFT_ACCOUNT_INTRO_REPLIES[0];
export const WILD_RIFT_PACKAGE_CONFIRMATION = (packageName: string) =>
  WILD_RIFT_PACKAGE_CONFIRMATION_REPLIES(packageName)[0];
