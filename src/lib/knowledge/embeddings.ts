/**
 * Generate embeddings via OpenAI for knowledge chunks. Used for ingestion and for query embedding in search.
 */

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey });

  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error('Invalid embedding response');
  }
  return embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey });

  const input = texts.map((t) => t.slice(0, 8000));
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input,
  });

  const sorted = response.data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return sorted.map((d) => {
    const e = d.embedding;
    if (!e || e.length !== EMBEDDING_DIMENSIONS) throw new Error('Invalid embedding');
    return e;
  });
}

export { EMBEDDING_DIMENSIONS, OPENAI_EMBEDDING_MODEL };
