'use client';

import { SimpleDashboardOverview } from '@/components/dashboard/simple-dashboard-overview';
import { SimpleAiSetupPage } from '@/components/dashboard/simple-pages/simple-ai-setup-page';
import { SimpleInstallPage } from '@/components/dashboard/simple-pages/simple-install-page';
import { SimpleAgentsPage } from '@/components/dashboard/simple-pages/simple-agents-page';
import { SimpleAutomationsPage } from '@/components/dashboard/simple-pages/simple-automations-page';
import { SimpleLeadsPage } from '@/components/dashboard/simple-pages/simple-leads-page';
import { SimpleTeamPage } from '@/components/dashboard/simple-pages/simple-team-page';
import { SimpleSettingsPage } from '@/components/dashboard/simple-pages/simple-settings-page';
import { SimpleKnowledgePage } from '@/components/dashboard/simple-pages/simple-knowledge-page';
import { SimpleConversationsPage } from '@/components/dashboard/simple-pages/simple-conversations-page';
import { SimpleBillingPage } from '@/components/dashboard/simple-pages/simple-billing-page';
import { SimpleAccountPage } from '@/components/dashboard/simple-pages/simple-account-page';
import { SimpleGenericPage } from '@/components/dashboard/simple-pages/simple-generic-page';
import { SimpleAiSearchPage } from '@/components/dashboard/simple-pages/simple-ai-search-page';
import { SimpleSetupWizard } from '@/components/dashboard/simple-setup-wizard/simple-setup-wizard';
import { SimpleLeadsQuotesPage } from '@/components/dashboard/simple-pages/simple-leads-quotes-page';
import { routing } from '@/i18n/routing';

type SimpleModeRouterProps = {
  pathname: string;
};

/** Known locale prefixes to strip; must match i18n routing so we never strip path segments like /da from /dashboard. */
const LOCALE_PREFIX_REGEX = new RegExp(
  `^/(${Array.from(routing.locales).join('|')})(?=/|$)`,
  'i'
);

/**
 * Normalize pathname for matching: ensure leading slash, strip known locale only, trim trailing slash.
 * next-intl with localePrefix: 'always' can return path WITH locale (e.g. /en/dashboard/settings).
 * Using a generic /^\/[a-z]{2}/ would incorrectly strip "/da" from "/dashboard" when path has no locale.
 */
function normalizeBasePath(pathname: string): string {
  let path = typeof pathname === 'string' ? pathname.trim() : '';
  if (!path) return '/dashboard';
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(LOCALE_PREFIX_REGEX, '').replace(/\/$/, '') || '/';
  if (!path || path === '/') return '/dashboard';
  return path.startsWith('/dashboard') ? path : '/dashboard';
}

function getSimplePage(pathname: string): React.ReactNode {
  const base = normalizeBasePath(pathname);

  if (base === '/dashboard' || base === '/') return <SimpleDashboardOverview />;
  if (base.startsWith('/dashboard/setup')) return <SimpleSetupWizard />;
  if (base.startsWith('/dashboard/leads-quotes')) return <SimpleLeadsQuotesPage />;
  if (base.startsWith('/dashboard/ai-setup')) return <SimpleAiSetupPage />;
  if (base.startsWith('/dashboard/install')) return <SimpleInstallPage />;
  if (base === '/dashboard/agents' || base.startsWith('/dashboard/agents/')) return <SimpleAgentsPage />;
  if (base.startsWith('/dashboard/automations')) return <SimpleAutomationsPage />;
  if (base.startsWith('/dashboard/leads') || base.startsWith('/dashboard/contacts') || base.startsWith('/dashboard/quote-requests')) return <SimpleLeadsPage />;
  if (base.startsWith('/dashboard/team') || base.startsWith('/dashboard/account/add')) return <SimpleTeamPage />;
  if (base.startsWith('/dashboard/settings')) return <SimpleSettingsPage />;
  if (base.startsWith('/dashboard/knowledge')) return <SimpleKnowledgePage />;
  if (base.startsWith('/dashboard/inbox') || base.startsWith('/dashboard/conversations')) return <SimpleConversationsPage />;
  if (base.startsWith('/dashboard/billing')) return <SimpleBillingPage />;
  if (base.startsWith('/dashboard/account')) return <SimpleAccountPage />;
  if (base.startsWith('/dashboard/business-setup')) return <SimpleAiSetupPage />;
  if (base.startsWith('/dashboard/deployments')) return <SimpleInstallPage />;
  if (base.startsWith('/dashboard/ai-search')) return <SimpleAiSearchPage />;

  // True fallback only for unknown dashboard subroutes (e.g. webhooks, integrations, documents)
  const segment = base.replace(/^\/dashboard\/?/, '') || 'dashboard';
  const fallbackTitle = segment === 'dashboard' ? 'Dashboard' : segment.split('/')[0].replace(/-/g, ' ');
  const fallbackTitlePascal = fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1);
  return (
    <SimpleGenericPage
      title={fallbackTitlePascal}
      askAiPrompt=""
      pathname={base}
    />
  );
}

export function SimpleModeRouter({ pathname }: SimpleModeRouterProps) {
  return <>{getSimplePage(pathname)}</>;
}
