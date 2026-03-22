/**
 * Map quote form `answers` / `form_answers` JSON into quote_requests columns.
 * Keeps dashboard + API aligned with createQuoteRequestFromSession / outcome-service.
 */

function pickString(
  answers: Record<string, unknown>,
  keys: string[],
  max: number
): string | null {
  for (const k of keys) {
    const v = answers[k];
    if (v == null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v).slice(0, max);
    if (typeof v === 'boolean') continue;
    const s = String(v).trim().slice(0, max);
    if (s) return s;
  }
  return null;
}

function parseMoneyish(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const stripped = v.replace(/[^0-9.-]/g, '');
  if (!stripped) return null;
  const n = Number(stripped);
  return Number.isFinite(n) ? n : null;
}

function pickNumber(answers: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = answers[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      const n = Number(String(v).replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export type ExtractedQuoteFields = {
  service_type: string | null;
  project_details: string | null;
  location: string | null;
  budget_text: string | null;
  budget_amount: number | null;
  dimensions_size: string | null;
  notes: string | null;
};

/** Derive column values from stored form answers (widget quote, dynamic fields). */
export function extractQuoteFieldsFromFormAnswers(
  answers: Record<string, unknown> | null | undefined
): ExtractedQuoteFields {
  if (!answers || typeof answers !== 'object') {
    return {
      service_type: null,
      project_details: null,
      location: null,
      budget_text: null,
      budget_amount: null,
      dimensions_size: null,
      notes: null,
    };
  }
  const a = answers;
  const budgetText = pickString(a, ['budget_text', 'budget_range', 'budget'], 500);
  const budgetAmount =
    pickNumber(a, ['budget_amount', 'max_budget']) ??
    parseMoneyish(a.budget) ??
    parseMoneyish(a.budget_text);

  return {
    service_type: pickString(
      a,
      ['service_type', 'service_category', 'requested_service', 'service', 'interest', 'service_selection'],
      500
    ),
    project_details: pickString(
      a,
      [
        'project_details',
        'details',
        'description',
        'message',
        'project_description',
        'additional_info',
        'detail',
        'summary',
      ],
      2000
    ),
    location: pickString(a, ['location', 'area', 'region', 'site_location', 'address'], 500),
    budget_text: budgetText,
    budget_amount: budgetAmount,
    dimensions_size: pickString(a, ['dimensions', 'dimensions_size', 'size', 'square_footage'], 500),
    notes: pickString(a, ['notes', 'additional_notes'], 2000),
  };
}

type QuoteLike = {
  service_type?: string | null;
  project_details?: string | null;
  location?: string | null;
  budget_text?: string | null;
  budget_amount?: number | null;
  dimensions_size?: string | null;
  notes?: string | null;
  form_answers?: Record<string, unknown> | null;
};

/** Prefer stored columns; fill from form_answers when columns were never denormalized. */
export function mergeQuoteRequestFieldsForDisplay<T extends QuoteLike>(row: T): T & ExtractedQuoteFields {
  const ex = extractQuoteFieldsFromFormAnswers(row.form_answers ?? null);
  return {
    ...row,
    service_type: row.service_type ?? ex.service_type,
    project_details: row.project_details ?? ex.project_details,
    location: row.location ?? ex.location,
    budget_text: row.budget_text ?? ex.budget_text,
    budget_amount: row.budget_amount ?? ex.budget_amount,
    dimensions_size: row.dimensions_size ?? ex.dimensions_size,
    notes: row.notes ?? ex.notes,
  };
}
