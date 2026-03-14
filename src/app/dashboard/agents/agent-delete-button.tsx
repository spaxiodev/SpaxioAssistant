'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type AgentDeleteButtonProps = {
  agentId: string;
  agentName: string;
};

export function AgentDeleteButton({ agentId, agentName }: AgentDeleteButtonProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const message = t('deleteAgentConfirm', { name: agentName });
    if (!confirm(message)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete agent');
      }
      router.push('/dashboard/agents');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t('deleteAgentError'));
      setIsDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label={t('deleteAgent')}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {isDeleting ? t('deleting') : t('deleteAgent')}
    </Button>
  );
}
