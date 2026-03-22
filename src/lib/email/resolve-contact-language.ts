/**
 * Pick the language for contact-form confirmation emails:
 * - Prefer the website locale (next-intl) when sent by the client
 * - If the message text clearly indicates another language (e.g. English UI + French body), use that
 */

export function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const two = v.includes('-') ? v.slice(0, 2) : v;
  const code = two.slice(0, 2);
  return code || null;
}

/** Heuristic: French vs English for typical contact messages (returns null when uncertain). */
function detectFrenchOrEnglishMessage(message: string): 'fr' | 'en' | null {
  const trimmed = message.trim();
  if (trimmed.length < 28) return null;

  const t = trimmed.toLowerCase();
  const frenchWordRe =
    /\b(le|la|les|des|du|de|une|un|vous|nous|merci|bonjour|bonsoir|pour|avec|aussi|très|bien|sujet|message|email|je|suis|sommes|notre|votre|avez|êtes|été|faire|faisons|cordialement|salutations)\b/g;
  const englishWordRe =
    /\b(the|and|you|your|hello|hi|thanks|thank|please|message|subject|email|we|our|this|that|with|from|have|been|will|can|could|regards|best|sincerely)\b/g;

  const frHits = t.match(frenchWordRe)?.length ?? 0;
  const enHits = t.match(englishWordRe)?.length ?? 0;
  const accentChars = (trimmed.match(/[àâäéèêëïîôùûüçœæ]/g) ?? []).length;

  let score = frHits * 2 - enHits * 2 + accentChars * 3;

  // Long English text often scores slightly negative without many function words; nudge by common patterns
  if (/\b(i'm|i am|don't|doesn't|can't|won't|hello|thanks)\b/i.test(t)) score -= 2;
  if (/\b(je |j'|nous |vous |merci|bonjour)\b/i.test(t)) score += 2;

  if (score >= 8) return 'fr';
  if (score <= -8) return 'en';
  return null;
}

/**
 * Website locale wins unless the message clearly indicates the other language (mixed-locale UX).
 */
export function resolveContactConfirmationLanguage(
  body: { language?: unknown; locale?: unknown; browserLocale?: unknown },
  message: string
): string {
  const site =
    normalizeLanguageCode(body.language ?? body.locale) ?? normalizeLanguageCode(body.browserLocale) ?? 'en';
  const siteCode = site.slice(0, 2).toLowerCase() || 'en';

  const detected = detectFrenchOrEnglishMessage(message);
  if (!detected) return siteCode;

  if (detected !== siteCode) return detected;
  return siteCode;
}
