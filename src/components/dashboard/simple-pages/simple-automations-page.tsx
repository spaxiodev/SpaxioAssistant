'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Workflow, Code } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

export function SimpleAutomationsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const handleAskAi = () => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, 'Create automations for me. When someone fills out the chat or becomes a lead, send me an email and notify my team.');
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Let AI automate this</h1>
        <p className="text-muted-foreground">
          Set up workflows so Spaxio can handle follow-up, notifications, and actions for you.
        </p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask AI to create an automation
          </CardTitle>
          <CardDescription>
            Tell AI what should happen automatically. When a lead comes in or someone chats, the AI will configure the workflow for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="gap-2" onClick={handleAskAi}>
            <Sparkles className="h-4 w-4" />
            Ask AI to create this automation for me
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Your automations
          </CardTitle>
          <CardDescription>
            View and manage automations in Developer Mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/dashboard/automations">Open automations in Developer Mode</Link>
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
