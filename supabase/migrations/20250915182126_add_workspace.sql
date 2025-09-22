-- Table
create table public."Workspace" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,

  -- Array of objects -> store as JSONB; keep validation light
  datapoints jsonb not null default '[]'::jsonb,
  
  -- Sources configuration
  source_crawl boolean not null default false,
  source_linkedin boolean not null default false,
  source_google boolean not null default false,

  -- Analysis configuration
  analysis_executive_summary boolean not null default false,
  analysis_company_criteria text,

  -- Outreach configuration
  outreach_linkedin boolean not null default false,
  outreach_email boolean not null default false,
  outreach_prompt text,

  -- Bulk processing configuration
  csv_file_url text,
  generated_csv_file_url text,
  run_status text check (run_status in ('idle', 'running', 'done', 'failed', 'canceled')) default 'idle',
  csv_mapping jsonb,
  run_started_at timestamptz,
  run_finished_at timestamptz,
  run_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Minimal shape validation
alter table public."Workspace"
  add constraint workspace_datapoints_is_array check (jsonb_typeof(datapoints) = 'array');

-- Indexes
create index workspace_user_id_idx on public."Workspace" (user_id);
create index workspace_datapoints_gin_idx on public."Workspace" using gin (datapoints jsonb_path_ops);
create index workspace_csv_mapping_gin_idx on public."Workspace" using gin (csv_mapping jsonb_path_ops);
create index workspace_run_status_idx on public."Workspace" (run_status);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_workspace_updated_at
before update on public."Workspace"
for each row execute function public.set_updated_at();

-- RLS
alter table public."Workspace" enable row level security;

create policy "Owners can select own Workspaces"
  on public."Workspace" for select
  using (auth.uid() = user_id);

create policy "Owners can insert Workspaces"
  on public."Workspace" for insert
  with check (auth.uid() = user_id);

create policy "Owners can update own Workspaces"
  on public."Workspace" for update
  using (auth.uid() = user_id);

create policy "Owners can delete own Workspaces"
  on public."Workspace" for delete
  using (auth.uid() = user_id);

-- Create CSV storage bucket
insert into storage.buckets (id, name, public)
values ('CSV', 'CSV', true);

-- Storage policies for CSV bucket
create policy "Users can upload CSV files"
  on storage.objects for insert
  with check (bucket_id = 'CSV' AND auth.uid() is not null);

create policy "Users can view CSV files"
  on storage.objects for select
  using (bucket_id = 'CSV' AND auth.uid() is not null);

create policy "Users can update their own CSV files"
  on storage.objects for update
  using (bucket_id = 'CSV' AND auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own CSV files"
  on storage.objects for delete
  using (bucket_id = 'CSV' AND auth.uid()::text = (storage.foldername(name))[1]);