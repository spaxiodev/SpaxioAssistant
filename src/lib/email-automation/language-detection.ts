/**
 * Lightweight language detection for incoming email bodies.
 *
 * Strategy (tiered, no external API required for common languages):
 * 1. Heuristic frequency-list scoring for EN / FR / ES (fast, covers ~90 % of cases).
 * 2. If confidence is low and OpenAI is available, fall back to an LLM call.
 * 3. Otherwise fall back to the provided fallback language code.
 *
 * Returns an ISO 639-1 two-letter code (e.g. "en", "fr", "es").
 */

import OpenAI from 'openai';

export interface LanguageDetectionResult {
  languageCode: string;
  confidence: number;   // 0–1
  method: 'heuristic' | 'llm' | 'fallback';
}

// ─── Heuristic word lists ─────────────────────────────────────────────────────

const EN_WORDS = new Set([
  'the', 'and', 'for', 'that', 'have', 'with', 'you', 'this', 'from', 'they',
  'are', 'was', 'but', 'not', 'can', 'all', 'your', 'will', 'one', 'would',
  'there', 'which', 'what', 'their', 'how', 'been', 'more', 'when', 'about',
  'hello', 'hi', 'dear', 'please', 'thank', 'thanks', 'regards', 'sincerely',
  'email', 'message', 'contact', 'information', 'service', 'request', 'order',
]);

const FR_WORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'un', 'une', 'des', 'en', 'et', 'ou', 'mais',
  'que', 'qui', 'dans', 'sur', 'par', 'pour', 'avec', 'sans', 'vous', 'nous',
  'est', 'sont', 'pas', 'plus', 'bien', 'merci', 'bonjour', 'bonsoir', 'salut',
  'cordialement', 'veuillez', 'votre', 'notre', 'message', 'demande', 'service',
  'information', 'contact', 'email', 'madame', 'monsieur',
]);

const ES_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'o', 'pero',
  'que', 'con', 'por', 'para', 'como', 'está', 'son', 'tiene', 'puede', 'usted',
  'nosotros', 'gracias', 'hola', 'buenos', 'días', 'saludos', 'atentamente',
  'estimado', 'estimada', 'servicio', 'información', 'correo', 'mensaje',
  'solicitud', 'empresa', 'señor', 'señora',
]);

const LANGUAGE_WORD_SETS: Array<{ code: string; words: Set<string> }> = [
  { code: 'en', words: EN_WORDS },
  { code: 'fr', words: FR_WORDS },
  { code: 'es', words: ES_WORDS },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôùûüœçæ\s]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function heuristicDetect(text: string): LanguageDetectionResult {
  const tokens = tokenize(text.slice(0, 1500));
  if (tokens.length === 0) {
    return { languageCode: 'en', confidence: 0, method: 'heuristic' };
  }

  const scores: Record<string, number> = {};
  for (const { code, words } of LANGUAGE_WORD_SETS) {
    const hits = tokens.filter((t) => words.has(t)).length;
    scores[code] = hits / tokens.length;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestCode, bestScore] = sorted[0];
  const [, secondScore] = sorted[1] ?? ['', 0];

  // Confidence = best score gap relative to second
  const gap = bestScore - secondScore;
  const confidence = Math.min(1, gap * 4 + bestScore * 0.5);

  return { languageCode: bestCode, confidence, method: 'heuristic' };
}

async function llmDetect(text: string): Promise<LanguageDetectionResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a language detector. Respond ONLY with a JSON object: {"code":"<ISO-639-1>","confidence":<0-1>}. No extra text.',
        },
        {
          role: 'user',
          content: `Detect the language of this text:\n\n${text.slice(0, 600)}`,
        },
      ],
      temperature: 0,
      max_tokens: 30,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const parsed = JSON.parse(raw) as { code?: string; confidence?: number };
    const code = typeof parsed.code === 'string' ? parsed.code.toLowerCase().slice(0, 2) : null;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8;

    if (!code || code.length !== 2) return null;
    return { languageCode: code, confidence, method: 'llm' };
  } catch {
    return null;
  }
}

/**
 * Detect the language of an email body.
 *
 * @param text - Plain text body of the email
 * @param fallbackLanguage - ISO code to use when detection fails (default: 'en')
 * @param useLlmFallback - Whether to call OpenAI for low-confidence cases (default: true)
 */
export async function detectEmailLanguage(
  text: string,
  fallbackLanguage = 'en',
  useLlmFallback = true
): Promise<LanguageDetectionResult> {
  if (!text || text.trim().length < 10) {
    return { languageCode: fallbackLanguage, confidence: 0, method: 'fallback' };
  }

  const heuristic = heuristicDetect(text);

  // High confidence — trust the heuristic
  if (heuristic.confidence >= 0.35) {
    return heuristic;
  }

  // Low confidence — try LLM if enabled
  if (useLlmFallback) {
    const llm = await llmDetect(text);
    if (llm) return llm;
  }

  // Hard fallback
  if (heuristic.confidence > 0) return heuristic;
  return { languageCode: fallbackLanguage, confidence: 0, method: 'fallback' };
}
