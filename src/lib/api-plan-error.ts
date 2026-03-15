/**
 * Structured error response for plan/feature gating in API routes.
 * Use when a premium action is blocked by subscription.
 */

import { NextResponse } from 'next/server';

export type PlanUpgradeErrorBody = {
  error: string;
  code: 'PLAN_UPGRADE_REQUIRED';
  message: string;
  currentPlan?: string;
  requiredPlan?: string;
  feature?: string;
};

/** Return 403 with PLAN_UPGRADE_REQUIRED body. */
export function planUpgradeRequiredResponse(options: {
  message: string;
  currentPlan?: string;
  requiredPlan?: string;
  feature?: string;
}): NextResponse {
  const body: PlanUpgradeErrorBody = {
    error: options.message,
    code: 'PLAN_UPGRADE_REQUIRED',
    message: options.message,
    currentPlan: options.currentPlan,
    requiredPlan: options.requiredPlan,
    feature: options.feature,
  };
  return NextResponse.json(body, { status: 403 });
}
