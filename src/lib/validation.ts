const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length > 64) return false;
  return UUID_REGEX.test(trimmed);
}

export function normalizeUuid(value: string): string {
  return value.trim();
}

export function getClientIp(request: Request): string {
  const header = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (!header) return 'unknown';
  const ip = header.split(',')[0]?.trim() || 'unknown';
  // Avoid logging/storing full IP; return a truncated form
  return ip.slice(0, 64);
}

export function sanitizeText(input: unknown, maxLength: number): string {
  if (input == null) return '';
  const value = String(input);
  if (!Number.isFinite(maxLength) || maxLength <= 0) return '';
  return value.slice(0, maxLength);
}

const MAX_FAQ_ITEMS = 50;
const MAX_FAQ_QUESTION_LENGTH = 500;
const MAX_FAQ_ANSWER_LENGTH = 2000;

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Sanitize and validate FAQ array from user input. Returns a safe array of { question, answer }.
 */
export function sanitizeFaq(input: unknown): FaqItem[] {
  if (!Array.isArray(input)) return [];
  const out: FaqItem[] = [];
  for (let i = 0; i < Math.min(input.length, MAX_FAQ_ITEMS); i++) {
    const item = input[i];
    if (item == null || typeof item !== 'object') continue;
    const q = sanitizeText((item as { question?: unknown }).question, MAX_FAQ_QUESTION_LENGTH);
    const a = sanitizeText((item as { answer?: unknown }).answer, MAX_FAQ_ANSWER_LENGTH);
    if (q || a) out.push({ question: q, answer: a });
  }
  return out;
}

