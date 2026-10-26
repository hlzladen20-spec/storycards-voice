-- Run once in this project's Supabase SQL Editor. No service_role key is needed.
begin;
create table if not exists public.learning_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check(version > 0),
  updated_at timestamptz not null default now(),
  constraint learning_snapshot_object check(jsonb_typeof(payload)='object'),
  constraint learning_snapshot_size check(octet_length(payload::text)<=5000000)
);
alter table public.learning_snapshots enable row level security;
revoke all on public.learning_snapshots from public, anon, authenticated;
grant select, insert, update on public.learning_snapshots to authenticated;
drop policy if exists learning_read_own on public.learning_snapshots;
drop policy if exists learning_insert_own on public.learning_snapshots;
drop policy if exists learning_update_own on public.learning_snapshots;
create policy learning_read_own on public.learning_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);
create policy learning_insert_own on public.learning_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy learning_update_own on public.learning_snapshots for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Compare-and-swap prevents silent last-writer-wins data loss between devices.
create or replace function public.save_learning_snapshot(expected_version bigint, new_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.learning_snapshots;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if expected_version=0 then
    insert into public.learning_snapshots(user_id,payload,version)
    values(auth.uid(),new_payload,1) on conflict(user_id) do nothing returning * into saved;
  else
    update public.learning_snapshots set payload=new_payload, version=version+1, updated_at=now()
    where user_id=auth.uid() and version=expected_version returning * into saved;
  end if;
  if saved.user_id is null then raise exception 'sync_conflict' using errcode='40001'; end if;
  return jsonb_build_object('version',saved.version,'updated_at',saved.updated_at);
end;
$$;
revoke all on function public.save_learning_snapshot(bigint,jsonb) from public, anon;
grant execute on function public.save_learning_snapshot(bigint,jsonb) to authenticated;
commit;
