begin;

alter table public.trainers enable row level security;

revoke all privileges on table public.trainers from public, anon, authenticated;
grant select on table public.trainers to anon;
grant select, insert, update, delete on table public.trainers to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'trainers'
      and policyname = 'admins_can_read_all_trainers'
  ) then
    execute 'create policy admins_can_read_all_trainers
      on public.trainers
      for select
      to authenticated
      using (
        exists (
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
      and tablename = 'trainers'
      and policyname = 'admins_can_insert_trainers'
  ) then
    execute 'create policy admins_can_insert_trainers
      on public.trainers
      for insert
      to authenticated
      with check (
        exists (
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
      and tablename = 'trainers'
      and policyname = 'admins_can_update_trainers'
  ) then
    execute 'create policy admins_can_update_trainers
      on public.trainers
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.admin_users
          where user_id = (select auth.uid())
        )
      )
      with check (
        exists (
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
      and tablename = 'trainers'
      and policyname = 'admins_can_delete_trainers'
  ) then
    execute 'create policy admins_can_delete_trainers
      on public.trainers
      for delete
      to authenticated
      using (
        exists (
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
      and policyname = 'admins_can_upload_trainer_images'
  ) then
    execute 'create policy admins_can_upload_trainer_images
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = ''trainer-images''
        and (storage.foldername(name))[1] = ''team''
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
