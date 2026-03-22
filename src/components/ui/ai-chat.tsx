"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${((i * 47 + 13) % 100)}%`,
        duration: 5 + (i % 4) * 0.75,
        delay: i * 0.5,
        x0: ((i * 17) % 200) - 100,
        x1: ((i * 31) % 200) - 100,
      })),
    []
  );

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

  const ringBorderStyle = primaryBrandColor
    ? { borderColor: `${primaryBrandColor}55` }
    : undefined;

  return (
    <div
      className={cn(
        "relative h-[460px] w-[360px] max-w-full overflow-hidden rounded-2xl p-[2px]",
        className
      )}
      style={accentStyle}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/20"
        style={ringBorderStyle}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-800 via-black to-gray-900"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        />

        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute h-1 w-1 rounded-full bg-white/10"
            animate={{
              y: ["0%", "-140%"],
              x: [p.x0, p.x1],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
            style={{ left: p.left, bottom: "-10%" }}
          />
        ))}

        <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 shadow-md"
              style={
                primaryBrandColor
                  ? {
                      backgroundColor: primaryBrandColor,
                      color: isLightColor(primaryBrandColor) ? "#0b1220" : "#ffffff",
                      boxShadow: `0 0 0 2px ${primaryBrandColor}44`,
                    }
                  : { backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }
              }
              aria-hidden="true"
            >
              {assistantAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assistantAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold tracking-tight">AI</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{chatbotName}</h2>
              {assistantSubtitle ? (
                <p className="truncate text-xs leading-snug text-white/55">{assistantSubtitle}</p>
              ) : (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-white/55">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
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
              className="shrink-0 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
          <div className="flex flex-col space-y-3 text-sm">
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
                      whileHover={{ y: -1, scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => sendSuggestion(s)}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12.5px] font-medium leading-none text-white/90 shadow-sm backdrop-blur-md transition-all hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-white/35"
                      style={
                        primaryBrandColor
                          ? { borderColor: `${primaryBrandColor}44` }
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
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 shadow-md backdrop-blur-md",
                    isAi
                      ? "self-start border border-white/10 bg-white/10 text-white"
                      : "self-end font-semibold"
                  )}
                  style={
                    !isAi
                      ? {
                          backgroundColor: primaryBrandColor
                            ? `${primaryBrandColor}e6`
                            : "rgba(255,255,255,0.3)",
                          color: primaryBrandColor
                            ? isLightColor(primaryBrandColor)
                              ? "#0b1220"
                              : "#ffffff"
                            : "#0a0a0a",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }
                      : undefined
                  }
                >
                  {isAi ? (
                    <div className="chat-markdown text-white [&_a]:text-sky-300 [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:my-1.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:my-1.5 [&_li]:my-0.5">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </motion.div>
              );
            })}

            <AnimatePresence>
              {isTyping ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex max-w-[75%] flex-col gap-1 self-start rounded-xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1">
                    <motion.span
                      className="h-2 w-2 rounded-full bg-white"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                    <motion.span
                      className="h-2 w-2 rounded-full bg-white"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.15 }}
                    />
                    <motion.span
                      className="h-2 w-2 rounded-full bg-white"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-white/60">{typingIndicatorText}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </div>

        <div className="relative z-10 shrink-0 border-t border-white/10 p-3">
          {showPoweredBy && (
            <div className="mb-2 text-center text-[10px] tracking-wide text-white/40">
              {poweredByText}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              className="min-h-[42px] max-h-[120px] flex-1 resize-none overflow-y-auto rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm leading-snug text-white placeholder:text-white/40 outline-none transition-all focus:border-white/25 focus:ring-1 focus:ring-white/35"
              style={
                primaryBrandColor
                  ? ({
                      ["--accent" as string]: primaryBrandColor,
                    } as React.CSSProperties)
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
              disabled={isTyping || input.trim().length === 0}
              className={cn(
                "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-white/40",
                !primaryBrandColor && "text-white"
              )}
              style={
                primaryBrandColor
                  ? {
                      backgroundColor: `${primaryBrandColor}cc`,
                      color: isLightColor(primaryBrandColor) ? "#0b1220" : "#ffffff",
                    }
                  : undefined
              }
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
