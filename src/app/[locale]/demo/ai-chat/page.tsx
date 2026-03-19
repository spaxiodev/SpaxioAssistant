'use client';

import { useState } from 'react';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import AIChatCard from '@/components/ui/ai-chat';

const DEMO_MESSAGES = [
  { sender: 'ai' as const, text: "Hi! I'm a sample website assistant. I answer questions about the business, help visitors get quotes, and capture leads. Try asking me something—like \"What are your hours?\" or \"I need a quote.\"" },
  { sender: 'user' as const, text: "What are your hours?" },
  { sender: 'ai' as const, text: "We're open Monday–Friday, 9am–5pm, and Saturdays 10am–2pm. Need a quote or want us to call you back? Just ask!" },
  { sender: 'user' as const, text: "I'd like a quote for landscaping." },
  { sender: 'ai' as const, text: "I'd be happy to help. Could you share your email and a bit about the project? We'll send you a quote within 24 hours." },
];

export default function DemoAIChatPage() {
  const t = useTranslations('metadata');
  const tCommon = useTranslations('common');
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { sender: 'user' as const, text }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai' as const,
          text: "Got it! In the real widget, I'd capture your details and notify the business right away. Sign up free to add this to your website.",
        },
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4 py-3">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← {tCommon('backToHome')}
        </Link>
        <span className="text-sm font-medium text-slate-300">{t('demoTitle')}</span>
        <Link
          href="/signup"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {tCommon('getStarted')}
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <AIChatCard
          messages={messages}
          onSend={handleSend}
          isTyping={isTyping}
          chatbotName="Website Assistant"
          primaryBrandColor="#0ea5e9"
          showPoweredBy={true}
          poweredByText="Powered by Spaxio Assistant"
          placeholder="Type a message..."
          className="h-[460px] w-[360px] max-w-full shadow-xl"
        />
      </div>
    </div>
  );
}
