/**
 * Text chunking for knowledge ingestion. Splits content into overlapping or fixed-size chunks
 * suitable for embedding and vector search.
 */

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 100;
const MAX_CHUNK_SIZE = 2000;

export type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
};

/**
 * Split text into chunks by size with optional overlap. Tries to break on sentence or paragraph boundaries.
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const chunkSize = Math.min(
    options.chunkSize ?? DEFAULT_CHUNK_SIZE,
    MAX_CHUNK_SIZE
  );
  const overlap = Math.min(
    options.overlap ?? DEFAULT_CHUNK_OVERLAP,
    Math.floor(chunkSize / 2)
  );

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized.length) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    let slice = normalized.slice(start, end);

    if (end < normalized.length) {
      const lastNewline = slice.lastIndexOf('\n');
      const lastPeriod = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n')
      );
      const breakAt = Math.max(lastNewline, lastPeriod);
      if (breakAt > chunkSize / 2) {
        end = start + breakAt + 1;
        slice = normalized.slice(start, end);
      }
    }

    if (slice.trim()) chunks.push(slice.trim());
    start = end - overlap;
    if (start >= normalized.length) break;
  }

  return chunks;
}
