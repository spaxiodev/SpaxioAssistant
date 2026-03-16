'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Settings, Code } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

export function SimpleSettingsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const handleAskAi = () => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, 'Configure my business settings. Set my company name, how the chatbot should sound, and where to send lead notifications.');
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organize your business</h1>
        <p className="text-muted-foreground">
          Business name, chatbot tone, and notifications. Let the AI set these up for you.
        </p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask AI to configure this for you
          </CardTitle>
          <CardDescription>
            The AI will ask a few questions and fill in your business and chatbot settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="gap-2" onClick={handleAskAi}>
            <Sparkles className="h-4 w-4" />
            Ask AI to configure this for me
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            All settings
          </CardTitle>
          <CardDescription>
            Full control over business, widget, and notifications in Developer Mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/dashboard/settings">Open settings in Developer Mode</Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setMode('developer')}>
            <Code className="h-4 w-4" />
            Switch to Developer Mode
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
