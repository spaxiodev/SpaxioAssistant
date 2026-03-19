'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Copy, Globe, MessageSquare, Sparkles, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { NextAction } from '@/hooks/use-next-best-action';
import { useNextBestAction } from '@/hooks/use-next-best-action';
import { SimpleSetupSkeleton } from './simple-setup-skeleton';

type NextBestActionCardProps = {
  /** When true, show compact variant (e.g. for sidebar or smaller contexts) */
  compact?: boolean;
  /** When true, hide when loading (default: show skeleton) */
  hideWhenLoading?: boolean;
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  setup_assistant: Sparkles,
  add_website_info: Globe,
  install_on_website: Copy,
  test_assistant: Globe,
  view_conversations: MessageSquare,
  view_leads: Users,
};

export function NextBestActionCard({ compact, hideWhenLoading }: NextBestActionCardProps) {
  const router = useRouter();
  const { data, isLoading } = useNextBestAction();

  if (isLoading) {
    if (hideWhenLoading) return null;
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <SimpleSetupSkeleton lines={3} />
        </CardContent>
      </Card>
    );
  }

  if (!data?.action) return null;

  const action = data.action as NextAction;
  const Icon = ACTION_ICONS[action.id] ?? Sparkles;

  const handleClick = () => router.push(action.href);

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-left transition hover:bg-primary/10"
      >
        <span className="text-sm font-medium text-foreground">{action.label}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recommended next step</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
        </div>
        <Button size="lg" className="gap-2 shrink-0" onClick={handleClick}>
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
