-- Supabase の SQL Editor で一度だけ実行してください
create extension if not exists pgcrypto;

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text not null,
  video_id text not null,
  channel_title text,
  thumbnail_url text,
  servings text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source_note text,
  confidence text,
  created_at timestamptz not null default now()
);

create index if not exists recipes_created_at_idx on recipes (created_at desc);

-- サーバー側（service role キー）からのみ読み書きするため、RLS を有効にしてポリシーは作りません
alter table recipes enable row level security;
