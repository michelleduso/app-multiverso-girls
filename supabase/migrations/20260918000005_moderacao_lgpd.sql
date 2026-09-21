-- Multiverso Girls · Segurança, denúncias, moderação e LGPD

-- ------------------------------------------------------------------ reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('profile', 'message', 'group', 'ride', 'behavior')),
  target_id uuid not null,
  reason text not null check (reason in (
    'perfil_falso', 'assedio', 'conteudo_ofensivo', 'spam',
    'comportamento_perigoso', 'discriminacao', 'golpe', 'outro'
  )),
  description text check (description is null or char_length(description) <= 1000),
  -- cópia do conteúdo denunciado (a original pode ser apagada depois)
  snapshot text,
  priority text not null default 'baixa' check (priority in ('alta', 'media', 'baixa')),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);
create index reports_status_idx on public.reports (status, priority, created_at desc);
create index reports_reported_user_idx on public.reports (reported_user_id);
create unique index reports_one_open_per_reporter_idx
  on public.reports (reporter_id, target_type, target_id) where status = 'open';

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in (
    'ignore', 'warn', 'remove_content', 'suspend_user', 'ban_user', 'suspend_group', 'delete_group'
  )),
  affected_user_id uuid references public.profiles (id) on delete set null,
  report_id uuid references public.reports (id) on delete set null,
  target_type text,
  target_id uuid,
  target_snapshot text,
  reason text not null check (char_length(reason) >= 3),
  suspended_until timestamptz,
  created_at timestamptz not null default now()
);
create index moderation_actions_user_idx on public.moderation_actions (affected_user_id, created_at desc);

alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

create policy reports_select on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
-- criação: RPC create_report · resolução: RPC moderate (nenhuma escrita direta)

