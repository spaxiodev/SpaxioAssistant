'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Loader2,
  Save,
  BarChart3,
  Package,
  Code,
  Sparkles,
  Lock,
  ChevronUp,
  ChevronDown,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/components/intl-link';
import type { FeatureKey } from '@/lib/plan-config';
import type { PriorityKey } from '@/lib/ai-search/types';

type SettingsPayload = {
  enabled: boolean;
  display_mode: string;
  search_mode: string;
  relevance_weight: number;
  profit_weight: number;
  promotion_weight: number;
  inventory_weight: number;
  popularity_weight: number;
  use_custom_boost: boolean;
  hide_out_of_stock: boolean;
  priority_order: PriorityKey[];
  include_site_content: boolean;
  quick_prompts: string[];
};

const PRIORITY_KEYS: PriorityKey[] = ['promoted', 'high_margin', 'overstock', 'newest', 'popular'];

const priorityLabelKey = (k: PriorityKey) => {
  const map: Record<PriorityKey, string> = {
    promoted: 'aiSearchPriorityPromoted',
    high_margin: 'aiSearchPriorityHighMargin',
    overstock: 'aiSearchPriorityOverstock',
    newest: 'aiSearchPriorityNewest',
    popular: 'aiSearchPriorityPopular',
  };
  return map[k];
};

type Props = {
  featureAccess?: Partial<Record<FeatureKey, boolean>>;
};

