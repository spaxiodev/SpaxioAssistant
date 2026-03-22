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
        "relative flex h-full w-[420px] max-w-full flex-col overflow-hidden rounded-[20px] border border-border-soft/50 bg-background shadow-[0_24px_80px_rgba(2,6,23,0.22)] opacity-100",
        className
      )}
      style={accentStyle}
    >
      {/* Header */}
      <header
        className="relative flex shrink-0 items-center justify-between gap-3 px-5 py-4 border-b border-border-soft/20"
        style={
          primaryBrandColor
            ? {
                background: `linear-gradient(135deg, ${primaryBrandColor}18 0%, ${primaryBrandColor}08 100%)`,
              }
            : undefined
        }
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full shadow-sm"
            style={
              primaryBrandColor
                ? {
                    backgroundColor: primaryBrandColor,
                    color: isLightColor(primaryBrandColor) ? "#0b1220" : "#ffffff",
                    boxShadow: `0 0 0 3px ${primaryBrandColor}22`,
                  }
                : undefined
            }
            aria-hidden="true"
          >
            {assistantAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assistantAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold tracking-tight">AI</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-tight text-foreground">{chatbotName}</h2>
            {assistantSubtitle ? (
              <p className="truncate text-xs leading-snug text-muted-foreground mt-0.5">{assistantSubtitle}</p>
            ) : (
              <p className="flex items-center gap-1 text-xs leading-snug text-muted-foreground mt-0.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"
                  aria-hidden="true"
                />
                Online
              </p>
            )}
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            aria-label={ariaLabelClose}
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </header>

      {/* Messages: scrollable, fills remaining space */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 scroll-smooth">
        <div className="flex flex-col gap-3.5 text-[14px] leading-relaxed">
          <AnimatePresence>
            {showSuggestions ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-2 flex flex-wrap gap-2"
              >
                {suggestions.map((s) => (
                  <motion.button
                    key={s}
                    type="button"
                    whileHover={{ y: -1, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendSuggestion(s)}
                    className="rounded-full border border-border-soft/70 bg-muted/40 px-3 py-1.5 text-[12.5px] font-medium leading-none text-foreground/80 shadow-sm transition-all hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
                    style={
                      primaryBrandColor
                        ? { borderColor: `${primaryBrandColor}35` }
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                  isAi
                    ? "self-start rounded-tl-sm border border-border-soft/60 bg-muted/50 text-foreground"
                    : "self-end rounded-tr-sm"
                )}
                style={
                  !isAi
                    ? {
                        backgroundColor: primaryBrandColor || "#1e293b",
                        color: primaryBrandColor
                          ? isLightColor(primaryBrandColor)
                            ? "#0b1220"
                            : "#ffffff"
                          : "#ffffff",
                      }
                    : undefined
                }
              >
                {isAi ? (
                  <div className="chat-markdown [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-1.5 [&_li]:my-0.5 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="font-medium">{msg.text}</span>
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
                className="flex items-center gap-1.5 self-start rounded-2xl rounded-tl-sm border border-border-soft/60 bg-muted/50 px-4 py-3"
              >
                {[0, 0.15, 0.3].map((delay, idx) => (
                  <span
                    key={idx}
                    className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce"
                    style={{ animationDelay: `${delay}s`, animationDuration: "1.1s" }}
                  />
                ))}
                <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                  {typingIndicatorText}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border-soft/20 bg-background px-4 pb-4 pt-3">
        {showPoweredBy && (
          <div className="mb-2 text-center text-[10px] text-muted-foreground/50 tracking-wide">
            {poweredByText}
          </div>
        )}
        <div className="flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            className="min-h-[46px] max-h-[128px] flex-1 resize-none overflow-y-auto rounded-2xl border border-border-soft/60 bg-muted/30 px-4 py-3 text-[14px] leading-snug text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus-visible:border-[color:var(--accent)]/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/25"
            style={
              primaryBrandColor
                ? ({ ["--accent" as string]: primaryBrandColor } as React.CSSProperties)
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
            className="shrink-0 rounded-2xl h-[46px] w-[46px] flex items-center justify-center shadow-sm transition-all hover:brightness-110 hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            style={
              primaryBrandColor
                ? {
                    backgroundColor: primaryBrandColor,
                    color: isLightColor(primaryBrandColor) ? "#0b1220" : "#ffffff",
                  }
                : { backgroundColor: "#1e293b", color: "#ffffff" }
            }
            disabled={isTyping || input.trim().length === 0}
          >
            <Send className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
