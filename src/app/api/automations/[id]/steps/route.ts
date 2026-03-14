import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationIdOrFromApiKey } from '@/lib/api-key-auth';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { STEP_TYPES } from '@/lib/automations/types';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/automations/:id/steps – list steps for workflow editor. Positions from config_json._position. */
export async function GET(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { id } = await context.params;
    const automationId = normalizeUuid(id);
    if (!isUuid(automationId))
      return NextResponse.json({ error: 'Invalid automation id' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: automation, error: autoError } = await supabase
      .from('automations')
      .select('id')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .single();

    if (autoError || !automation)
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });

    const { data: steps, error } = await supabase
      .from('automation_steps')
      .select('id, step_order, step_type, step_name, config_json, condition_json')
      .eq('automation_id', automationId)
      .order('step_order', { ascending: true });

    if (error) {
      console.error('[API] automations steps GET', error);
      return NextResponse.json({ error: 'Failed to load steps' }, { status: 500 });
    }

    const rows = (steps ?? []).map((s) => {
      const config = (s.config_json as Record<string, unknown>) ?? {};
      const position = config._position as { x: number; y: number } | undefined;
      return {
        id: s.id,
        step_order: s.step_order,
        step_type: s.step_type,
        step_name: s.step_name,
        config_json: config,
        condition_json: s.condition_json,
        position: position ?? { x: 0, y: 0 },
      };
    });

    return NextResponse.json({ steps: rows });
  } catch (err) {
    return handleApiError(err, 'automations/steps/GET');
  }
}

/** PUT /api/automations/:id/steps – replace steps from workflow graph (nodes + edges). */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { id } = await context.params;
    const automationId = normalizeUuid(id);
    if (!isUuid(automationId))
      return NextResponse.json({ error: 'Invalid automation id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data?: Record<string, unknown> }> =
      Array.isArray(body.nodes) ? body.nodes : [];
    const edges: Array<{ source: string; target: string; sourceHandle?: string }> = Array.isArray(body.edges)
      ? body.edges
      : [];

    const supabase = createAdminClient();
    const { data: automation, error: autoError } = await supabase
      .from('automations')
      .select('id')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .single();

    if (autoError || !automation)
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });

    // Trigger node id is fixed; step nodes have type 'step' and data.step_type
    const triggerId = 'trigger';
    const stepNodes = nodes.filter((n) => n.id !== triggerId && n.type === 'step') as Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data?: { step_type?: string; step_name?: string; config_json?: Record<string, unknown>; condition_json?: Record<string, unknown> | null };
    }>;
    const getStepType = (n: (typeof stepNodes)[0]) => (n.data?.step_type as string) || 'action';
    if (stepNodes.some((n) => !STEP_TYPES.includes(getStepType(n) as 'action' | 'delay' | 'branch_if' | 'human_approval'))) {
      return NextResponse.json({ error: 'Invalid step type' }, { status: 400 });
    }

    // Build order from graph: BFS from trigger
    const order: string[] = [];
    const outEdges = new Map<string, Array<{ target: string; handle?: string }>>();
    for (const e of edges) {
      const list = outEdges.get(e.source) ?? [];
      list.push({ target: e.target, handle: e.sourceHandle });
      outEdges.set(e.source, list);
    }
    const queue: string[] = [triggerId];
    const seen = new Set<string>([triggerId]);
    while (queue.length) {
      const cur = queue.shift()!;
      const nexts = outEdges.get(cur) ?? [];
      for (const { target } of nexts) {
        if (!seen.has(target)) {
          seen.add(target);
          order.push(target);
          queue.push(target);
        }
      }
    }

    // Preserve order of step nodes that weren't reached by edges (e.g. orphan); append at end
    for (const n of stepNodes) {
      if (!order.includes(n.id)) order.push(n.id);
    }

    const { data: existingSteps } = await supabase
      .from('automation_steps')
      .select('id, step_order, step_type, step_name, config_json, condition_json')
      .eq('automation_id', automationId);

    const existingMap = new Map((existingSteps ?? []).map((s) => [s.id, s]));

    // Delete steps that are no longer in the graph (existing DB ids not in order)
    const orderSet = new Set(order);
    for (const row of existingSteps ?? []) {
      if (!orderSet.has(row.id)) {
        await supabase.from('automation_steps').delete().eq('id', row.id).eq('automation_id', automationId);
      }
    }

    // Upsert: update existing by id, insert new (no id)
    for (let index = 0; index < order.length; index++) {
      const nodeId = order[index];
      const node = stepNodes.find((n) => n.id === nodeId);
      if (!node) continue;
      const existing = existingMap.get(nodeId);
      const stepType = getStepType(node);
      const config = (node.data?.config_json as Record<string, unknown>) ?? (existing?.config_json as Record<string, unknown>) ?? {};
      const condition = (node.data?.condition_json as Record<string, unknown>) ?? (existing?.condition_json as Record<string, unknown>) ?? null;
      const { _position, ...restConfig } = config;
      const configClean = { ...restConfig, _position: node.position };
      const stepName = (node.data?.step_name as string) ?? existing?.step_name ?? null;
      const payload = {
        automation_id: automationId,
        step_order: index,
        step_type: stepType,
        step_name: stepName,
        config_json: configClean,
        condition_json: condition,
      };
      if (existing) {
        await supabase
          .from('automation_steps')
          .update({ step_order: payload.step_order, step_type: payload.step_type, step_name: payload.step_name, config_json: payload.config_json, condition_json: payload.condition_json })
          .eq('id', nodeId)
          .eq('automation_id', automationId);
      } else {
        await supabase.from('automation_steps').insert(payload);
      }
    }

    const { data: updated } = await supabase
      .from('automation_steps')
      .select('id, step_order, step_type, step_name, config_json, condition_json')
      .eq('automation_id', automationId)
      .order('step_order', { ascending: true });

    return NextResponse.json({ steps: updated ?? [] });
  } catch (err) {
    return handleApiError(err, 'automations/steps/PUT');
  }
}
