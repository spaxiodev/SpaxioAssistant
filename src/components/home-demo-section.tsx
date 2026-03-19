'use client';

import { useState } from 'react';
import AIChatCard from '@/components/ui/ai-chat';

const DEMO_MESSAGES = [
  { sender: 'ai' as const, text: "Hi! I'm your website assistant. I can answer questions about your business, help visitors get quotes, and capture leads. Try asking me something—like \"What are your hours?\" or \"I need a quote.\"" },
  { sender: 'user' as const, text: "What are your hours?" },
  { sender: 'ai' as const, text: "We're open Monday–Friday, 9am–5pm, and Saturdays 10am–2pm. Need a quote or want us to call you back? Just ask!" },
  { sender: 'user' as const, text: "I'd like a quote for landscaping." },
  { sender: 'ai' as const, text: "I'd be happy to help. Could you share your email and a bit about the project? We'll send you a quote within 24 hours." },
];

export function HomeDemoSection() {
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
    <div className="flex justify-center">
      <AIChatCard
        messages={messages}
        onSend={handleSend}
        isTyping={isTyping}
        chatbotName="Website Assistant"
        primaryBrandColor="#0ea5e9"
        showPoweredBy={true}
        poweredByText="Powered by Spaxio Assistant"
        placeholder="Type a message..."
        className="h-[420px] w-[340px] sm:w-[360px] shadow-xl"
      />
    </div>
  );
}
