/**
 * Unit tests for the Fair Access Control Layer (src/lib/billing/access.ts).
 *
 * Tests are focused on pure functions that do NOT require a Supabase client.
 * Integration-style tests (getOrganizationAccessSnapshot) are covered separately
 * with mocked Supabase clients where needed.
 */

import { describe, it, expect } from 'vitest';
import {
  buildUsageWarnings,
  canCreateResource,
  getUpgradeReason,
  widgetAiLimitResponse,
  widgetNoSubscriptionResponse,
  type RichUsageStatus,
  type UsageWarning,
} from '../access';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRichUsage(overrides: Partial<RichUsageStatus> = {}): RichUsageStatus {
  const defaults: RichUsageStatus = {
    // Periodic
    message_count: 0,
    message_limit: 200,
    ai_action_count: 0,
    ai_action_limit: 100,
    messages_remaining: 200,
    ai_actions_remaining: 100,
    messages_exceeded: false,
    ai_actions_exceeded: false,
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    messages_pct: 0,
    messages_status: 'healthy',
    ai_actions_pct: 0,
    ai_actions_status: 'healthy',
    // Resources
    agents_count: 0,
    agents_limit: 1,
    agents_pct: 0,
    agents_status: 'healthy',
    knowledge_sources_count: 0,
    knowledge_sources_limit: 1,
    knowledge_sources_pct: 0,
    knowledge_sources_status: 'healthy',
    team_members_count: 0,
    team_members_limit: 1,
    team_members_pct: 0,
    team_members_status: 'healthy',
    automations_count: 0,
    automations_limit: 0,
    automations_pct: 0,
    automations_status: 'healthy',
    widgets_count: 0,
    widgets_limit: 1,
    widgets_pct: 0,
    widgets_status: 'healthy',
    document_uploads_count: 0,
    document_uploads_limit: 0,
    document_uploads_pct: 0,
    document_uploads_status: 'healthy',
    ai_pages_count: 0,
    ai_pages_limit: 0,
    ai_pages_pct: 0,
    ai_pages_status: 'healthy',
  };
  return { ...defaults, ...overrides };
}

// ─── buildUsageWarnings ───────────────────────────────────────────────────────

describe('buildUsageWarnings', () => {
  it('returns empty when all usage is below 70%', () => {
    const usage = makeRichUsage({
      message_count: 50,
      messages_pct: 25,
      messages_status: 'healthy',
    });
    const warnings = buildUsageWarnings(usage, false);
    expect(warnings).toHaveLength(0);
  });

  it('returns warning when messages_pct is 70–89%', () => {
    const usage = makeRichUsage({
      message_count: 145,
      message_limit: 200,
      messages_pct: 72,
      messages_status: 'nearing_limit',
    });
    const warnings = buildUsageWarnings(usage, false);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].metric).toBe('monthly_messages');
    expect(warnings[0].level).toBe('nearing_limit');
  });

  it('returns high_usage warning when messages_pct is 90–99%', () => {
    const usage = makeRichUsage({
      message_count: 185,
      message_limit: 200,
      messages_pct: 92,
      messages_status: 'high_usage',
    });
    const warnings = buildUsageWarnings(usage, false);
    const msgWarning = warnings.find((w) => w.metric === 'monthly_messages');
    expect(msgWarning?.level).toBe('high_usage');
  });

  it('returns limit_reached warning when messages are exceeded', () => {
    const usage = makeRichUsage({
      message_count: 200,
      message_limit: 200,
      messages_exceeded: true,
      messages_pct: 100,
      messages_status: 'limit_reached',
    });
    const warnings = buildUsageWarnings(usage, false);
    const msgWarning = warnings.find((w) => w.metric === 'monthly_messages');
    expect(msgWarning?.level).toBe('limit_reached');
  });

  it('does NOT include automations warning when automationsEnabled is false', () => {
    const usage = makeRichUsage({
      automations_count: 5,
      automations_limit: 5,
      automations_pct: 100,
      automations_status: 'limit_reached',
    });
    const warnings = buildUsageWarnings(usage, false);
    const autoWarning = warnings.find((w) => w.metric === 'automations');
    expect(autoWarning).toBeUndefined();
  });

  it('includes automations warning when automationsEnabled is true', () => {
    const usage = makeRichUsage({
      automations_count: 4,
      automations_limit: 5,
      automations_pct: 80,
      automations_status: 'nearing_limit',
    });
    const warnings = buildUsageWarnings(usage, true);
    const autoWarning = warnings.find((w) => w.metric === 'automations');
    expect(autoWarning).toBeDefined();
    expect(autoWarning?.level).toBe('nearing_limit');
  });

  it('skips metrics with limit=0 (unlimited or plan does not track)', () => {
    const usage = makeRichUsage({
      document_uploads_limit: 0,
      document_uploads_count: 999,
      document_uploads_pct: 100,
      document_uploads_status: 'limit_reached',
    });
    const warnings = buildUsageWarnings(usage, false);
    const docWarning = warnings.find((w) => w.metric === 'document_uploads');
    expect(docWarning).toBeUndefined();
  });

  it('includes a human-readable message in each warning', () => {
    const usage = makeRichUsage({
      knowledge_sources_count: 1,
      knowledge_sources_limit: 1,
      knowledge_sources_pct: 100,
      knowledge_sources_status: 'limit_reached',
    });
    const warnings = buildUsageWarnings(usage, false);
    const w = warnings.find((w) => w.metric === 'knowledge_sources');
    expect(w?.message).toBeTruthy();
    expect(typeof w?.message).toBe('string');
  });
});

