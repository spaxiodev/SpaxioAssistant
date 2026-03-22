'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { QUOTE_SUBMISSION_SOURCE } from '@/lib/quote-requests/submission-source';
import { FollowUpCard } from '@/components/dashboard/follow-up-card';

type QuoteRequestRow = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  submission_source?: string | null;
  submission_metadata?: Record<string, unknown> | null;
  service_type?: string | null;
  project_details?: string | null;
  dimensions_size?: string | null;
  location?: string | null;
  notes?: string | null;
  budget_text?: string | null;
  budget_amount?: number | null;
  conversation_id?: string | null;
  lead_id?: string | null;
  form_answers?: Record<string, unknown> | null;
  estimate_total?: number | null;
  estimate_low?: number | null;
  estimate_high?: number | null;
  created_at: string;
};

type Props = {
  request: QuoteRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatBudget: (r: QuoteRequestRow) => string;
};

export function QuoteRequestDetailSheet({
  request,
  open,
  onOpenChange,
  formatBudget,
}: Props) {
  if (!request) return null;

  const sourceLabel =
    request.submission_source === QUOTE_SUBMISSION_SOURCE.AI_WIDGET
      ? 'AI Widget'
      : request.submission_source === QUOTE_SUBMISSION_SOURCE.AI_PAGE_ASSISTANT
        ? 'AI Page Assistant'
        : request.submission_source ?? null;

  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Customer', value: request.customer_name },
    { label: 'Email', value: request.customer_email ?? null },
    { label: 'Phone', value: request.customer_phone ?? null },
    { label: 'Service', value: request.service_type ?? null },
    { label: 'Budget', value: formatBudget(request) },
    { label: 'Location', value: request.location ?? null },
    { label: 'Dimensions / size', value: request.dimensions_size ?? null },
    { label: 'Project details', value: request.project_details ?? null },
    { label: 'Notes', value: request.notes ?? null },
    { label: 'Date', value: formatDate(request.created_at) },
  ];

  const aiPageRunId =
    request.submission_metadata &&
    typeof request.submission_metadata === 'object' &&
    request.submission_metadata !== null &&
    typeof (request.submission_metadata as { ai_page_run_id?: unknown }).ai_page_run_id === 'string'
      ? (request.submission_metadata as { ai_page_run_id: string }).ai_page_run_id
      : null;

  const formAnswers = request.form_answers && Object.keys(request.form_answers).length > 0
    ? request.form_answers
    : null;
  const hasEstimate =
    request.estimate_total != null ||
    (request.estimate_low != null && request.estimate_high != null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quote request details</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {sourceLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Source</span>
              <Badge variant="secondary">{sourceLabel}</Badge>
              {aiPageRunId ? (
                <span className="text-xs text-muted-foreground font-mono">Run {aiPageRunId.slice(0, 8)}…</span>
              ) : null}
            </div>
          ) : null}
          <dl className="space-y-3 text-sm">
            {fields.map(({ label, value }) => {
              if (value === undefined || value === null || value === '') return null;
              return (
                <div key={label}>
                  <dt className="font-medium text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words">{String(value)}</dd>
                </div>
              );
            })}
          </dl>

          {request.form_answers && Object.keys(request.form_answers).length > 0 && (
            <div className="space-y-2">
              <dt className="font-medium text-muted-foreground">Form details</dt>
              <dd className="space-y-1.5">
                {Object.entries(request.form_answers).map(([key, val]) => {
                  if (val == null || val === '') return null;
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div key={key} className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="break-all text-right">{String(val)}</span>
                    </div>
                  );
                })}
              </dd>
            </div>
          )}

          {(request.estimate_total != null || (request.estimate_low != null && request.estimate_high != null)) && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <dt className="font-medium text-muted-foreground">Estimate</dt>
              <dd className="mt-1 font-semibold">
                {request.estimate_low != null && request.estimate_high != null
                  ? `$${Number(request.estimate_low).toLocaleString()} – $${Number(request.estimate_high).toLocaleString()}`
                  : `$${Number(request.estimate_total).toLocaleString()}`}
              </dd>
            </div>
          )}

          <FollowUpCard quoteRequestId={request.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
