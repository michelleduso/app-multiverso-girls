-- Multiverso Girls · Grupos de motoqueiras

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  description text check (description is null or char_length(description) <= 1000),
  cover_url text,
  city text check (city is null or char_length(city) between 2 and 80),
  state char(2),
  region text check (region is null or char_length(region) <= 80),
  category text not null default 'outros' check (category in (
    'cidade_regiao', 'modelo_moto', 'iniciantes', 'viagens', 'encontros', 'estilo_pilotagem', 'outros'
  )),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  rules text check (rules is null or char_length(rules) <= 2000),
  status text not null default 'active' check (status in ('active', 'suspended')),
  member_count int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index groups_city_idx on public.groups (state, city);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'pending')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- ----------------------------------------------------- funções de apoio (RLS)
create or replace function public.is_group_member(gid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = uid and status = 'active'
  );
$$;

create or replace function public.is_group_admin(gid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = uid and status = 'active' and role = 'admin'
  );
$$;

-- --------------------------------------------------------------------- RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Todas as aprovadas enxergam os grupos (para poder pedir entrada); o conteúdo
-- (chat, membros, rolês) segue restrito às integrantes.
create policy groups_select on public.groups
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_active_member() and (status = 'active' or created_by = auth.uid()))
  );

create policy groups_insert on public.groups
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_active_member());

create policy groups_update_admins on public.groups
  for update to authenticated
  using (public.is_group_admin(id) and public.is_active_member())
  with check (public.is_group_admin(id));

revoke insert, update on public.groups from authenticated, anon;
grant insert (name, description, cover_url, city, state, region, category, visibility, rules, created_by)
  on public.groups to authenticated;
grant update (name, description, cover_url, city, state, region, category, visibility, rules)
  on public.groups to authenticated;

create policy group_members_select on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_group_admin(group_id)
    or (status = 'active' and public.is_group_member(group_id))
  );
-- escrita apenas via RPC (join_group, respond_group_join, ...)

-- ----------------------------------------------------------------- triggers
-- Quem cria o grupo vira administradora. (Nome com "z" para rodar depois da
-- criação da conversa do grupo, definida na migration de chat.)
create or replace function public.groups_add_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id, role, status)
    values (new.id, new.created_by, 'admin', 'active');
  end if;
  return new;
end;
$$;
create trigger groups_z_creator_member
  after insert on public.groups
  for each row execute function public.groups_add_creator();

create or replace function public.group_members_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare gid uuid := coalesce(new.group_id, old.group_id);
begin
  update public.groups
     set member_count = (select count(*) from public.group_members where group_id = gid and status = 'active')
   where id = gid;
  return null;
end;
$$;
create trigger group_members_count_trg
  after insert or update or delete on public.group_members
  for each row execute function public.group_members_count();

-- -------------------------------------------------------------------- RPCs
create or replace function public.join_group(p_group uuid)
returns text language plpgsql security definer set search_path = public as $$
declare g public.groups; me uuid := auth.uid(); v_status text; v_name text; a record;
begin
  if not public.is_active_member() then raise exception 'Conta sem permissão para entrar em grupos.'; end if;
  select * into g from public.groups where id = p_group and status = 'active';
  if not found then raise exception 'Grupo não encontrado.'; end if;

  select status into v_status from public.group_members where group_id = p_group and user_id = me;
  if found then return v_status; end if;

  v_status := case when g.visibility = 'public' then 'active' else 'pending' end;
  insert into public.group_members (group_id, user_id, role, status) values (p_group, me, 'member', v_status);

  if v_status = 'pending' then
    select display_name into v_name from public.profiles where id = me;
    for a in select user_id from public.group_members where group_id = p_group and role = 'admin' and status = 'active' loop
      perform public.push_notification(a.user_id, 'group_request', 'Novo pedido de entrada',
        v_name || ' quer entrar em ' || g.name, '/grupos/' || p_group || '/membros');
    end loop;
  end if;
  return v_status;
end;
$$;

create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_role text;
begin
  select role into v_role from public.group_members where group_id = p_group and user_id = me;
  if not found then return; end if;
  if v_role = 'admin'
     and not exists (select 1 from public.group_members where group_id = p_group and user_id <> me and role = 'admin' and status = 'active')
     and exists (select 1 from public.group_members where group_id = p_group and user_id <> me and status = 'active') then
    raise exception 'Defina outra administradora antes de sair do grupo.';
  end if;
  delete from public.group_members where group_id = p_group and user_id = me;
end;
$$;

create or replace function public.respond_group_join(p_group uuid, p_user uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare g_name text;
begin
  if not (public.is_group_admin(p_group) and public.is_active_member()) then
    raise exception 'Apenas administradoras podem aprovar membros.';
  end if;
  select name into g_name from public.groups where id = p_group;
  if p_accept then
    update public.group_members set status = 'active', joined_at = now()
     where group_id = p_group and user_id = p_user and status = 'pending';
    perform public.push_notification(p_user, 'group_approved', 'Entrada aprovada',
      'Você agora faz parte de ' || g_name, '/grupos/' || p_group);
  else
    delete from public.group_members where group_id = p_group and user_id = p_user and status = 'pending';
    perform public.push_notification(p_user, 'group_declined', 'Pedido não aprovado',
      'Seu pedido para entrar em ' || g_name || ' não foi aprovado.', '/grupos');
  end if;
end;
$$;

create or replace function public.remove_group_member(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_group_admin(p_group) and public.is_active_member()) then
    raise exception 'Apenas administradoras podem remover membros.';
  end if;
  if public.is_group_admin(p_group, p_user) then
    raise exception 'Remova o cargo de administradora antes de remover esta pessoa.';
  end if;
  delete from public.group_members where group_id = p_group and user_id = p_user;
end;
$$;

create or replace function public.set_group_admin(p_group uuid, p_user uuid, p_make_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_group_admin(p_group) and public.is_active_member()) then
    raise exception 'Apenas administradoras podem alterar cargos.';
  end if;
  if not p_make_admin
     and not exists (select 1 from public.group_members where group_id = p_group and user_id <> p_user and role = 'admin' and status = 'active') then
    raise exception 'O grupo precisa ter ao menos uma administradora.';
  end if;
  update public.group_members set role = case when p_make_admin then 'admin' else 'member' end
   where group_id = p_group and user_id = p_user and status = 'active';
end;
$$;

-- ---------------------------------------------------------------- storage
-- (bucket `group-covers` criado na migration de fundação)