// ─── canCreateResource ────────────────────────────────────────────────────────

describe('canCreateResource', () => {
  it('returns "allowed" when adminAllowed is true regardless of counts', () => {
    expect(canCreateResource(10, 1, true)).toBe('allowed');
  });

  it('returns "requires_upgrade" when limit is 0', () => {
    expect(canCreateResource(0, 0, false)).toBe('requires_upgrade');
  });

  it('returns "limit_reached" when at capacity', () => {
    expect(canCreateResource(5, 5, false)).toBe('limit_reached');
    expect(canCreateResource(6, 5, false)).toBe('limit_reached');
  });

  it('returns "warning" when 90–99% used', () => {
    // 9/10 = 90%
    expect(canCreateResource(9, 10, false)).toBe('warning');
  });

  it('returns "allowed" when under 90%', () => {
    // 5/10 = 50%
    expect(canCreateResource(5, 10, false)).toBe('allowed');
    // 7/10 = 70% — still allowed (warning is only surfaced in buildUsageWarnings)
    expect(canCreateResource(7, 10, false)).toBe('allowed');
  });
});

// ─── widgetAiLimitResponse ────────────────────────────────────────────────────

describe('widgetAiLimitResponse', () => {
  it('returns a 200 JSON response (not 403)', async () => {
    const response = widgetAiLimitResponse('free');
    expect(response.status).toBe(200);
  });

  it('has ai_disabled: true in the body', async () => {
    const response = widgetAiLimitResponse('free');
    const body = await response.json();
    expect(body.ai_disabled).toBe(true);
  });

  it('has allow_lead_capture: true in the body', async () => {
    const response = widgetAiLimitResponse('starter');
    const body = await response.json();
    expect(body.allow_lead_capture).toBe(true);
  });

  it('has allow_quote_request: true in the body', async () => {
    const response = widgetAiLimitResponse('starter');
    const body = await response.json();
    expect(body.allow_quote_request).toBe(true);
  });

  it('has a friendly non-empty reply string', async () => {
    const response = widgetAiLimitResponse('free');
    const body = await response.json();
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(10);
  });

  it('sets recommended_plan based on current plan slug', async () => {
    const freeResponse = await widgetAiLimitResponse('free').json();
    expect(freeResponse.recommended_plan).toBe('starter');

    const starterResponse = await widgetAiLimitResponse('starter').json();
    expect(starterResponse.recommended_plan).toBe('pro');

    const proResponse = await widgetAiLimitResponse('pro').json();
    expect(proResponse.recommended_plan).toBe('business');
  });
});

// ─── widgetNoSubscriptionResponse ────────────────────────────────────────────

describe('widgetNoSubscriptionResponse', () => {
  it('returns a 200 (not 403/500)', () => {
    const response = widgetNoSubscriptionResponse();
    expect(response.status).toBe(200);
  });

  it('has ai_disabled: true', async () => {
    const body = await widgetNoSubscriptionResponse().json();
    expect(body.ai_disabled).toBe(true);
  });

  it('has allow_lead_capture: true', async () => {
    const body = await widgetNoSubscriptionResponse().json();
    expect(body.allow_lead_capture).toBe(true);
  });

  it('has a non-empty reply', async () => {
    const body = await widgetNoSubscriptionResponse().json();
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(5);
  });
});

// ─── Warning threshold boundaries ────────────────────────────────────────────

describe('Warning thresholds (70 / 90 / 100)', () => {
  function warningForMessages(used: number, limit: number): UsageWarning | undefined {
    const pct = Math.min(100, Math.round((used / limit) * 100));
    let status: RichUsageStatus['messages_status'] = 'healthy';
    if (pct >= 100 || used >= limit) status = 'limit_reached';
    else if (pct >= 90) status = 'high_usage';
    else if (pct >= 70) status = 'nearing_limit';

    const usage = makeRichUsage({
      message_count: used,
      message_limit: limit,
      messages_exceeded: used >= limit,
      messages_pct: pct,
      messages_status: status,
    });
    return buildUsageWarnings(usage, false).find((w) => w.metric === 'monthly_messages');
  }

  it('no warning at 69%', () => {
    expect(warningForMessages(138, 200)).toBeUndefined(); // 69%
  });

  it('nearing_limit warning at 70%', () => {
    const w = warningForMessages(140, 200); // 70%
    expect(w?.level).toBe('nearing_limit');
  });

  it('high_usage warning at 90%', () => {
    const w = warningForMessages(180, 200); // 90%
    expect(w?.level).toBe('high_usage');
  });

  it('limit_reached warning at 100%', () => {
    const w = warningForMessages(200, 200); // 100%
    expect(w?.level).toBe('limit_reached');
  });
});
