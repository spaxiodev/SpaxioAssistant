'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import AIChatCard from '@/components/ui/ai-chat';

export default function DemoAIChatPage() {
  const t = useTranslations('metadata');
  const tCommon = useTranslations('common');
  const tDemo = useTranslations('demo');

  const initialMessages = useMemo(() => [
    { sender: 'ai' as const, text: tDemo('msg1') },
    { sender: 'user' as const, text: tDemo('msg2') },
    { sender: 'ai' as const, text: tDemo('msg3') },
    { sender: 'user' as const, text: tDemo('msg4') },
    { sender: 'ai' as const, text: tDemo('msg5') },
  ], [tDemo]);

  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { sender: 'user' as const, text }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai' as const, text: tDemo('reply') },
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
          chatbotName={tDemo('chatbotName')}
          primaryBrandColor="#0ea5e9"
          showPoweredBy={true}
          poweredByText={tDemo('poweredBy')}
          placeholder={tDemo('placeholder')}
          className="h-[460px] w-[360px] max-w-full shadow-xl"
        />
      </div>
    </div>
  );
}
