-- Additive only: existing learning_snapshots and all learning data are untouched.
create table public.ai_usage_events (
 id uuid primary key,
 event_key text not null unique check(length(event_key)<=300),
 user_id uuid references auth.users(id) on delete set null,
 feature text not null check(length(feature)<=80),
 model text not null check(length(model)<=120),
 kind text not null check(kind in ('request','session','event')),
 status text not null check(status in ('pending','monitoring','closed','recorded','missing_usage','incomplete','provider_error')),
 provider_id text,
 input_tokens bigint check(input_tokens>=0), output_tokens bigint check(output_tokens>=0),
 total_tokens bigint check(total_tokens>=0), cached_tokens bigint check(cached_tokens>=0),
 audio_input_tokens bigint check(audio_input_tokens>=0), audio_output_tokens bigint check(audio_output_tokens>=0),
 text_input_tokens bigint check(text_input_tokens>=0), text_output_tokens bigint check(text_output_tokens>=0),
 audio_seconds double precision check(audio_seconds>=0),
 created_at timestamptz not null default now(), finished_at timestamptz
);
create index ai_usage_user_time_idx on public.ai_usage_events(user_id,created_at);
create index ai_usage_time_idx on public.ai_usage_events(created_at);
alter table public.ai_usage_events enable row level security;
revoke all on public.ai_usage_events from public,anon,authenticated;
grant select,insert,update on public.ai_usage_events to service_role;
comment on table public.ai_usage_events is 'Server-observed usage only. No prompts, transcripts, access tokens or API keys. NULL token counts are unknown, not zero.';

create function public.admin_usage_report(from_time timestamptz,to_time timestamptz,feature_filter text default null)
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
  select u.id as user_id,u.email,coalesce(sum(e.total_tokens),0) as total_tokens,
   coalesce(sum(e.input_tokens),0) as input_tokens,coalesce(sum(e.output_tokens),0) as output_tokens,
   coalesce(sum(e.cached_tokens),0) as cached_tokens,count(e.id) filter(where e.unresolved) as unresolved
  from auth.users u left join measured e on e.user_id=u.id group by u.id,u.email
 ), breakdown as (
  select to_char(e.created_at at time zone 'UTC','YYYY-MM-DD') as day,e.user_id,u.email,e.feature,e.model,
   count(*) filter(where e.kind<>'session') as requests,coalesce(sum(e.input_tokens),0) as input_tokens,
   coalesce(sum(e.output_tokens),0) as output_tokens,coalesce(sum(e.total_tokens),0) as total_tokens,
   coalesce(sum(e.cached_tokens),0) as cached_tokens,coalesce(sum(e.audio_input_tokens),0) as audio_input_tokens,
   coalesce(sum(e.audio_output_tokens),0) as audio_output_tokens,coalesce(sum(e.audio_seconds),0) as audio_seconds,
   count(*) filter(where e.unresolved) as unresolved
  from measured e left join auth.users u on u.id=e.user_id group by day,e.user_id,u.email,e.feature,e.model
 )
 select jsonb_build_object('totals',(select to_jsonb(t) from totals t),
  'users',coalesce((select jsonb_agg(to_jsonb(u) order by total_tokens desc,email) from users u),'[]'::jsonb),
  'breakdown',coalesce((select jsonb_agg(to_jsonb(b) order by day desc,email,feature,model) from breakdown b),'[]'::jsonb)) into result;
 return result;
end;
$$;
revoke all on function public.admin_usage_report(timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_usage_report(timestamptz,timestamptz,text) to service_role;
