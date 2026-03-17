'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDate } from '@/lib/utils';
import { FollowUpCard } from '@/components/dashboard/follow-up-card';

type QuoteRequestRow = {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quote request details</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
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

          <FollowUpCard quoteRequestId={request.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
