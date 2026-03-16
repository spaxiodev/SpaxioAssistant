'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wand2, Sparkles } from 'lucide-react';
import { AISetupClient } from '@/app/dashboard/ai-setup/ai-setup-client';
import { AiWebsiteSetupCard } from '@/components/dashboard/ai-website-setup-card';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

export function SimpleAiSetupPage() {
  const handleDoItForMe = () => {
    try {
      window.localStorage.setItem(
        INTENT_STORAGE_KEY,
        'Set up my chatbot, lead capture, and automations. Ask me a few simple questions and configure everything for me.'
      );
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard/ai-setup?mode=guided';
    }
  };

  return (
    <div className="space-y-8">
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Setup with AI
            </CardTitle>
            <CardDescription>
              Tell Spaxio what you want. The AI will configure your chatbot, lead capture, automations, and notifications.
            </CardDescription>
          </div>
          <Button size="lg" className="gap-2 shrink-0" onClick={handleDoItForMe}>
            <Wand2 className="h-4 w-4" />
            Do It For Me
          </Button>
        </CardHeader>
      </Card>

      <AiWebsiteSetupCard />

      <AISetupClient />
    </div>
  );
}
