-- Research-to-Enterprise Engine (section 20): upload a research paper and
-- extract a structured commercialization assessment, not just a summary.

create table public.research_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text not null default '',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  -- { title, authors, researchQuestion, methodology, materials, results,
  --   findings, limitations, technology, trl, novelty, potentialApplications,
  --   potentialProducts, commercialOpportunities, requiredValidation,
  --   potentialIp, potentialCustomers, commercializationRoadmap }
  extraction jsonb,
  created_at timestamptz not null default now()
);

alter table public.research_documents enable row level security;

create policy "research_documents_select_own" on public.research_documents
  for select using (auth.uid() = user_id);
create policy "research_documents_insert_own" on public.research_documents
  for insert with check (auth.uid() = user_id);
create policy "research_documents_update_own" on public.research_documents
  for update using (auth.uid() = user_id);
create policy "research_documents_delete_own" on public.research_documents
  for delete using (auth.uid() = user_id);

create index research_documents_project_id_idx on public.research_documents(project_id);

-- Private storage bucket for the uploaded files themselves.
insert into storage.buckets (id, name, public)
values ('research-documents', 'research-documents', false)
on conflict (id) do nothing;

create policy "research_documents_storage_select_own" on storage.objects
  for select using (bucket_id = 'research-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "research_documents_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'research-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "research_documents_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'research-documents' and auth.uid()::text = (storage.foldername(name))[1]);
