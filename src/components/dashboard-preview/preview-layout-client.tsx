'use client';

import { useState } from 'react';
import { DashboardSidebarProvider } from '@/contexts/dashboard-sidebar-context';
import { PreviewSidebar } from '@/components/dashboard-preview/preview-sidebar';
import { PreviewHeader } from '@/components/dashboard-preview/preview-header';
import { PreviewBanner } from '@/components/dashboard-preview/preview-banner';
import { PreviewUnlockDialog } from '@/components/dashboard-preview/preview-unlock-dialog';

type PreviewLayoutClientProps = {
  children: React.ReactNode;
};

export function PreviewLayoutClient({ children }: PreviewLayoutClientProps) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [featureName, setFeatureName] = useState<string | undefined>(undefined);

  return (
    <DashboardSidebarProvider>
      <div className="relative flex bg-transparent">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_24%)]" />
        <PreviewSidebar />
        <div className="relative ml-0 flex min-h-screen flex-1 flex-col md:ml-56">
          <PreviewBanner />
          <PreviewHeader />
          <main className="flex-1 p-4 md:p-6">
            <div
              onClick={(e) => {
                const el = e.target as HTMLElement | null;
                const feature = el?.closest?.('[data-preview-lock]')?.getAttribute?.('data-preview-lock') ?? null;
                if (!feature) return;
                e.preventDefault();
                e.stopPropagation();
                setFeatureName(feature);
                setUnlockOpen(true);
              }}
            >
              {children}
            </div>
          </main>
        </div>
        <PreviewUnlockDialog
          open={unlockOpen}
          onOpenChange={setUnlockOpen}
          featureName={featureName}
        />
      </div>
    </DashboardSidebarProvider>
  );
}

