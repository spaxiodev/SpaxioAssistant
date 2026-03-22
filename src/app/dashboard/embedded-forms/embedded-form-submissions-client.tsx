'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Inbox } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { FormSubmission, SubmissionStatus } from '@/lib/embedded-forms/types';

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  converted: 'Converted',
  archived: 'Archived',
};

const STATUS_VARIANTS: Record<SubmissionStatus, 'default' | 'secondary' | 'outline'> = {
  new: 'default',
  reviewed: 'secondary',
  contacted: 'secondary',
  converted: 'default',
  archived: 'outline',
};

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  new: 'bg-blue-600 hover:bg-blue-700',
  reviewed: '',
  contacted: '',
  converted: 'bg-green-600 hover:bg-green-700',
  archived: '',
};

type Props = {
  formId: string;
  formName: string;
  initialSubmissions: FormSubmission[];
  onSubmissionsUpdated: (submissions: FormSubmission[]) => void;
};

export function EmbeddedFormSubmissionsClient({ formId, formName, initialSubmissions, onSubmissionsUpdated }: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? submissions.find((s) => s.id === selectedId) ?? null : null;

  async function handleStatusChange(submissionId: string, status: SubmissionStatus) {
    const res = await fetch(`/api/dashboard/embedded-forms/${formId}/submissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, status }),
    });
    if (res.ok) {
      const updated = submissions.map((s) => (s.id === submissionId ? { ...s, status } : s));
      setSubmissions(updated);
      onSubmissionsUpdated(updated);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            All submissions for {formName}. Click a row to view full answers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No submissions yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Embed the form on your website and submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Estimate</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedId(sub.id)}
                    >
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(sub.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{sub.customer_name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{sub.customer_email ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{sub.customer_phone ?? '—'}</TableCell>
                      <TableCell>
                        {sub.calculated_total != null
                          ? `$${Number(sub.calculated_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {sub.source}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={sub.status}
                          onValueChange={(v) => handleStatusChange(sub.id, v as SubmissionStatus)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABELS) as SubmissionStatus[]).map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Submission details</SheetTitle>
            <SheetDescription className="sr-only">Full details for this form submission</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={STATUS_COLORS[selected.status] || ''} variant={STATUS_VARIANTS[selected.status]}>
                  {STATUS_LABELS[selected.status]}
                </Badge>
                <Badge variant="secondary" className="capitalize">{selected.source}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(selected.created_at)}</span>
              </div>

              <dl className="space-y-3 text-sm">
                {selected.customer_name && (
                  <div>
                    <dt className="font-medium text-muted-foreground">Name</dt>
                    <dd className="mt-0.5">{selected.customer_name}</dd>
                  </div>
                )}
                {selected.customer_email && (
                  <div>
                    <dt className="font-medium text-muted-foreground">Email</dt>
                    <dd className="mt-0.5">{selected.customer_email}</dd>
                  </div>
                )}
                {selected.customer_phone && (
                  <div>
                    <dt className="font-medium text-muted-foreground">Phone</dt>
                    <dd className="mt-0.5">{selected.customer_phone}</dd>
                  </div>
                )}
              </dl>

              {selected.answers_json && Object.keys(selected.answers_json).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Form answers</p>
                  <dl className="space-y-2 text-sm">
                    {Object.entries(selected.answers_json).map(([key, val]) => {
                      if (val == null || val === '') return null;
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                      return (
                        <div key={key} className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="break-all text-right font-medium">{String(val)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}

              {selected.calculated_total != null && (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <p className="text-muted-foreground">Estimated total</p>
                  <p className="mt-1 text-xl font-bold">
                    ${Number(selected.calculated_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {selected.quote_breakdown_json && Object.keys(selected.quote_breakdown_json).length > 0 && (
                <details className="rounded-lg border p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">Quote breakdown</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                    {JSON.stringify(selected.quote_breakdown_json, null, 2)}
                  </pre>
                </details>
              )}

              <div className="pt-2">
                <p className="mb-2 text-sm font-medium">Update status</p>
                <Select
                  value={selected.status}
                  onValueChange={(v) => handleStatusChange(selected.id, v as SubmissionStatus)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as SubmissionStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