-- Histórico append-only: sem policy de escrita e sem privilégio de escrita para ninguém
-- (as linhas só nascem dentro da RPC `moderate`, que é security definer).
revoke insert, update, delete on public.moderation_actions from authenticated, anon;
create policy moderation_actions_select_admin on public.moderation_actions
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------------- RPCs
create or replace function public.create_report(
  p_target_type text, p_target_id uuid, p_reason text, p_description text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_user uuid; v_snapshot text; v_priority text; v_id uuid; v_open int;
begin
  if not public.is_active_member() then raise exception 'Conta sem permissão para denunciar.'; end if;
  if (select count(*) from public.reports where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Limite diário de denúncias atingido.';
  end if;

  if p_target_type in ('profile', 'behavior') then
    select id, display_name into v_user, v_snapshot from public.profiles where id = p_target_id;
  elsif p_target_type = 'message' then
    select m.sender_id, coalesce(m.body, case when m.image_path is not null then '[imagem]' end)
      into v_user, v_snapshot
      from public.messages m
     where m.id = p_target_id and public.can_access_conversation(m.conversation_id);
  elsif p_target_type = 'group' then
    select created_by, name into v_user, v_snapshot from public.groups where id = p_target_id;
  elsif p_target_type = 'ride' then
    select organizer_id, title into v_user, v_snapshot from public.rides where id = p_target_id and public.can_view_ride(id);
  else
    raise exception 'Tipo de denúncia inválido.';
  end if;

  if not found then raise exception 'Conteúdo não encontrado.'; end if;
  if v_user = me then raise exception 'Você não pode denunciar a si mesma.'; end if;

  v_priority := case
    when p_reason in ('assedio', 'comportamento_perigoso', 'golpe') then 'alta'
    when p_reason in ('perfil_falso', 'discriminacao', 'conteudo_ofensivo') then 'media'
    else 'baixa' end;

  -- reincidência: já há várias denúncias abertas contra a mesma pessoa → sobe a prioridade
  select count(*) into v_open from public.reports where reported_user_id = v_user and status = 'open';
  if v_open >= 2 then v_priority := 'alta'; end if;

  insert into public.reports (reporter_id, reported_user_id, target_type, target_id, reason, description, snapshot, priority)
  values (me, v_user, p_target_type, p_target_id, p_reason, nullif(trim(p_description), ''), v_snapshot, v_priority)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Você já denunciou este item — nossa equipe está analisando.';
end;
$$;

-- Toda ação administrativa passa por aqui e é registrada em moderation_actions.
create or replace function public.moderate(
  p_report uuid, p_action text, p_reason text,
  p_days int default null, p_target_type text default null, p_target_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  rep public.reports; v_type text; v_target uuid; v_user uuid; v_snapshot text; v_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'Informe o motivo da ação.'; end if;

  if p_report is not null then
    select * into rep from public.reports where id = p_report for update;
    if not found then raise exception 'Denúncia não encontrada.'; end if;
    v_type := rep.target_type; v_target := rep.target_id; v_user := rep.reported_user_id; v_snapshot := rep.snapshot;
  else
    v_type := p_target_type; v_target := p_target_id;
    if v_type = 'group' then select created_by, name into v_user, v_snapshot from public.groups where id = v_target;
    elsif v_type = 'profile' then v_user := v_target; select display_name into v_snapshot from public.profiles where id = v_target;
    end if;
  end if;

  if v_user is not null and exists (select 1 from public.admin_users where user_id = v_user) then
    raise exception 'Não é possível moderar outra administradora.';
  end if;

  case p_action
    when 'ignore' then null;

    when 'warn' then
      if v_user is null then raise exception 'Sem usuária para advertir.'; end if;
      perform public.push_notification(v_user, 'warning', 'Advertência da moderação', p_reason, '/regras');

    when 'remove_content' then
      if v_type = 'message' then
        update public.messages set deleted_at = now(), deleted_by = auth.uid(), body = null, image_path = null
         where id = v_target and deleted_at is null;
      elsif v_type = 'ride' then
        update public.rides set status = 'cancelled' where id = v_target and status <> 'cancelled';
      elsif v_type = 'profile' then
        update public.profiles set avatar_url = null, bio = null where id = v_target;
      else
        raise exception 'Este tipo de denúncia não permite remoção de conteúdo.';
      end if;
      if v_user is not null then
        perform public.push_notification(v_user, 'content_removed', 'Conteúdo removido pela moderação', p_reason, '/regras');
      end if;

    when 'suspend_user' then
      if v_user is null then raise exception 'Sem usuária para suspender.'; end if;
      if p_days is null or p_days not between 1 and 365 then raise exception 'Informe a duração (1 a 365 dias).'; end if;
      v_until := now() + make_interval(days => p_days);
      update public.profiles set status = 'suspended', suspended_until = v_until where id = v_user and status <> 'banned';

    when 'ban_user' then
      if v_user is null then raise exception 'Sem usuária para banir.'; end if;
      update public.profiles set status = 'banned', suspended_until = null where id = v_user;

    when 'suspend_group' then
      if v_type <> 'group' then raise exception 'Alvo não é um grupo.'; end if;
      update public.groups set status = 'suspended' where id = v_target;
      if v_user is not null then
        perform public.push_notification(v_user, 'group_suspended', 'Grupo suspenso',
          'O grupo ' || coalesce(v_snapshot, '') || ' foi suspenso pela moderação. ' || p_reason, '/regras');
      end if;

    when 'delete_group' then
      if v_type <> 'group' then raise exception 'Alvo não é um grupo.'; end if;
      delete from public.groups where id = v_target;

    else raise exception 'Ação inválida.';
  end case;

  insert into public.moderation_actions
    (admin_id, action, affected_user_id, report_id, target_type, target_id, target_snapshot, reason, suspended_until)
  values (auth.uid(), p_action, v_user, p_report, v_type, v_target, v_snapshot, trim(p_reason), v_until);

  if p_report is not null then
    update public.reports
       set status = case when p_action = 'ignore' then 'dismissed' else 'resolved' end,
           resolved_at = now(), resolved_by = auth.uid()
     where id = p_report;
  end if;
end;
$$;

-- ------------------------------------------------------------------- LGPD
-- Registro de solicitações (accountability) — sem dados pessoais além do vínculo.
create table public.lgpd_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('export', 'anonymize')),
  created_at timestamptz not null default now()
);
alter table public.lgpd_requests enable row level security;
create policy lgpd_requests_select_own on public.lgpd_requests
  for select to authenticated using (user_id = auth.uid());

-- Direito de acesso: tudo que a plataforma guarda sobre a usuária.
create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); result jsonb;
begin
  if me is null then raise exception 'Não autenticada.'; end if;
  insert into public.lgpd_requests (user_id, type) values (me, 'export');

  select jsonb_build_object(
    'exportado_em', now(),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = me),
    'rolês_organizados', coalesce((select jsonb_agg(to_jsonb(r)) from public.rides r where r.organizer_id = me), '[]'),
    'participações_em_rolês', coalesce((select jsonb_agg(to_jsonb(rp)) from public.ride_participants rp where rp.user_id = me), '[]'),
    'grupos', coalesce((select jsonb_agg(to_jsonb(gm)) from public.group_members gm where gm.user_id = me), '[]'),
    'mensagens_enviadas', coalesce((select jsonb_agg(jsonb_build_object(
        'conversa', m.conversation_id, 'texto', m.body, 'imagem', m.image_path, 'enviada_em', m.created_at, 'apagada_em', m.deleted_at))
        from public.messages m where m.sender_id = me), '[]'),
    'solicitações_de_conversa', coalesce((select jsonb_agg(to_jsonb(cr)) from public.chat_requests cr
        where cr.from_id = me or cr.to_id = me), '[]'),
    'bloqueios', coalesce((select jsonb_agg(jsonb_build_object('bloqueada', b.blocked_id, 'em', b.created_at))
        from public.blocks b where b.blocker_id = me), '[]'),
    'denúncias_feitas', coalesce((select jsonb_agg(jsonb_build_object(
        'tipo', rep.target_type, 'motivo', rep.reason, 'descrição', rep.description, 'status', rep.status, 'em', rep.created_at))
        from public.reports rep where rep.reporter_id = me), '[]'),
    'notificações', coalesce((select jsonb_agg(to_jsonb(n)) from public.notifications n where n.user_id = me), '[]')
  ) into result;
  return result;
