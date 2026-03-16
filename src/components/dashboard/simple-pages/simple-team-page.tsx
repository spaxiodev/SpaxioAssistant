'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, UserPlus, Code } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

export function SimpleTeamPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const handleAskAi = () => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, 'Help me manage my team. I want to invite colleagues and set who can see leads and conversations.');
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage your team access</h1>
        <p className="text-muted-foreground">
          Invite team members and control who can see leads, conversations, and settings.
        </p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask AI to configure permissions
          </CardTitle>
          <CardDescription>
            Tell the AI who should have access and what they can do. It will suggest the right roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="gap-2" onClick={handleAskAi}>
            <Sparkles className="h-4 w-4" />
            Ask AI to configure permissions
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Team members
          </CardTitle>
          <CardDescription>
            Invite and manage team members in Developer Mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/dashboard/team">Open team in Developer Mode</Link>
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
