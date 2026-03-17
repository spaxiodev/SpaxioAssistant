'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle, Copy } from 'lucide-react';
import { useViewMode } from '@/contexts/view-mode-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SimplePageHeader,
  SimpleActionCard,
  SimpleAiAssistPanel,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';

export function SimpleInstallPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Install your widget"
        description="Copy the code snippet for your website and preview how it looks."
        icon={<MessageCircle className="h-6 w-6" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Install code</CardTitle>
          <CardDescription>
            Copy a short script tag and paste it into your website HTML just before the closing {'</body>'} tag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full gap-2" onClick={() => openInDeveloperMode('/dashboard/install')}>
            <Copy className="h-4 w-4" />
            Open Install code
          </Button>
        </CardContent>
      </Card>

      <SimpleAiAssistPanel
        title="AI can help"
        description="Get a recommendation for the best way to add your assistant to your site."
        actions={[
          {
            label: 'Recommend best setup',
            onClick: () => {
              try {
                window.localStorage.setItem('spaxio-ai-setup-intent', 'I want to add my chat assistant to my website. Should I use the widget or a full page? Give me the install code.');
              } catch {
                // ignore
              }
              router.push('/dashboard/ai-setup');
            },
          },
          {
            label: 'Help me choose widget vs full page',
            onClick: () => {
              try {
                window.localStorage.setItem('spaxio-ai-setup-intent', 'Explain the difference between the chat widget and a full-page chat. Which is better for my site?');
              } catch {
                // ignore
              }
              router.push('/dashboard/ai-setup');
            },
          },
        ]}
      />

      <SimpleDeveloperModeLink
        developerPath="/dashboard/install"
        linkLabel="Open Install & embed code in Developer Mode"
      />
    </div>
  );
}