end;
$$;

-- Direito de eliminação: apaga/anonimiza tudo que identifica a usuária.
-- Depois desta função a aplicação remove o usuário do Auth (service role), o que
-- apaga a linha de `profiles`. Ficam retidos, sem vínculo de identidade: registros
-- de denúncias e de moderação (segurança da comunidade / exercício regular de direitos).
create or replace function public.anonymize_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g record; v_next uuid; v_status text;
begin
  select status into v_status from public.profiles where id = me;
  if not found then raise exception 'Perfil não encontrado.'; end if;
  if v_status = 'banned' then
    raise exception 'Contas banidas são mantidas por motivo de segurança da comunidade. Fale com o suporte.';
  end if;

  insert into public.lgpd_requests (user_id, type) values (me, 'anonymize');

  -- mensagens (texto e referência de imagem)
  update public.messages set body = null, image_path = null, deleted_at = coalesce(deleted_at, now()), deleted_by = me
   where sender_id = me and (body is not null or image_path is not null or deleted_at is null);

  -- rolês: cancela os abertos que ela organiza (avisa participantes) e sai dos demais
  update public.rides set status = 'cancelled' where organizer_id = me and status = 'open';
  delete from public.ride_participants where user_id = me and ride_id not in (select id from public.rides where organizer_id = me);

  -- grupos: transfere a administração ou remove o grupo vazio
  for g in select group_id, role from public.group_members where user_id = me loop
    delete from public.group_members where group_id = g.group_id and user_id = me;
    if g.role = 'admin' and not exists (
      select 1 from public.group_members where group_id = g.group_id and role = 'admin' and status = 'active') then
      select user_id into v_next from public.group_members
       where group_id = g.group_id and status = 'active' order by joined_at limit 1;
      if v_next is null then
        delete from public.groups where id = g.group_id;
      else
        update public.group_members set role = 'admin' where group_id = g.group_id and user_id = v_next;
      end if;
    end if;
  end loop;

  delete from public.conversation_participants where user_id = me;
  delete from public.conversation_reads where user_id = me;
  delete from public.chat_requests where from_id = me or to_id = me;
  delete from public.blocks where blocker_id = me or blocked_id = me;
  delete from public.notifications where user_id = me;
  delete from public.ride_private_details
   where ride_id in (select id from public.rides where organizer_id = me);

  update public.profiles
     set display_name = 'Ex-integrante', avatar_url = null, bio = null, city = null, state = null, status = 'deleted'
   where id = me;
end;
$$;
