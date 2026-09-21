-- Multiverso Girls · Painel administrativo: auditoria, configurações, RPCs e dashboard

-- ------------------------------------------------------------------- auditoria
-- Append-only: só nasce dentro das RPCs de admin (security definer).
create table public.audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.audit_log from authenticated, anon;

create or replace function public.write_audit(p_action text, p_type text, p_id text, p_details jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_type, p_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------- configurações
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.app_settings enable row level security;
-- Somente valores NÃO secretos (contato de suporte, limites de exibição).
create policy app_settings_select on public.app_settings for select to authenticated using (true);
revoke insert, update, delete on public.app_settings from authenticated, anon;
insert into public.app_settings (key, value) values
  ('support_contact', '{"email": "", "whatsapp": ""}'),
  ('sponsored_max', '2');

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  if p_key not in ('support_contact', 'sponsored_max') then raise exception 'Configuração desconhecida.'; end if;
  if p_key = 'sponsored_max' and (jsonb_typeof(p_value) <> 'number' or (p_value)::text::numeric not between 0 and 5) then
    raise exception 'O máximo de cards patrocinados deve ser de 0 a 5.';
  end if;
  insert into public.app_settings (key, value, updated_by) values (p_key, p_value, auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  perform public.write_audit('setting_updated', 'setting', p_key, jsonb_build_object('value', p_value));
end;
$$;

-- ------------------------------------------------------ ações administrativas
-- Aprovar/recusar cadastro de motoqueira (ou reativar uma conta suspensa/recusada).
create or replace function public.admin_review_profile(p_user uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decisão inválida.'; end if;
  if exists (select 1 from public.partners where owner_id = p_user) then
    raise exception 'Esta é uma conta de parceiro e não pode ser aprovada como motoqueira.';
  end if;
  if p_decision = 'rejected' and (p_reason is null or char_length(trim(p_reason)) < 3) then
    raise exception 'Informe o motivo da recusa.';
  end if;
  update public.profiles
     set status = p_decision, suspended_until = null
   where id = p_user and status <> 'banned' and status <> 'deleted';
  if not found then raise exception 'Perfil não encontrado ou não pode ser alterado.'; end if;
  if p_decision = 'approved' then
    perform public.push_notification(p_user, 'profile_approved', 'Cadastro aprovado 💜',
      'Bem-vinda! A comunidade já está liberada para você.', '/inicio');
  end if;
  perform public.write_audit('profile_' || p_decision, 'profile', p_user::text, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.admin_review_partner(p_partner uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected', 'suspended', 'pending') then raise exception 'Decisão inválida.'; end if;
  if p_decision in ('rejected', 'suspended') and (p_reason is null or char_length(trim(p_reason)) < 3) then
    raise exception 'Informe o motivo.';
  end if;
  update public.partners set status = p_decision, review_note = nullif(trim(p_reason), '') where id = p_partner;
  if not found then raise exception 'Parceiro não encontrado.'; end if;
  perform public.write_audit('partner_' || p_decision, 'partner', p_partner::text, jsonb_build_object('reason', p_reason));
end;
$$;

-- Ativa/altera plano, vencimento e status. Renovar = novo vencimento + status active.
create or replace function public.admin_set_subscription(
  p_partner uuid, p_plan text, p_status text,
  p_starts timestamptz default null, p_ends timestamptz default null, p_notes text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_starts timestamptz := coalesce(p_starts, now());
begin
  if not public.is_admin() then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  if not exists (select 1 from public.partners where id = p_partner) then raise exception 'Parceiro não encontrado.'; end if;
  if p_status not in ('trial', 'active', 'expired', 'suspended') then raise exception 'Status inválido.'; end if;
  if p_ends is not null and p_ends <= v_starts then raise exception 'O vencimento deve ser depois do início.'; end if;

  insert into public.partner_subscriptions (partner_id, plan_id, status, starts_at, ends_at, updated_by)
  values (p_partner, p_plan, p_status, v_starts, p_ends, auth.uid())
  on conflict (partner_id) do update
    set plan_id = excluded.plan_id, status = excluded.status, starts_at = excluded.starts_at,
        ends_at = excluded.ends_at, updated_by = excluded.updated_by, updated_at = now();

  insert into public.partner_admin_notes (partner_id, notes) values (p_partner, nullif(trim(p_notes), ''))
  on conflict (partner_id) do update set notes = excluded.notes, updated_at = now();

  perform public.write_audit('subscription_set', 'partner', p_partner::text,
    jsonb_build_object('plan', p_plan, 'status', p_status, 'starts_at', v_starts, 'ends_at', p_ends));
end;
$$;

create or replace function public.admin_set_product_status(p_product uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  if p_status not in ('paused', 'blocked', 'draft') then raise exception 'Status inválido.'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'Informe o motivo.'; end if;
  update public.products set status = p_status where id = p_product;
  if not found then raise exception 'Produto não encontrado.'; end if;
  perform public.write_audit('product_' || p_status, 'product', p_product::text, jsonb_build_object('reason', p_reason));
end;
$$;

-- ----------------------------------------------------------------- dashboard
create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'comunidade', jsonb_build_object(
      'total', (select count(*) from public.profiles where status = 'approved'),
      'novos_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'
                      and not exists (select 1 from public.partners pa where pa.owner_id = profiles.id)),
      'pendentes', (select count(*) from public.profiles where status = 'pending'
                      and not exists (select 1 from public.partners pa where pa.owner_id = profiles.id)),
      'suspensas', (select count(*) from public.profiles where status = 'suspended'),
      'cidades', coalesce((select jsonb_agg(jsonb_build_object('cidade', c, 'total', n)) from (
          select initcap(trim(city)) as c, count(*) as n from public.profiles
           where status = 'approved' and city is not null and trim(city) <> ''
           group by 1 order by 2 desc limit 5) t), '[]')
    ),
    'roles', jsonb_build_object(
      'ativos', (select count(*) from public.rides where status = 'open' and starts_at > now() - interval '3 hours'),
      'criados_mes', (select count(*) from public.rides where created_at >= date_trunc('month', now())),
      'participantes', (select coalesce(sum(confirmed_count), 0) from public.rides
                          where status = 'open' and starts_at > now() - interval '3 hours'),
      'denunciados', (select count(*) from public.reports where target_type = 'ride' and status = 'open')
    ),
    'grupos', jsonb_build_object(
      'ativos', (select count(*) from public.groups where status = 'active'),
      'novos_30d', (select count(*) from public.groups where created_at > now() - interval '30 days'),
      'denunciados', (select count(*) from public.reports where target_type = 'group' and status = 'open')
    ),
    'seguranca', jsonb_build_object(
      'abertas', (select count(*) from public.reports where status = 'open'),
      'resolvidas', (select count(*) from public.reports where status in ('resolved', 'dismissed')),
      'suspensos', (select count(*) from public.profiles where status = 'suspended'),
      'banidos', (select count(*) from public.profiles where status = 'banned')
    ),
    'parceiros', jsonb_build_object(
      'ativos', (select count(*) from public.partners p where public.partner_is_live(p.id)),
      'pendentes', (select count(*) from public.partners where status = 'pending'),
      'produtos_ativos', (select count(*) from public.products pr where pr.status = 'active' and public.partner_is_live(pr.partner_id)),
      'campanhas_ativas', (select count(*) from public.products pr
                             where public.product_is_public(pr.id) and (pr.sale_price is not null or pr.is_featured)),
      'planos_vencendo', (select count(*) from public.partner_subscriptions s
                            where s.status in ('trial', 'active') and s.ends_at > now() and s.ends_at <= now() + interval '7 days'),
      'planos_vencidos', (select count(*) from public.partner_subscriptions s
                            where s.status = 'expired' or (s.status in ('trial', 'active') and s.ends_at <= now())),
      'cliques_30d', (select count(*) from public.commercial_events
                        where kind in ('product_click', 'whatsapp_click', 'site_click') and created_at > now() - interval '30 days')
    )
  ) into r;
  return r;
end;
$$;
