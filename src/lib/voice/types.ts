/**
 * Voice agent types and provider abstraction.
 * All providers (browser, Vapi, Deepgram, OpenAI Realtime) use the same
 * canonical data: voice_sessions + voice_transcripts. Each provider implements
 * its own capture/streaming but calls the same session lifecycle (start, turn, end).
 */

export type VoiceProviderType = 'browser' | 'vapi' | 'deepgram' | 'openai_realtime';

export type VoiceSessionStartResult = {
  sessionId: string;
  conversationId: string;
  greeting?: string;
};

export type VoiceTurnResult = {
  assistantText: string;
};

export type VoiceSessionEndResult = {
  sessionId: string;
  durationSeconds: number;
  transcriptSummary?: string;
};

/** Capabilities per provider for UI and routing. */
export type VoiceProviderCapabilities = {
  realtime: boolean;
  phone: boolean;
  browser: boolean;
};

export const VOICE_PROVIDER_CAPABILITIES: Record<VoiceProviderType, VoiceProviderCapabilities> = {
  browser: { realtime: false, phone: false, browser: true },
  vapi: { realtime: true, phone: true, browser: false },
  deepgram: { realtime: true, phone: false, browser: true },
  openai_realtime: { realtime: true, phone: false, browser: true },
};

export function getVoiceProviderCapabilities(provider: VoiceProviderType): VoiceProviderCapabilities {
  return VOICE_PROVIDER_CAPABILITIES[provider] ?? VOICE_PROVIDER_CAPABILITIES.browser;
}
