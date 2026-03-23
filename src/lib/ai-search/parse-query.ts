import type { ParsedQuery, StructuredFilters } from './types';

const EMPTY_FILTERS: StructuredFilters = {
  category: null,
  colors: [],
  sizes: [],
  materials: [],
  max_price: null,
  min_price: null,
  styles: [],
  use_case: null,
  keywords: [],
  must_have_text: [],
  in_stock_only: false,
};

function normalizeParsed(raw: Record<string, unknown>): ParsedQuery {
  const filtersRaw = raw.filters && typeof raw.filters === 'object' ? (raw.filters as Record<string, unknown>) : {};
  const filters: StructuredFilters = {
    ...EMPTY_FILTERS,
    category: typeof filtersRaw.category === 'string' ? filtersRaw.category : null,
    colors: Array.isArray(filtersRaw.colors) ? filtersRaw.colors.filter((x): x is string => typeof x === 'string') : [],
    sizes: Array.isArray(filtersRaw.sizes) ? filtersRaw.sizes.filter((x): x is string => typeof x === 'string') : [],
    materials: Array.isArray(filtersRaw.materials)
      ? filtersRaw.materials.filter((x): x is string => typeof x === 'string')
      : [],
    max_price: typeof filtersRaw.max_price === 'number' ? filtersRaw.max_price : null,
    min_price: typeof filtersRaw.min_price === 'number' ? filtersRaw.min_price : null,
    styles: Array.isArray(filtersRaw.styles) ? filtersRaw.styles.filter((x): x is string => typeof x === 'string') : [],
    use_case: typeof filtersRaw.use_case === 'string' ? filtersRaw.use_case : null,
    keywords: Array.isArray(filtersRaw.keywords) ? filtersRaw.keywords.filter((x): x is string => typeof x === 'string') : [],
    must_have_text: Array.isArray(filtersRaw.must_have_text)
      ? filtersRaw.must_have_text.filter((x): x is string => typeof x === 'string')
      : [],
    in_stock_only: filtersRaw.in_stock_only === true,
  };

  const intent_summary =
    typeof raw.intent_summary === 'string' && raw.intent_summary.trim()
      ? raw.intent_summary.trim()
      : typeof raw.normalized_intent === 'string'
        ? raw.normalized_intent.trim()
        : '';

  const normalized_intent =
    typeof raw.normalized_intent === 'string' && raw.normalized_intent.trim()
      ? raw.normalized_intent.trim()
      : intent_summary;

  return {
    intent_summary: intent_summary || 'product search',
    normalized_intent,
    filters,
  };
}

function heuristicParse(query: string): ParsedQuery {
  const q = query.trim();
  const lower = q.toLowerCase();
  const filters = { ...EMPTY_FILTERS };
  const under = lower.match(/under\s*\$?\s*([0-9]+)/);
  const below = lower.match(/less than\s*\$?\s*([0-9]+)/);
  if (under) filters.max_price = Number(under[1]);
  if (below) filters.max_price = Number(below[1]);
  if (lower.includes('in stock') || lower.includes('available')) filters.in_stock_only = true;
  return {
    intent_summary: q,
    normalized_intent: q.slice(0, 120),
    filters,
  };
}

/**
 * Uses OpenAI to extract structured filters and intent. Falls back to heuristics when API is unavailable.
 */
export async function parseNaturalLanguageQuery(
  query: string,
  history: { role: string; content: string }[],
  locale: string
): Promise<ParsedQuery> {
  const trimmed = query.trim().slice(0, 4000);
  if (!trimmed) {
    return {
      intent_summary: '',
      normalized_intent: '',
      filters: { ...EMPTY_FILTERS },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return heuristicParse(trimmed);
  }

  const lang = locale.slice(0, 5) || 'en';
  const historyBlock =
    history.length > 0
      ? history
          .slice(-6)
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
      : '(none)';

  const system = `You extract structured shopping search intent from the user's message and optional prior turns.
Respond ONLY with valid JSON matching this shape:
{
  "intent_summary": "short natural language summary in the visitor's language (${lang})",
  "normalized_intent": "compact intent label for analytics (English snake_case phrase)",
  "filters": {
    "category": string | null,
    "colors": string[],
    "sizes": string[],
    "materials": string[],
    "max_price": number | null,
    "min_price": number | null,
    "styles": string[],
    "use_case": string | null,
    "keywords": string[],
    "must_have_text": string[],
    "in_stock_only": boolean
  }
}
Rules:
- Carry forward constraints from prior turns (e.g. color, budget) when the user refines ("cheaper", "only black").
- Put budget numbers in max_price/min_price when expressed.
- keywords: important product words not covered elsewhere.
- Do not invent categories; use null if unsure.`;

  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Locale: ${lang}\nPrior turns:\n${historyBlock}\n\nCurrent message:\n${trimmed}`,
        },
      ],
      max_tokens: 600,
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const raw = JSON.parse(cleaned) as Record<string, unknown>;
    return normalizeParsed(raw);
  } catch {
    return heuristicParse(trimmed);
  }
}
