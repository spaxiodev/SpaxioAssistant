'use client';

import { useRouter } from 'next/navigation';
import { Wand2, Sparkles, Settings, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimplePageHeader, SimpleDeveloperModeLink } from '@/components/dashboard/simple';
import { AISetupClient } from '@/app/dashboard/ai-setup/ai-setup-client';
import { AiWebsiteSetupCard } from '@/components/dashboard/ai-website-setup-card';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

export function SimpleAiSetupPage() {
  const router = useRouter();

  const handleDoItForMe = () => {
    try {
      window.localStorage.setItem(
        INTENT_STORAGE_KEY,
        'Set up my website assistant, lead capture, and follow-up. Ask me a few simple questions and configure everything for me.'
      );
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup?mode=guided');
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Set up your assistant"
        description="Choose how you want to get started: let AI do it from your website, answer a few questions, or configure step by step."
        icon={<Settings className="h-6 w-6" />}
      />

      <AiWebsiteSetupCard />

      {/* Path 3: Manual / chat-style setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-muted-foreground" />
            Describe what you want
          </CardTitle>
          <CardDescription>
            Tell Spaxio what you want in plain language. We’ll suggest settings and next steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AISetupClient />
        </CardContent>
      </Card>

      <SimpleDeveloperModeLink
        title="Advanced setup"
        description="Developer Mode is for advanced settings and technical setup (assistants, knowledge, and automations)."
        developerPath="/dashboard/ai-setup"
        linkLabel="Open AI Setup in Developer Mode"
      />
    </div>
  );
}
