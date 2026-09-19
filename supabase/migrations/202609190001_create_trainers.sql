begin;

create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name_vi text not null check (btrim(name_vi) <> ''),
  name_ko text not null check (btrim(name_ko) <> ''),
  title_vi text not null check (btrim(title_vi) <> ''),
  title_ko text not null check (btrim(title_ko) <> ''),
  bio_vi text not null check (btrim(bio_vi) <> ''),
  bio_ko text not null check (btrim(bio_ko) <> ''),
  credentials_vi text[] not null default '{}'::text[],
  credentials_ko text[] not null default '{}'::text[],
  image_url text not null check (btrim(image_url) <> ''),
  image_position_percent smallint not null default 50
    check (image_position_percent between 0 and 100),
  display_order integer not null check (display_order > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trainers is
  'Bilingual trainer profiles displayed on the Vietnamese and Korean trainer pages.';

create index if not exists trainers_active_display_order_idx
  on public.trainers (display_order, id)
  where active = true;

create or replace function public.set_trainers_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_trainers_updated_at()
  from public, anon, authenticated;

create or replace trigger set_trainers_updated_at
before update on public.trainers
for each row
execute function public.set_trainers_updated_at();

insert into public.trainers (
  id,
  name_vi,
  name_ko,
  title_vi,
  title_ko,
  bio_vi,
  bio_ko,
  credentials_vi,
  credentials_ko,
  image_url,
  image_position_percent,
  display_order,
  active
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'Trần Minh Anh',
    '쩐 민 아인',
    'Head Coach · Strength',
    '수석 코치 · 근력 훈련',
    'Chuyên xây dựng nền tảng sức mạnh và kỹ thuật tập tạ cho người mới.',
    '운동을 처음 시작하는 회원의 기초 근력과 정확한 웨이트 트레이닝 자세를 전문적으로 지도합니다.',
    array['NASM-CPT', 'Strength Coach', '6 năm kinh nghiệm'],
    array['NASM-CPT', '근력 전문 코치', '경력 6년'],
    'assets/images/trainer-team.png',
    16,
    1,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'Nguyễn Hoàng Nam',
    '응우옌 호앙 남',
    'Performance Coach',
    '운동 능력 전문 코치',
    'Hỗ trợ học viên tăng hiệu suất, sức bền và khả năng vận động toàn diện.',
    '전반적인 운동 능력과 지구력, 안정적인 움직임을 높일 수 있도록 체계적으로 지도합니다.',
    array['ACE-CPT', 'Sports Performance', '8 năm kinh nghiệm'],
    array['ACE-CPT', '스포츠 퍼포먼스', '경력 8년'],
    'assets/images/trainer-team.png',
    50,
    2,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'Lê Thảo Vy',
    '레 타오 비',
    'Mobility · Body Composition',
    '가동성 · 체형 개선',
    'Đồng hành cùng dân văn phòng cải thiện chuyển động và xây dựng hình thể khỏe khoắn.',
    '직장인의 뻣뻣한 움직임을 개선하고 건강하고 탄탄한 체형을 만들 수 있도록 돕습니다.',
    array['ISSA-CPT', 'Mobility Specialist', '5 năm kinh nghiệm'],
    array['ISSA-CPT', '가동성 전문가', '경력 5년'],
    'assets/images/trainer-team.png',
    86,
    3,
    true
  )
on conflict (id) do nothing;

alter table public.trainers enable row level security;

revoke all privileges on table public.trainers from public, anon, authenticated;
grant usage on schema public to anon;
grant select on table public.trainers to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'trainers'
      and policyname = 'anon_can_read_active_trainers'
  ) then
    execute 'create policy anon_can_read_active_trainers
      on public.trainers
      for select
      to anon
      using (active = true)';
  end if;
end;
$$;

commit;
