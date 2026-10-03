-- Additive migration. Run in Supabase SQL Editor as the database owner.
-- No existing website or giveaway tables are modified.
begin;
create table if not exists public.edu_users (
  telegram_id bigint primary key check (telegram_id > 0), first_name text not null default '', username text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.edu_memberships (
  user_id bigint primary key references public.edu_users(telegram_id) on delete cascade,
  active boolean not null default false, checked_at timestamptz, version bigint not null default 0
);
create table if not exists public.edu_login_tokens (
  token_hash text primary key, user_id bigint not null references public.edu_users(telegram_id) on delete cascade,
  expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.edu_sessions (
  token_hash text primary key, user_id bigint not null references public.edu_users(telegram_id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days', created_at timestamptz not null default now()
);
create index if not exists edu_sessions_user on public.edu_sessions(user_id);
create table if not exists public.edu_rate_limits (key text primary key, hits integer not null, reset_at timestamptz not null);
create table if not exists public.edu_webhook_updates (id bigint primary key, completed boolean not null default false, lease_until timestamptz not null, created_at timestamptz not null default now());
create table if not exists public.edu_courses (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), title text not null, summary text not null default '',
  level text not null check (level in ('beginner','intermediate','advanced')),
  access text not null default 'public' check (access in ('public','free_member','premium')),
  published boolean not null default false, position integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.edu_sections (
  id text primary key, course_id text not null references public.edu_courses(id) on delete cascade,
  title text not null, position integer not null default 0, unique(id,course_id)
);
create table if not exists public.edu_lessons (
  id text primary key, course_id text not null references public.edu_courses(id) on delete cascade,
  section_id text not null, slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), title text not null,
  summary text not null default '', access text check (access in ('public','free_member','premium')),
  published boolean not null default false, position integer not null default 0, duration_seconds integer not null default 0 check(duration_seconds >= 0),
  unique(course_id,slug), foreign key(section_id,course_id) references public.edu_sections(id,course_id) on delete cascade
);
-- Bodies and storage paths live separately from public curriculum metadata.
create table if not exists public.edu_lesson_content (
  lesson_id text primary key references public.edu_lessons(id) on delete cascade,
  body text not null default '', video_path text, download_path text
);
create table if not exists public.edu_progress (
  user_id bigint not null references public.edu_users(telegram_id) on delete cascade,
  lesson_id text not null references public.edu_lessons(id) on delete cascade,
  opened_at timestamptz not null default now(), completed_at timestamptz, watched_seconds integer not null default 0,
  updated_at timestamptz not null default now(), primary key(user_id,lesson_id)
);

create or replace function public.edu_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql set search_path = public as $$
declare n integer;
begin
  insert into edu_rate_limits(key,hits,reset_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
  on conflict(key) do update set hits=case when edu_rate_limits.reset_at<=now() then 1 else edu_rate_limits.hits+1 end,
  reset_at=case when edu_rate_limits.reset_at<=now() then now()+make_interval(secs=>p_seconds) else edu_rate_limits.reset_at end returning hits into n;
  return n<=p_limit;
end $$;

create or replace function public.edu_set_membership(p_user bigint,p_active boolean,p_version bigint) returns boolean
language plpgsql set search_path = public as $$
begin
  insert into edu_memberships(user_id) values(p_user) on conflict do nothing;
  update edu_memberships set active=p_active,checked_at=now() where user_id=p_user and version=p_version;
  return found;
end $$;
create or replace function public.edu_invalidate_membership(p_user bigint) returns void
language plpgsql set search_path = public as $$
begin
  insert into edu_memberships(user_id,active,checked_at,version) select p_user,false,null,1 where exists(select 1 from edu_users where telegram_id=p_user)
  on conflict(user_id) do update set active=false,checked_at=null,version=edu_memberships.version+1;
end $$;
create or replace function public.edu_redeem_login(p_token text,p_session text) returns boolean
language plpgsql set search_path = public as $$
declare u bigint;
begin
  update edu_login_tokens set used_at=now() where token_hash=p_token and used_at is null and expires_at>now() returning user_id into u;
  if u is null then return false; end if;
  perform 1 from edu_memberships where user_id=u and active=true and checked_at>now()-interval '1 minute' for update;
  if not found then raise exception 'Membership requires verification'; end if;
  insert into edu_sessions(token_hash,user_id) values(p_session,u);
  return true;
end $$;
create or replace function public.edu_claim_update(p_id bigint) returns text
language plpgsql set search_path = public as $$
declare row edu_webhook_updates;
begin
  insert into edu_webhook_updates(id,lease_until) values(p_id,now()+interval '90 seconds') on conflict do nothing;
  if found then return 'claimed'; end if;
  select * into row from edu_webhook_updates where id=p_id for update;
  if row.completed then return 'done'; end if;
  if row.lease_until>now() then return 'busy'; end if;
  update edu_webhook_updates set lease_until=now()+interval '90 seconds' where id=p_id;
  return 'claimed';
end $$;
create or replace function public.edu_save_progress(p_user bigint,p_lesson text,p_seconds integer,p_complete boolean) returns void
language plpgsql set search_path = public as $$
begin
  insert into edu_progress(user_id,lesson_id,watched_seconds,completed_at) values(p_user,p_lesson,greatest(0,p_seconds),case when p_complete then now() else null end)
  on conflict(user_id,lesson_id) do update set watched_seconds=greatest(edu_progress.watched_seconds,excluded.watched_seconds),
  completed_at=coalesce(edu_progress.completed_at,excluded.completed_at),updated_at=now();
end $$;

-- Transactional content editor. Omitting a lesson does NOT delete progress or existing content.
create or replace function public.edu_save_course(p_course jsonb) returns void
language plpgsql set search_path = public as $$
declare s jsonb; l jsonb; cid text := p_course->>'id';
begin
  insert into edu_courses(id,title,summary,level,access,published,position) values(cid,p_course->>'title',p_course->>'summary',p_course->>'level',p_course->>'access',(p_course->>'published')::boolean,(p_course->>'position')::integer)
  on conflict(id) do update set title=excluded.title,summary=excluded.summary,level=excluded.level,access=excluded.access,published=excluded.published,position=excluded.position,updated_at=now();
  for s in select * from jsonb_array_elements(p_course->'sections') loop
    if exists(select 1 from edu_sections where id=s->>'id' and course_id<>cid) then raise exception 'Section belongs to another course'; end if;
    insert into edu_sections(id,course_id,title,position) values(s->>'id',cid,s->>'title',(s->>'position')::integer)
    on conflict(id) do update set title=excluded.title,position=excluded.position;
    for l in select * from jsonb_array_elements(s->'lessons') loop
      if exists(select 1 from edu_lessons where id=l->>'id' and course_id<>cid) then raise exception 'Lesson belongs to another course'; end if;
      insert into edu_lessons(id,course_id,section_id,slug,title,summary,access,published,position,duration_seconds)
      values(l->>'id',cid,s->>'id',l->>'slug',l->>'title',coalesce(l->>'summary',''),l->>'access',(l->>'published')::boolean,(l->>'position')::integer,(l->>'duration_seconds')::integer)
      on conflict(id) do update set section_id=excluded.section_id,slug=excluded.slug,title=excluded.title,summary=excluded.summary,access=excluded.access,published=excluded.published,position=excluded.position,duration_seconds=excluded.duration_seconds;
      insert into edu_lesson_content(lesson_id,body,video_path,download_path) values(l->>'id',coalesce(l->>'body',''),l->>'video_path',l->>'download_path')
      on conflict(lesson_id) do update set body=excluded.body,video_path=excluded.video_path,download_path=excluded.download_path;
    end loop;
  end loop;
end $$;

-- Server service-role access only. No browser reads, writes or RPC calls are allowed.
do $$ declare t text; f record; begin
  foreach t in array array['edu_users','edu_memberships','edu_login_tokens','edu_sessions','edu_rate_limits','edu_webhook_updates','edu_courses','edu_sections','edu_lessons','edu_lesson_content','edu_progress'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('edu_rate_limit','edu_set_membership','edu_invalidate_membership','edu_redeem_login','edu_claim_update','edu_save_progress','edu_save_course') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;

-- Private bucket; do not add public SELECT policies to this bucket.
insert into storage.buckets(id,name,public) values('course-assets','course-assets',false) on conflict(id) do nothing;
