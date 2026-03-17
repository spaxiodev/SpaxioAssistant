'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';
import { SimplePageHeader, SimpleDeveloperModeLink } from '@/components/dashboard/simple';

export function SimpleLaunchPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Launch your website assistant"
        description="Get your install code, preview how it looks, and go live on your website."
        icon={<PlayCircle className="h-6 w-6" />}
      />

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ready to go live?
          </CardTitle>
          <CardDescription>
            Add the widget to your site from the Install page, then preview it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button size="lg" className="gap-2" onClick={() => openInDeveloperMode('/dashboard/install')}>
            <PlayCircle className="h-4 w-4" />
            Open Install
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={() => openInDeveloperMode('/dashboard/install')}>
            Preview widget
          </Button>
        </CardContent>
      </Card>

      <SimpleDeveloperModeLink
        developerPath="/dashboard/install"
        linkLabel="Open Install in Developer Mode"
      />
    </div>
  );
}
