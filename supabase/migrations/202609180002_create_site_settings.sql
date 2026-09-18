begin;

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  brand_name text not null,
  brand_display text not null,
  phone_display text not null,
  phone_e164 text not null,
  email text not null,
  address_short_vi text not null,
  address_short_ko text not null,
  address_full_vi text not null,
  address_full_ko text not null,
  hours_vi text not null,
  hours_ko text not null,
  footer_copy_vi text not null,
  footer_copy_ko text not null
);

insert into public.site_settings (
  id,
  brand_name,
  brand_display,
  phone_display,
  phone_e164,
  email,
  address_short_vi,
  address_short_ko,
  address_full_vi,
  address_full_ko,
  hours_vi,
  hours_ko,
  footer_copy_vi,
  footer_copy_ko
)
values (
  1,
  'FORGEFIT',
  'FORGE//FIT',
  '028 7300 8898',
  '+842873008898',
  'hello@forgefit.vn',
  '18 Nguyễn Cơ Thạch, TP. Thủ Đức',
  '호찌민시 투득시 응우옌꺼탁 거리 18',
  E'18 Nguyễn Cơ Thạch, P. An Lợi Đông\nTP. Thủ Đức, TP. Hồ Chí Minh',
  E'호찌민시 투득시 안러이동\n응우옌꺼탁 거리 18',
  E'Thứ Hai – Thứ Sáu: 06:00 – 21:00\nThứ Bảy – Chủ Nhật: 07:00 – 18:00',
  E'월요일–금요일: 06:00–21:00\n토요일–일요일: 07:00–18:00',
  'Không gian huấn luyện cá nhân hiện đại dành cho những người muốn tập đúng, tiến bộ thật và sống khỏe bền vững.',
  '정확하게 운동하고, 확실하게 발전하며, 건강한 삶을 오래 이어가고 싶은 분들을 위한 현대적인 퍼스널 트레이닝 공간입니다.'
)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

revoke all privileges on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'anon_can_read_site_settings'
  ) then
    execute 'create policy anon_can_read_site_settings
      on public.site_settings
      for select
      to anon
      using (id = 1)';
  end if;
end;
$$;

commit;
