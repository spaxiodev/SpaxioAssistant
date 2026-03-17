'use client';

import { useRouter } from 'next/navigation';
import { Link } from '@/components/intl-link';
import { Wand2, Sparkles, Settings, Globe, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimplePageHeader, SimpleActionCard, SimpleDeveloperModeLink } from '@/components/dashboard/simple';
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

      {/* Path 1: Fully automatic from website */}
      <AiWebsiteSetupCard />

      {/* Full business setup: wizard with review & publish */}
      <SimpleActionCard
        title="Full business setup"
        description="Tell us about your business (website URL, paste, or describe). We’ll build a business profile, draft helpful answers, and set up lead + quote capture. Review and approve before going live."
        icon={<Building2 className="h-5 w-5" />}
      >
        <Button asChild variant="secondary" className="gap-2">
          <Link href="/dashboard/business-setup">
            <Building2 className="h-4 w-4" />
            Set up my whole business
          </Link>
        </Button>
      </SimpleActionCard>

      {/* Path 2: Guided setup with AI */}
      <SimpleActionCard
        title="Guided setup with AI"
        description="Answer a few questions and we’ll configure your assistant, lead capture, and follow-up for you."
        icon={<Wand2 className="h-5 w-5" />}
        variant="primary"
      >
        <Button className="gap-2" onClick={handleDoItForMe}>
          <Wand2 className="h-4 w-4" />
          Start guided setup
        </Button>
      </SimpleActionCard>

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
