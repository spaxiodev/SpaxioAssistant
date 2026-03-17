/**
 * Structured error response for plan/feature gating in API routes.
 * Use when a premium action is blocked by subscription or usage limit.
 */

import { NextResponse } from 'next/server';

export type PlanUpgradeErrorBody = {
  error: string;
  code: 'PLAN_UPGRADE_REQUIRED' | 'plan_limit' | 'usage_limit';
  message: string;
  currentPlan?: string;
  requiredPlan?: string;
  recommendedPlan?: string;
  feature?: string;
  reason?: 'upgrade_required' | 'limit_reached';
};

/** Return 403 with PLAN_UPGRADE_REQUIRED body. */
export function planUpgradeRequiredResponse(options: {
  message: string;
  currentPlan?: string;
  requiredPlan?: string;
  recommendedPlan?: string;
  feature?: string;
  reason?: 'upgrade_required' | 'limit_reached';
}): NextResponse {
  const body: PlanUpgradeErrorBody = {
    error: options.message,
    code: 'PLAN_UPGRADE_REQUIRED',
    message: options.message,
    currentPlan: options.currentPlan,
    requiredPlan: options.requiredPlan ?? options.recommendedPlan,
    recommendedPlan: options.recommendedPlan ?? options.requiredPlan,
    feature: options.feature,
    reason: options.reason ?? 'upgrade_required',
  };
  return NextResponse.json(body, { status: 403 });
}

/** Return 403 with plan_limit body (for centralized subscription-access). */
export function planLimitResponse(options: {
  message: string;
  feature: string;
  reason: 'upgrade_required' | 'limit_reached';
  currentPlan?: string;
  recommendedPlan?: string;
}): NextResponse {
  const body: PlanUpgradeErrorBody = {
    error: options.message,
    code: 'plan_limit',
    message: options.message,
    feature: options.feature,
    reason: options.reason,
    currentPlan: options.currentPlan,
    recommendedPlan: options.recommendedPlan,
  };
  return NextResponse.json(body, { status: 403 });
}
