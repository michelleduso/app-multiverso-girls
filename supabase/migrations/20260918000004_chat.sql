-- Multiverso Girls · Conversas (privada, grupo, rolê) com Supabase Realtime
--
-- Acesso NUNCA é decidido pelo cliente: toda leitura/escrita em `messages`
-- passa por RLS baseada em can_access_conversation()/can_send_message().
-- O Realtime (postgres_changes) respeita a mesma RLS.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group', 'ride')),
  group_id uuid unique references public.groups (id) on delete cascade,
  ride_id uuid unique references public.rides (id) on delete cascade,
  direct_key text unique,
  pinned_message_id uuid,
  created_at timestamptz not null default now(),
  check (
    (type = 'direct' and direct_key is not null and group_id is null and ride_id is null)
    or (type = 'group' and group_id is not null and ride_id is null and direct_key is null)
    or (type = 'ride' and ride_id is not null and group_id is null and direct_key is null)
  )
);

-- Somente conversas privadas têm lista explícita de participantes.
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text check (body is null or char_length(body) <= 2000),
  image_path text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  check (deleted_at is not null or body is not null or image_path is not null),
  check (image_path is null or image_path like conversation_id::text || '/%')
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

alter table public.conversations
  add constraint conversations_pinned_fk
  foreign key (pinned_message_id) references public.messages (id) on delete set null;

create table public.chat_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  message text check (message is null or char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_id <> to_id)
);
create unique index chat_requests_one_pending_idx
  on public.chat_requests (least(from_id, to_id), greatest(from_id, to_id))
  where status = 'pending';
create index chat_requests_to_idx on public.chat_requests (to_id, status);

-- ----------------------------------------------------- funções de apoio (RLS)
create or replace function public.can_access_conversation(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_member() and exists (
    select 1 from public.conversations c
    where c.id = cid
      and (
        (c.type = 'direct' and exists (
          select 1 from public.conversation_participants p
          where p.conversation_id = c.id and p.user_id = auth.uid()))
        or (c.type = 'group' and exists (
          select 1 from public.group_members gm join public.groups g on g.id = gm.group_id
          where gm.group_id = c.group_id and gm.user_id = auth.uid()
            and gm.status = 'active' and g.status = 'active'))
        or (c.type = 'ride' and exists (
          select 1 from public.ride_participants rp
          where rp.ride_id = c.ride_id and rp.user_id = auth.uid() and rp.status = 'confirmed'))
      )
  );
$$;

create or replace function public.can_send_message(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_access_conversation(cid)
    -- conversa privada: nenhuma das duas pode ter bloqueado a outra
    and not exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = cid and p.user_id <> auth.uid()
        and public.is_blocked_between(p.user_id, auth.uid()))
    -- rolê cancelado: chat somente leitura
    and not exists (
      select 1 from public.conversations c join public.rides r on r.id = c.ride_id
      where c.id = cid and r.status = 'cancelled');
$$;

create or replace function public.is_direct_participant(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants where conversation_id = cid and user_id = uid);
$$;

-- --------------------------------------------------------------------- RLS
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.messages enable row level security;
alter table public.chat_requests enable row level security;

create policy conversations_select on public.conversations
  for select to authenticated using (public.can_access_conversation(id));

create policy conversation_participants_select on public.conversation_participants
  for select to authenticated using (public.can_access_conversation(conversation_id));

-- Minhas leituras + (em conversa privada) a leitura da outra pessoa → "lida".
create policy conversation_reads_select on public.conversation_reads
  for select to authenticated
  using (
    user_id = auth.uid()
    or (public.is_direct_participant(conversation_id) and public.can_access_conversation(conversation_id))
  );

-- Mensagens de quem eu bloqueei ficam ocultas para mim.
create policy messages_select on public.messages
  for select to authenticated
  using (
    public.can_access_conversation(conversation_id)
    and (sender_id is null or sender_id = auth.uid() or not public.i_blocked(sender_id))
  );

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and deleted_at is null
    and public.can_send_message(conversation_id)
  );
revoke insert on public.messages from authenticated, anon;
grant insert (conversation_id, sender_id, body, image_path) on public.messages to authenticated;
-- sem policy de update/delete: apagar/fixar somente via RPC

create policy chat_requests_select on public.chat_requests
  for select to authenticated using (from_id = auth.uid() or to_id = auth.uid());

-- --------------------------------------------------------------- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.conversation_reads;
    alter publication supabase_realtime add table public.conversations;
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ----------------------------------------------------------------- triggers
-- Conversa de grupo/rolê nasce junto com o grupo/rolê ("a_" roda antes dos
-- triggers que adicionam criadora/organizadora como membro).
create or replace function public.create_group_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.conversations (type, group_id) values ('group', new.id);
  return new;
end;
$$;
create trigger groups_a_conversation after insert on public.groups
  for each row execute function public.create_group_conversation();

create or replace function public.create_ride_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.conversations (type, ride_id) values ('ride', new.id);
  return new;
