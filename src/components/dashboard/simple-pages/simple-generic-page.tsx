'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

type SimpleGenericPageProps = {
  title: string;
  askAiPrompt: string;
  pathname: string;
};

export function SimpleGenericPage({ title, askAiPrompt, pathname }: SimpleGenericPageProps) {
  const router = useRouter();
  const { setMode } = useViewMode();

  const handleAskAi = () => {
    if (askAiPrompt) {
      try {
        window.localStorage.setItem(INTENT_STORAGE_KEY, askAiPrompt);
      } catch {
        // ignore
      }
      router.push('/dashboard/ai-setup');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">
          Use Simple Mode for guided setup, or switch to Developer Mode for full control.
        </p>
      </div>

      {askAiPrompt && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask AI to do this for you
            </CardTitle>
            <CardDescription>
              Tell Spaxio what you want and the AI will configure this section for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="gap-2" onClick={handleAskAi}>
              <Sparkles className="h-4 w-4" />
              Ask AI to do this for me
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need more control?</CardTitle>
          <CardDescription>
            Developer Mode gives you access to all settings and advanced options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="gap-2" onClick={() => setMode('developer')}>
            <Code className="h-4 w-4" />
            Switch to Developer Mode
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
