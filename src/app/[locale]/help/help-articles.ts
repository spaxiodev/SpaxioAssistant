/**
 * Help article IDs and categories for the help page.
 * Title and body come from messages: help.articles.[id].title, help.articles.[id].body
 */
export const HELP_ARTICLE_IDS = [
  'gettingStarted',
  'dashboardOverview',
  'simpleVsDeveloper',
  'agents',
  'installWidget',
  'leads',
  'quoteRequests',
  'conversations',
  'automations',
  'knowledge',
  'billing',
  'settings',
  'team',
  'deployments',
  'webhooks',
  'inbox',
] as const;

export type HelpArticleId = (typeof HELP_ARTICLE_IDS)[number];

export const HELP_ARTICLE_CATEGORY: Record<HelpArticleId, keyof typeof CATEGORY_KEYS> = {
  gettingStarted: 'gettingStarted',
  dashboardOverview: 'dashboard',
  simpleVsDeveloper: 'dashboard',
  agents: 'dashboard',
  installWidget: 'widget',
  leads: 'leads',
  quoteRequests: 'leads',
  conversations: 'leads',
  automations: 'automations',
  knowledge: 'knowledge',
  billing: 'billing',
  settings: 'account',
  team: 'account',
  deployments: 'widget',
  webhooks: 'automations',
  inbox: 'leads',
};

const CATEGORY_KEYS = {
  gettingStarted: 'gettingStarted',
  dashboard: 'dashboard',
  widget: 'widget',
  leads: 'leads',
  automations: 'automations',
  knowledge: 'knowledge',
  billing: 'billing',
  account: 'account',
} as const;