end;
$$;
create trigger rides_a_conversation after insert on public.rides
  for each row execute function public.create_ride_conversation();

-- Ao ganhar acesso, a conversa começa "lida" (histórico anterior não conta como não lido).
create or replace function public.seed_conversation_read()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'group_members' and new.status = 'active' then
    insert into public.conversation_reads (conversation_id, user_id)
    select c.id, new.user_id from public.conversations c where c.group_id = new.group_id
    on conflict do nothing;
  elsif tg_table_name = 'ride_participants' and new.status = 'confirmed' then
    insert into public.conversation_reads (conversation_id, user_id)
    select c.id, new.user_id from public.conversations c where c.ride_id = new.ride_id
    on conflict do nothing;
  end if;
  return null;
end;
$$;
create trigger group_members_seed_read after insert or update on public.group_members
  for each row execute function public.seed_conversation_read();
create trigger ride_participants_seed_read after insert or update on public.ride_participants
  for each row execute function public.seed_conversation_read();

-- -------------------------------------------------------------------- RPCs
create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access_conversation(p_conversation) then return; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

-- Apaga (soft delete) a própria mensagem; administradora do grupo / organizadora
-- do rolê / admin da plataforma também podem remover conteúdo inadequado.
create or replace function public.delete_message(p_message uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.messages; c public.conversations; me uuid := auth.uid(); allowed boolean;
begin
  select * into m from public.messages where id = p_message;
  if not found then raise exception 'Mensagem não encontrada.'; end if;
  select * into c from public.conversations where id = m.conversation_id;

  allowed := public.is_admin()
    or (m.sender_id = me and public.can_access_conversation(c.id))
    or (c.type = 'group' and public.is_group_admin(c.group_id) and public.can_access_conversation(c.id))
    or (c.type = 'ride' and public.is_ride_organizer(c.ride_id) and public.can_access_conversation(c.id));
  if not allowed then raise exception 'Você não pode apagar esta mensagem.'; end if;

  update public.messages
     set deleted_at = now(), deleted_by = me, body = null, image_path = null
   where id = p_message and deleted_at is null;
end;
$$;

-- Fixar (ou desafixar, com p_message nulo): organizadora do rolê / administradora do grupo.
create or replace function public.pin_message(p_conversation uuid, p_message uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = p_conversation;
  if not found or not public.can_access_conversation(c.id) then raise exception 'Conversa não encontrada.'; end if;
  if not ((c.type = 'ride' and public.is_ride_organizer(c.ride_id))
       or (c.type = 'group' and public.is_group_admin(c.group_id))) then
    raise exception 'Apenas a organizadora/administradora pode fixar mensagens.';
  end if;
  if p_message is not null and not exists (
    select 1 from public.messages where id = p_message and conversation_id = p_conversation and deleted_at is null
  ) then
    raise exception 'Mensagem inválida.';
  end if;
  update public.conversations set pinned_message_id = p_message where id = p_conversation;
end;
$$;

create or replace function public.request_chat(p_target uuid, p_message text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_id uuid; v_name text; v_key text;
begin
  if not public.is_active_member() then raise exception 'Conta sem permissão para conversar.'; end if;
  if p_target = me then raise exception 'Você não pode conversar consigo mesma.'; end if;
  if not public.is_active_member(p_target) then raise exception 'Perfil indisponível.'; end if;
  if public.is_blocked_between(me, p_target) then raise exception 'Não foi possível enviar a solicitação.'; end if;

  v_key := least(me, p_target)::text || ':' || greatest(me, p_target)::text;
  if exists (select 1 from public.conversations where direct_key = v_key) then
    raise exception 'Vocês já podem conversar.';
  end if;
  if exists (select 1 from public.chat_requests where from_id = p_target and to_id = me and status = 'pending') then
    raise exception 'Esta pessoa já enviou uma solicitação para você — responda em Conversas.';
  end if;
  if exists (select 1 from public.chat_requests where from_id = me and to_id = p_target and status in ('pending', 'declined')) then
    raise exception 'Você já enviou uma solicitação para esta pessoa.';
  end if;

  insert into public.chat_requests (from_id, to_id, message)
  values (me, p_target, nullif(trim(p_message), '')) returning id into v_id;

  select display_name into v_name from public.profiles where id = me;
  perform public.push_notification(p_target, 'chat_request', 'Solicitação de conversa',
    v_name || ' quer conversar com você.', '/mensagens?aba=pessoas');
  return v_id;
end;
$$;

-- Aceitar cria a conversa privada; retorna o id (ou nulo se recusada).
create or replace function public.respond_chat_request(p_request uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare rq public.chat_requests; v_conv uuid; v_name text;
begin
  select * into rq from public.chat_requests where id = p_request and to_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;

  if not p_accept then
    update public.chat_requests set status = 'declined', responded_at = now() where id = rq.id;
    return null;
  end if;

  if public.is_blocked_between(rq.from_id, rq.to_id) then raise exception 'Não foi possível aceitar.'; end if;
  update public.chat_requests set status = 'accepted', responded_at = now() where id = rq.id;

  insert into public.conversations (type, direct_key)
  values ('direct', least(rq.from_id, rq.to_id)::text || ':' || greatest(rq.from_id, rq.to_id)::text)
  on conflict (direct_key) do update set direct_key = excluded.direct_key
  returning id into v_conv;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv, rq.from_id), (v_conv, rq.to_id) on conflict do nothing;
  insert into public.conversation_reads (conversation_id, user_id)
  values (v_conv, rq.from_id), (v_conv, rq.to_id) on conflict do nothing;

  select display_name into v_name from public.profiles where id = rq.to_id;
  perform public.push_notification(rq.from_id, 'chat_accepted', 'Conversa liberada',
    v_name || ' aceitou sua solicitação.', '/mensagens/' || v_conv);
  return v_conv;
end;
$$;

create or replace function public.block_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if p_target = me then raise exception 'Você não pode bloquear a si mesma.'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception 'Perfil não encontrado.'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, p_target) on conflict do nothing;
  -- impede novas conexões: cancela solicitações pendentes entre as duas
  delete from public.chat_requests
   where status = 'pending'
     and ((from_id = me and to_id = p_target) or (from_id = p_target and to_id = me));
end;
$$;

create or replace function public.unblock_user(p_target uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_target;
$$;

create or replace function public.list_blocked()
returns table (user_id uuid, display_name text, avatar_url text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked_id, p.display_name, p.avatar_url, b.created_at
    from public.blocks b join public.profiles p on p.id = b.blocked_id
   where b.blocker_id = auth.uid()
   order by b.created_at desc;
$$;

-- Lista de conversas com última mensagem e contador de não lidas (RLS aplicada).
create or replace function public.list_conversations()
returns table (
  id uuid, type text, title text, avatar_url text, ref_id uuid,
  last_body text, last_at timestamptz, last_has_image boolean, last_deleted boolean, unread_count int
)
language sql stable security invoker set search_path = public as $$
  with mine as (
    select c.id from public.conversations c
      join public.conversation_participants p on p.conversation_id = c.id and p.user_id = auth.uid()
     where c.type = 'direct'
    union
    select c.id from public.conversations c
      join public.group_members gm on gm.group_id = c.group_id and gm.user_id = auth.uid() and gm.status = 'active'
      join public.groups g on g.id = c.group_id and g.status = 'active'
     where c.type = 'group'
    union
    select c.id from public.conversations c
      join public.ride_participants rp on rp.ride_id = c.ride_id and rp.user_id = auth.uid() and rp.status = 'confirmed'
     where c.type = 'ride'
  )
  select c.id, c.type,
         case c.type when 'direct' then coalesce(op.display_name, 'Usuária')
                     when 'group' then g.name else r.title end as title,
         case c.type when 'direct' then op.avatar_url
                     when 'group' then g.cover_url else r.image_url end as avatar_url,
         coalesce(c.group_id, c.ride_id, op.id) as ref_id,
         lm.body, lm.created_at, (lm.image_path is not null), coalesce(lm.deleted_at is not null, false),
         coalesce(u.n, 0)
    from mine m
    join public.conversations c on c.id = m.id
    left join public.groups g on g.id = c.group_id
    left join public.rides r on r.id = c.ride_id
    left join lateral (
      select pr.id, pr.display_name, pr.avatar_url
        from public.conversation_participants p
        left join public.profiles pr on pr.id = p.user_id
       where p.conversation_id = c.id and p.user_id <> auth.uid() limit 1
    ) op on c.type = 'direct'
    left join lateral (
      select m2.body, m2.image_path, m2.created_at, m2.deleted_at
        from public.messages m2 where m2.conversation_id = c.id
       order by m2.created_at desc limit 1
    ) lm on true
    left join lateral (
      select count(*)::int as n from (
        select 1 from public.messages m3
          left join public.conversation_reads cr on cr.conversation_id = c.id and cr.user_id = auth.uid()
         where m3.conversation_id = c.id and m3.deleted_at is null
           and m3.sender_id is distinct from auth.uid()
           and (cr.last_read_at is null or m3.created_at > cr.last_read_at)
         limit 100
      ) x
    ) u on true
   where not (c.type = 'direct' and op.id is not null and public.i_blocked(op.id))
   order by coalesce(lm.created_at, c.created_at) desc;
$$;

-- ---------------------------------------------------------------- storage
-- Imagens de chat: bucket PRIVADO, pasta = id da conversa; leitura/escrita
-- exigem acesso à conversa (mesma regra da RLS de mensagens).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "chat_images_select_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-images'
    and public.can_access_conversation(((storage.foldername(name))[1])::uuid)
  );
create policy "chat_images_insert_members" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and public.can_send_message(((storage.foldername(name))[1])::uuid)
  );
