'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calculator, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { QuotePricingProfileRow, QuoteServiceRow, QuotePricingVariableRow, QuotePricingRuleRow } from '@/lib/quote-pricing/types';

type Props = {
  profile: QuotePricingProfileRow;
  services: QuoteServiceRow[];
  variables: QuotePricingVariableRow[];
  rules: QuotePricingRuleRow[];
};

export function PricingProfileDetail({ profile, services, variables, rules }: Props) {
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
            <CardDescription>Inputs the AI collects from the customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {variables.map((v) => (
                <li key={v.id}>
                  <span className="font-medium">{v.label}</span>
                  <span className="text-muted-foreground"> ({v.key}, {v.variable_type})</span>
                  {v.required && <Badge variant="outline" className="ml-1 text-xs">required</Badge>}
                </li>
              ))}
              {variables.length === 0 && <p className="text-muted-foreground">No variables.</p>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rules</CardTitle>
            <CardDescription>Applied in order to calculate the estimate.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {rules.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground"> ({r.rule_type})</span>
                </li>
              ))}
              {rules.length === 0 && <p className="text-muted-foreground">No rules.</p>}
            </ul>
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
            {variables.map((v) => (
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
        To edit variables and rules, use the API or add an editor UI. Link this profile to a Quote AI page in AI Pages so the assistant uses these rules.
      </p>
    </div>
  );
}
