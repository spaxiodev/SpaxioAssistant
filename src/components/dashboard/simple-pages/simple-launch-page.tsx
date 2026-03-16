'use client';

import { Sparkles, PlayCircle, Code } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

export function SimpleLaunchPage() {
  const { setMode } = useViewMode();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Launch your chatbot</h1>
        <p className="text-muted-foreground">
          Get your widget code, preview how it looks, and deploy to your website.
        </p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ready to go live?
          </CardTitle>
          <CardDescription>
            Add the chat widget to your site from the Chat Widget page, then preview it here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button size="lg" className="gap-2" asChild>
            <Link href="/dashboard/install">
              <PlayCircle className="h-4 w-4" />
              Set up Chat Widget
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2" asChild>
            <Link href="/dashboard-preview/overview">Preview widget</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            Deployments
          </CardTitle>
          <CardDescription>
            View all deployments and embed options in Developer Mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/dashboard/deployments">Open deployments in Developer Mode</Link>
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
