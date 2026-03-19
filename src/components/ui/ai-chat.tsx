"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIChatMessage = { sender: "ai" | "user"; text: string };

export type AIChatCardProps = {
  className?: string;
  primaryBrandColor?: string;
  chatbotName?: string;
  welcomeMessage?: string;
  messages?: AIChatMessage[];
  onSend?: (text: string) => void;
  isTyping?: boolean;
  input?: string;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  onClose?: () => void;
  showPoweredBy?: boolean;
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
  const accentStyle = primaryBrandColor
    ? { ["--accent" as string]: primaryBrandColor }
    : undefined;

  return (
    <div
      className={cn(
        "flex h-[460px] w-[360px] max-w-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#111827] opacity-100",
        className
      )}
      style={accentStyle}
    >
      {/* Header: title + close button */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-600 bg-gray-900 px-4 py-3">
        <h2 className="min-w-0 truncate text-lg font-semibold text-white">
          {chatbotName}
        </h2>
        {onClose && (
          <button
            type="button"
            aria-label={ariaLabelClose}
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-white/70 hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </header>

      {/* Messages: scrollable, fills remaining space */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-900 px-4 py-3">
        <div className="flex flex-col gap-3 text-sm">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 shadow-md",
                msg.sender === "ai"
                  ? "self-start bg-[#374151] text-white"
                  : "self-end font-semibold"
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
            </div>
          ))}
          {isTyping && (
            <div className="flex max-w-[30%] items-center gap-1 self-start rounded-xl bg-[#374151] px-3 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-white"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-white"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          )}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </div>

      {/* Input row */}
      <div className="flex shrink-0 items-end gap-2 border-t border-gray-600 bg-gray-900 p-3">
        <textarea
          ref={textareaRef}
          rows={1}
          className="min-h-[40px] max-h-[120px] flex-1 resize-none overflow-y-auto rounded-lg border border-white/20 bg-[#1f2937] px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
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
          className="shrink-0 rounded-lg bg-[#374151] p-2 hover:bg-[#4b5563]"
          style={
            primaryBrandColor ? { color: primaryBrandColor } : { color: "#fff" }
          }
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Footer: compact, no empty space */}
      {showPoweredBy && (
        <footer className="shrink-0 border-t border-gray-600 bg-gray-900 px-3 py-1.5">
          <span className="text-[10px] text-white/40">{poweredByText}</span>
        </footer>
      )}
    </div>
  );
}
