'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type WidgetVoiceUIProps = {
  widgetId: string;
  primaryBrandColor?: string;
  chatbotName?: string;
  onClose?: () => void;
  showPoweredBy?: boolean;
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

  const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');

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
    if (!base || !widgetId) return;
    setError(null);
    setPhase('connecting');
    try {
      const res = await fetch(`${base}/api/widget/voice/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      setSessionId(data.sessionId);
      setConversationId(data.conversationId ?? null);
      setTranscript([]);
      if (data.greeting) {
        setGreeting(data.greeting);
        speak(data.greeting);
        setTranscript((t) => [...t, { role: 'ai', text: data.greeting }]);
      }
      setPhase('active');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start voice session');
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

  return (
    <div
      className="flex h-full min-h-[400px] w-full max-w-[360px] flex-col rounded-2xl border bg-card shadow-xl"
      style={{ borderColor: `${primaryBrandColor}40` }}
    >
      <div
        className="flex items-center justify-between rounded-t-2xl px-4 py-3 text-white"
        style={{ backgroundColor: primaryBrandColor }}
      >
        <span className="font-semibold">{chatbotName}</span>
        <div className="flex items-center gap-1">
          {phase === 'active' && (
            <button
              type="button"
              onClick={endSession}
              className="rounded-full p-1.5 hover:bg-white/20"
              aria-label="End call"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/20" aria-label="Close">
              <span className="text-lg leading-none">×</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden p-4">
        {error && (
          <p className="mb-2 rounded-md bg-destructive/10 px-2 py-1 text-sm text-destructive">{error}</p>
        )}

        {phase === 'idle' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">Tap to start a voice conversation</p>
            <button
              type="button"
              onClick={startSession}
              disabled={!hasSupport}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full text-white transition',
                hasSupport ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'
              )}
              style={{ backgroundColor: primaryBrandColor }}
              aria-label="Start voice"
            >
              <Mic className="h-7 w-7" />
            </button>
            {!hasSupport && (
              <p className="text-xs text-muted-foreground">Voice is not supported in this browser. Try Chrome or Edge.</p>
            )}
          </div>
        )}

        {phase === 'connecting' && (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Connecting…</div>
        )}

        {(phase === 'active' || phase === 'ended') && (
          <>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {transcript.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    line.role === 'user' ? 'ml-4 bg-muted' : 'mr-4 bg-primary/10'
                  )}
                >
                  <span className="text-xs text-muted-foreground">{line.role === 'user' ? 'You' : chatbotName}</span>
                  <p className="mt-0.5 whitespace-pre-wrap">{line.text}</p>
                </div>
              ))}
            </div>
            {phase === 'active' && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-full text-white transition',
                    listening && 'ring-4 ring-primary/30'
                  )}
                  style={{ backgroundColor: listening ? primaryBrandColor : '#64748b' }}
                  aria-label={listening ? 'Stop listening' : 'Start listening'}
                >
                  {listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                </button>
              </div>
            )}
            {phase === 'ended' && (
              <p className="mt-4 text-center text-sm text-muted-foreground">Session ended. Start a new one to continue.</p>
            )}
          </>
        )}
      </div>

      {showPoweredBy && (
        <div className="border-t px-4 py-1.5 text-center text-xs text-muted-foreground">Powered by Spaxio</div>
      )}
    </div>
  );
}
