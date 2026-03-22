'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { mergeQuoteRequestFieldsForDisplay } from '@/lib/quote-requests/form-answers-fields';
import { QUOTE_SUBMISSION_SOURCE } from '@/lib/quote-requests/submission-source';
import { QuoteRequestRowActions } from './quote-request-row-actions';
import { QuoteRequestDetailSheet } from './quote-request-detail-sheet';

type QuoteRequest = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  submission_source?: string | null;
  service_type?: string | null;
  project_details?: string | null;
  dimensions_size?: string | null;
  location?: string | null;
  notes?: string | null;
  budget_text?: string | null;
  budget_amount?: number | null;
  estimate_total?: number | null;
  estimate_low?: number | null;
  estimate_high?: number | null;
  conversation_id?: string | null;
  form_answers?: Record<string, unknown> | null;
  created_at: string;
};

type Labels = {
  customer: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  worthIt: string;
  location: string;
  details: string;
  date: string;
  quoteRequestSource: string;
  quoteSourceAiWidget: string;
  quoteSourceAiPageAssistant: string;
  quoteSourceUnknown: string;
  worthItYes: string;
  worthItNo: string;
  allQuoteRequests: string;
  quoteRequestsCardDescription: string;
  noQuoteRequests: string;
};

type Props = {
  requests: QuoteRequest[];
  basePrices: Record<string, number> | null;
  labels: Labels;
};

function formatSubmissionSource(
  source: string | null | undefined,
  labels: Labels
): string {
  if (!source) return labels.quoteSourceUnknown;
  if (source === QUOTE_SUBMISSION_SOURCE.AI_WIDGET) return labels.quoteSourceAiWidget;
  if (source === QUOTE_SUBMISSION_SOURCE.AI_PAGE_ASSISTANT) return labels.quoteSourceAiPageAssistant;
  return source;
}

function formatBudget(r: QuoteRequest): string {
  if (r.budget_text) return r.budget_text;
  if (r.budget_amount != null) return `$${Number(r.budget_amount).toLocaleString()}`;
  if (r.estimate_low != null && r.estimate_high != null)
    return `$${Number(r.estimate_low).toLocaleString()} – $${Number(r.estimate_high).toLocaleString()}`;
  if (r.estimate_total != null) return `$${Number(r.estimate_total).toLocaleString()}`;
  return '—';
}

function lookupBasePrice(
  basePrices: Record<string, number> | null,
  serviceType: string | null | undefined
): number | undefined {
  if (!basePrices || !serviceType) return undefined;
  if (typeof basePrices[serviceType] === 'number' && Number.isFinite(basePrices[serviceType])) {
    return basePrices[serviceType];
  }
  const lower = serviceType.toLowerCase();
  for (const [k, v] of Object.entries(basePrices)) {
    if (k.toLowerCase() === lower && typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function getWorthItStatus(
  r: QuoteRequest,
  basePrices: Record<string, number> | null
): 'worth_it' | 'not_worth_it' | null {
  if (r.budget_amount == null || !Number.isFinite(r.budget_amount)) return null;
  const base = lookupBasePrice(basePrices, r.service_type);
  if (base == null || !Number.isFinite(base)) return null;
  return r.budget_amount >= base ? 'worth_it' : 'not_worth_it';
}

export function QuoteRequestsTableClient({ requests, basePrices, labels }: Props) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const selected = detailId
    ? (requests.find((r) => r.id === detailId) ?? null)
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{labels.allQuoteRequests}</CardTitle>
          <CardDescription>{labels.quoteRequestsCardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {!requests?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{labels.noQuoteRequests}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.customer}</TableHead>
                  <TableHead>{labels.email}</TableHead>
                  <TableHead>{labels.phone}</TableHead>
                  <TableHead>{labels.service}</TableHead>
                  <TableHead>{labels.budget}</TableHead>
                  <TableHead>{labels.worthIt}</TableHead>
                  <TableHead>{labels.location}</TableHead>
                  <TableHead>{labels.details}</TableHead>
                  <TableHead>{labels.quoteRequestSource}</TableHead>
                  <TableHead>{labels.date}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const row = mergeQuoteRequestFieldsForDisplay(r);
                  const worthIt = getWorthItStatus(row, basePrices);
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailId(r.id)}
                    >
                      <TableCell className="font-medium">{r.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.customer_email ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.customer_phone ?? '—'}</TableCell>
                      <TableCell>{row.service_type ?? '—'}</TableCell>
                      <TableCell>{formatBudget(row)}</TableCell>
                      <TableCell>
                        {worthIt === 'worth_it' && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            {labels.worthItYes}
                          </Badge>
                        )}
                        {worthIt === 'not_worth_it' && (
                          <Badge variant="destructive">{labels.worthItNo}</Badge>
                        )}
                        {worthIt === null && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{row.location ?? '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {row.project_details ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {formatSubmissionSource(r.submission_source, labels)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <QuoteRequestRowActions quoteRequestId={r.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuoteRequestDetailSheet
        request={selected ? mergeQuoteRequestFieldsForDisplay(selected) : null}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        formatBudget={formatBudget}
      />
    </>
  );
}
