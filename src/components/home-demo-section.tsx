'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import AIChatCard from '@/components/ui/ai-chat';

export function HomeDemoSection() {
  const t = useTranslations('demo');

  const initialMessages = useMemo(() => [
    { sender: 'ai' as const, text: t('msg1') },
    { sender: 'user' as const, text: t('msg2') },
    { sender: 'ai' as const, text: t('msg3') },
    { sender: 'user' as const, text: t('msg4') },
    { sender: 'ai' as const, text: t('msg5') },
  ], [t]);

  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { sender: 'user' as const, text }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai' as const, text: t('reply') },
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="flex justify-center">
      <AIChatCard
        messages={messages}
        onSend={handleSend}
        isTyping={isTyping}
        chatbotName={t('chatbotName')}
        primaryBrandColor="#0ea5e9"
        showPoweredBy={true}
        poweredByText={t('poweredBy')}
        placeholder={t('placeholder')}
        className="h-[420px] w-[340px] sm:w-[360px] shadow-xl"
      />
    </div>
  );
}
