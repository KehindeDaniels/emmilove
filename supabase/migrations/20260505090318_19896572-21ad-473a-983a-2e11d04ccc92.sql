alter table public.uploads 
add column if not exists source text not null default 'guest' 
check (source in ('guest', 'couple'));