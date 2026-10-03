-- Run once in your Supabase SQL editor. Never expose service_role keys in the browser.
create table if not exists public.giveaways (
 id uuid primary key,data jsonb not null,status text not null check(status in ('draft','open','paused','closed')),
 starts_at timestamptz not null,ends_at timestamptz not null,updated_at timestamptz not null default now(),check(ends_at>starts_at)
);
create table if not exists public.giveaway_entries (
 id uuid primary key default gen_random_uuid(),giveaway_id uuid not null references public.giveaways(id),
 name text not null,email text not null,created_at timestamptz not null default now(),unique(giveaway_id,email)
);
create index if not exists giveaway_entry_email_time on public.giveaway_entries(email,created_at);
alter table public.giveaways enable row level security;
alter table public.giveaway_entries enable row level security;
revoke all on public.giveaways,public.giveaway_entries from anon,authenticated;
create or replace function public.enter_giveaway(p_id uuid,p_name text,p_email text) returns boolean
language plpgsql security invoker set search_path=public as $$
declare g public.giveaways; affected integer;
begin
 -- Serialize duplicate/daily-limit checks for this email and lock the giveaway against pause/close races.
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)),0));
 select * into g from public.giveaways where id=p_id for update;
 if not found or g.status<>'open' or now()<g.starts_at or now()>=g.ends_at then return false; end if;
 if (select count(*) from public.giveaway_entries where email=lower(trim(p_email)) and created_at>now()-interval '1 day')>=10 then return false;end if;
 insert into public.giveaway_entries(giveaway_id,name,email) values(p_id,p_name,lower(trim(p_email))) on conflict(giveaway_id,email) do nothing;
 get diagnostics affected=row_count;return affected=1;
end;
$$;
revoke all on function public.enter_giveaway(uuid,text,text) from public,anon,authenticated;
grant execute on function public.enter_giveaway(uuid,text,text) to service_role;
