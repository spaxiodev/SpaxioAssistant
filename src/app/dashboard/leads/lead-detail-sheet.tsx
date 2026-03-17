'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDate } from '@/lib/utils';
import { FollowUpCard } from '@/components/dashboard/follow-up-card';
import { MemoryCard } from '@/components/dashboard/memory-card';
import { FileText } from 'lucide-react';

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  requested_service: string | null;
  requested_timeline: string | null;
  project_details: string | null;
  location: string | null;
  qualification_summary: string | null;
  next_recommended_action: string | null;
  transcript_snippet: string | null;
  created_at: string;
};

type Props = {
  lead: LeadRow | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When set, render a trigger button that opens the sheet (for use inside card). */
  asTrigger?: boolean;
};

export function LeadDetailSheet({ lead, open: controlledOpen, onOpenChange: controlledOnOpenChange, asTrigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = asTrigger ? internalOpen : (controlledOpen ?? false);
  const onOpenChange = asTrigger ? setInternalOpen : (controlledOnOpenChange ?? (() => {}));

  if (!lead) return null;

  if (asTrigger) {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => setInternalOpen(true)} className="gap-1">
          <FileText className="h-4 w-4" />
          View full details
        </Button>
        <LeadDetailSheetContent lead={lead} open={open} onOpenChange={onOpenChange} />
      </>
    );
  }

  return <LeadDetailSheetContent lead={lead} open={open} onOpenChange={onOpenChange} />;
}

function LeadDetailSheetContent({
  lead,
  open,
  onOpenChange,
}: {
  lead: LeadRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {

  const fields: { label: string; value: string | null }[] = [
    { label: 'Name', value: lead.name },
    { label: 'Email', value: lead.email },
    { label: 'Phone', value: lead.phone },
    { label: 'Requested service', value: lead.requested_service },
    { label: 'Timeline', value: lead.requested_timeline },
    { label: 'Location', value: lead.location },
    { label: 'Message', value: lead.message },
    { label: 'Project details', value: lead.project_details },
    { label: 'Date', value: formatDate(lead.created_at) },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lead details</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <dl className="space-y-3 text-sm">
            {fields.map(({ label, value }) => {
              if (value === undefined || value === null || value === '') return null;
              return (
                <div key={label}>
                  <dt className="font-medium text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words">{value}</dd>
                </div>
              );
            })}
          </dl>

          {lead.qualification_summary && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Lead summary</dt>
              <dd className="mt-1 text-sm">{lead.qualification_summary}</dd>
              {lead.next_recommended_action && (
                <dd className="mt-1 text-xs text-muted-foreground">Next: {lead.next_recommended_action}</dd>
              )}
            </div>
          )}

          {lead.transcript_snippet && (
            <div className="rounded-md border bg-muted/20 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Chat snippet</dt>
              <dd className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{lead.transcript_snippet}</dd>
            </div>
          )}

          <FollowUpCard leadId={lead.id} />
          <MemoryCard subjectType="lead" subjectId={lead.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
