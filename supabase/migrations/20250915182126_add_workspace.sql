-- Enum for sources
create type public.source as enum ('crawl', 'linkedin', 'google');

-- Table
create table public."Workspace" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,

  -- Array of objects -> store as JSONB; keep validation light
  datapoints jsonb not null default '[]'::jsonb,
  -- Multiple sources per Workspace
  sources public.source[] not null default '{}',

  -- New: company criteria as plain text
  company_criteria text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Minimal shape validation
alter table public."Workspace"
  add constraint workspace_datapoints_is_array check (jsonb_typeof(datapoints) = 'array');

-- Indexes
create index workspace_user_id_idx on public."Workspace" (user_id);
create index workspace_sources_gin_idx on public."Workspace" using gin (sources);
create index workspace_datapoints_gin_idx on public."Workspace" using gin (datapoints jsonb_path_ops);

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