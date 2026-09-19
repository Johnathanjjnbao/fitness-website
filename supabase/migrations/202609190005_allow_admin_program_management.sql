begin;

alter table public.programs enable row level security;

revoke all privileges on table public.programs from public, anon, authenticated;
grant select on table public.programs to anon;
grant select, insert, update, delete on table public.programs to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'programs'
      and policyname = 'admins_can_read_all_programs'
  ) then
    execute 'create policy admins_can_read_all_programs
      on public.programs
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
      and tablename = 'programs'
      and policyname = 'admins_can_insert_programs'
  ) then
    execute 'create policy admins_can_insert_programs
      on public.programs
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
      and tablename = 'programs'
      and policyname = 'admins_can_update_programs'
  ) then
    execute 'create policy admins_can_update_programs
      on public.programs
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
      and tablename = 'programs'
      and policyname = 'admins_can_delete_programs'
  ) then
    execute 'create policy admins_can_delete_programs
      on public.programs
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
end;
$$;

commit;
