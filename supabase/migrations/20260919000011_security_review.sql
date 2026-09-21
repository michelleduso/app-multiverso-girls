-- Multiverso Girls · Revisão de segurança pré-aplicação (auditoria técnica das migrations 01–10)
--
-- Achados corrigidos aqui:
--  1. Funções auxiliares chamáveis pela API (RPC) aceitavam `uid` arbitrário → qualquer autenticada
--     (inclusive pending/lojista) descobria bloqueios e participação em grupos/rolês privados.
--  2. `admin_users` aceitava contas sem profile (ex.: conta de parceiro) → agora só quem tem profile.
--  3. Campos de texto/URL sem limite no banco: a API direta ignorava as validações do frontend
--     (nome/bio gigantes, imagens de hosts externos = pixel de rastreamento para outras membros).
--  4. Privilégios de tabela excessivos (TRUNCATE/REFERENCES/TRIGGER e DML sem policy) para authenticated.
--  5. search_path das funções sem `pg_temp` no fim.
--  6. Policy de Storage do chat fazia cast de uuid sem proteção de ordem de avaliação.
--  7. Perfil banido/excluído ainda podia editar os próprios dados.

-- ============================================================ 1. helpers sem "oráculo"
-- Versões INTERNAS (sem guarda, sem acesso da API) para as poucas RPCs que precisam
-- consultar o uid de outra pessoa.
create or replace function public.internal_member_ok(uid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and (
        p.status = 'approved'
        or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until < now())
      )
  ) and not exists (select 1 from public.partners where owner_id = uid);
$$;

create or replace function public.internal_group_admin(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = uid and status = 'active' and role = 'admin'
  );
$$;

