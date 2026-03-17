/**
 * Static search index for pages and actions.
 * Used by the global command palette for navigation and quick actions.
 */

export type SearchResultGroup =
  | 'pages'
  | 'actions'
  | 'leads'
  | 'quote-requests'
  | 'conversations'
  | 'knowledge'
  | 'automations'
  | 'team'
  | 'settings';

export type SearchableItem = {
  id: string;
  label: string;
  keywords: string[];
  href: string;
  group: SearchResultGroup;
  /** Whether to show in Simple Mode (business-friendly). Developer-only items are hidden in Simple Mode. */
  simpleMode?: boolean;
  /** Higher = more prominent in rankings. Default 0. */
  priority?: number;
};

/** Navigation pages - exact path matches. */
const PAGES: SearchableItem[] = [
  { id: 'page-overview', label: 'Overview', keywords: ['home', 'dashboard'], href: '/dashboard', group: 'pages', simpleMode: true, priority: 10 },
  { id: 'page-ai-setup', label: 'AI Setup', keywords: ['setup', 'assistant', 'configure'], href: '/dashboard/ai-setup', group: 'pages', simpleMode: true, priority: 10 },
  { id: 'page-agents', label: 'AI Assistants', keywords: ['agents', 'assistant', 'chatbot'], href: '/dashboard/agents', group: 'pages', simpleMode: true, priority: 9 },
  { id: 'page-knowledge', label: 'Knowledge', keywords: ['sources', 'documents', 'learn', 'teach'], href: '/dashboard/knowledge', group: 'pages', simpleMode: true, priority: 9 },
  { id: 'page-install', label: 'Install', keywords: ['widget', 'embed', 'code', 'deploy'], href: '/dashboard/install', group: 'pages', simpleMode: true, priority: 10 },
  { id: 'page-conversations', label: 'Conversations', keywords: ['chats', 'messages', 'inbox'], href: '/dashboard/conversations', group: 'pages', simpleMode: true, priority: 9 },
  { id: 'page-leads', label: 'Leads', keywords: ['contacts', 'crm'], href: '/dashboard/leads', group: 'pages', simpleMode: true, priority: 10 },
  { id: 'page-quote-requests', label: 'Quote Requests', keywords: ['quotes', 'estimates'], href: '/dashboard/quote-requests', group: 'pages', simpleMode: true, priority: 10 },
  { id: 'page-quote-form-setup', label: 'Quote Form Setup', keywords: ['form', 'quote form', 'config'], href: '/dashboard/quote-requests/form-setup', group: 'pages', priority: 8 },
  { id: 'page-pricing-rules', label: 'Pricing Rules', keywords: ['pricing', 'estimates', 'variables'], href: '/dashboard/quote-requests/pricing', group: 'pages', priority: 8 },
  { id: 'page-automations', label: 'Automations', keywords: ['workflows', 'triggers'], href: '/dashboard/automations', group: 'pages', simpleMode: true, priority: 8 },
  { id: 'page-team', label: 'Team', keywords: ['members', 'invite', 'collaborate'], href: '/dashboard/team', group: 'pages', simpleMode: true, priority: 8 },
  { id: 'page-billing', label: 'Billing', keywords: ['subscription', 'plan', 'payment'], href: '/dashboard/billing', group: 'pages', simpleMode: true, priority: 10 },
  { id: 'page-settings', label: 'Settings', keywords: ['business', 'widget', 'branding'], href: '/dashboard/settings', group: 'pages', simpleMode: true, priority: 9 },
  { id: 'page-inbox', label: 'Inbox', keywords: ['human replies', 'assign'], href: '/dashboard/inbox', group: 'pages', priority: 7 },
  { id: 'page-analytics', label: 'Analytics', keywords: ['stats', 'reports'], href: '/dashboard/analytics', group: 'pages', priority: 7 },
  { id: 'page-business-setup', label: 'Business Setup', keywords: ['wizard', 'draft'], href: '/dashboard/business-setup', group: 'pages', priority: 6 },
  { id: 'page-help', label: 'Help', keywords: ['support', 'docs'], href: '/help', group: 'pages', simpleMode: true, priority: 7 },
];

