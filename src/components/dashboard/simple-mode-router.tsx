'use client';

import { SimpleDashboardOverview } from '@/components/dashboard/simple-dashboard-overview';
import { SimpleAiSetupPage } from '@/components/dashboard/simple-pages/simple-ai-setup-page';
import { SimpleInstallPage } from '@/components/dashboard/simple-pages/simple-install-page';
import { SimpleAgentsPage } from '@/components/dashboard/simple-pages/simple-agents-page';
import { SimpleAutomationsPage } from '@/components/dashboard/simple-pages/simple-automations-page';
import { SimpleLeadsPage } from '@/components/dashboard/simple-pages/simple-leads-page';
import { SimpleTeamPage } from '@/components/dashboard/simple-pages/simple-team-page';
import { SimpleSettingsPage } from '@/components/dashboard/simple-pages/simple-settings-page';
import { SimpleLaunchPage } from '@/components/dashboard/simple-pages/simple-launch-page';
import { SimpleGenericPage } from '@/components/dashboard/simple-pages/simple-generic-page';

type SimpleModeRouterProps = {
  pathname: string;
};

/**
 * Returns the Simple Mode page component for the given pathname.
 * Normalize pathname: strip locale prefix if present (e.g. /en/dashboard -> /dashboard).
 */
function getSimplePage(pathname: string): React.ReactNode {
  const path = pathname.replace(/^\/[a-z]{2}(-[A-Za-z0-9]+)?/, '') || '/';
  const base = path.startsWith('/dashboard') ? path : path === '/' ? '/dashboard' : path;

  if (base === '/dashboard' || base === '/') return <SimpleDashboardOverview />;
  if (base.startsWith('/dashboard/ai-setup')) return <SimpleAiSetupPage />;
  if (base.startsWith('/dashboard/install')) return <SimpleInstallPage />;
  if (base === '/dashboard/agents' || base.startsWith('/dashboard/agents/')) return <SimpleAgentsPage />;
  if (base.startsWith('/dashboard/automations')) return <SimpleAutomationsPage />;
  if (base.startsWith('/dashboard/leads') || base.startsWith('/dashboard/contacts') || base.startsWith('/dashboard/quote-requests')) return <SimpleLeadsPage />;
  if (base.startsWith('/dashboard/team')) return <SimpleTeamPage />;
  if (base.startsWith('/dashboard/settings')) return <SimpleSettingsPage />;
  if (base.startsWith('/dashboard/deployments')) return <SimpleLaunchPage />;
  if (base.startsWith('/dashboard/knowledge')) return <SimpleGenericPage title="Add your learning materials" askAiPrompt="Import my materials and organize my content" pathname={base} />;
  if (base.startsWith('/dashboard/inbox') || base.startsWith('/dashboard/conversations')) return <SimpleGenericPage title="Conversations" askAiPrompt="Set up how I handle visitor conversations" pathname={base} />;
  if (base.startsWith('/dashboard/analytics')) return <SimpleGenericPage title="Analytics" askAiPrompt="Show me how my chatbot is performing" pathname={base} />;
  if (base.startsWith('/dashboard/billing')) return <SimpleGenericPage title="Billing" askAiPrompt="" pathname={base} />;
  if (base.startsWith('/dashboard/account')) return <SimpleGenericPage title="Account" askAiPrompt="" pathname={base} />;

  return <SimpleGenericPage title="Settings" askAiPrompt="Configure this for me" pathname={base} />;
}

export function SimpleModeRouter({ pathname }: SimpleModeRouterProps) {
  return <>{getSimplePage(pathname)}</>;
}
