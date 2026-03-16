export type PreviewConversation = {
  id: string;
  from: string;
  summary: string;
  status: 'open' | 'resolved';
  createdAtLabel: string;
};

export type PreviewLead = {
  id: string;
  name: string;
  email: string;
  intent: string;
  createdAtLabel: string;
};

export type PreviewAnalytics = {
  conversationsThisWeek: number;
  deflectionRatePct: number;
  leadsCaptured: number;
  avgFirstResponseSeconds: number;
};

export type DashboardPreviewData = {
  businessName: string;
  assistantName: string;
  websiteUrl: string;
  widgetStatusLabel: string;
  knowledgeStatusLabel: string;
  analytics: PreviewAnalytics;
  recentConversations: PreviewConversation[];
  recentLeads: PreviewLead[];
};

export const DASHBOARD_PREVIEW_DATA: DashboardPreviewData = {
  businessName: 'Acme Dental',
  assistantName: 'Acme Support AI',
  websiteUrl: 'https://acmedental.com',
  widgetStatusLabel: 'Installed (Preview)',
  knowledgeStatusLabel: 'Ready — 38 pages indexed (Preview)',
  analytics: {
    conversationsThisWeek: 184,
    deflectionRatePct: 62,
    leadsCaptured: 27,
    avgFirstResponseSeconds: 3,
  },
  recentConversations: [
    {
      id: 'c1',
      from: 'Jamie R.',
      summary: 'Asked about Invisalign pricing and appointment availability.',
      status: 'open',
      createdAtLabel: '2h ago',
    },
    {
      id: 'c2',
      from: 'Taylor S.',
      summary: 'Needed emergency dental care — directed to urgent booking page.',
      status: 'resolved',
      createdAtLabel: 'Yesterday',
    },
    {
      id: 'c3',
      from: 'Morgan K.',
      summary: 'Question about insurance accepted (Delta Dental, Cigna).',
      status: 'resolved',
      createdAtLabel: '2d ago',
    },
  ],
  recentLeads: [
    {
      id: 'l1',
      name: 'Avery P.',
      email: 'avery@example.com',
      intent: 'Book cleaning',
      createdAtLabel: 'Today',
    },
    {
      id: 'l2',
      name: 'Chris D.',
      email: 'chris@example.com',
      intent: 'Invisalign consult',
      createdAtLabel: 'Yesterday',
    },
    {
      id: 'l3',
      name: 'Sam N.',
      email: 'sam@example.com',
      intent: 'Emergency visit',
      createdAtLabel: '2d ago',
    },
  ],
};

