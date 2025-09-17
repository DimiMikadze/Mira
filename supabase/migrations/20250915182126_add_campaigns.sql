-- Enum for sources
create type public.source as enum ('crawl', 'linkedin', 'google');

-- Table
create table public."Campaign" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,

  -- Array of objects -> store as JSONB; keep validation light
  datapoints jsonb not null default '[]'::jsonb,
  -- Multiple sources per campaign
  sources public.source[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Minimal shape validation
alter table public."Campaign"
  add constraint campaign_datapoints_is_array check (jsonb_typeof(datapoints) = 'array');

-- Indexes
create index campaign_user_id_idx on public."Campaign" (user_id);
create index campaign_sources_gin_idx on public."Campaign" using gin (sources);
create index campaign_datapoints_gin_idx on public."Campaign" using gin (datapoints jsonb_path_ops);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_campaign_updated_at
before update on public."Campaign"
for each row execute function public.set_updated_at();

-- RLS
alter table public."Campaign" enable row level security;

create policy "Owners can select own campaigns"
  on public."Campaign" for select
  using (auth.uid() = user_id);

create policy "Owners can insert campaigns"
  on public."Campaign" for insert
  with check (auth.uid() = user_id);

create policy "Owners can update own campaigns"
  on public."Campaign" for update
  using (auth.uid() = user_id);

create policy "Owners can delete own campaigns"
  on public."Campaign" for delete
  using (auth.uid() = user_id);