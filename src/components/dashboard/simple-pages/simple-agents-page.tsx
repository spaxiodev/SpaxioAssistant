'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Bot, Code } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

export function SimpleAgentsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const handleAskAi = () => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, 'Build my chatbot. Set up an AI agent for my website that captures leads and answers visitor questions.');
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Set up your business AI</h1>
        <p className="text-muted-foreground">
          Your AI assistant powers the chat widget. Let Spaxio configure it for you.
        </p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask AI to build your chatbot
          </CardTitle>
          <CardDescription>
            Describe what you want your chatbot to do. The AI will create and configure your agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="gap-2" onClick={handleAskAi}>
            <Sparkles className="h-4 w-4" />
            Ask AI to build my chatbot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Your AI agents
          </CardTitle>
          <CardDescription>
            View and edit agents, or switch to Developer Mode for full control.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/dashboard/agents">Open agents in Developer Mode</Link>
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
