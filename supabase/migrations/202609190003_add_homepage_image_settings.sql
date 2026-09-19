begin;

alter table public.site_settings
  add column if not exists homepage_image_url text,
  add column if not exists homepage_image_position_percent smallint default 50;

alter table public.site_settings
  alter column homepage_image_position_percent set default 50;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_homepage_image_position_percent_check'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_homepage_image_position_percent_check
      check (homepage_image_position_percent between 0 and 100);
  end if;
end;
$$;

update public.site_settings
set homepage_image_url = 'team/trainer-1.png'
where id = 1
  and nullif(btrim(homepage_image_url), '') is null;

update public.site_settings
set homepage_image_position_percent = 50
where id = 1
  and homepage_image_position_percent is null;

commit;