/** Quick actions - same as pages but phrased as actions. */
const ACTIONS: SearchableItem[] = [
  { id: 'action-ai-setup', label: 'Open AI Setup', keywords: ['setup', 'configure'], href: '/dashboard/ai-setup', group: 'actions', simpleMode: true, priority: 10 },
  { id: 'action-install', label: 'Install widget', keywords: ['install', 'embed', 'code'], href: '/dashboard/install', group: 'actions', simpleMode: true, priority: 10 },
  { id: 'action-add-knowledge', label: 'Add knowledge source', keywords: ['knowledge', 'add', 'learn'], href: '/dashboard/knowledge', group: 'actions', simpleMode: true, priority: 8 },
  { id: 'action-create-assistant', label: 'Create assistant', keywords: ['create', 'agent', 'new'], href: '/dashboard/agents/new', group: 'actions', simpleMode: true, priority: 8 },
  { id: 'action-create-automation', label: 'Create automation', keywords: ['automation', 'create', 'workflow'], href: '/dashboard/automations', group: 'actions', simpleMode: true, priority: 7 },
  { id: 'action-invite-team', label: 'Invite team member', keywords: ['invite', 'team', 'add'], href: '/dashboard/team', group: 'actions', simpleMode: true, priority: 7 },
  { id: 'action-billing', label: 'Open billing', keywords: ['billing', 'plan', 'upgrade'], href: '/dashboard/billing', group: 'actions', simpleMode: true, priority: 9 },
  { id: 'action-quote-form', label: 'Open quote form setup', keywords: ['quote form', 'config'], href: '/dashboard/quote-requests/form-setup', group: 'actions', priority: 7 },
  { id: 'action-pricing-rules', label: 'Open pricing rules', keywords: ['pricing', 'rules', 'estimates'], href: '/dashboard/quote-requests/pricing', group: 'actions', priority: 7 },
];

export const ALL_STATIC_ITEMS = [...PAGES, ...ACTIONS];

/** Get static items filtered by query and mode. */
export function searchStaticItems(
  query: string,
  isSimpleMode: boolean
): SearchableItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const items = ALL_STATIC_ITEMS.filter((item) => {
    if (isSimpleMode && item.simpleMode !== true) return false;
    const searchText = [item.label, ...item.keywords].join(' ').toLowerCase();
    return matchesQuery(searchText, q);
  });

  return rankAndDedupe(items, q);
}

function matchesQuery(text: string, q: string): boolean {
  const terms = q.split(/\s+/).filter(Boolean);
  return terms.every((term) => text.includes(term));
}

function rankAndDedupe(items: SearchableItem[], q: string): SearchableItem[] {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    })
    .sort((a, b) => {
      const aText = a.label.toLowerCase();
      const bText = b.label.toLowerCase();
      const aExact = aText === q || a.keywords.some((k) => k.toLowerCase() === q);
      const bExact = bText === q || b.keywords.some((k) => k.toLowerCase() === q);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      const aPrefix = aText.startsWith(q) || a.keywords.some((k) => k.toLowerCase().startsWith(q));
      const bPrefix = bText.startsWith(q) || b.keywords.some((k) => k.toLowerCase().startsWith(q));
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return aText.localeCompare(bText);
    });
}

export const GROUP_LABELS: Record<SearchResultGroup, string> = {
  pages: 'Pages',
  actions: 'Actions',
  leads: 'Leads',
  'quote-requests': 'Quote Requests',
  conversations: 'Conversations',
  knowledge: 'Knowledge',
  automations: 'Automations',
  team: 'Team',
  settings: 'Settings',
};
