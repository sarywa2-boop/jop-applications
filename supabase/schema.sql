create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source text not null,
  title text not null,
  company text,
  location text,
  url text not null,
  description text,
  posted_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (source, external_id)
);
create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);
create index if not exists jobs_source_idx on public.jobs (source);
alter table public.jobs enable row level security;
create policy "public can read jobs" on public.jobs for select using (true);
