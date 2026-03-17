'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calculator, ArrowLeft, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { QuotePricingProfileRow, QuoteServiceRow, QuotePricingVariableRow, QuotePricingRuleRow } from '@/lib/quote-pricing/types';
import { VARIABLE_TYPES, RULE_TYPES } from '@/lib/quote-pricing/types';

type Props = {
  profile: QuotePricingProfileRow;
  services: QuoteServiceRow[];
  variables: QuotePricingVariableRow[];
  rules: QuotePricingRuleRow[];
};

export function PricingProfileDetail({ profile, services, variables, rules }: Props) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [currentVariables, setCurrentVariables] = useState<QuotePricingVariableRow[]>(variables);
  const [currentRules, setCurrentRules] = useState<QuotePricingRuleRow[]>(rules);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<{
    total: number;
    estimate_low?: number | null;
    estimate_high?: number | null;
    line_items: { rule_name: string; amount: number; label?: string }[];
    missing_required: string[];
    valid: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [addVariableLoading, setAddVariableLoading] = useState(false);
  const [addRuleLoading, setAddRuleLoading] = useState(false);
  // Add variable form
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');
  const [newVarType, setNewVarType] = useState<string>('number');
  const [newVarRequired, setNewVarRequired] = useState(false);
  const [newVarUnitLabel, setNewVarUnitLabel] = useState('');
  const [newVarDefault, setNewVarDefault] = useState('');
  // Add rule form (simple: fixed_price or per_unit or addon)
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState<string>('fixed_price');
  const [newRuleAmount, setNewRuleAmount] = useState('');
  const [newRulePricePerUnit, setNewRulePricePerUnit] = useState('');
  const [newRuleVariableKey, setNewRuleVariableKey] = useState('');
  const [newRuleWhenValue, setNewRuleWhenValue] = useState('true');
  const [newRuleMinAmount, setNewRuleMinAmount] = useState('');
  const [newRuleLabel, setNewRuleLabel] = useState('');

  async function deleteRule(ruleId: string) {
    if (!ruleId) return;
    setDeletingRuleId(ruleId);
    try {
      const res = await fetch(`/api/dashboard/pricing-rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        console.error('Failed to delete rule');
        return;
      }
      setCurrentRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function addVariable() {
    const key = newVarKey.trim().replace(/\s+/g, '_') || undefined;
    if (!key) return;
    setAddVariableLoading(true);
    try {
      const res = await fetch('/api/dashboard/pricing-variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing_profile_id: profile.id,
          service_id: services.length === 1 ? services[0]?.id : null,
          key,
          label: newVarLabel.trim() || key,
          variable_type: newVarType,
          required: newVarRequired,
          unit_label: newVarUnitLabel.trim() || null,
          default_value: newVarDefault.trim() || null,
          sort_order: currentVariables.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add variable');
      if (data.variable) {
        setCurrentVariables((prev) => [...prev, data.variable]);
        setNewVarKey('');
        setNewVarLabel('');
        setNewVarUnitLabel('');
        setNewVarDefault('');
        setShowAddVariable(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddVariableLoading(false);
    }
  }

  async function addRule() {
    const name = newRuleName.trim() || 'Rule';
    setAddRuleLoading(true);
    try {
      let config: Record<string, unknown> = {};
      if (newRuleType === 'fixed_price') {
        config = { amount: Number(newRuleAmount) || 0, label: newRuleLabel.trim() || undefined };
      } else if (newRuleType === 'per_unit') {
        config = {
          variable_key: newRuleVariableKey || currentVariables[0]?.key,
          price_per_unit: Number(newRulePricePerUnit) || 0,
          unit_label: undefined,
          label: newRuleLabel.trim() || undefined,
        };
      } else if (newRuleType === 'addon') {
        const whenVal = newRuleWhenValue === 'true' ? true : newRuleWhenValue === 'false' ? false : newRuleWhenValue;
        config = {
          variable_key: newRuleVariableKey || currentVariables[0]?.key,
          when_value: whenVal,
          amount: Number(newRuleAmount) || 0,
          label: newRuleLabel.trim() || undefined,
        };
      } else if (newRuleType === 'minimum_charge') {
        config = { minimum_amount: Number(newRuleMinAmount) || 0, label: newRuleLabel.trim() || undefined };
      }
      const res = await fetch('/api/dashboard/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing_profile_id: profile.id,
          service_id: services.length === 1 ? services[0]?.id : null,
          rule_type: newRuleType,
          name,
          config,
          sort_order: currentRules.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add rule');
      if (data.rule) {
        setCurrentRules((prev) => [...prev, data.rule]);
        setNewRuleName('');
        setNewRuleAmount('');
        setNewRulePricePerUnit('');
        setNewRuleVariableKey('');
        setNewRuleMinAmount('');
        setNewRuleLabel('');
        setShowAddRule(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddRuleLoading(false);
    }
  }

  async function saveRuleConfig(ruleId: string, config: Record<string, unknown>) {
    setSavingRuleId(ruleId);
    try {
      const res = await fetch(`/api/dashboard/pricing-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      if (data.rule) {
        setCurrentRules((prev) => prev.map((r) => (r.id === ruleId ? data.rule : r)));
        setEditingRuleId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRuleId(null);
    }
  }

  async function runPreview() {
    setLoading(true);
    setPreviewResult(null);
    try {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(inputs)) {
        if (v === 'true') body[k] = true;
        else if (v === 'false') body[k] = false;
        else if (v === '') continue;
        else if (/^\d+$/.test(v)) body[k] = Number(v);
        else if (/^\d+\.\d+$/.test(v)) body[k] = parseFloat(v);
        else body[k] = v;
      }
      const res = await fetch(`/api/dashboard/pricing-profiles/${profile.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: body,
          service_id: services.length === 1 ? services[0]!.id : null,
        }),
      });
      const data = await res.json();
      setPreviewResult({
        total: data.total ?? 0,
        estimate_low: data.estimate_low,
        estimate_high: data.estimate_high,
        line_items: data.applied_rules ?? [],
        missing_required: data.missing_required ?? [],
        valid: data.valid ?? false,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pricing" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.industry_type ?? 'Custom'} · {profile.currency} · {profile.pricing_mode.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variables</CardTitle>
            <CardDescription>Inputs the AI collects from the customer. Add variables for custom profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {currentVariables.map((v) => (
                <li key={v.id}>
                  <span className="font-medium">{v.label}</span>
                  <span className="text-muted-foreground"> ({v.key}, {v.variable_type})</span>
                  {v.required && <Badge variant="outline" className="ml-1 text-xs">required</Badge>}
                </li>
              ))}
              {currentVariables.length === 0 && (
                <p className="text-muted-foreground">{t('pricingNoVariablesYet')}</p>
              )}
            </ul>
            <div className="border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowAddVariable((x) => !x)}>
                {showAddVariable ? <ChevronUp className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
                {t('pricingAddVariable')}
              </Button>
              {showAddVariable && (
                <div className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>{t('pricingVariableKey')}</Label>
                      <Input
                        value={newVarKey}
                        onChange={(e) => setNewVarKey(e.target.value)}
                        placeholder="e.g. number_of_pages"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>{t('pricingVariableLabel')}</Label>
                      <Input
                        value={newVarLabel}
                        onChange={(e) => setNewVarLabel(e.target.value)}
                        placeholder="Number of pages"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label>{t('pricingVariableType')}</Label>
                      <Select value={newVarType} onValueChange={setNewVarType}>
                        <SelectTrigger className="mt-1 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VARIABLE_TYPES.map((vt) => (
                            <SelectItem key={vt} value={vt}>
                              {vt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="newVarRequired"
                        checked={newVarRequired}
                        onChange={(e) => setNewVarRequired(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="newVarRequired">{t('pricingRequired')}</Label>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>{t('pricingUnitLabel')}</Label>
                      <Input
                        value={newVarUnitLabel}
                        onChange={(e) => setNewVarUnitLabel(e.target.value)}
                        placeholder="pages, sq ft"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>{t('pricingDefaultValue')}</Label>
                      <Input
                        value={newVarDefault}
                        onChange={(e) => setNewVarDefault(e.target.value)}
                        placeholder="0 or false"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={addVariable} disabled={addVariableLoading || !newVarKey.trim()}>
                    {addVariableLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('pricingAddVariable')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rules</CardTitle>
            <CardDescription>Applied in order. Edit costs for template rules or add rules for custom profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              {currentRules.map((r) => (
                <li key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground"> ({r.rule_type})</span>
                      {['fixed_price', 'per_unit', 'addon', 'minimum_charge'].includes(r.rule_type) && (
                        <span className="ml-2 text-muted-foreground">
                          — {r.rule_type === 'fixed_price' && typeof (r.config as { amount?: number })?.amount === 'number' && `$${(r.config as { amount?: number }).amount}`}
                          {r.rule_type === 'per_unit' && typeof (r.config as { price_per_unit?: number })?.price_per_unit === 'number' && ` $${(r.config as { price_per_unit?: number }).price_per_unit}/unit`}
                          {r.rule_type === 'addon' && typeof (r.config as { amount?: number })?.amount === 'number' && ` +$${(r.config as { amount?: number }).amount}`}
                          {r.rule_type === 'minimum_charge' && typeof (r.config as { minimum_amount?: number })?.minimum_amount === 'number' && ` min $${(r.config as { minimum_amount?: number }).minimum_amount}`}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setEditingRuleId((id) => (id === r.id ? null : r.id))}
                      >
                        {t('pricingEditCost')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        disabled={deletingRuleId === r.id}
                        onClick={() => deleteRule(r.id)}
                      >
                        {deletingRuleId === r.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        Delete
                      </Button>
                    </div>
                  </div>
                  {editingRuleId === r.id && (
                    <RuleConfigEditor
                      rule={r}
                      variables={currentVariables}
                      t={t}
                      saving={savingRuleId === r.id}
                      onSave={(config) => saveRuleConfig(r.id, config)}
                      onCancel={() => setEditingRuleId(null)}
                    />
                  )}
                </li>
              ))}
              {currentRules.length === 0 && (
                <p className="text-muted-foreground">{t('pricingNoRulesYet')}</p>
              )}
            </ul>
            <div className="border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowAddRule((x) => !x)}>
                {showAddRule ? <ChevronUp className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
                {t('pricingAddRule')}
              </Button>
              {showAddRule && (
                <div className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div>
                    <Label>{t('pricingRuleName')}</Label>
                    <Input
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="Base fee"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{t('pricingRuleType')}</Label>
                    <Select value={newRuleType} onValueChange={setNewRuleType}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map((rt) => (
                          <SelectItem key={rt} value={rt}>
                            {rt.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newRuleType === 'fixed_price' && (
                    <div>
                      <Label>{t('pricingAmount')}</Label>
                      <Input
                        type="number"
                        value={newRuleAmount}
                        onChange={(e) => setNewRuleAmount(e.target.value)}
                        className="mt-1 w-32"
                      />
                    </div>
                  )}
                  {newRuleType === 'per_unit' && (
                    <>
                      <div>
                        <Label>{t('pricingVariableKeyRule')}</Label>
                        <Select value={newRuleVariableKey || currentVariables[0]?.key} onValueChange={setNewRuleVariableKey}>
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Select variable" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentVariables.map((v) => (
                              <SelectItem key={v.id} value={v.key}>
                                {v.label} ({v.key})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('pricingPricePerUnit')}</Label>
                        <Input
                          type="number"
                          value={newRulePricePerUnit}
                          onChange={(e) => setNewRulePricePerUnit(e.target.value)}
                          className="mt-1 w-32"
                        />
                      </div>
                    </>
                  )}
                  {newRuleType === 'addon' && (
                    <>
                      <div>
                        <Label>{t('pricingVariableKeyRule')}</Label>
                        <Select value={newRuleVariableKey || currentVariables[0]?.key} onValueChange={setNewRuleVariableKey}>
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Select variable" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentVariables.map((v) => (
                              <SelectItem key={v.id} value={v.key}>
                                {v.label} ({v.key})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('pricingWhenValue')}</Label>
                        <Input
                          value={newRuleWhenValue}
                          onChange={(e) => setNewRuleWhenValue(e.target.value)}
                          placeholder="true or false"
                          className="mt-1 w-32"
                        />
                      </div>
                      <div>
                        <Label>{t('pricingAmount')}</Label>
                        <Input
                          type="number"
                          value={newRuleAmount}
                          onChange={(e) => setNewRuleAmount(e.target.value)}
                          className="mt-1 w-32"
                        />
                      </div>
                    </>
                  )}
                  {newRuleType === 'minimum_charge' && (
                    <div>
                      <Label>{t('pricingMinimumAmount')}</Label>
                      <Input
                        type="number"
                        value={newRuleMinAmount}
                        onChange={(e) => setNewRuleMinAmount(e.target.value)}
                        className="mt-1 w-32"
                      />
                    </div>
                  )}
                  <div>
                    <Label>{t('pricingLabel')}</Label>
                    <Input
                      value={newRuleLabel}
                      onChange={(e) => setNewRuleLabel(e.target.value)}
                      className="mt-1 w-48"
                    />
                  </div>
                  <Button size="sm" onClick={addRule} disabled={addRuleLoading}>
                    {addRuleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('pricingAddRule')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Test estimate
          </CardTitle>
          <CardDescription>Enter sample values and see the calculated result.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {currentVariables.map((v) => (
              <div key={v.id}>
                <Label htmlFor={v.id}>{v.label}</Label>
                <Input
                  id={v.id}
                  placeholder={v.variable_type === 'boolean' ? 'true / false' : v.unit_label ?? ''}
                  value={inputs[v.key] ?? ''}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [v.key]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <Button onClick={runPreview} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Calculate
          </Button>
          {previewResult && (
            <div className="rounded-lg border bg-muted/30 p-4">
              {previewResult.missing_required.length > 0 && (
                <p className="mb-2 text-sm text-amber-600">Missing: {previewResult.missing_required.join(', ')}</p>
              )}
              {previewResult.line_items.length > 0 && (
                <ul className="mb-2 space-y-1 text-sm">
                  {previewResult.line_items.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-muted-foreground">{item.label ?? item.rule_name}</span>
                      <span>${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>
                  {previewResult.estimate_low != null && previewResult.estimate_high != null
                    ? `$${Number(previewResult.estimate_low).toLocaleString('en-US', { minimumFractionDigits: 2 })} – $${Number(previewResult.estimate_high).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : `$${Number(previewResult.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Link this profile to a Quote AI page in AI Pages so the assistant uses these rules. Visitors can fill the quote form in the widget and get an estimate on the spot.
      </p>
    </div>
  );
}

function RuleConfigEditor({
  rule,
  variables,
  t,
  saving,
  onSave,
  onCancel,
}: {
  rule: QuotePricingRuleRow;
  variables: QuotePricingVariableRow[];
  t: (key: string) => string;
  saving: boolean;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const cfg = (rule.config || {}) as Record<string, unknown>;
  const [amount, setAmount] = useState(String((cfg.amount as number) ?? ''));
  const [pricePerUnit, setPricePerUnit] = useState(String((cfg.price_per_unit as number) ?? ''));
  const [variableKey, setVariableKey] = useState((cfg.variable_key as string) ?? variables[0]?.key ?? '');
  const [whenValue, setWhenValue] = useState(String(cfg.when_value ?? 'true'));
  const [minimumAmount, setMinimumAmount] = useState(String((cfg.minimum_amount as number) ?? ''));
  const [label, setLabel] = useState((cfg.label as string) ?? '');

  const handleSave = () => {
    if (rule.rule_type === 'fixed_price') {
      onSave({ ...cfg, amount: Number(amount) || 0, label: label.trim() || undefined });
    } else if (rule.rule_type === 'per_unit') {
      onSave({ ...cfg, variable_key: variableKey, price_per_unit: Number(pricePerUnit) || 0, label: label.trim() || undefined });
    } else if (rule.rule_type === 'addon') {
      const whenVal = whenValue === 'true' ? true : whenValue === 'false' ? false : whenValue;
      onSave({ ...cfg, variable_key: variableKey, when_value: whenVal, amount: Number(amount) || 0, label: label.trim() || undefined });
    } else if (rule.rule_type === 'minimum_charge') {
      onSave({ ...cfg, minimum_amount: Number(minimumAmount) || 0, label: label.trim() || undefined });
    } else {
      onSave(cfg);
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {rule.rule_type === 'fixed_price' && (
        <div>
          <Label>{t('pricingAmount')}</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-32" />
        </div>
      )}
      {rule.rule_type === 'per_unit' && (
        <>
          <div>
            <Label>{t('pricingVariableKeyRule')}</Label>
            <Select value={variableKey || variables[0]?.key} onValueChange={setVariableKey}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variables.map((v) => (
                  <SelectItem key={v.id} value={v.key}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('pricingPricePerUnit')}</Label>
            <Input type="number" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} className="mt-1 w-32" />
          </div>
        </>
      )}
      {rule.rule_type === 'addon' && (
        <>
          <div>
            <Label>{t('pricingVariableKeyRule')}</Label>
            <Select value={variableKey || variables[0]?.key} onValueChange={setVariableKey}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variables.map((v) => (
                  <SelectItem key={v.id} value={v.key}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('pricingWhenValue')}</Label>
            <Input value={whenValue} onChange={(e) => setWhenValue(e.target.value)} className="mt-1 w-24" />
          </div>
          <div>
            <Label>{t('pricingAmount')}</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-32" />
          </div>
        </>
      )}
      {rule.rule_type === 'minimum_charge' && (
        <div>
          <Label>{t('pricingMinimumAmount')}</Label>
          <Input type="number" value={minimumAmount} onChange={(e) => setMinimumAmount(e.target.value)} className="mt-1 w-32" />
        </div>
      )}
      <div>
        <Label>{t('pricingLabel')}</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-48" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('pricingSaveRule')}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          {t('pricingCancel')}
        </Button>
      </div>
    </div>
  );
}
