begin;

alter table public.site_settings enable row level security;

revoke all privileges on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon;
grant select, update on table public.site_settings to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'admins_can_read_site_settings'
  ) then
    execute 'create policy admins_can_read_site_settings
      on public.site_settings
      for select
      to authenticated
      using (
        id = 1
        and exists (
          select 1
          from public.admin_users
          where user_id = (select auth.uid())
        )
      )';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'admins_can_update_site_settings'
  ) then
    execute 'create policy admins_can_update_site_settings
      on public.site_settings
      for update
      to authenticated
      using (
        id = 1
        and exists (
          select 1
          from public.admin_users
          where user_id = (select auth.uid())
        )
      )
      with check (
        id = 1
        and exists (
          select 1
          from public.admin_users
          where user_id = (select auth.uid())
        )
      )';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'admins_can_upload_homepage_images'
  ) then
    execute 'create policy admins_can_upload_homepage_images
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = ''trainer-images''
        and (storage.foldername(name))[1] = ''homepage''
        and exists (
          select 1
          from public.admin_users
          where user_id = (select auth.uid())
        )
      )';
  end if;
end;
$$;

commit;
