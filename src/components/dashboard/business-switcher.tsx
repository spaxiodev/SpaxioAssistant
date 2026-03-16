'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, ChevronDown } from 'lucide-react';

export type OrganizationOption = {
  id: string;
  name: string;
  business_name: string | null;
  display_name: string;
  is_owner: boolean;
  is_current: boolean;
};

export function BusinessSwitcher() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const fetchList = useCallback(() => {
    fetch('/api/organization/list')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.organizations)) setOrganizations(data.organizations);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/organization/list')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.organizations)) {
          setOrganizations(data.organizations);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = () => fetchList();
    window.addEventListener('businesses-updated', handler);
    return () => window.removeEventListener('businesses-updated', handler);
  }, [fetchList]);

  const current = organizations.find((o) => o.is_current) ?? organizations[0];

  async function handleSwitch(orgId: string) {
    if (orgId === current?.id) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/organization/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSwitching(false);
    }
  }

  if (loading || organizations.length === 0) return null;
  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{current?.display_name ?? ''}</span>
        <span className="text-muted-foreground">
          {current?.is_owner ? t('businessSwitcherYourBusiness') : t('businessSwitcherTeam')}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-border/60 bg-muted/40"
          disabled={switching}
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{current?.display_name ?? t('businessSwitcherSelectBusiness')}</span>
          <span className="text-muted-foreground">
            ({current?.is_owner ? t('businessSwitcherYourBusiness') : t('businessSwitcherTeam')})
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            disabled={org.is_current}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate">{org.display_name}</span>
            <span className="shrink-0 text-muted-foreground text-xs">
              {org.is_owner ? t('businessSwitcherYourBusiness') : t('businessSwitcherTeam')}
            </span>
            {org.is_current && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
