'use client';

import { useViewMode } from '@/contexts/view-mode-context';
import { SimpleBusinessSetupPage } from '@/components/dashboard/simple-pages/simple-business-setup-page';
import { BusinessSetupDeveloperView } from '@/app/dashboard/business-setup/business-setup-developer-view';

type DraftSummary = { id: string; status: string; created_at: string; updated_at: string };

export function BusinessSetupPageClient({
  initialDrafts,
}: {
  initialDrafts: DraftSummary[];
}) {
  const { mode } = useViewMode();

  if (mode === 'simple') {
    return <SimpleBusinessSetupPage />;
  }
  return <BusinessSetupDeveloperView initialDrafts={initialDrafts} />;
}
