-- Multiverso Girls · Fundação: perfis, administradores, bloqueios e notificações.
--
-- Estas tabelas são o mínimo exigido pelos módulos de rolês, grupos, chats e
-- moderação. Se você já tem `profiles` de uma modelagem anterior, o script é
-- idempotente: apenas garante as colunas usadas pelos módulos seguintes.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Motoqueira',
  avatar_url text,
  bio text,
  city text,
  state text,
  status text not null default 'pending',
  suspended_until timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text not null default 'Motoqueira';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists privacy_accepted_at timestamptz;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'suspended', 'banned', 'deleted'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Motoqueira'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- admin_users
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security; -- sem policies: só via funções

-- ------------------------------------------------------------------ blocks
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

create policy blocks_select_own on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());
-- criação de bloqueio: RPC block_user (limpa solicitações pendentes junto)

-- ----------------------------------------------------- funções de apoio (RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- "Ativa" = aprovada e sem suspensão em vigor (suspensão temporária expira sozinha).
create or replace function public.is_active_member(uid uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and (
        p.status = 'approved'
        or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until < now())
      )
  );
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Eu bloqueei "other"?
create or replace function public.i_blocked(other uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = other);
$$;

-- "other" me bloqueou?
create or replace function public.is_blocked_by(other uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.blocks where blocker_id = other and blocked_id = auth.uid());
$$;

-- --------------------------------------------------------- profiles · RLS
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (public.is_active_member() and status <> 'deleted' and not public.is_blocked_by(id))
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- A usuária só edita dados de perfil; status/suspensão são exclusivos da moderação.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar_url, bio, city, state) on public.profiles to authenticated;

-- ----------------------------------------------------------- notificações
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- Uso interno (triggers/RPCs) — não é exposta como RPC (ver migration de grants).
create or replace function public.push_notification(
  p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null
)
returns void
language sql security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
$$;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ride-images', 'ride-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('group-covers', 'group-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuária escreve apenas na própria pasta ({uid}/arquivo).
create policy "ride_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ride-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );
create policy "ride_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ride-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "group_covers_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );
create policy "group_covers_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'group-covers' and (storage.foldername(name))[1] = auth.uid()::text);
