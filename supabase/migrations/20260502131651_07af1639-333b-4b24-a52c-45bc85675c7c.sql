
-- Tables
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('single', 'album')),
  user_name text,
  is_anonymous boolean default false,
  caption text,
  album_title text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  file_url text not null,
  type text not null check (type in ('photo', 'video')),
  created_at timestamp with time zone not null default now()
);

create index idx_media_upload_id on public.media(upload_id);
create index idx_uploads_status_created on public.uploads(status, created_at desc);

-- RLS
alter table public.uploads enable row level security;
alter table public.media enable row level security;

-- uploads: anyone can insert
create policy "Anyone can submit uploads"
  on public.uploads for insert
  to anon, authenticated
  with check (true);

-- uploads: only approved are visible publicly
create policy "Anyone can view approved uploads"
  on public.uploads for select
  to anon, authenticated
  using (status = 'approved');

-- media: anyone can insert
create policy "Anyone can submit media"
  on public.media for insert
  to anon, authenticated
  with check (true);

-- media: only media linked to approved uploads is visible
create policy "Anyone can view media of approved uploads"
  on public.media for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.uploads u
      where u.id = media.upload_id and u.status = 'approved'
    )
  );

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do nothing;

-- Storage policies for 'memories' bucket
create policy "Public can read memories"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'memories');

create policy "Anyone can upload memories"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'memories');
