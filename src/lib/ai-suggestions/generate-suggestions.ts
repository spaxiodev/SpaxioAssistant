/**
 * AI suggestions generator: creates grounded, actionable recommendations
 * based on real configuration gaps and usage patterns.
 *
 * All suggestions are derived from actual data — no random or fabricated signals.
 * Each suggestion includes grounding_data explaining exactly why it was generated.
 */

import type { SuggestionCandidate, SuggestionContext } from './types';

/** Max suggestions to generate in one pass to avoid noise. */
const MAX_SUGGESTIONS = 5;

/**
 * Generate suggestion candidates from the given context.
 * Returns suggestions sorted by priority (highest first), capped at MAX_SUGGESTIONS.
 * Does not persist to DB — callers handle persistence.
 */
export function generateSuggestionCandidates(ctx: SuggestionContext): SuggestionCandidate[] {
  const candidates: SuggestionCandidate[] = [];
  const existing = new Set(ctx.existingSuggestionTypes ?? []);

  // --- 1. Setup incomplete ---
  if (!ctx.businessSettings?.business_name || ctx.agentCount === 0 || ctx.knowledgeSourceCount === 0) {
    if (!existing.has('setup_incomplete')) {
      candidates.push({
        suggestion_type: 'setup_incomplete',
        title: 'Complete your assistant setup',
        description: 'Your assistant isn\'t fully configured yet. Finishing setup means it can answer customers, capture leads, and represent your business accurately.',
        action_href: '/dashboard/ai-setup',
        action_label: 'Open AI Setup',
        priority: 100,
        grounding_data: {
          has_business_name: !!ctx.businessSettings?.business_name,
          agent_count: ctx.agentCount,
          knowledge_source_count: ctx.knowledgeSourceCount,
        },
      });
    }
  }

  // --- 2. High-priority leads need follow-up ---
  if (ctx.unreviewedHighPriorityLeadCount > 0 && !existing.has('review_high_priority_leads')) {
    candidates.push({
      suggestion_type: 'review_high_priority_leads',
      title: `${ctx.unreviewedHighPriorityLeadCount} high-priority lead${ctx.unreviewedHighPriorityLeadCount > 1 ? 's' : ''} need attention`,
      description: 'Your AI has identified high-intent leads that are likely ready to move forward. Following up quickly increases conversion rates.',
      action_href: '/dashboard/leads',
      action_label: 'View leads',
      priority: 95,
      grounding_data: {
        unreviewed_high_priority_count: ctx.unreviewedHighPriorityLeadCount,
        total_high_priority_count: ctx.highPriorityLeadCount,
      },
    });
  }

  // --- 3. Quote requests pending review ---
  if (ctx.pendingQuoteCount > 0) {
    candidates.push({
      suggestion_type: 'add_pricing_info',
      title: `${ctx.pendingQuoteCount} quote request${ctx.pendingQuoteCount > 1 ? 's' : ''} waiting for review`,
      description: 'Customers have submitted quote requests. Review and respond promptly to win more business.',
      action_href: '/dashboard/quote-requests',
      action_label: 'Review quotes',
      priority: 90,
      grounding_data: { pending_quote_count: ctx.pendingQuoteCount },
    });
  }

  // --- 4. No follow-up automation — has leads ---
  if (ctx.leadCount > 0 && !ctx.hasFollowUpAutomation && !existing.has('enable_follow_up')) {
    if (ctx.followUpEmailsEnabled || ctx.aiFollowUpEnabled) {
      candidates.push({
        suggestion_type: 'enable_follow_up',
        title: 'Set up automatic follow-up for new leads',
        description: `You've captured ${ctx.leadCount} lead${ctx.leadCount > 1 ? 's' : ''} but have no automated follow-up. Auto follow-up sends a reply within minutes, while interest is high.`,
        action_href: '/dashboard/automations',
        action_label: 'Set up follow-up',
        priority: 85,
        grounding_data: {
          lead_count: ctx.leadCount,
          followup_emails_enabled: ctx.followUpEmailsEnabled,
          ai_followup_enabled: ctx.aiFollowUpEnabled,
        },
      });
    }
  }

  // --- 5. No pricing rules — has quote requests ---
  if (ctx.quoteRequestCount > 0 && !ctx.hasPricingRules && !existing.has('review_quote_rules')) {
    candidates.push({
      suggestion_type: 'review_quote_rules',
      title: 'Add pricing rules to provide instant estimates',
      description: 'Customers are requesting quotes, but you haven\'t configured pricing rules. Adding pricing info lets your assistant provide immediate estimate ranges — a strong conversion driver.',
      action_href: '/dashboard/quote-requests/pricing',
      action_label: 'Configure pricing',
      priority: 80,
      grounding_data: {
        quote_request_count: ctx.quoteRequestCount,
        has_pricing_profile: ctx.hasQuotePricingProfile,
        has_rules: ctx.hasPricingRules,
      },
    });
  }

  // --- 6. No website info / knowledge ---
  if (ctx.knowledgeSourceCount === 0 && ctx.agentCount > 0 && !existing.has('improve_website_info')) {
    candidates.push({
      suggestion_type: 'improve_website_info',
      title: 'Add your website info so the assistant answers accurately',
      description: 'Without website knowledge, the assistant relies on generic responses. Adding your website URL gives it specific, accurate answers about your business.',
      action_href: '/dashboard/knowledge',
      action_label: 'Add website info',
      priority: 75,
      grounding_data: { knowledge_source_count: ctx.knowledgeSourceCount },
    });
  }

  // --- 7. No lead capture (has conversations but no leads) ---
  if (ctx.conversationsCount > 5 && ctx.leadCount === 0 && !existing.has('enable_lead_capture')) {
    candidates.push({
      suggestion_type: 'enable_lead_capture',
      title: 'Start capturing leads from your conversations',
      description: `Your assistant has had ${ctx.conversationsCount} conversations but captured no leads. Enable lead capture to turn visitors into contacts your team can follow up with.`,
      action_href: '/dashboard/ai-setup',
      action_label: 'Enable lead capture',
      priority: 70,
      grounding_data: {
        conversations_count: ctx.conversationsCount,
        lead_count: ctx.leadCount,
      },
    });
  }

  // --- 8. Business has no hours (common question gap) ---
  if (
    ctx.businessSettings?.business_name &&
    !ctx.businessSettings?.business_hours &&
    ctx.conversationsCount > 0 &&
    !existing.has('add_business_hours')
  ) {
    candidates.push({
      suggestion_type: 'add_business_hours',
      title: 'Add your business hours',
      description: 'Customers frequently ask about opening hours. Adding your hours to business settings means your assistant can answer this instantly.',
      action_href: '/dashboard/settings',
      action_label: 'Update settings',
      priority: 55,
      grounding_data: { has_business_hours: false, conversations_count: ctx.conversationsCount },
    });
  }

  // --- 9. Multi-language opportunity ---
  if (
    ctx.languagesUsed &&
    ctx.languagesUsed.length > 1 &&
    ctx.defaultLanguage &&
    !existing.has('add_language_support')
  ) {
    const otherLangs = ctx.languagesUsed.filter((l) => l !== ctx.defaultLanguage);
    if (otherLangs.length > 0) {
      candidates.push({
        suggestion_type: 'add_language_support',
        title: `Add support for ${otherLangs[0]} — customers are using it`,
        description: `Conversations in ${otherLangs.join(', ')} have been detected. Your assistant already supports multilingual responses, but configuring a secondary language improves accuracy and lead capture.`,
        action_href: '/dashboard/settings',
        action_label: 'Configure languages',
        priority: 50,
        grounding_data: { languages_used: ctx.languagesUsed, default_language: ctx.defaultLanguage },
      });
    }
  }

  // --- 10. No pricing profile + no quote requests yet ---
  if (
    ctx.quoteRequestCount === 0 &&
    !ctx.hasQuotePricingProfile &&
    ctx.agentCount > 0 &&
    !existing.has('add_pricing_info')
  ) {
    candidates.push({
      suggestion_type: 'add_pricing_info',
      title: 'Enable instant quotes to win more business',
      description: 'Businesses that provide instant estimates convert significantly more visitors. Set up your pricing profile so the assistant can give customers immediate ballpark numbers.',
      action_href: '/dashboard/quote-requests/pricing',
      action_label: 'Set up pricing',
      priority: 45,
      grounding_data: { has_quote_profile: false, quote_request_count: 0 },
    });
  }

  // Sort by priority descending, cap at MAX_SUGGESTIONS
  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_SUGGESTIONS);
}
