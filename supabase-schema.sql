-- =====================================================
-- المشروع رقم 2 ميديا باير: Abdelaziz Tamer (النسخة 2)
-- =====================================================
create table if not exists p2_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null unique,
  duration_min int not null default 30 check (duration_min between 5 and 240),
  created_at timestamptz not null default now()
);

create table if not exists p2_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid unique references p2_slots(id) on delete restrict,
  slot_starts_at timestamptz not null,
  duration_min int not null,
  name text not null,
  phone text not null,
  activity text not null,
  status text not null default 'new' check (status in ('new','confirmed','done','cancelled')),
  meeting_link text,
  created_at timestamptz not null default now()
);

create table if not exists p2_briefs (
  id uuid primary key default gen_random_uuid(),
  client_name text,
  brand_name text,
  phone text,
  answers jsonb not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint p2_briefs_size check (pg_column_size(answers) < 200000)
);

create table if not exists p2_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

create table if not exists p2_admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  name text not null default '',
  password_hash text not null,
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login timestamptz
);

insert into p2_settings (key, value) values
  ('site', '{"lang":"en","theme":"light","whatsapp":"201041249535","wa_show":true,"marquee_speed":1,"logo_speed":1}'),
  ('content', '{}')
on conflict (key) do nothing;

alter table p2_slots enable row level security;
alter table p2_bookings enable row level security;
alter table p2_briefs enable row level security;
alter table p2_settings enable row level security;
alter table p2_admins enable row level security;

drop policy if exists p2_settings_read on p2_settings;
create policy p2_settings_read on p2_settings for select to anon using (key in ('site','content','brief'));
drop policy if exists p2_briefs_insert on p2_briefs;
create policy p2_briefs_insert on p2_briefs for insert to anon with check (is_read = false);
grant select on p2_settings to anon;
grant insert on p2_briefs to anon;

create or replace view p2_open_slots as
  select s.id, s.starts_at, s.duration_min
  from p2_slots s
  where s.starts_at > now()
    and not exists (select 1 from p2_bookings b where b.slot_id = s.id);
grant select on p2_open_slots to anon;

create or replace function p2_book_slot(p_slot uuid, p_name text, p_phone text, p_activity text)
returns json language plpgsql security definer set search_path = public as $$
declare s p2_slots; bid uuid;
begin
  if length(trim(coalesce(p_name,''))) not between 2 and 100
     or length(trim(coalesce(p_phone,''))) not between 8 and 30
     or length(trim(coalesce(p_activity,''))) not between 1 and 300 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into s from p2_slots where id = p_slot and starts_at > now() for update;
  if not found then
    return json_build_object('ok', false, 'error', 'slot_unavailable');
  end if;
  if exists (select 1 from p2_bookings where slot_id = p_slot) then
    return json_build_object('ok', false, 'error', 'slot_taken');
  end if;
  insert into p2_bookings (slot_id, slot_starts_at, duration_min, name, phone, activity)
  values (s.id, s.starts_at, s.duration_min, trim(p_name), trim(p_phone), trim(p_activity))
  returning id into bid;
  return json_build_object('ok', true, 'id', bid);
end $$;
revoke all on function p2_book_slot(uuid, text, text, text) from public;
grant execute on function p2_book_slot(uuid, text, text, text) to anon;

-- STORAGE: bucket للصور والخطوط (قراءة عامة، الرفع من الداشبورد بس)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('p2-assets', 'p2-assets', true, 5242880,
  array['image/png','image/jpeg','image/webp','image/gif','font/woff2','font/woff','font/ttf','font/otf'])
on conflict (id) do update set public = true, file_size_limit = 5242880;
