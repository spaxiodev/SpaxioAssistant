"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIChatMessage = { sender: "ai" | "user"; text: string };

export type AIChatCardProps = {
  className?: string;
  /** Client-customizable accent (border, user bubble, focus). Defaults to a neutral accent. */
  primaryBrandColor?: string;
  /** Header title, e.g. chatbot name. */
  chatbotName?: string;
  /** Initial/welcome message when there are no messages (demo mode only). */
  welcomeMessage?: string;
  /** Controlled mode: messages from parent (e.g. widget chat API). */
  messages?: AIChatMessage[];
  /** Controlled mode: send handler. */
  onSend?: (text: string) => void;
  /** Controlled mode: loading/typing state. */
  isTyping?: boolean;
  /** Controlled mode: input value. */
  input?: string;
  /** Controlled mode: input change handler. */
  onInputChange?: (value: string) => void;
  /** Input placeholder. */
  placeholder?: string;
  /** When set, show close button and call on close (e.g. widget iframe). */
  onClose?: () => void;
  /** Show "Powered by" footer (e.g. in widget). */
  showPoweredBy?: boolean;
  /** Aria-label for send button (e.g. for i18n). */
  ariaLabelSend?: string;
  /** Aria-label for close button (e.g. for i18n). */
  ariaLabelClose?: string;
  /** Override "Powered by" text (e.g. for i18n). */
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
  return (
    Array.isArray(props.messages) &&
    typeof props.onSend === "function"
  );
}

export default function AIChatCard({
  className,
  primaryBrandColor = "#404040",
  chatbotName = "🤖 AI Assistant",
  welcomeMessage = "👋 Hello! I'm your AI assistant.",
  messages: controlledMessages,
  onSend: controlledOnSend,
  isTyping: controlledIsTyping = false,
  input: controlledInput,
  onInputChange: controlledOnInputChange,
  placeholder = "Type a message...",
  onClose,
  showPoweredBy = false,
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

  // Auto-grow textarea: reset height then set to scrollHeight (capped)
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

  const rgb = primaryBrandColor ? hexToRgb(primaryBrandColor) : null;
  const borderColor =
    rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)` : "rgba(255,255,255,0.2)";
  const accentStyle = primaryBrandColor
    ? { borderColor, ["--accent" as string]: primaryBrandColor }
    : undefined;

  return (
    <div
      className={cn(
        "relative w-[360px] h-[460px] rounded-2xl overflow-hidden p-[2px]",
        className
      )}
    >
      {/* Animated Outer Border - uses client colour when provided */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2"
        style={{ borderColor }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner Card */}
      <div
        className="relative flex flex-col w-full h-full rounded-xl border border-white/10 overflow-hidden bg-black/90 backdrop-blur-xl"
        style={accentStyle}
      >
        {/* Inner Animated Background - optional tint from brand colour */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-800 via-black to-gray-900"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundSize: "200% 200%",
            ...(rgb && {
              backgroundImage: `linear-gradient(to bottom right, rgba(${rgb.r},${rgb.g},${rgb.b},0.12), black 40%, rgba(${rgb.r},${rgb.g},${rgb.b},0.06))`,
            }),
          }}
        />

        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/10"
            animate={{
              y: ["0%", "-140%"],
              x: [Math.random() * 200 - 100, Math.random() * 200 - 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
            style={{ left: `${Math.random() * 100}%`, bottom: "-10%" }}
          />
        ))}

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 relative z-10 flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-lg font-semibold text-white truncate min-w-0">
            {chatbotName}
          </h2>
          {onClose && (
            <button
              type="button"
              aria-label={ariaLabelClose}
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black/50"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3 text-sm flex flex-col relative z-10">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "px-3 py-2 rounded-xl max-w-[80%] shadow-md backdrop-blur-md",
                msg.sender === "ai"
                  ? "bg-white/10 text-white self-start"
                  : "font-semibold self-end"
              )}
              style={
                msg.sender === "user" && primaryBrandColor
                  ? {
                      backgroundColor: primaryBrandColor,
                      color: isLightColor(primaryBrandColor) ? "#111" : "#fff",
                    }
                  : undefined
              }
            >
              {msg.sender === "ai" ? (
                <div className="chat-markdown [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              className="flex items-center gap-1 px-3 py-2 rounded-xl max-w-[30%] bg-white/10 self-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span
                className="w-2 h-2 rounded-full bg-white animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-white animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </motion.div>
          )}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* Input: auto-growing textarea, Enter to send, Shift+Enter for newline */}
        <div className="flex shrink-0 items-end gap-2 p-3 pt-2 pb-2 border-t border-white/10 relative z-10">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none overflow-y-auto px-3 py-2 text-sm bg-black/50 rounded-lg border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50"
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
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            style={
              primaryBrandColor
                ? { color: primaryBrandColor }
                : { color: "#fff" }
            }
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {showPoweredBy && (
          <div className="px-3 py-1 border-t border-white/5 flex shrink-0 items-center justify-between gap-2 relative z-10">
            <span className="text-[10px] text-white/40">{poweredByText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
