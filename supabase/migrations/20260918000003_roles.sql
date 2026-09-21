-- Multiverso Girls · Rolês ("Quem pilha um rolê?")
--
-- Privacidade: o feed público só expõe a CIDADE. O ponto de encontro fica em
-- `ride_private_details`, cuja RLS só libera organizadora e participantes
-- CONFIRMADAS — nunca vai junto com a linha pública do rolê.

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text check (description is null or char_length(description) <= 1000),
  city text not null check (char_length(city) between 2 and 80),
  state char(2) not null,
  starts_at timestamptz not null,
  ride_type text not null check (ride_type in (
    'hoje', 'bate_volta', 'passeio', 'viagem', 'cafe_encontro', 'evento', 'outro'
  )),
  max_participants int check (max_participants is null or max_participants between 2 and 200),
  image_url text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  requires_approval boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  confirmed_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- rolê privado sempre passa pela aprovação da organizadora
  check (visibility = 'public' or requires_approval)
);
create index rides_starts_idx on public.rides (starts_at) where status <> 'cancelled';
create index rides_city_idx on public.rides (state, city);
create index rides_group_idx on public.rides (group_id) where group_id is not null;

create table public.ride_participants (
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
create index ride_participants_user_idx on public.ride_participants (user_id);

create table public.ride_private_details (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  meeting_point text not null check (char_length(meeting_point) between 2 and 300),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------- funções de apoio (RLS)
create or replace function public.is_ride_organizer(rid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rides where id = rid and organizer_id = uid);
$$;

create or replace function public.is_ride_participant(rid uuid, uid uuid default auth.uid(), p_status text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ride_participants
    where ride_id = rid and user_id = uid and (p_status is null or status = p_status)
  );
$$;

-- Fonte única da regra "posso ver este rolê?" (RLS e RPCs usam a mesma).
create or replace function public.can_view_ride(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.rides r
    where r.id = rid
      and (
        r.organizer_id = auth.uid()
        or (
          public.is_active_member()
          and not public.is_blocked_between(r.organizer_id, auth.uid())
          and (
            (r.visibility = 'public' and (r.group_id is null or public.is_group_member(r.group_id)
                                          or (select g.visibility from public.groups g where g.id = r.group_id) = 'public'))
            or exists (select 1 from public.ride_participants p where p.ride_id = r.id and p.user_id = auth.uid())
            or (r.group_id is not null and public.is_group_member(r.group_id))
          )
        )
      )
  );
$$;

-- --------------------------------------------------------------------- RLS
alter table public.rides enable row level security;
alter table public.ride_participants enable row level security;
alter table public.ride_private_details enable row level security;

-- `organizer_id = auth.uid()` fica inline: um INSERT ... RETURNING precisa enxergar a
-- linha recém-criada, e funções STABLE não veem linhas do próprio comando.
create policy rides_select on public.rides
  for select to authenticated using (organizer_id = auth.uid() or public.can_view_ride(id));

create policy rides_insert on public.rides
  for insert to authenticated
  with check (
    organizer_id = auth.uid()
    and public.is_active_member()
    and starts_at > now() - interval '1 hour'
    and (group_id is null or public.is_group_admin(group_id))
  );

-- Só rolês abertos são editáveis; status/contagem mudam apenas por RPC/trigger.
create policy rides_update_organizer on public.rides
  for update to authenticated
  using (organizer_id = auth.uid() and status = 'open' and public.is_active_member())
  with check (organizer_id = auth.uid());

revoke insert, update on public.rides from authenticated, anon;
grant insert (organizer_id, group_id, title, description, city, state, starts_at, ride_type,
              max_participants, image_url, visibility, requires_approval)
  on public.rides to authenticated;
grant update (title, description, city, state, starts_at, ride_type,
              max_participants, image_url, visibility, requires_approval)
  on public.rides to authenticated;

create policy ride_participants_select on public.ride_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_ride_organizer(ride_id)
    or (status = 'confirmed' and public.is_ride_participant(ride_id, auth.uid(), 'confirmed'))
  );

create policy ride_details_select on public.ride_private_details
  for select to authenticated
  using (
    public.is_ride_organizer(ride_id)
    or public.is_ride_participant(ride_id, auth.uid(), 'confirmed')
  );
create policy ride_details_insert on public.ride_private_details
  for insert to authenticated with check (public.is_ride_organizer(ride_id));
create policy ride_details_update on public.ride_private_details
  for update to authenticated
  using (public.is_ride_organizer(ride_id)) with check (public.is_ride_organizer(ride_id));
create policy ride_details_delete on public.ride_private_details
  for delete to authenticated using (public.is_ride_organizer(ride_id));

-- ----------------------------------------------------------------- triggers
create or replace function public.rides_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.max_participants is not null and new.max_participants < new.confirmed_count then
    raise exception 'O limite não pode ser menor que o número de confirmadas (%).', new.confirmed_count;
  end if;
  return new;
end;
$$;
create trigger rides_touch_trg before update on public.rides
  for each row execute function public.rides_touch();

-- Organizadora entra automaticamente como participante confirmada.
-- (Nome com "z": roda depois da criação da conversa do rolê, na migration de chat.)
create or replace function public.rides_add_organizer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ride_participants (ride_id, user_id, status)
  values (new.id, new.organizer_id, 'confirmed');
  return new;
end;
$$;
create trigger rides_z_organizer_participant after insert on public.rides
  for each row execute function public.rides_add_organizer();

create or replace function public.ride_participants_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid := coalesce(new.ride_id, old.ride_id);
begin
  update public.rides
     set confirmed_count = (select count(*) from public.ride_participants where ride_id = rid and status = 'confirmed')
   where id = rid;
  return null;
end;
$$;
create trigger ride_participants_count_trg
  after insert or update or delete on public.ride_participants
  for each row execute function public.ride_participants_count();

-- "Participantes recebem informações atualizadas".
create or replace function public.rides_notify_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; v_title text; v_body text; v_type text; v_targets text[];
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    v_type := 'ride_cancelled'; v_title := 'Rolê cancelado'; v_body := new.title;
    v_targets := array['confirmed', 'pending'];
  elsif new.status = 'closed' and old.status = 'open' then
    v_type := 'ride_closed'; v_title := 'Rolê encerrado'; v_body := new.title;
    v_targets := array['confirmed'];
  elsif new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.city is distinct from old.city
     or new.state is distinct from old.state
     or new.starts_at is distinct from old.starts_at
     or new.max_participants is distinct from old.max_participants then
    v_type := 'ride_updated'; v_title := 'Rolê atualizado'; v_body := new.title || ' teve informações alteradas.';
    v_targets := array['confirmed'];
  else
    return null;
  end if;

  for p in
    select user_id from public.ride_participants
     where ride_id = new.id and user_id <> new.organizer_id and status = any (v_targets)
  loop
    perform public.push_notification(p.user_id, v_type, v_title, v_body, '/roles/' || new.id);
  end loop;
  return null;
end;
$$;
create trigger rides_notify_change_trg after update on public.rides
  for each row execute function public.rides_notify_change();

-- Aviso genérico: o endereço em si nunca vai dentro da notificação.
create or replace function public.ride_details_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; v_title text;
begin
  if tg_op = 'UPDATE' and new.meeting_point is not distinct from old.meeting_point then
    return null;
  end if;
  select title into v_title from public.rides where id = new.ride_id;
  for p in
    select rp.user_id from public.ride_participants rp
      join public.rides r on r.id = rp.ride_id
     where rp.ride_id = new.ride_id and rp.status = 'confirmed' and rp.user_id <> r.organizer_id
  loop
    perform public.push_notification(p.user_id, 'ride_meeting_point', 'Ponto de encontro atualizado',
      'Veja o ponto de encontro de ' || v_title || '.', '/roles/' || new.ride_id);
  end loop;
  return null;
end;
$$;
create trigger ride_details_notify_trg after insert or update on public.ride_private_details
  for each row execute function public.ride_details_notify();

-- -------------------------------------------------------------------- RPCs
-- Retorna o estado resultante: 'confirmed' ou 'pending'.
create or replace function public.join_ride(p_ride uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.rides; me uuid := auth.uid(); v_status text; v_name text;
begin
  if not public.is_active_member() then raise exception 'Conta sem permissão para participar de rolês.'; end if;

  select * into r from public.rides where id = p_ride for update;
  if not found or not public.can_view_ride(p_ride) then raise exception 'Rolê não encontrado.'; end if;
  if r.status <> 'open' then raise exception 'Este rolê não está mais aberto.'; end if;
  if r.starts_at < now() then raise exception 'Este rolê já aconteceu.'; end if;

  select status into v_status from public.ride_participants where ride_id = p_ride and user_id = me;
  if found then
    if v_status in ('confirmed', 'pending') then return v_status; end if;
    raise exception 'Você não pode participar deste rolê.';
  end if;

  select display_name into v_name from public.profiles where id = me;

  if r.requires_approval then
    insert into public.ride_participants (ride_id, user_id, status) values (p_ride, me, 'pending');
    perform public.push_notification(r.organizer_id, 'ride_request', 'Nova solicitação de rolê',
      v_name || ' quer participar de ' || r.title, '/roles/' || p_ride);
    return 'pending';
  end if;

  if r.max_participants is not null and r.confirmed_count >= r.max_participants then
    raise exception 'Este rolê está lotado.';
  end if;
  insert into public.ride_participants (ride_id, user_id, status) values (p_ride, me, 'confirmed');
  perform public.push_notification(r.organizer_id, 'ride_joined', 'Mais uma confirmada!',
    v_name || ' topou ' || r.title, '/roles/' || p_ride);
  return 'confirmed';
end;
$$;

create or replace function public.leave_ride(p_ride uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.is_ride_organizer(p_ride) then
    raise exception 'A organizadora não pode sair do próprio rolê. Cancele ou encerre o rolê.';
  end if;
  delete from public.ride_participants
   where ride_id = p_ride and user_id = auth.uid() and status in ('pending', 'confirmed');
end;
$$;

create or replace function public.respond_ride_participant(p_ride uuid, p_user uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rides;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found or r.organizer_id <> auth.uid() then raise exception 'Apenas a organizadora pode responder solicitações.'; end if;
  if r.status <> 'open' then raise exception 'Este rolê não está mais aberto.'; end if;
  if not exists (select 1 from public.ride_participants where ride_id = p_ride and user_id = p_user and status = 'pending') then
    raise exception 'Solicitação não encontrada.';
  end if;

  if p_accept then
    if r.max_participants is not null and r.confirmed_count >= r.max_participants then
      raise exception 'O rolê já está lotado.';
    end if;
    update public.ride_participants set status = 'confirmed' where ride_id = p_ride and user_id = p_user;
    perform public.push_notification(p_user, 'ride_accepted', 'Você está dentro!',
      'Sua participação em ' || r.title || ' foi confirmada.', '/roles/' || p_ride);
  else
    update public.ride_participants set status = 'declined' where ride_id = p_ride and user_id = p_user;
    perform public.push_notification(p_user, 'ride_declined', 'Solicitação não aprovada',
      'Sua solicitação para ' || r.title || ' não foi aprovada.', '/inicio');
  end if;
end;
$$;

create or replace function public.remove_ride_participant(p_ride uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rides;
begin
  select * into r from public.rides where id = p_ride;
  if not found or r.organizer_id <> auth.uid() then raise exception 'Apenas a organizadora pode remover participantes.'; end if;
  if p_user = r.organizer_id then raise exception 'Não é possível remover a organizadora.'; end if;
  update public.ride_participants set status = 'removed'
   where ride_id = p_ride and user_id = p_user and status in ('pending', 'confirmed');
  perform public.push_notification(p_user, 'ride_removed', 'Você foi removida de um rolê',
    'A organizadora removeu você de ' || r.title || '.', '/inicio');
end;
$$;

create or replace function public.cancel_ride(p_ride uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.rides set status = 'cancelled'
   where id = p_ride and organizer_id = auth.uid() and status = 'open';
  if not found then raise exception 'Não foi possível cancelar este rolê.'; end if;
end;
$$;

create or replace function public.close_ride(p_ride uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.rides set status = 'closed'
   where id = p_ride and organizer_id = auth.uid() and status = 'open';
  if not found then raise exception 'Não foi possível encerrar este rolê.'; end if;
end;
$$;

-- ---------------------------------------------------------------- storage
-- (bucket `ride-images` criado na migration de fundação)
