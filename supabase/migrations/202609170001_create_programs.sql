begin;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name_vi text not null check (btrim(name_vi) <> ''),
  name_ko text not null check (btrim(name_ko) <> ''),
  description_vi text not null check (btrim(description_vi) <> ''),
  description_ko text not null check (btrim(description_ko) <> ''),
  price_vnd integer not null check (price_vnd >= 0),
  display_order integer not null check (display_order > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_display_order_key unique (display_order)
);

comment on table public.programs is
  'Bilingual fitness packages displayed on the pricing pages.';

create index if not exists programs_active_display_order_idx
  on public.programs (active, display_order);

create or replace function public.set_programs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger set_programs_updated_at
before update on public.programs
for each row
execute function public.set_programs_updated_at();

insert into public.programs (
  id,
  name_vi,
  name_ko,
  description_vi,
  description_ko,
  price_vnd,
  display_order,
  active
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Khởi động',
    '시작',
    '4 buổi · sử dụng trong 30 ngày',
    '4회 · 30일 이내 사용',
    3600000,
    1,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Bứt phá',
    '도약',
    '12 buổi · sử dụng trong 8 tuần',
    '12회 · 8주 이내 사용',
    9600000,
    2,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Chuyển đổi',
    '변화',
    '24 buổi · sử dụng trong 16 tuần',
    '24회 · 16주 이내 사용',
    17400000,
    3,
    true
  )
on conflict (id) do nothing;

alter table public.programs enable row level security;

revoke all privileges on table public.programs from public, anon, authenticated;
grant select on table public.programs to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'programs'
      and policyname = 'anon_can_read_active_programs'
  ) then
    execute 'create policy anon_can_read_active_programs
      on public.programs
      for select
      to anon
      using (active = true)';
  end if;
end;
$$;

commit;
