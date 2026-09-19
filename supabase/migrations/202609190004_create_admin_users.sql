begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all privileges on table public.admin_users from public, anon, authenticated;
grant select on table public.admin_users to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'admins_can_read_own_access'
  ) then
    execute 'create policy admins_can_read_own_access
      on public.admin_users
      for select
      to authenticated
      using ((select auth.uid()) = user_id)';
  end if;
end;
$$;

commit;
