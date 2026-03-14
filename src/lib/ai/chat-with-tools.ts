/**
 * Tool-calling loop for chat: call OpenAI with tools, execute tool_calls, re-call until no more tool_calls or max iterations.
 */

import type OpenAI from 'openai';
import { getTool, getTools } from '@/lib/tools/registry';
import type { ToolContext } from '@/lib/tools/types';

const MAX_TOOL_LOOP_ITERATIONS = 8;

/** Map our parameter type to JSON schema type */
function paramTypeToJsonSchema(t: string): string {
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'object') return t;
  return 'string';
}

/**
 * Build OpenAI tools array from enabled tool ids (for chat.completions.create).
 */
export function buildOpenAIToolsSchema(enabledToolIds: string[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const tools = getTools(enabledToolIds.length ? enabledToolIds : undefined);
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.id,
      description: t.description,
      parameters: {
        type: 'object' as const,
        properties: Object.fromEntries(
          t.parameters.map((p) => [
            p.name,
            {
              type: paramTypeToJsonSchema(p.type),
              description: p.description ?? undefined,
            },
          ])
        ),
        required: t.parameters.filter((p) => p.required).map((p) => p.name),
      },
    },
  }));
}

export type ChatWithToolsOptions = {
  openai: OpenAI;
  modelId: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  toolContext: ToolContext;
  maxTokens?: number;
  temperature?: number;
  maxIterations?: number;
  /** Called once per tool execution (for usage/billing). */
  onToolRun?: () => void | Promise<void>;
  /** Called per tool invocation for audit/agent run logging. */
  onToolInvocation?: (params: {
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    status: 'success' | 'failed';
  }) => void | Promise<void>;
};

/**
 * Run chat completion with tool-calling loop. Returns the final assistant text content.
 */
export async function runChatWithToolsLoop(options: ChatWithToolsOptions): Promise<string> {
  const {
    openai,
    modelId,
    tools,
    toolContext,
    maxTokens = 500,
    temperature = 0.7,
    maxIterations = MAX_TOOL_LOOP_ITERATIONS,
    onToolRun,
    onToolInvocation,
  } = options;

  let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [...options.messages];
  let iterations = 0;

  while (iterations < maxIterations) {
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      max_tokens: maxTokens,
      temperature,
    });

    const choice = completion.choices[0];
    const message = choice?.message;
    if (!message) {
      return 'Sorry, I could not generate a response.';
    }

    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const content = message.content;
      if (typeof content === 'string' && content.trim()) {
        return content.trim();
      }
      if (Array.isArray(content) && content.length > 0) {
        const text = content
          .filter((c): c is { type: 'text'; text: { value: string } } => c.type === 'text')
          .map((c) => c.text?.value ?? '')
          .join('')
          .trim();
        if (text) return text;
      }
      return 'Sorry, I could not generate a response.';
    }

    // Append assistant message with tool_calls to conversation
    messages = [
      ...messages,
      {
        role: 'assistant' as const,
        content: message.content ?? null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      },
    ];

    // Execute each tool call and append tool results
    for (const tc of toolCalls) {
      const toolId = tc.function?.name;
      const argsStr = tc.function?.arguments ?? '{}';
      let toolResult: string;
      let params: Record<string, unknown> = {};
      try {
        params = JSON.parse(argsStr);
      } catch {
        params = {};
      }
      try {
        const tool = toolId ? getTool(toolId) : undefined;
        if (!tool) {
          toolResult = JSON.stringify({ error: 'Unknown tool', toolId });
          await onToolInvocation?.({ toolName: toolId ?? 'unknown', input: params, output: { error: 'Unknown tool' }, status: 'failed' });
        } else {
          const result = await tool.execute(params, toolContext);
          toolResult = typeof result === 'string' ? result : JSON.stringify(result);
          await onToolInvocation?.({ toolName: toolId, input: params, output: result, status: 'success' });
        }
        await onToolRun?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toolResult = JSON.stringify({ error: message });
        await onToolInvocation?.({ toolName: toolId ?? 'unknown', input: params, output: { error: message }, status: 'failed' });
      }
      messages = [
        ...messages,
        {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: toolResult.slice(0, 4000),
        },
      ];
    }

    iterations++;
  }

  return "I've used the available tools but reached the limit of steps. Please ask again in a shorter way if you need more.";
}
