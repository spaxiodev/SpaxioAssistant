'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    const r = parseInt(value[0] + value[0], 16);
    const g = parseInt(value[1] + value[1], 16);
    const b = parseInt(value[2] + value[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.7;
}

type WidgetVoiceUIProps = {
  widgetId: string;
  primaryBrandColor?: string;
  chatbotName?: string;
  onClose?: () => void;
  showPoweredBy?: boolean;
  /** Base URL for API calls (e.g. window.location.origin). Pass from widget page for consistency with chat. */
  baseUrl?: string;
  /** Aria-label for close button. */
  ariaLabelClose?: string;
  /** Footer text (e.g. "Powered by Spaxio"). */
  poweredByText?: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: unknown) => void) | null;
  onend: () => void;
  onerror: (e: { error: string }) => void;
};

export function WidgetVoiceUI({
  widgetId,
  primaryBrandColor = '#0f172a',
  chatbotName = 'Assistant',
  onClose,
  showPoweredBy,
  baseUrl,
  ariaLabelClose = 'Close',
  poweredByText = 'Powered by Spaxio',
}: WidgetVoiceUIProps) {
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const base =
    typeof baseUrl === 'string' && baseUrl
      ? baseUrl.replace(/\/$/, '')
      : typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || '');

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1;
    synthRef.current = window.speechSynthesis;
    utteranceRef.current = u;
    u.onstart = () => setSpeaking(true);
    u.onend = u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  const startSession = useCallback(async () => {
    if (!base || !widgetId) {
      setError('Missing configuration. Please refresh and try again.');
      return;
    }
    setError(null);
    setPhase('connecting');
    try {
      const res = await fetch(`${base}/api/widget/voice/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetId }),
      });
      let data: { error?: string; sessionId?: string; conversationId?: string; greeting?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError('Invalid response from server. Please try again.');
        setPhase('idle');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Voice is not available. Please try again later.');
        setPhase('idle');
        return;
      }
      setSessionId(data.sessionId ?? null);
      setConversationId(data.conversationId ?? null);
      setTranscript([]);
      if (data.greeting) {
        setGreeting(data.greeting);
        speak(data.greeting);
        setTranscript((t) => [...t, { role: 'ai', text: data.greeting! }]);
      }
      setPhase('active');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start voice session';
      setError(message.includes('fetch') || message.includes('Network') ? 'Network error. Check your connection and try again.' : message);
      setPhase('idle');
    }
  }, [base, widgetId, speak]);

  const sendTurn = useCallback(
    async (userText: string) => {
      if (!sessionId || !base || !userText.trim()) return;
      const trimmed = userText.trim();
      setTranscript((t) => [...t, { role: 'user', text: trimmed }]);
      try {
        const res = await fetch(`${base}/api/widget/voice/turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userText: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const assistantText = data.assistantText?.trim();
        if (assistantText) {
          setTranscript((t) => [...t, { role: 'ai', text: assistantText }]);
          speak(assistantText);
        }
      } catch {
        setTranscript((t) => [...t, { role: 'ai', text: 'Sorry, I had trouble responding.' }]);
      }
    },
    [sessionId, base, speak]
  );

  const endSession = useCallback(async () => {
    if (!sessionId || !base) return;
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    setListening(false);
    setPhase('ended');
    try {
      await fetch(`${base}/api/widget/voice/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // ignore
    }
    setSessionId(null);
  }, [sessionId, base]);

  useEffect(() => {
    if (phase !== 'active' || !sessionId) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = document.documentElement.lang || 'en-US';
    let finalBuffer = '';
    rec.onresult = (e: unknown) => {
      const ev = e as { results: Iterable<{ isFinal: boolean; length: number; 0?: { transcript: string } }> };
      const results = Array.from(ev.results);
      const last = results[results.length - 1];
      if (last?.isFinal && last[0]?.transcript) {
        const text = String(last[0].transcript || '').trim();
        if (text) {
          finalBuffer += (finalBuffer ? ' ' : '') + text;
          sendTurn(finalBuffer);
          finalBuffer = '';
        }
      } else if (last && !last.isFinal) {
        finalBuffer = Array.from(results)
          .filter((r) => r.length > 0)
          .map((r) => String(r[0]?.transcript ?? ''))
          .join(' ')
          .trim();
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e: { error: string }) => {
      if (e.error !== 'aborted') setListening(false);
    };
    recognitionRef.current = rec;
    return () => {
      rec.stop();
      recognitionRef.current = null;
    };
  }, [phase, sessionId, sendTurn]);

  const toggleListening = useCallback(() => {
    if (phase !== 'active') return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      setError(null);
      try {
        recognitionRef.current?.start();
        setListening(true);
      } catch {
        setError('Could not start microphone');
      }
    }
  }, [phase, listening]);

  const hasSupport = typeof window !== 'undefined' && (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  const rgb = primaryBrandColor ? hexToRgb(primaryBrandColor) : null;
  const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)` : 'rgba(255,255,255,0.2)';
  const accentStyle = primaryBrandColor ? { borderColor, ['--accent' as string]: primaryBrandColor } : undefined;

  return (
    <div
      className={cn(
        'relative flex h-full min-h-[460px] w-full max-w-[360px] flex-col rounded-2xl overflow-hidden border-2 p-[2px]'
      )}
      style={{ borderColor }}
    >
      {/* Inner card – same dark theme as AIChatCard */}
      <div
        className="relative flex flex-1 flex-col rounded-xl border border-white/10 overflow-hidden bg-black/90 backdrop-blur-xl"
        style={accentStyle}
      >
        {/* Header – same as AIChatCard */}
        <div className="px-3 py-2 relative z-10 flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-lg font-semibold text-white truncate min-w-0">{chatbotName}</h2>
          <div className="flex items-center gap-1 shrink-0">
            {phase === 'active' && (
              <button
                type="button"
                onClick={endSession}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={ariaLabelClose}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden p-4 min-h-0">
          {error && (
            <p className="mb-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          {phase === 'idle' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-white/70">Tap to start a voice conversation</p>
              <button
                type="button"
                onClick={startSession}
                disabled={!hasSupport}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full text-white transition',
                  hasSupport ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'
                )}
                style={{
                  backgroundColor: primaryBrandColor,
                  color: isLightColor(primaryBrandColor) ? '#111' : '#fff',
                }}
                aria-label="Start voice"
              >
                <Mic className="h-7 w-7" />
              </button>
              {!hasSupport && (
                <p className="text-xs text-white/50">Voice is not supported in this browser. Try Chrome or Edge.</p>
              )}
            </div>
          )}

          {phase === 'connecting' && (
            <div className="flex flex-1 items-center justify-center text-sm text-white/70">Connecting…</div>
          )}

          {(phase === 'active' || phase === 'ended') && (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
                {transcript.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm max-w-[82%] shadow-md backdrop-blur-md',
                      line.role === 'user' ? 'self-end ml-auto' : 'self-start bg-white/10'
                    )}
                    style={
                      line.role === 'user' && primaryBrandColor
                        ? {
                            backgroundColor: primaryBrandColor,
                            color: isLightColor(primaryBrandColor) ? '#111' : '#fff',
                          }
                        : undefined
                    }
                  >
                    {line.role === 'user' ? null : (
                      <span className="text-xs text-white/60 block mb-0.5">{chatbotName}</span>
                    )}
                    <p className={cn('whitespace-pre-wrap', line.role === 'user' ? 'text-inherit' : 'text-white')}>
                      {line.text}
                    </p>
                  </div>
                ))}
              </div>
              {phase === 'active' && (
                <div className="mt-4 flex justify-center shrink-0">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-full text-white transition',
                      listening && 'ring-4 ring-white/30'
                    )}
                    style={{
                      backgroundColor: listening ? primaryBrandColor : 'rgba(100,116,139,0.9)',
                      color: listening && primaryBrandColor && isLightColor(primaryBrandColor) ? '#111' : '#fff',
                    }}
                    aria-label={listening ? 'Stop listening' : 'Start listening'}
                  >
                    {listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                  </button>
                </div>
              )}
              {phase === 'ended' && (
                <p className="mt-4 text-center text-sm text-white/50 shrink-0">Session ended. Start a new one to continue.</p>
              )}
            </>
          )}
        </div>

        {showPoweredBy && (
          <div className="px-4 py-2 flex items-center justify-center shrink-0 relative z-10">
            <span className="text-[10px] text-white/40">{poweredByText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
