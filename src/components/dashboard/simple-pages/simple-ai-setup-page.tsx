'use client';

import { useRouter } from 'next/navigation';
import { Wand2, Sparkles, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SimplePageHeader,
  SimpleDeveloperModeLink,
  NextBestActionCard,
  PreviewAssistantButton,
} from '@/components/dashboard/simple';
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
        title="Set up your AI assistant"
        description="Add your website URL to get started, or describe what you want in plain language. We'll configure everything for you."
        icon={<Sparkles className="h-6 w-6" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <NextBestActionCard compact hideWhenLoading />
        <PreviewAssistantButton />
      </div>

      {/* Step 1: Website URL */}
      <AiWebsiteSetupCard />

      {/* Step 2: Chat-style setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-muted-foreground" />
            Or describe what you want
          </CardTitle>
          <CardDescription>
            Tell us your goals in plain language. We&apos;ll suggest settings and next steps—no technical terms required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AISetupClient />
        </CardContent>
      </Card>

      {/* Guided path */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-5 w-5 text-primary" />
            Prefer a guided walkthrough?
          </CardTitle>
          <CardDescription>
            We&apos;ll ask a few simple questions and set everything up for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={handleDoItForMe}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Wand2 className="h-4 w-4" />
            Start guided setup
          </button>
        </CardContent>
      </Card>

      <SimpleDeveloperModeLink
        title="Need more control?"
        description="Developer Mode has advanced settings for assistants, website info, and auto follow-up."
        developerPath="/dashboard/ai-setup"
        linkLabel="Open AI Setup in Developer Mode"
      />
    </div>
  );
}
