export interface SensitiveCredentialDetection {
  isSensitive: boolean;
  credentialType: 'riot' | 'gmail' | 'facebook' | 'apple' | 'generic_login' | 'unknown';
  maskedText: string;
  reasons: string[];
}

const passwordValuePatterns = [
  /(password|pass|pwd|باسورد|الباسورد|كلمة\s*السر|كلمه\s*السر)\s*[:=-]?\s*([^\s,;]+)/giu,
  /(otp|2fa|code|كود|رمز)\s*[:=-]?\s*(\d{4,8})/giu
];

const providerMatchers: Array<{
  type: SensitiveCredentialDetection['credentialType'];
  pattern: RegExp;
}> = [
  { type: 'riot', pattern: /\b(riot|league|valorant|wild\s*rift|ريوت|فالورانت)\b/iu },
  { type: 'gmail', pattern: /\b(gmail|google|جيميل)\b/iu },
  { type: 'facebook', pattern: /\b(facebook|fb|فيسبوك|فيس)\b/iu },
  { type: 'apple', pattern: /\b(apple|icloud|ابل|آبل|ايكلاود)\b/iu }
];

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu;
const accountKeywordPattern =
  /\b(login|log\s*in|account|email|user(name)?|اكونت|أكونت|حساب|ايميل|يوزر)\b/iu;

export function maskSensitiveText(input: string): string {
  let masked = input;

  for (const pattern of passwordValuePatterns) {
    masked = masked.replace(pattern, (_match, key: string) => `${key}: [MASKED]`);
  }

  return masked;
}

export function detectSensitiveCredentials(input: string): SensitiveCredentialDetection {
  const reasons: string[] = [];
  const hasPasswordLikeValue = passwordValuePatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
  const hasEmail = emailPattern.test(input);
  const hasAccountKeyword = accountKeywordPattern.test(input);
  const provider = providerMatchers.find((matcher) => matcher.pattern.test(input));

  if (hasPasswordLikeValue) {
    reasons.push('password_like_value');
  }
  if (hasEmail && hasAccountKeyword) {
    reasons.push('email_and_account_keyword');
  }
  if (provider) {
    reasons.push(`${provider.type}_provider_keyword`);
  }

  const isSensitive =
    hasPasswordLikeValue && (hasEmail || hasAccountKeyword || Boolean(provider));

  return {
    isSensitive,
    credentialType: isSensitive ? provider?.type ?? 'generic_login' : 'unknown',
    maskedText: maskSensitiveText(input),
    reasons
  };
}
