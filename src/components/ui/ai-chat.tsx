"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIChatMessage = { sender: "ai" | "user"; text: string };

export type AIChatCardProps = {
  className?: string;
  primaryBrandColor?: string;
  chatbotName?: string;
  assistantSubtitle?: string | null;
  assistantAvatarUrl?: string | null;
  welcomeMessage?: string;
  suggestions?: string[];
  messages?: AIChatMessage[];
  onSend?: (text: string) => void;
  isTyping?: boolean;
  input?: string;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  onClose?: () => void;
  showPoweredBy?: boolean;
  typingIndicatorText?: string;
  ariaLabelSend?: string;
  ariaLabelClose?: string;
  poweredByText?: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.replace("#", "");
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

function isControlled(props: AIChatCardProps): boolean {
  return Array.isArray(props.messages) && typeof props.onSend === "function";
}

export default function AIChatCard({
  className,
  primaryBrandColor = "#404040",
  chatbotName = "AI Assistant",
  assistantSubtitle = null,
  assistantAvatarUrl = null,
  welcomeMessage = "👋 Hello! I'm your AI assistant.",
  suggestions = [],
  messages: controlledMessages,
  onSend: controlledOnSend,
  isTyping: controlledIsTyping = false,
  input: controlledInput,
  onInputChange: controlledOnInputChange,
  placeholder = "Type a message...",
  onClose,
  showPoweredBy = false,
  typingIndicatorText = "Thinking…",
  ariaLabelSend = "Send",
  ariaLabelClose = "Close",
  poweredByText = "Powered by Spaxio Assistant",
}: AIChatCardProps) {
  const [demoMessages, setDemoMessages] = useState<AIChatMessage[]>([
    { sender: "ai", text: welcomeMessage },
  ]);
  const [demoInput, setDemoInput] = useState("");
  const [demoTyping, setDemoTyping] = useState(false);

  const controlled = isControlled({
    messages: controlledMessages,
    onSend: controlledOnSend,
  });

  const messages = controlled ? controlledMessages! : demoMessages;
  const input = controlled ? (controlledInput ?? "") : demoInput;
  const setInput = controlled
    ? (controlledOnInputChange ?? (() => {}))
    : setDemoInput;
  const isTyping = controlled ? controlledIsTyping : demoTyping;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const capped = Math.min(el.scrollHeight, 120);
    el.style.height = `${capped}px`;
  }, [input]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    if (controlled && controlledOnSend) {
      controlledOnSend(text);
      if (controlledOnInputChange) controlledOnInputChange("");
      return;
    }

    setDemoMessages((prev) => [...prev, { sender: "user", text }]);
    setDemoInput("");
    setDemoTyping(true);
    setTimeout(() => {
      setDemoMessages((prev) => [
        ...prev,
        { sender: "ai", text: "🤖 This is a sample AI response." },
      ]);
      setDemoTyping(false);
    }, 1200);
  };

  const hasUserMessages = messages.some((m) => m.sender === "user");
  const showSuggestions = suggestions.length > 0 && !hasUserMessages;

  function sendSuggestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (controlled && controlledOnSend) {
      controlledOnSend(trimmed);
      return;
    }

    setDemoMessages((prev) => [...prev, { sender: "user", text: trimmed }]);
    setDemoTyping(true);
    setTimeout(() => {
      setDemoMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Got it. Tell me a bit more and I’ll help you." },
      ]);
      setDemoTyping(false);
    }, 800);
  }

  const accentStyle = primaryBrandColor
    ? { ["--accent" as string]: primaryBrandColor }
    : undefined;

  return (
    <div
      className={cn(
        "relative flex h-full w-[400px] max-w-full flex-col overflow-hidden rounded-[26px] border border-border-soft/50 bg-background/65 shadow-[0_18px_60px_rgba(2,6,23,0.18)] backdrop-blur supports-[backdrop-filter]:bg-background/55 opacity-100",
        className
      )}
      style={accentStyle}
    >
      {/* Header: title + close button */}
      <header className="relative flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="relative grid size-10 place-items-center overflow-hidden rounded-full border border-border-soft/80"
            style={
              primaryBrandColor
                ? {
                    backgroundColor: primaryBrandColor,
                    color: isLightColor(primaryBrandColor) ? "#0b1220" : "#ffffff",
                  }
                : undefined
            }
            aria-hidden="true"
          >
            {assistantAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assistantAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold">AI</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{chatbotName}</h2>
            {assistantSubtitle ? (
              <p className="truncate text-[11px] leading-tight text-muted-foreground">{assistantSubtitle}</p>
            ) : null}
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            aria-label={ariaLabelClose}
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </header>

      {/* Messages: scrollable, fills remaining space */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4 text-sm">
          <AnimatePresence>
            {showSuggestions ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-1 flex flex-wrap gap-2"
              >
                {suggestions.map((s) => (
                  <motion.button
                    key={s}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendSuggestion(s)}
                    className="rounded-full border border-border-soft bg-background/35 px-2.5 py-1 text-[12px] font-medium leading-none text-foreground shadow-sm transition-colors hover:bg-background/60 focus:outline-none focus:ring-2 focus:ring-ring/60"
                    style={
                      primaryBrandColor
                        ? { boxShadow: `0 0 0 1px ${primaryBrandColor}20 inset` }
                        : undefined
                    }
                  >
                    {s}
                  </motion.button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {messages.map((msg, i) => {
            const isAi = msg.sender === "ai";
            return (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3 shadow-sm",
                  isAi
                    ? "self-start border border-border-soft bg-card/70 text-foreground"
                    : "self-end font-semibold bg-muted/25 border border-border-soft/35"
                )}
                style={
                  !isAi && primaryBrandColor
                    ? {
                        backgroundColor: primaryBrandColor,
                        color: isLightColor(primaryBrandColor) ? "#0b1220" : "#ffffff",
                      }
                    : undefined
                }
              >
                {isAi ? (
                  <div className="chat-markdown [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </motion.div>
            );
          })}

          <AnimatePresence>
            {isTyping ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex max-w-[42%] items-center gap-1 self-start rounded-2xl border border-border-soft bg-card/70 px-4 py-2.5"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/70" />
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-foreground/70"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-foreground/70"
                  style={{ animationDelay: "0.3s" }}
                />
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  {typingIndicatorText}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </div>

      {/* Floating input bar */}
      <div className="mx-3 mb-3 mt-2 shrink-0 rounded-2xl border border-border-soft/40 bg-background/55 px-3 py-2.5 shadow-[0_10px_30px_rgba(2,6,23,0.16)] backdrop-blur">
        {showPoweredBy && (
          <div className="mb-1 text-center text-[10px] text-muted-foreground/70">
            {poweredByText}
          </div>
        )}
        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            className="min-h-[48px] max-h-[128px] flex-1 resize-none overflow-y-auto rounded-xl border border-border-soft bg-background/45 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/35"
            style={
              primaryBrandColor
                ? ({ ["--tw-ring-color" as string]: primaryBrandColor } as React.CSSProperties)
                : undefined
            }
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            aria-label={placeholder}
          />
          <button
            type="button"
            onClick={handleSend}
            aria-label={ariaLabelSend}
            className="shrink-0 rounded-xl h-[48px] w-[48px] flex items-center justify-center shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={
              primaryBrandColor
                ? {
                    backgroundColor: primaryBrandColor,
                    color: isLightColor(primaryBrandColor) ? "#0b1220" : "#ffffff",
                  }
                : undefined
            }
            disabled={isTyping || input.trim().length === 0}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
