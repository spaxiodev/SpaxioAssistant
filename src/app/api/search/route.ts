/**
 * GET /api/search – Global search for command palette.
 * Returns org-scoped records: leads, quote requests, conversations, knowledge, automations, agents.
 * Query: q, mode (simple|developer), limit
 */
import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseInbox } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

export type SearchRecord = {
  id: string;
  group: string;
  label: string;
  subtitle?: string;
  href: string;
};

function highlightMatch(text: string, query: string): string {
  if (!query.trim() || !text) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    '**' +
    text.slice(idx, idx + q.length) +
    '**' +
    text.slice(idx + q.length)
  );
}

export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 30);

    // Debounce: don't search if query too short (client can do static search)
    if (q.length < 2) {
      return NextResponse.json({
        leads: [],
        quoteRequests: [],
        conversations: [],
        knowledge: [],
        automations: [],
        agents: [],
      });
    }

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const inboxEnabled = await canUseInbox(supabase, organizationId, adminAllowed);

    const results: {
      leads: SearchRecord[];
      quoteRequests: SearchRecord[];
      conversations: SearchRecord[];
      knowledge: SearchRecord[];
      automations: SearchRecord[];
      agents: SearchRecord[];
    } = {
      leads: [],
      quoteRequests: [],
      conversations: [],
      knowledge: [],
      automations: [],
      agents: [],
    };

    // Search leads: name, email, phone
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, email, phone')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (leads) {
      for (const l of leads) {
        const searchText = [l.name, l.email, l.phone].filter(Boolean).join(' ').toLowerCase();
        if (searchText.includes(q)) {
          results.leads.push({
            id: l.id,
            group: 'leads',
            label: l.name || l.email || l.phone || 'Unknown',
            subtitle: [l.email, l.phone].filter(Boolean).join(' • ') || undefined,
            href: `/dashboard/leads`,
          });
        }
      }
    }

    // Search quote requests: customer_name, customer_email, service_type, project_details
    const { data: quotes } = await supabase
      .from('quote_requests')
      .select('id, customer_name, customer_email, service_type, project_details')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (quotes) {
      for (const qr of quotes) {
        const name = (qr as { customer_name?: string }).customer_name ?? '';
        const email = (qr as { customer_email?: string }).customer_email ?? '';
        const service = (qr as { service_type?: string }).service_type ?? '';
        const details = typeof (qr as { project_details?: unknown }).project_details === 'string'
          ? (qr as { project_details: string }).project_details
          : '';
        const searchText = [name, email, service, details].filter(Boolean).join(' ').toLowerCase();
        if (searchText.includes(q)) {
          results.quoteRequests.push({
            id: (qr as { id: string }).id,
            group: 'quote-requests',
            label: name || email || service || 'Quote request',
            subtitle: [service, email].filter(Boolean).join(' • ') || undefined,
            href: `/dashboard/quote-requests`,
          });
        }
      }
    }

    // Search conversations (requires inbox) – widget_ids -> conversations
    if (inboxEnabled) {
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id')
        .eq('organization_id', organizationId);
      const widgetIds = (widgets ?? []).map((w) => w.id);
      if (widgetIds.length > 0) {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id, metadata')
          .in('widget_id', widgetIds)
          .order('updated_at', { ascending: false })
          .limit(limit);
        if (convs) {
          for (const c of convs) {
            const meta = (c as { metadata?: Record<string, unknown> }).metadata ?? {};
            const title = (meta.title as string) || (meta.visitor_name as string) || '';
            const snippet = typeof meta.snippet === 'string' ? meta.snippet : '';
            const searchText = [title, snippet].filter(Boolean).join(' ').toLowerCase();
            if (searchText.includes(q) || !q) {
              results.conversations.push({
                id: (c as { id: string }).id,
                group: 'conversations',
                label: title || 'Conversation',
                subtitle: snippet ? snippet.slice(0, 50) + (snippet.length > 50 ? '…' : '') : undefined,
                href: `/dashboard/inbox/${(c as { id: string }).id}`,
              });
            }
          }
        }
      }
    }

    // Search knowledge sources: name, config (url)
    const { data: sources } = await supabase
      .from('knowledge_sources')
      .select('id, name, source_type, config')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sources) {
      for (const s of sources) {
        const config = (s as { config?: Record<string, unknown> }).config ?? {};
        const url = typeof config.url === 'string' ? config.url : '';
        const searchText = [(s as { name?: string }).name, url].filter(Boolean).join(' ').toLowerCase();
        if (searchText.includes(q)) {
          results.knowledge.push({
            id: (s as { id: string }).id,
            group: 'knowledge',
            label: (s as { name?: string }).name || 'Knowledge source',
            subtitle: url ? url.slice(0, 50) + (url.length > 50 ? '…' : '') : undefined,
            href: `/dashboard/knowledge`,
          });
        }
      }
    }

    // Search automations: name
    const { data: automations } = await supabase
      .from('automations')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (automations) {
      for (const a of automations) {
        const name = (a as { name?: string }).name ?? '';
        if (name.toLowerCase().includes(q)) {
          results.automations.push({
            id: (a as { id: string }).id,
            group: 'automations',
            label: name || 'Automation',
            href: `/dashboard/automations`,
          });
        }
      }
    }

    // Search agents: name
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agents) {
      for (const a of agents) {
        const name = (a as { name?: string }).name ?? '';
        if (name.toLowerCase().includes(q)) {
          results.agents.push({
            id: (a as { id: string }).id,
            group: 'agents',
            label: name || 'Assistant',
            href: `/dashboard/agents/${(a as { id: string }).id}`,
          });
        }
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('[API] search GET', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
