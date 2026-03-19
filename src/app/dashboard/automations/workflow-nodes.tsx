'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, Clock, GitBranch, UserCheck, Mail, Webhook, Send } from 'lucide-react';
import { getStepTypeLabel, getActionLabel } from '@/lib/automations/labels';

const TRIGGER_STYLE =
  'rounded-lg border-2 border-amber-500/80 bg-amber-500/10 px-4 py-3 min-w-[180px] shadow-sm';
const STEP_STYLE =
  'rounded-lg border border-border bg-card px-4 py-3 min-w-[160px] shadow-sm hover:border-primary/50';

const iconClass = 'h-4 w-4 shrink-0 text-muted-foreground';

function TriggerNodeInner({ data }: { data: { label?: string } }) {
  return (
    <div className={TRIGGER_STYLE}>
      <div className="flex items-center gap-2">
        <Zap className={`${iconClass} text-amber-600`} />
        <span className="font-medium text-sm">{data.label ?? 'Trigger'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bottom-[-6px]" />
    </div>
  );
}

export const TriggerNode = memo(function TriggerNode(props: NodeProps) {
  return <TriggerNodeInner data={props.data} />;
});

function StepNodeInner({
  data,
}: {
  data: {
    stepType: string;
    stepName?: string | null;
    actionType?: string;
  };
}) {
  const { stepType, stepName, actionType } = data;
  const label = stepName || getStepTypeLabel(stepType);
  const sublabel = stepType === 'action' && actionType ? getActionLabel(actionType) : null;

  const Icon =
    stepType === 'delay'
      ? Clock
      : stepType === 'branch_if'
        ? GitBranch
        : stepType === 'human_approval'
          ? UserCheck
          : stepType === 'action'
            ? actionType === 'send_email_notification'
              ? Mail
              : actionType === 'send_follow_up_message' || actionType === 'generate_followup_draft' || actionType === 'send_internal_summary' || actionType === 'schedule_followup'
                ? Send
              : Webhook
            : Zap;

  return (
    <div className={STEP_STYLE}>
      <Handle type="target" position={Position.Top} className="!top-[-6px]" />
      <div className="flex items-center gap-2">
        <Icon className={iconClass} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bottom-[-6px]" />
    </div>
  );
}

export const StepNode = memo(function StepNode(props: NodeProps) {
  return <StepNodeInner data={props.data as Parameters<typeof StepNodeInner>[0]['data']} />;
});

export const nodeTypes = {
  trigger: TriggerNode,
  step: StepNode,
};