-- Versões públicas (usadas pelas policies): só respondem sobre a PRÓPRIA usuária
-- (ou para admin da plataforma); para qualquer outro uid devolvem false.
create or replace function public.is_active_member(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() then public.internal_member_ok(uid) else false end;
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when a is not distinct from auth.uid() or b is not distinct from auth.uid() or public.is_admin() then
      exists (
        select 1 from public.blocks
        where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
    else false end;
$$;

create or replace function public.is_group_member(gid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or public.is_admin() then
    exists (select 1 from public.group_members where group_id = gid and user_id = uid and status = 'active')
  else false end;
$$;

create or replace function public.is_group_admin(gid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or public.is_admin() then
    public.internal_group_admin(gid, uid)
  else false end;
$$;

create or replace function public.is_ride_organizer(rid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or public.is_admin() then
    exists (select 1 from public.rides where id = rid and organizer_id = uid)
  else false end;
$$;

create or replace function public.is_ride_participant(rid uuid, uid uuid default auth.uid(), p_status text default null)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or public.is_admin() then
    exists (
      select 1 from public.ride_participants
      where ride_id = rid and user_id = uid and (p_status is null or status = p_status))
  else false end;
$$;

create or replace function public.is_direct_participant(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or public.is_admin() then
    exists (select 1 from public.conversation_participants where conversation_id = cid and user_id = uid)
  else false end;
$$;

-- RPCs que consultavam o uid de OUTRA pessoa passam a usar as versões internas.
create or replace function public.remove_group_member(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not (public.is_group_admin(p_group) and public.is_active_member()) then
    raise exception 'Apenas administradoras podem remover membros.';
  end if;
  if public.internal_group_admin(p_group, p_user) then
    raise exception 'Remova o cargo de administradora antes de remover esta pessoa.';
  end if;
  delete from public.group_members where group_id = p_group and user_id = p_user;
end;
$$;

create or replace function public.request_chat(p_target uuid, p_message text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); v_id uuid; v_name text; v_key text;
begin
  if not public.is_active_member() then raise exception 'Conta sem permissão para conversar.'; end if;
  if p_target = me then raise exception 'Você não pode conversar consigo mesma.'; end if;
  if not public.internal_member_ok(p_target) then raise exception 'Perfil indisponível.'; end if;
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

-- ============================================================ 2. admin só com profile
-- (garante profile para os FKs de moderation_actions/reports e barra contas de parceiro)
alter table public.admin_users drop constraint if exists admin_users_user_id_fkey;
alter table public.admin_users
  add constraint admin_users_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

-- ============================================================ 3. limites e URLs no banco
alter table public.profiles add constraint profiles_display_name_len_chk check (char_length(display_name) between 1 and 60);
alter table public.profiles add constraint profiles_bio_len_chk check (bio is null or char_length(bio) <= 300);
alter table public.profiles add constraint profiles_city_len_chk check (city is null or char_length(city) <= 80);
alter table public.profiles add constraint profiles_state_fmt_chk check (state is null or state ~ '^[A-Z]{2}$');
alter table public.profiles add constraint profiles_avatar_len_chk check (avatar_url is null or char_length(avatar_url) <= 500);
-- não existe upload de avatar no app: a usuária não escreve avatar_url (evita imagem externa/rastreador)
revoke update (avatar_url) on public.profiles from authenticated;

-- Imagens públicas só podem apontar para o Storage do próprio projeto.
-- Configuração (uma vez, no bootstrap): insert into app_settings values ('storage_base_url', '"https://<ref>.supabase.co"').
-- Sem essa chave vale só o formato (https?://host/storage/v1/object/public/<bucket>/...).
create or replace function public.internal_media_url_ok(p_url text, p_bucket text)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_base text;
begin
  if p_url is null then return true; end if;
  if char_length(p_url) > 500 then return false; end if;
  if p_url !~ ('^https?://[^/[:space:]]+/storage/v1/object/public/' || p_bucket || '/[^[:space:]]+$') then return false; end if;
  select value #>> '{}' into v_base from public.app_settings where key = 'storage_base_url';
  if v_base is not null and v_base <> '' then
    return left(p_url, char_length(rtrim(v_base, '/')) + 1) = rtrim(v_base, '/') || '/';
  end if;
  return true;
end;
$$;

create or replace function public.enforce_media_urls()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_bucket text;
begin
  -- to_jsonb(new): a função é compartilhada por 4 tabelas com colunas de nome diferente
  case tg_table_name
    when 'rides'    then v_url := to_jsonb(new) ->> 'image_url'; v_bucket := 'ride-images';
    when 'groups'   then v_url := to_jsonb(new) ->> 'cover_url'; v_bucket := 'group-covers';
    when 'partners' then v_url := to_jsonb(new) ->> 'logo_url';  v_bucket := 'partner-media';
    when 'products' then v_url := to_jsonb(new) ->> 'image_url'; v_bucket := 'partner-media';
    else return new;
  end case;
  if not public.internal_media_url_ok(v_url, v_bucket) then
    raise exception 'Imagem inválida: envie o arquivo pelo app.';
  end if;
  return new;
end;
$$;
create trigger rides_media_urls_trg before insert or update of image_url on public.rides
  for each row execute function public.enforce_media_urls();
create trigger groups_media_urls_trg before insert or update of cover_url on public.groups
  for each row execute function public.enforce_media_urls();
create trigger partners_media_urls_trg before insert or update of logo_url on public.partners
  for each row execute function public.enforce_media_urls();
create trigger products_media_urls_trg before insert or update of image_url on public.products
  for each row execute function public.enforce_media_urls();

-- ============================================================ 4. privilégios de tabela
-- TRUNCATE/REFERENCES/TRIGGER nunca são necessários à API e TRUNCATE ignora RLS.
revoke truncate, references, trigger on all tables in schema public from authenticated, anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated, anon;

-- Tabelas escritas SOMENTE por RPC/trigger (security definer): sem DML direto para a API.
-- (a RLS sem policy já negava; aqui o privilégio também deixa de existir — defesa em profundidade)
revoke insert, update, delete on
  public.blocks, public.chat_requests, public.conversation_participants, public.conversation_reads,
  public.conversations, public.group_members, public.lgpd_requests, public.reports,
  public.ride_participants
from authenticated, anon;
revoke insert, delete on public.notifications from authenticated, anon;   -- só read_at é atualizável
revoke update, delete on public.messages from authenticated, anon;         -- apagar/fixar = RPC
revoke delete on public.rides, public.groups from authenticated, anon;     -- cancelar/suspender = RPC

-- view de vitrine: somente leitura
revoke insert, update, delete on public.public_partners from authenticated, anon;

-- ============================================================ 5. search_path com pg_temp no fim
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

-- ============================================================ 6. Storage: cast de uuid seguro
create or replace function public.storage_conversation_id(p_name text)
returns uuid language sql immutable set search_path = public, pg_temp as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[1])::uuid
  end;
$$;

drop policy if exists "chat_images_select_members" on storage.objects;
create policy "chat_images_select_members" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-images' and public.can_access_conversation(public.storage_conversation_id(name)));
drop policy if exists "chat_images_insert_members" on storage.objects;
create policy "chat_images_insert_members" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-images' and public.can_send_message(public.storage_conversation_id(name)));

-- ============================================================ 7. perfil banido/excluído não edita
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and status not in ('banned', 'deleted'))
  with check (id = auth.uid());

-- ============================================================ grants das funções novas
-- (default privileges as tornariam executáveis pela API; internas ficam fechadas)
revoke execute on function
  public.internal_member_ok(uuid),
  public.internal_group_admin(uuid, uuid),
  public.internal_media_url_ok(text, text),
  public.enforce_media_urls()
from public, anon, authenticated;
revoke execute on function public.storage_conversation_id(text) from public, anon;
grant execute on function public.storage_conversation_id(text) to authenticated;
