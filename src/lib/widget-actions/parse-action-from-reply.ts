/**
 * Parse optional ACTION: and HANDOFF: lines from AI reply. Strip them from visible reply and return structured action/handoff.
 * Format: last line "ACTION: open_quote_form" or "ACTION: open_link {\"url\":\"https://...\"}"
 * Or "HANDOFF: quote" / "HANDOFF: support" / "HANDOFF: intake" to suggest continuing in full AI page.
 */

import type { WidgetChatAction } from './types';
import { isAllowedWidgetActionType, sanitizeActionUrl, sanitizeSectionId } from './types';

const ACTION_PREFIX = 'ACTION:';
const HANDOFF_PREFIX = 'HANDOFF:';
const ALLOWED_HANDOFF_TYPES = ['quote', 'support', 'intake', 'booking'] as const;
export type HandoffType = (typeof ALLOWED_HANDOFF_TYPES)[number];

function parseHandoffLine(line: string): HandoffType | null {
  const t = line.trim().toUpperCase();
  if (!t.startsWith(HANDOFF_PREFIX)) return null;
  const rest = t.slice(HANDOFF_PREFIX.length).trim().toLowerCase();
  if (ALLOWED_HANDOFF_TYPES.includes(rest as HandoffType)) return rest as HandoffType;
  return null;
}

export function parseActionFromReply(reply: string): {
  cleanReply: string;
  action: WidgetChatAction | null;
  handoffType: HandoffType | null;
} {
  let trimmed = reply.trim();
  const lines = trimmed.split(/\r?\n/);
  let handoffType: HandoffType | null = null;

  // Strip HANDOFF: line (can be last or second-to-last)
  for (let i = lines.length - 1; i >= 0; i--) {
    const handoff = parseHandoffLine(lines[i] ?? '');
    if (handoff) {
      handoffType = handoff;
      lines.splice(i, 1);
      trimmed = lines.join('\n').trimEnd();
      break;
    }
  }

  const lastLine = lines[lines.length - 1]?.trim() ?? '';
  if (!lastLine.toUpperCase().startsWith(ACTION_PREFIX)) {
    return {
      cleanReply: trimmed || reply,
      action: null,
      handoffType,
    };
  }
  const rest = lastLine.slice(ACTION_PREFIX.length).trim();
  const spaceIdx = rest.indexOf(' ');
  const typeStr = spaceIdx >= 0 ? rest.slice(0, spaceIdx).trim() : rest;
  const payloadStr = spaceIdx >= 0 ? rest.slice(spaceIdx).trim() : '';

  if (!isAllowedWidgetActionType(typeStr)) {
    return {
      cleanReply: trimmed || reply,
      action: null,
      handoffType,
    };
  }

  let payload: WidgetChatAction['payload'] | undefined;
  if (payloadStr) {
    try {
      const parsed = JSON.parse(payloadStr) as Record<string, unknown>;
      if (typeStr === 'open_link' && typeof parsed.url === 'string') {
        const url = sanitizeActionUrl(parsed.url);
        if (url) payload = { url };
      } else if (typeStr === 'scroll_to_section') {
        const sectionId = sanitizeSectionId(typeof parsed.section_id === 'string' ? parsed.section_id : String(parsed.id ?? ''));
        if (sectionId) payload = { section_id: sectionId };
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const cleanLines = lines.slice(0, -1);
  const cleanReply = cleanLines.join('\n').trimEnd();
  return {
    cleanReply: cleanReply || trimmed || reply,
    action: { type: typeStr, payload },
    handoffType,
  };
}
