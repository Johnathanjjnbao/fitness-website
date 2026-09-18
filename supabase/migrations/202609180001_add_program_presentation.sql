begin;

alter table public.programs
  add column if not exists features_vi text[] not null default '{}'::text[],
  add column if not exists features_ko text[] not null default '{}'::text[],
  add column if not exists featured boolean not null default false,
  add column if not exists badge_vi text,
  add column if not exists badge_ko text;

-- Copy the existing Vietnamese and Korean benefits without changing other fields.
update public.programs
set
  features_vi = array[
    'Đánh giá thể lực ban đầu',
    '4 buổi huấn luyện 1:1',
    'Giáo án cơ bản cá nhân hóa',
    'Hướng dẫn kỹ thuật nền tảng'
  ],
  features_ko = array[
    '초기 체력 평가',
    '1:1 트레이닝 4회',
    '기초 맞춤 운동 계획',
    '기본 자세 지도'
  ]
where id = '00000000-0000-4000-8000-000000000001'
  and cardinality(features_vi) = 0
  and cardinality(features_ko) = 0;

update public.programs
set
  features_vi = array[
    'Đánh giá và đo chỉ số chuyên sâu',
    '12 buổi huấn luyện 1:1',
    'Giáo án cập nhật theo tuần',
    'Hướng dẫn dinh dưỡng cơ bản',
    'Báo cáo tiến bộ giữa kỳ'
  ],
  features_ko = array[
    '세부 체력 및 신체 지표 평가',
    '1:1 트레이닝 12회',
    '주별 맞춤 계획 업데이트',
    '기초 영양 가이드',
    '중간 변화 리포트'
  ],
  featured = true,
  badge_vi = 'Phổ biến nhất',
  badge_ko = '가장 인기 있는 선택'
where id = '00000000-0000-4000-8000-000000000002'
  and cardinality(features_vi) = 0
  and cardinality(features_ko) = 0;

update public.programs
set
  features_vi = array[
    'Toàn bộ quyền lợi gói Bứt phá',
    '24 buổi huấn luyện 1:1',
    'Theo dõi thói quen hằng tuần',
    '2 lần đánh giá lại toàn diện',
    'Hỗ trợ trực tuyến giữa các buổi'
  ],
  features_ko = array[
    '도약 이용권의 모든 혜택',
    '1:1 트레이닝 24회',
    '주간 생활 습관 점검',
    '종합 재평가 2회',
    '세션 사이 온라인 상담'
  ]
where id = '00000000-0000-4000-8000-000000000003'
  and cardinality(features_vi) = 0
  and cardinality(features_ko) = 0;

-- A featured package must have a visible label in both languages.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.programs'::regclass
      and conname = 'programs_featured_badges_check'
  ) then
    alter table public.programs
      add constraint programs_featured_badges_check
      check (
        not featured or (
          coalesce(btrim(badge_vi), '') <> ''
          and coalesce(btrim(badge_ko), '') <> ''
        )
      );
  end if;
end;
$$;

commit;
