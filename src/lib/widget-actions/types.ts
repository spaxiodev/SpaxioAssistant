/**
 * Widget website actions: allowlisted types and payloads.
 * Only these can be returned by the chat API and executed by the embed.
 */

export const WIDGET_ACTION_TYPES = [
  'open_contact_form',
  'open_quote_form',
  'open_booking_form',
  'show_pricing',
  'scroll_to_section',
  'open_link',
] as const;

export type WidgetActionType = (typeof WIDGET_ACTION_TYPES)[number];

export interface WidgetActionPayload {
  /** For scroll_to_section: selector or id (e.g. #pricing, .pricing-section) */
  section_id?: string;
  /** For open_link: URL (must be http/https, validated server-side) */
  url?: string;
  [key: string]: unknown;
}

export interface WidgetChatAction {
  type: WidgetActionType;
  payload?: WidgetActionPayload;
}

export function isAllowedWidgetActionType(value: string): value is WidgetActionType {
  return (WIDGET_ACTION_TYPES as readonly string[]).includes(value);
}

/** Sanitize URL for open_link: only http/https, no javascript:. */
export function sanitizeActionUrl(url: string | undefined): string | undefined {
  if (typeof url !== 'string' || !url.trim()) return undefined;
  const u = url.trim().slice(0, 2048);
  const lower = u.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return undefined;
  if (lower.startsWith('http://') || lower.startsWith('https://')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return undefined;
}

/** Sanitize section_id for scroll_to_section: only #id or .class, no spaces or script. */
export function sanitizeSectionId(sectionId: string | undefined): string | undefined {
  if (typeof sectionId !== 'string' || !sectionId.trim()) return undefined;
  const s = sectionId.trim().slice(0, 200);
  if (/^#[a-zA-Z0-9_-]+$/.test(s) || /^\.[a-zA-Z0-9_-]+$/.test(s)) return s;
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)) return `#${s}`;
  return undefined;
}

/** Parse and sanitize action from API/LLM output. Returns null if invalid. */
export function parseAndSanitizeAction(
  raw: unknown
): { type: WidgetActionType; payload?: WidgetActionPayload } | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const type = typeof o.type === 'string' ? o.type.trim() : '';
  if (!isAllowedWidgetActionType(type)) return null;
  const payloadRaw = o.payload;
  let payload: WidgetActionPayload | undefined;
  if (payloadRaw && typeof payloadRaw === 'object') {
    const p = payloadRaw as Record<string, unknown>;
    if (type === 'open_link' && typeof p.url === 'string') {
      const url = sanitizeActionUrl(p.url);
      if (url) payload = { url };
    } else if (type === 'scroll_to_section') {
      const sectionId = sanitizeSectionId(
        typeof p.section_id === 'string' ? p.section_id : typeof p.sectionId === 'string' ? p.sectionId : typeof p.selector === 'string' ? p.selector : undefined
      );
      if (sectionId) payload = { section_id: sectionId };
    }
  }
  return { type, payload };
}
