/** Draft AI Setup Assistant sessions inactive longer than this are removed server-side. */
export const AI_SETUP_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export const AI_SETUP_SESSION_TTL_HOURS = 2;

/** localStorage key for resuming the current setup chat within the TTL window. */
export const AI_SETUP_SESSION_STORAGE_KEY = 'spaxio_ai_setup_session_v1';

export function expiredAiSetupSessionCutoffIso(): string {
  return new Date(Date.now() - AI_SETUP_SESSION_TTL_MS).toISOString();
}
