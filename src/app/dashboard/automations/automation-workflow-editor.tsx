'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  Panel,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Save, Loader2 } from 'lucide-react';
import { getTriggerLabel } from '@/lib/automations/labels';
import { STEP_TYPES } from '@/lib/automations/types';
import { getStepTypeLabel } from '@/lib/automations/labels';
import { nodeTypes } from './workflow-nodes';
import { StepEditDialog } from './step-edit-dialog';
import type { AutomationStepRecord } from './step-edit-dialog';

const TRIGGER_ID = 'trigger';

type StepRow = {
  id: string;
  step_order: number;
  step_type: string;
  step_name: string | null;
  config_json: Record<string, unknown>;
  condition_json: Record<string, unknown> | null;
  position: { x: number; y: number };
};

type Props = {
  automationId: string;
  triggerType: string;
  onClose?: () => void;
};

function stepRowToNode(row: StepRow): Node {
  const config = row.config_json ?? {};
  const actionType = config.action_type as string | undefined;
  return {
    id: row.id,
    type: 'step',
    position: row.position,
    data: {
      stepType: row.step_type,
      stepName: row.step_name,
      actionType,
      config_json: row.config_json,
      condition_json: row.condition_json,
    },
  };
}

function stepsToNodesAndEdges(
  steps: StepRow[],
  triggerLabel: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: TRIGGER_ID,
      type: 'trigger',
      position: { x: 250, y: 0 },
      data: { label: triggerLabel },
    },
  ];
  const edges: Edge[] = [];
  steps
    .sort((a, b) => a.step_order - b.step_order)
    .forEach((s, i) => {
      nodes.push(stepRowToNode(s));
      if (i === 0) edges.push({ id: `${TRIGGER_ID}-${s.id}`, source: TRIGGER_ID, target: s.id });
      else edges.push({ id: `${steps[i - 1].id}-${s.id}`, source: steps[i - 1].id, target: s.id });
    });
  return { nodes, edges };
}

export function AutomationWorkflowEditor({ automationId, triggerType, onClose }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [editingStep, setEditingStep] = useState<AutomationStepRecord | null>(null);

  const triggerLabel = getTriggerLabel(triggerType);

  const loadSteps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/automations/${automationId}/steps`);
      if (!res.ok) throw new Error('Failed to load steps');
      const data = await res.json();
      const stepRows: StepRow[] = (data.steps ?? []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        step_order: s.step_order as number,
        step_type: s.step_type as string,
        step_name: s.step_name as string | null,
        config_json: (s.config_json as Record<string, unknown>) ?? {},
        condition_json: (s.condition_json as Record<string, unknown>) ?? null,
        position: (s.position as { x: number; y: number }) ?? { x: 0, y: 0 },
      }));
      setSteps(stepRows);
      const { nodes: n, edges: e } = stepsToNodesAndEdges(stepRows, triggerLabel);
      setNodes(n);
      setEdges(e);
    } catch {
      toast({ title: 'Error', description: 'Could not load workflow steps', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [automationId, triggerLabel, setNodes, setEdges, toast]);

  useEffect(() => {
    loadSteps();
  }, [loadSteps]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const addBlock = useCallback(
    (stepType: (typeof STEP_TYPES)[number]) => {
      const newId = `step-new-${crypto.randomUUID()}`;
      const lastStep = nodes.filter((n) => n.type === 'step').pop();
      const position = lastStep
        ? { x: lastStep.position.x, y: lastStep.position.y + 120 }
        : { x: 250, y: 120 };
      const newNode: Node = {
        id: newId,
        type: 'step',
        position,
        data: {
          stepType,
          stepName: null,
          actionType: stepType === 'action' ? 'send_email_notification' : undefined,
          config_json: stepType === 'action' ? { action_type: 'send_email_notification', action_config: {} } : stepType === 'delay' ? { delay_seconds: 0 } : {},
          condition_json: stepType === 'branch_if' ? { path: 'lead.email', value: '' } : null,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      if (nodes.length === 1) {
        setEdges((eds) => [...eds, { id: `${TRIGGER_ID}-${newId}`, source: TRIGGER_ID, target: newId }]);
      } else if (lastStep) {
        setEdges((eds) => [...eds, { id: `${lastStep.id}-${newId}`, source: lastStep.id, target: newId }]);
      }
    },
    [nodes, setNodes, setEdges]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const stepNodes = nodes.filter((n) => n.type === 'step') as Node<{
        stepType: string;
        stepName?: string | null;
        actionType?: string;
        config_json?: Record<string, unknown>;
        condition_json?: Record<string, unknown> | null;
      }>[];
      const payload = {
        nodes: [
          { id: TRIGGER_ID, type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          ...stepNodes.map((n) => ({
            id: n.id,
            type: 'step',
            position: n.position,
            data: {
              step_type: n.data.stepType,
              step_name: n.data.stepName,
              config_json: n.data.config_json ?? {},
              condition_json: n.data.condition_json ?? null,
            },
          })),
        ],
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      };
      const res = await fetch(`/api/automations/${automationId}/steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save');
      }
      toast({ title: 'Workflow saved' });
      await loadSteps();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save workflow',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [automationId, nodes, edges, loadSteps, toast]);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type !== 'step' || !node.id) return;
      const stepData = node.data as {
        stepType: string;
        stepName?: string | null;
        actionType?: string;
        config_json?: Record<string, unknown>;
        condition_json?: Record<string, unknown> | null;
      };
      setEditingStep({
        id: node.id,
        automation_id: automationId,
        step_order: 0,
        step_type: stepData.stepType,
        step_name: stepData.stepName ?? null,
        config_json: stepData.config_json ?? {},
        condition_json: stepData.condition_json ?? null,
      });
    },
    [automationId]
  );

  const handleStepSave = useCallback(
    (updated: AutomationStepRecord) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== updated.id) return n;
          const cfg = updated.config_json ?? {};
          const actionType = cfg.action_type as string | undefined;
          return {
            ...n,
            data: {
              ...n.data,
              stepName: updated.step_name,
              actionType,
              config_json: updated.config_json,
              condition_json: updated.condition_json,
            },
          };
        })
      );
      setEditingStep(null);
    },
    [setNodes]
  );

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border border-border bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full rounded-lg border border-border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={['Backspace', 'Delete']}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-left" className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary">
                <Plus className="mr-2 h-4 w-4" />
                Add block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {STEP_TYPES.map((stepType) => (
                <DropdownMenuItem key={stepType} onClick={() => addBlock(stepType)}>
                  {getStepTypeLabel(stepType)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save workflow
          </Button>
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </Panel>
      </ReactFlow>
      <StepEditDialog
        open={!!editingStep}
        step={editingStep}
        onClose={() => setEditingStep(null)}
        onSave={handleStepSave}
      />
    </div>
  );
}
