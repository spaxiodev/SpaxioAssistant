/**
 * Extract a JSON object from markdown code block in AI response.
 * Used to get planner config updates from the assistant reply.
 */

export function extractJsonBlock(text: string): Record<string, unknown> | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Strip the JSON code block from text so we can show the rest as the assistant message.
 */
export function stripJsonBlockFromMessage(text: string): string {
  return text.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim();
}

/**
 * Strip all fenced code blocks (e.g. ```json ... ``` or ``` ... ```) for safe display.
 * Use when rendering assistant messages so users never see raw JSON or code.
 */
export function stripAllCodeBlocksFromMessage(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').trim();
}
