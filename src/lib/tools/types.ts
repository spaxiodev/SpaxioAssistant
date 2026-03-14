/**
 * Tool definitions and execution context for the agent tools framework.
 */

export type ToolContext = {
  organizationId: string;
  supabase: import('@supabase/supabase-js').SupabaseClient;
  /** Optional: conversation id when tool is run during chat */
  conversationId?: string | null;
  /** Optional: agent id for tool run */
  agentId?: string | null;
  /** Optional: widget id when run from widget chat */
  widgetId?: string | null;
};

export type ToolParameter = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description?: string;
  required?: boolean;
};

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  /** Handler returns a string or object (will be JSON stringified for agent consumption). */
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<string | Record<string, unknown>>;
};

export type ToolResult = {
  success: boolean;
  output: string;
  error?: string;
};
