/**
 * Model routing: abstract LLM provider so agents can choose provider/model.
 * Current implementation: OpenAI only. Extend with Anthropic, OpenRouter when needed.
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionOptions = {
  max_tokens?: number;
  temperature?: number;
};

export type ChatCompletionResult = {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

/**
 * Returns a chat completion from the configured provider.
 * provider='openai' uses OPENAI_API_KEY and the given model_id (e.g. gpt-4o-mini).
 */
export async function getChatCompletion(
  provider: string,
  modelId: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const effectiveProvider = (provider || 'openai').toLowerCase();
  if (effectiveProvider === 'openai') {
    return openaiChatCompletion(modelId, messages, options);
  }
  // TODO: anthropic, openrouter
  return openaiChatCompletion(modelId, messages, options);
}

async function openaiChatCompletion(
  modelId: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: modelId || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: options.max_tokens ?? 500,
    temperature: options.temperature ?? 0.7,
  });
  const choice = completion.choices[0];
  const content = choice?.message?.content?.trim() ?? '';
  return {
    content,
    model: completion.model ?? modelId,
    usage: completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
        }
      : undefined,
  };
}
