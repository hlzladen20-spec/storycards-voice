-- Keep the server's directory separate from Supabase's internal auth tables.
create table public.usage_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null check(length(email)<=320),
 last_seen_at timestamptz not null default now()
);
alter table public.usage_accounts enable row level security;
revoke all on public.usage_accounts from public,anon,authenticated;
grant select,insert,update on public.usage_accounts to service_role;
insert into public.usage_accounts(user_id,email)
 select id,email from auth.users where email_confirmed_at is not null and email is not null;
comment on table public.usage_accounts is 'Verified server-maintained account directory for usage reports. Not exposed to clients.';
create or replace function public.admin_usage_report(from_time timestamptz,to_time timestamptz,feature_filter text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if to_time<=from_time or to_time-from_time>interval '366 days' then raise exception 'invalid_report_range';end if;
 with measured as (
  select e.*,case when e.kind='session' then e.status not in ('closed','provider_error')
    else e.status in ('pending','incomplete','missing_usage') or (e.status='provider_error' and e.total_tokens is null) end as unresolved
  from public.ai_usage_events e where e.created_at>=from_time and e.created_at<to_time
    and (feature_filter is null or e.feature=feature_filter)
 ), totals as (
  select coalesce(sum(total_tokens),0) as total_tokens,coalesce(sum(input_tokens),0) as input_tokens,
   coalesce(sum(output_tokens),0) as output_tokens,count(*) filter(where unresolved) as unresolved from measured
 ), users as (
  select u.user_id as user_id,u.email,coalesce(sum(e.total_tokens),0) as total_tokens,
   coalesce(sum(e.input_tokens),0) as input_tokens,coalesce(sum(e.output_tokens),0) as output_tokens,
   coalesce(sum(e.cached_tokens),0) as cached_tokens,count(e.id) filter(where e.unresolved) as unresolved
  from public.usage_accounts u left join measured e on e.user_id=u.user_id group by u.user_id,u.email
 ), breakdown as (
  select to_char(e.created_at at time zone 'UTC','YYYY-MM-DD') as day,e.user_id,u.email,e.feature,e.model,
   count(*) filter(where e.kind<>'session') as requests,coalesce(sum(e.input_tokens),0) as input_tokens,
   coalesce(sum(e.output_tokens),0) as output_tokens,coalesce(sum(e.total_tokens),0) as total_tokens,
   coalesce(sum(e.cached_tokens),0) as cached_tokens,coalesce(sum(e.audio_input_tokens),0) as audio_input_tokens,
   coalesce(sum(e.audio_output_tokens),0) as audio_output_tokens,coalesce(sum(e.audio_seconds),0) as audio_seconds,
   count(*) filter(where e.unresolved) as unresolved
  from measured e left join public.usage_accounts u on u.user_id=e.user_id group by day,e.user_id,u.email,e.feature,e.model
 )
 select jsonb_build_object('totals',(select to_jsonb(t) from totals t),
  'users',coalesce((select jsonb_agg(to_jsonb(u) order by total_tokens desc,email) from users u),'[]'::jsonb),
  'breakdown',coalesce((select jsonb_agg(to_jsonb(b) order by day desc,email,feature,model) from breakdown b),'[]'::jsonb)) into result;
 return result;
end;
$$;
revoke all on function public.admin_usage_report(timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_usage_report(timestamptz,timestamptz,text) to service_role;