export function AiSearchDashboard({ featureAccess }: Props) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [locked, setLocked] = useState(() => featureAccess?.ai_search === false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [productsJson, setProductsJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importPageUrl, setImportPageUrl] = useState('');
  const [urlImporting, setUrlImporting] = useState(false);
  const [replaceCatalogForUrl, setReplaceCatalogForUrl] = useState(false);
  const [urlImportMessage, setUrlImportMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/ai-search/settings');
      if (!res.ok) return;
      const data = await res.json();
      setWidgetId(data.widgetId ?? null);
      if (data.featureAccess && typeof data.featureAccess.ai_search === 'boolean') {
        setLocked(data.featureAccess.ai_search === false);
      }
      if (data.settings) {
        const po = Array.isArray(data.settings.priority_order)
          ? (data.settings.priority_order as string[]).filter((k): k is PriorityKey =>
              PRIORITY_KEYS.includes(k as PriorityKey)
            )
          : PRIORITY_KEYS;
        setSettings({
          enabled: Boolean(data.settings.enabled),
          display_mode: data.settings.display_mode ?? 'modal',
          search_mode: data.settings.search_mode ?? 'balanced',
          relevance_weight: Number(data.settings.relevance_weight ?? 1),
          profit_weight: Number(data.settings.profit_weight ?? 0.25),
          promotion_weight: Number(data.settings.promotion_weight ?? 0.35),
          inventory_weight: Number(data.settings.inventory_weight ?? 0.2),
          popularity_weight: Number(data.settings.popularity_weight ?? 0.25),
          use_custom_boost: data.settings.use_custom_boost !== false,
          hide_out_of_stock: data.settings.hide_out_of_stock !== false,
          priority_order: po.length ? po : PRIORITY_KEYS,
          include_site_content: Boolean(data.settings.include_site_content),
          quick_prompts: Array.isArray(data.settings.quick_prompts) ? data.settings.quick_prompts : [],
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    if (!settings || locked) return;
    setSaving(true);
    try {
      await fetch('/api/dashboard/ai-search/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } finally {
      setSaving(false);
    }
  };

  const loadAnalytics = async () => {
    const res = await fetch('/api/dashboard/ai-search/analytics');
    if (res.ok) setAnalytics(await res.json());
  };

  const importFromWebsiteUrl = async () => {
    if (locked || !importPageUrl.trim()) return;
    setUrlImporting(true);
    setUrlImportMessage(null);
    try {
      const res = await fetch('/api/dashboard/ai-search/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: importPageUrl.trim(),
          replaceExisting: replaceCatalogForUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUrlImportMessage(data.error ?? 'Import failed');
        return;
      }
      const n = typeof data.inserted === 'number' ? data.inserted : 0;
      const method = data.method === 'openai' ? t('aiSearchImportMethodAi') : t('aiSearchImportMethodJsonLd');
      setUrlImportMessage(t('aiSearchImportUrlSuccess', { count: n, method }));
    } catch {
      setUrlImportMessage(t('aiSearchImportUrlError'));
    } finally {
      setUrlImporting(false);
    }
  };

  const importProducts = async () => {
    if (locked) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(productsJson);
    } catch {
      return;
    }
    const products = Array.isArray(parsed) ? parsed : (parsed as { products?: unknown }).products;
    if (!Array.isArray(products)) return;
    setImporting(true);
    try {
      await fetch('/api/dashboard/ai-search/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });
      setProductsJson('');
    } finally {
      setImporting(false);
    }
  };

  const movePriority = (index: number, dir: -1 | 1) => {
    if (!settings) return;
    const next = [...settings.priority_order];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setSettings({ ...settings, priority_order: next });
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {tCommon('loading')}
      </div>
    );
  }

  const embedSnippet =
    typeof window !== 'undefined' && widgetId
      ? `<script src="${window.location.origin}/embed/ai-search.js" data-widget-id="${widgetId}" async></script>`
      : `<script src="https://YOUR_APP_URL/embed/ai-search.js" data-widget-id="YOUR_WIDGET_ID" async></script>`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-7 w-7 text-primary" />
            {t('aiSearchTitle')}
          </h1>
          <p className="text-muted-foreground max-w-2xl">{t('aiSearchDescription')}</p>
        </div>
        {locked && (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3.5 w-3.5" />
            <Link href="/dashboard/billing" className="underline-offset-4 hover:underline">
              {t('upgrade')}
            </Link>
          </Badge>
        )}
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="settings" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            {t('aiSearchTabSettings')}
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1.5">
            <Package className="h-4 w-4" />
            {t('aiSearchTabCatalog')}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5" onClick={() => void loadAnalytics()}>
            <BarChart3 className="h-4 w-4" />
            {t('aiSearchTabAnalytics')}
          </TabsTrigger>
          <TabsTrigger value="embed" className="gap-1.5">
            <Code className="h-4 w-4" />
            {t('aiSearchTabEmbed')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>{t('aiSearchSectionGeneral')}</CardTitle>
              <CardDescription>{t('aiSearchSectionGeneralHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <div>
                  <Label>{t('aiSearchEnabled')}</Label>
                  <p className="text-sm text-muted-foreground">{t('aiSearchEnabledHint')}</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  disabled={locked}
                  onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('aiSearchDisplayMode')}</Label>
                  <Select
                    disabled={locked}
                    value={settings.display_mode}
                    onValueChange={(v) => setSettings({ ...settings, display_mode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replace_search">{t('aiSearchDisplayReplace')}</SelectItem>
                      <SelectItem value="beside_search">{t('aiSearchDisplayBeside')}</SelectItem>
                      <SelectItem value="modal">{t('aiSearchDisplayModal')}</SelectItem>
                      <SelectItem value="widget_only">{t('aiSearchDisplayWidget')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('aiSearchMode')}</Label>
                  <Select
                    disabled={locked}
                    value={settings.search_mode}
                    onValueChange={(v) => setSettings({ ...settings, search_mode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">{t('aiSearchModeStrict')}</SelectItem>
                      <SelectItem value="balanced">{t('aiSearchModeBalanced')}</SelectItem>
                      <SelectItem value="broad">{t('aiSearchModeBroad')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 px-4 py-3">
                <div>
                  <Label>{t('aiSearchHideOos')}</Label>
                  <p className="text-sm text-muted-foreground">{t('aiSearchHideOosHint')}</p>
                </div>
                <Switch
                  checked={settings.hide_out_of_stock}
                  disabled={locked}
                  onCheckedChange={(v) => setSettings({ ...settings, hide_out_of_stock: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 px-4 py-3">
                <div>
                  <Label>{t('aiSearchCustomBoost')}</Label>
                  <p className="text-sm text-muted-foreground">{t('aiSearchCustomBoostHint')}</p>
                </div>
                <Switch
                  checked={settings.use_custom_boost}
                  disabled={locked}
                  onCheckedChange={(v) => setSettings({ ...settings, use_custom_boost: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 px-4 py-3">
                <div>
                  <Label>{t('aiSearchIncludeSiteContent')}</Label>
                  <p className="text-sm text-muted-foreground">{t('aiSearchIncludeSiteContentHint')}</p>
                </div>
                <Switch
                  checked={settings.include_site_content}
                  disabled={locked}
                  onCheckedChange={(v) => setSettings({ ...settings, include_site_content: v })}
                />
              </div>

              <div className="border-t border-border/60 pt-6">
                <h3 className="font-semibold mb-1">{t('aiSearchWeights')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('aiSearchWeightsHint')}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ['relevance_weight', t('aiSearchWeightRelevance')],
                      ['profit_weight', t('aiSearchWeightProfit')],
                      ['promotion_weight', t('aiSearchWeightPromotion')],
                      ['inventory_weight', t('aiSearchWeightInventory')],
                      ['popularity_weight', t('aiSearchWeightPopularity')],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type="number"
                        step="0.05"
                        min={0}
                        max={2}
                        disabled={locked}
                        value={settings[key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [key]: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-1">{t('aiSearchPriorityTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t('aiSearchPriorityHint')}</p>
                <ul className="space-y-2">
                  {settings.priority_order.map((k, i) => (
                    <li
                      key={k}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2"
                    >
                      <span className="text-sm font-medium">{t(priorityLabelKey(k))}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={locked || i === 0}
                          onClick={() => movePriority(i, -1)}
                          aria-label="Up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={locked || i === settings.priority_order.length - 1}
                          onClick={() => movePriority(i, 1)}
                          aria-label="Down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Label>{t('aiSearchQuickPrompts')}</Label>
                <p className="text-sm text-muted-foreground">{t('aiSearchQuickPromptsHint')}</p>
                <Textarea
                  disabled={locked}
                  placeholder={t('aiSearchQuickPromptsPlaceholder')}
                  value={settings.quick_prompts.join('\n')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      quick_prompts: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 12),
                    })
                  }
                  rows={4}
                />
              </div>

              <Button disabled={locked || saving} onClick={() => void saveSettings()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                {t('aiSearchImportUrlTitle')}
              </CardTitle>
              <CardDescription>{t('aiSearchImportUrlHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                disabled={locked}
                type="url"
                placeholder={t('aiSearchImportUrlPlaceholder')}
                value={importPageUrl}
                onChange={(e) => setImportPageUrl(e.target.value)}
              />
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 px-4 py-3">
                <div>
                  <Label>{t('aiSearchImportUrlReplace')}</Label>
                  <p className="text-sm text-muted-foreground">{t('aiSearchImportUrlReplaceHint')}</p>
                </div>
                <Switch
                  checked={replaceCatalogForUrl}
                  disabled={locked}
                  onCheckedChange={setReplaceCatalogForUrl}
                />
              </div>
              <Button
                type="button"
                disabled={locked || urlImporting || !importPageUrl.trim()}
                onClick={() => void importFromWebsiteUrl()}
                className="gap-2"
              >
                {urlImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {t('aiSearchImportUrlRun')}
              </Button>
              {urlImportMessage && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{urlImportMessage}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('aiSearchCatalogTitle')}</CardTitle>
              <CardDescription>{t('aiSearchCatalogHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                disabled={locked}
                placeholder={t('aiSearchCatalogPlaceholder')}
                value={productsJson}
                onChange={(e) => setProductsJson(e.target.value)}
                rows={14}
                className="font-mono text-sm"
              />
              <Button disabled={locked || importing} onClick={() => void importProducts()}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : t('aiSearchCatalogImport')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('aiSearchAnalyticsTitle')}</CardTitle>
              <CardDescription>{t('aiSearchAnalyticsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">{t('aiSearchAnQueries')}</p>
                    <p className="text-2xl font-bold">{String(analytics.total_queries ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">{t('aiSearchAnClicks')}</p>
                    <p className="text-2xl font-bold">{String(analytics.total_clicks ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">{t('aiSearchAnNoResults')}</p>
                    <p className="text-2xl font-bold">{String(analytics.no_result_searches ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">{t('aiSearchAnMargin')}</p>
                    <p className="text-2xl font-bold">
                      {String((analytics.margin_impact as { estimated_margin_usd?: number })?.estimated_margin_usd ?? 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('aiSearchAnalyticsOpen')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('aiSearchEmbedTitle')}</CardTitle>
              <CardDescription>{t('aiSearchEmbedHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('aiSearchWidgetId')}:{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{widgetId ?? '—'}</code>
              </p>
              <Textarea readOnly value={embedSnippet} rows={4} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">{t('aiSearchEmbedNote')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
