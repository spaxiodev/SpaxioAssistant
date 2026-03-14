/**
 * Knowledge ingestion: create documents, chunks, and embeddings from text.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { chunkText } from './chunking';
import { getEmbeddings } from './embeddings';
import { OPENAI_EMBEDDING_MODEL } from './embeddings';

const MAX_TEXT_LENGTH = 500_000;

export type IngestDocumentInput = {
  sourceId: string;
  title?: string | null;
  content: string;
  externalId?: string | null;
  metadata?: Record<string, unknown>;
  embed?: boolean;
};

export type IngestResult = {
  documentId: string;
  chunksCreated: number;
  embeddingsCreated: number;
};

/**
 * Ingest a document: insert document, chunk content, optionally generate and store embeddings.
 */
export async function ingestDocument(
  supabase: SupabaseClient,
  input: IngestDocumentInput
): Promise<IngestResult> {
  const content = input.content.slice(0, MAX_TEXT_LENGTH).trim();
  if (!content) {
    const { data: doc } = await supabase
      .from('knowledge_documents')
      .insert({
        source_id: input.sourceId,
        external_id: input.externalId ?? null,
        title: input.title ?? null,
        content_text: '',
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single();
    return {
      documentId: doc?.id ?? '',
      chunksCreated: 0,
      embeddingsCreated: 0,
    };
  }

  const { data: doc, error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      source_id: input.sourceId,
      external_id: input.externalId ?? null,
      title: input.title ?? null,
      content_text: content,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (docError || !doc) {
    throw new Error(docError?.message ?? 'Failed to create document');
  }

  const chunks = chunkText(content);
  let embeddingsCreated = 0;

  for (let i = 0; i < chunks.length; i++) {
    const { data: chunk, error: chunkError } = await supabase
      .from('knowledge_chunks')
      .insert({
        document_id: doc.id,
        content: chunks[i],
        chunk_index: i,
        metadata: {},
      })
      .select('id')
      .single();

    if (chunkError || !chunk) continue;

    if (input.embed !== false) {
      try {
        const [embedding] = await getEmbeddings([chunks[i]]);
        await supabase.from('document_embeddings').insert({
          chunk_id: chunk.id,
          embedding,
          model_id: OPENAI_EMBEDDING_MODEL,
        });
        embeddingsCreated++;
      } catch (err) {
        console.warn('[knowledge/ingest] Embedding failed for chunk', chunk.id, err);
      }
    }
  }

  return {
    documentId: doc.id,
    chunksCreated: chunks.length,
    embeddingsCreated,
  };
}

/**
 * Ingest in batch: generate all embeddings in one OpenAI call, then insert (more efficient for many chunks).
 */
export async function ingestDocumentBatchEmbed(
  supabase: SupabaseClient,
  input: IngestDocumentInput
): Promise<IngestResult> {
  const content = input.content.slice(0, MAX_TEXT_LENGTH).trim();
  if (!content) {
    const { data: doc } = await supabase
      .from('knowledge_documents')
      .insert({
        source_id: input.sourceId,
        external_id: input.externalId ?? null,
        title: input.title ?? null,
        content_text: '',
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single();
    return {
      documentId: doc?.id ?? '',
      chunksCreated: 0,
      embeddingsCreated: 0,
    };
  }

  const { data: doc, error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      source_id: input.sourceId,
      external_id: input.externalId ?? null,
      title: input.title ?? null,
      content_text: content,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (docError || !doc) {
    throw new Error(docError?.message ?? 'Failed to create document');
  }

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    return { documentId: doc.id, chunksCreated: 0, embeddingsCreated: 0 };
  }

  const chunkRows = await Promise.all(
    chunks.map((content, i) =>
      supabase
        .from('knowledge_chunks')
        .insert({ document_id: doc.id, content, chunk_index: i, metadata: {} })
        .select('id')
        .single()
    )
  );

  const entries = chunkRows
    .map((r, i) => ({ index: i, id: r.data?.id }))
    .filter((e): e is { index: number; id: string } => !!e.id);
  const sorted = entries.sort((a, b) => a.index - b.index);
  const chunkIds = sorted.map((e) => e.id);
  const chunksToEmbed = sorted.map((e) => chunks[e.index]);

  if (input.embed !== false && chunkIds.length > 0) {
    try {
      const embeddings = await getEmbeddings(chunksToEmbed);
      for (let i = 0; i < Math.min(chunkIds.length, embeddings.length); i++) {
        await supabase.from('document_embeddings').insert({
          chunk_id: chunkIds[i],
          embedding: embeddings[i],
          model_id: OPENAI_EMBEDDING_MODEL,
        });
      }
      return {
        documentId: doc.id,
        chunksCreated: chunks.length,
        embeddingsCreated: Math.min(chunkIds.length, embeddings.length),
      };
    } catch (err) {
      console.warn('[knowledge/ingest] Batch embed failed', err);
    }
  }

  return {
    documentId: doc.id,
    chunksCreated: chunks.length,
    embeddingsCreated: 0,
  };
}
