'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle, Copy, ExternalLink, Layout, FileText } from 'lucide-react';
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
        title="Get your assistant live"
        description="Add the chat widget to your website, create a quote or support page, or preview how it looks."
        icon={<MessageCircle className="h-6 w-6" />}
      />

      {/* Plain-language options */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SimpleActionCard
          title="Add chat widget to my site"
          description="Copy a short code snippet and paste it before the closing body tag on your site."
          icon={<MessageCircle className="h-5 w-5" />}
        >
          <Button className="w-full gap-2" onClick={() => openInDeveloperMode('/dashboard/install')}>
            <Copy className="h-4 w-4" />
            Get install code
          </Button>
        </SimpleActionCard>
        <SimpleActionCard
          title="Create a quote page"
          description="A dedicated page where visitors can request a quote."
          icon={<FileText className="h-5 w-5" />}
        >
          <Button variant="outline" className="w-full gap-2" onClick={() => openInDeveloperMode('/dashboard/install')}>
            <ExternalLink className="h-4 w-4" />
            Set up in Developer Mode
          </Button>
        </SimpleActionCard>
        <SimpleActionCard
          title="Create a support page"
          description="A page focused on help and support conversations."
          icon={<Layout className="h-5 w-5" />}
        >
          <Button variant="outline" className="w-full gap-2" onClick={() => openInDeveloperMode('/dashboard/install')}>
            <ExternalLink className="h-4 w-4" />
            Set up in Developer Mode
          </Button>
        </SimpleActionCard>
        <SimpleActionCard
          title="Preview my assistant"
          description="See how the chat widget looks on desktop and mobile before going live."
          icon={<MessageCircle className="h-5 w-5" />}
        >
          <Button variant="outline" className="w-full gap-2" onClick={() => router.push('/dashboard-preview/overview')}>
            <ExternalLink className="h-4 w-4" />
            Preview widget
          </Button>
        </SimpleActionCard>
      </div>

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
