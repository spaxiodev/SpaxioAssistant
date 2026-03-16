'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, MessageCircle, Code } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

export function SimpleInstallPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const handleAskAi = () => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, 'Add my chat widget to my website. Give me the install code and tell me where to paste it.');
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Set up your chatbot</h1>
        <p className="text-muted-foreground">
          Add the chat widget to your website so visitors can talk to your AI assistant.
        </p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Let AI do it for you
          </CardTitle>
          <CardDescription>
            The AI can guide you through setup and give you the exact code to paste on your site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="gap-2" onClick={handleAskAi}>
            <Sparkles className="h-4 w-4" />
            Ask AI to add my widget
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Get your install code
          </CardTitle>
          <CardDescription>
            Copy the code and paste it on your website. Need more options? Use Developer Mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/dashboard/install">
              Open install code in Developer Mode
            </Link>
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
