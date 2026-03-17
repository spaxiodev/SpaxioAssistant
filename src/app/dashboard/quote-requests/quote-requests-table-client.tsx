'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { QuoteRequestRowActions } from './quote-request-row-actions';
import { QuoteRequestDetailSheet } from './quote-request-detail-sheet';

type QuoteRequest = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  service_type?: string | null;
  project_details?: string | null;
  dimensions_size?: string | null;
  location?: string | null;
  notes?: string | null;
  budget_text?: string | null;
  budget_amount?: number | null;
  conversation_id?: string | null;
  created_at: string;
};

function formatBudget(r: QuoteRequest): string {
  if (r.budget_text) return r.budget_text;
  if (r.budget_amount != null) return `$${Number(r.budget_amount).toLocaleString()}`;
  return '—';
}

function getWorthItStatus(
  r: QuoteRequest,
  basePrices: Record<string, number> | null
): 'worth_it' | 'not_worth_it' | null {
  if (r.budget_amount == null || !Number.isFinite(r.budget_amount)) return null;
  const base = basePrices && r.service_type ? basePrices[r.service_type] : undefined;
  if (base == null || !Number.isFinite(base)) return null;
  return r.budget_amount >= base ? 'worth_it' : 'not_worth_it';
}

type Props = {
  requests: QuoteRequest[];
  basePrices: Record<string, number> | null;
  labels: {
    customer: string;
    service: string;
    budget: string;
    worthIt: string;
    location: string;
    details: string;
    date: string;
    worthItYes: string;
    worthItNo: string;
    allQuoteRequests: string;
    quoteRequestsCardDescription: string;
    noQuoteRequests: string;
  };
};

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
                  <TableHead>{labels.service}</TableHead>
                  <TableHead>{labels.budget}</TableHead>
                  <TableHead>{labels.worthIt}</TableHead>
                  <TableHead>{labels.location}</TableHead>
                  <TableHead>{labels.details}</TableHead>
                  <TableHead>{labels.date}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const worthIt = getWorthItStatus(r, basePrices);
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailId(r.id)}
                    >
                      <TableCell className="font-medium">{r.customer_name}</TableCell>
                      <TableCell>{r.service_type ?? '—'}</TableCell>
                      <TableCell>{formatBudget(r)}</TableCell>
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
                      <TableCell>{r.location ?? '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {r.project_details ?? '—'}
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
        request={selected}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        formatBudget={formatBudget}
      />
    </>
  );
}
