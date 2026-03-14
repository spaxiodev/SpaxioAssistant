'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type Agent = { id: string; name: string };

export function WidgetAgentLink({
  widgetId,
  currentAgentId,
  agents,
}: {
  widgetId: string;
  currentAgentId: string | null;
  agents: Agent[];
}) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const { toast } = useToast();

  async function onValueChange(value: string) {
    const agentId = value === '__none__' ? null : value;
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update');
      }
      toast({ title: t('installAgentLinkUpdated'), description: '' });
      router.refresh();
    } catch (err) {
      toast({
        title: t('installAgentLinkError'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
  }

  const value = currentAgentId ?? '__none__';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-foreground">{t('installWidgetAgent')}:</span>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'flex h-10 w-[220px] rounded-md border border-border bg-background px-3 py-2 text-sm',
          'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        <option value="__none__">{t('installNoAgent')}</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}
