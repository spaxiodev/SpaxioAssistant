'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Calculator, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import { INDUSTRY_TEMPLATES } from '@/lib/quote-pricing/industry-templates';

type Profile = {
  id: string;
  name: string;
  industry_type: string | null;
  is_default: boolean;
  currency: string;
  pricing_mode: string;
};

export function PricingProfilesList({ profiles }: { profiles: Profile[] }) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  async function createFromTemplate(industryType: string) {
    setCreating(true);
    try {
      const res = await fetch('/api/dashboard/pricing-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: INDUSTRY_TEMPLATES.find((x) => x.industry_type === industryType)?.name ?? industryType,
          industry_type: industryType,
          from_template: industryType,
          is_default: profiles.length === 0,
        }),
      });
      const data = await res.json();
      if (data.profile?.id) {
        router.push(`/dashboard/pricing/${data.profile.id}`);
        return;
      }
      throw new Error(data.error ?? 'Failed to create');
    } catch (e) {
      console.error(e);
      setCreating(false);
    } finally {
      setCreating(false);
      setTemplateOpen(false);
    }
  }

  async function createEmpty() {
    setCreating(true);
    try {
      const res = await fetch('/api/dashboard/pricing-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Custom pricing',
          is_default: profiles.length === 0,
        }),
      });
      const data = await res.json();
      if (data.profile?.id) {
        router.push(`/dashboard/pricing/${data.profile.id}`);
        return;
      }
      throw new Error(data.error ?? 'Failed to create');
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setTemplateOpen((v) => !v)} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create from template
        </Button>
        <Button variant="outline" onClick={createEmpty} disabled={creating}>
          Create custom
        </Button>
      </div>

      {templateOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose industry template</CardTitle>
            <CardDescription>Start with pre-configured variables and rules you can edit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {INDUSTRY_TEMPLATES.map((tmpl) => (
              <Button
                key={tmpl.industry_type}
                variant="secondary"
                size="sm"
                onClick={() => createFromTemplate(tmpl.industry_type)}
                disabled={creating}
              >
                {tmpl.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No pricing profiles yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one from a template (e.g. Web Design, Landscaping) or build your own. Then link it to a Quote AI page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {profiles.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.industry_type ?? 'Custom'} · {p.currency} · {p.pricing_mode.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {p.is_default && (
                      <Badge variant="secondary" className="shrink-0">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/pricing/${p.id}`}>Edit & preview</Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/pricing/${p.id}`}>{t('preview')}</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Link a pricing profile to a Quote AI page in AI Pages → edit page → Pricing profile. The AI will collect variables and calculate estimates using these rules.
      </p>
    </div>
  );
}
