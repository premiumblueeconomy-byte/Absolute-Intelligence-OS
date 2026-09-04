-- Semantic/vector search (Phase 3/4). This migration only adds storage and
-- a similarity query function — nothing here calls an embeddings API.
-- Anthropic's API does not serve embeddings, so this feature needs a
-- separate provider (the embed-text edge function defaults to OpenAI's
-- text-embedding-3-small, 1536 dimensions) and an EMBEDDING_API_KEY secret
-- set on the Supabase project before it does anything. Until that secret is
-- set, embedding stays null on every row and semantic search returns
-- nothing to search over — it fails loudly (the edge function returns a
-- clear error), not silently with fabricated results.

alter table public.opportunities add column embedding vector(1536);
alter table public.opportunities add column embedded_at timestamptz;

-- No index yet: an ivfflat/hnsw index tuned on an empty or near-empty table
-- isn't meaningful. Add one, e.g.
--   create index opportunities_embedding_idx on public.opportunities
--     using hnsw (embedding vector_cosine_ops);
-- once there's a real volume of embedded opportunities.

/** Cosine-similarity search over already-embedded opportunities the caller can see. */
create or replace function public.match_opportunities(
  p_query_embedding vector(1536),
  p_match_count int default 10
)
returns table (id uuid, title text, summary text, project_id uuid, similarity real)
language sql stable security definer set search_path = public
as $$
  select o.id, o.title, o.summary, o.project_id,
         (1 - (o.embedding <=> p_query_embedding))::real as similarity
  from public.opportunities o
  where o.embedding is not null
    and public.project_is_accessible(o.project_id)
  order by o.embedding <=> p_query_embedding
  limit p_match_count;
$$;
