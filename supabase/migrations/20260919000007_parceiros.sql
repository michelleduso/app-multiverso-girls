-- Multiverso Girls · Parceiros (lojistas), planos, produtos (vitrine) e métricas
--
-- Conta de parceiro é COMPLETAMENTE separada da conta de motoqueira:
--   * parceiro nunca tem `profiles` aprovado (o trigger nem cria profile);
--   * is_active_member() passa a devolver false para quem é dono de parceiro,
--     então todas as policies/RPCs da comunidade (grupos, rolês, chats...) o barram;
--   * uma motoqueira ativa também não consegue virar parceira.
-- Não é marketplace: sem carrinho, checkout, pagamento, estoque ou frete.

-- ------------------------------------------------------------------ partners
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 2 and 120),
  trade_name text not null check (char_length(trade_name) between 2 and 80),
  cnpj text check (cnpj is null or cnpj ~ '^\d{14}$'),
  responsible text not null check (char_length(responsible) between 2 and 80),
  email text not null,
  phone text check (phone is null or phone ~ '^\d{10,13}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\d{10,13}$'),
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  website text check (website is null or (website ~* '^https?://[^\s]+$' and char_length(website) <= 300)),
  city text not null check (char_length(city) between 2 and 80),
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  description text check (description is null or char_length(description) <= 1000),
  logo_url text,
  category text not null check (category in (
    'acessorios', 'roupas', 'capacetes', 'oficina', 'pecas', 'concessionaria',
    'turismo', 'seguro', 'estetica_personalizacao', 'alimentacao', 'outros'
  )),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partners_status_idx on public.partners (status);

-- Observações internas da administração (nunca visíveis ao parceiro).
create table public.partner_admin_notes (
  partner_id uuid primary key references public.partners (id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

create or replace function public.is_partner_owner(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partners where id = pid and owner_id = auth.uid());
$$;

-- --------------------------------------------- isolamento das contas (trigger)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_state text := upper(left(trim(coalesce(m ->> 'state', '')), 2));
begin
  if m ->> 'account_type' = 'partner' then
    -- pedido de parceria: SEMPRE nasce "pending"; nenhum profile de comunidade é criado
    insert into public.partners (
      owner_id, legal_name, trade_name, cnpj, responsible, email, phone, whatsapp,
      instagram, website, city, state, description, category
    ) values (
      new.id,
      left(trim(coalesce(m ->> 'legal_name', '')), 120),
      left(trim(coalesce(m ->> 'trade_name', '')), 80),
      nullif(regexp_replace(coalesce(m ->> 'cnpj', ''), '\D', '', 'g'), ''),
      left(trim(coalesce(m ->> 'responsible', '')), 80),
      coalesce(new.email, ''),
      nullif(regexp_replace(coalesce(m ->> 'phone', ''), '\D', '', 'g'), ''),
      nullif(regexp_replace(coalesce(m ->> 'whatsapp', ''), '\D', '', 'g'), ''),
      nullif(left(regexp_replace(coalesce(m ->> 'instagram', ''), '[^A-Za-z0-9._]', '', 'g'), 30), ''),
      nullif(trim(coalesce(m ->> 'website', '')), ''),
      left(trim(coalesce(m ->> 'city', '')), 80),
      v_state,
      nullif(left(trim(coalesce(m ->> 'description', '')), 1000), ''),
      m ->> 'category'
    );
    return new;
  end if;

  insert into public.profiles (id, display_name, city, state, terms_accepted_at, privacy_accepted_at)
  values (
    new.id,
    coalesce(nullif(left(trim(coalesce(m ->> 'display_name', '')), 60), ''), 'Motoqueira'),
    nullif(left(trim(coalesce(m ->> 'city', '')), 80), ''),
    case when v_state ~ '^[A-Z]{2}$' then v_state end,
    case when m ->> 'accepted_terms' = 'true' then now() end,
    case when m ->> 'accepted_terms' = 'true' then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Dono de parceiro nunca é "membro ativo" da comunidade.
create or replace function public.is_active_member(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and (
        p.status = 'approved'
        or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until < now())
      )
  ) and not exists (select 1 from public.partners where owner_id = uid);
$$;

-- ------------------------------------------------------------ planos e vigência
create table public.plans (
  id text primary key,
  name text not null,
  sort int not null default 0,
  max_products int not null check (max_products >= 0),
  can_feature boolean not null default false,  -- produtos em destaque
  can_promote boolean not null default false,  -- preço promocional / campanhas
  in_spotlight boolean not null default false, -- seção "Parceiros em destaque"
  full_metrics boolean not null default false,
  description text
);
insert into public.plans (id, name, sort, max_products, can_feature, can_promote, in_spotlight, full_metrics, description) values
  ('basic', 'Parceiro Básico', 1, 5, false, false, false, false,
   'Página da loja, até 5 produtos, WhatsApp, site e métricas básicas.'),
  ('featured', 'Parceiro Destaque', 2, 20, true, true, true, true,
   'Tudo do Básico, até 20 produtos, produtos em destaque, seção "Parceiros em destaque", promoções e métricas completas.'),
  ('premium', 'Parceiro Premium', 3, 50, true, true, true, true,
   'Estrutura preparada; benefícios finais a definir.');

-- Um registro vigente por parceiro. Pagamento é externo: a administração ativa/renova.
-- payment_provider/external_ref ficam reservados para uma futura integração com gateway.
create table public.partner_subscriptions (
  partner_id uuid primary key references public.partners (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status text not null check (status in ('trial', 'active', 'expired', 'suspended')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  payment_provider text,
  external_ref text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

-- Plano em vigor = status trial/active, já iniciado e não vencido.
create or replace function public.partner_plan_in_force(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_subscriptions s
    where s.partner_id = pid and s.status in ('trial', 'active')
      and s.starts_at <= now() and (s.ends_at is null or s.ends_at > now())
  );
$$;

-- "No ar" = parceiro aprovado + plano em vigor. Vencido: nada some do banco, só sai do ar.
create or replace function public.partner_is_live(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partners p where p.id = pid and p.status = 'approved')
     and public.partner_plan_in_force(pid);
$$;

-- ------------------------------------------------------------------ produtos
create table public.products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text check (description is null or char_length(description) <= 1000),
  category text not null check (category in (
    'acessorios', 'roupas', 'capacetes', 'oficina', 'pecas', 'concessionaria',
    'turismo', 'seguro', 'estetica_personalizacao', 'alimentacao', 'outros'
  )),
  price numeric(10, 2) check (price is null or price >= 0),
  sale_price numeric(10, 2) check (sale_price is null or sale_price >= 0),
  image_url text,
  external_url text check (external_url is null or (external_url ~* '^https?://[^\s]+$' and char_length(external_url) <= 500)),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\d{10,13}$'),
  city text,
  state char(2),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'blocked')),
  is_featured boolean not null default false,
  campaign_start timestamptz not null default now(),
  campaign_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sale_price is null or price is null or sale_price < price),
  check (campaign_end is null or campaign_end > campaign_start)
);
create index products_partner_idx on public.products (partner_id);
create index products_public_idx on public.products (status, campaign_start desc) where status = 'active';

-- Visível para motoristas/motoqueiras: ativo, dentro da campanha, parceiro no ar.
create or replace function public.product_is_public(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.products pr
    where pr.id = pid and pr.status = 'active'
      and pr.campaign_start <= now() and (pr.campaign_end is null or pr.campaign_end > now())
      and public.partner_is_live(pr.partner_id)
  );
$$;

-- Regras do plano + cidade herdada da loja.
create or replace function public.products_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare pl public.plans; p public.partners;
begin
  select * into p from public.partners where id = new.partner_id;
  select pl2.* into pl from public.partner_subscriptions s join public.plans pl2 on pl2.id = s.plan_id
   where s.partner_id = new.partner_id;

  new.city := p.city;
  new.state := p.state;
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if pl.id is null then
      raise exception 'Seu plano ainda não foi ativado. Fale com a equipe para começar a cadastrar produtos.';
    end if;
    if (select count(*) from public.products where partner_id = new.partner_id) >= pl.max_products then
      raise exception 'Seu plano permite até % produtos.', pl.max_products;
    end if;
  end if;

  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if not public.partner_is_live(new.partner_id) then
      raise exception 'Seu plano não está ativo. Entre em contato com a equipe para renovar.';
    end if;
  end if;

  if (new.sale_price is not null and (tg_op = 'INSERT' or new.sale_price is distinct from old.sale_price)
      and not coalesce(pl.can_promote, false)) then
    raise exception 'Promoções não estão incluídas no seu plano.';
  end if;
  if (new.is_featured and (tg_op = 'INSERT' or not old.is_featured) and not coalesce(pl.can_feature, false)) then
    raise exception 'Produtos em destaque não estão incluídos no seu plano.';
  end if;
  return new;
end;
$$;
create trigger products_guard_trg before insert or update on public.products
  for each row execute function public.products_guard();

-- ------------------------------------------------------------------- métricas
-- Sem identificar a usuária: nenhum user_id, só tipo/loja/produto/hora.
create table public.commercial_events (
  id bigint generated always as identity primary key,
  partner_id uuid not null references public.partners (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  kind text not null check (kind in ('store_view', 'impression', 'product_click', 'whatsapp_click', 'site_click')),
  created_at timestamptz not null default now()
);
create index commercial_events_partner_idx on public.commercial_events (partner_id, kind, created_at desc);

-- --------------------------------------------------------------------- RLS
alter table public.partners enable row level security;
alter table public.partner_admin_notes enable row level security;
alter table public.plans enable row level security;
alter table public.partner_subscriptions enable row level security;
alter table public.products enable row level security;
alter table public.commercial_events enable row level security;

create policy partners_select on public.partners
  for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy partners_update_own on public.partners
  for update to authenticated
  using (owner_id = auth.uid() and status <> 'suspended')
  with check (owner_id = auth.uid());
revoke insert, update, delete on public.partners from authenticated, anon;
grant update (legal_name, trade_name, cnpj, responsible, phone, whatsapp, instagram, website,
              city, state, description, logo_url, category)
  on public.partners to authenticated;

create policy partner_notes_admin on public.partner_admin_notes
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.partner_admin_notes from authenticated, anon;

create policy plans_select on public.plans for select to authenticated using (true);
revoke insert, update, delete on public.plans from authenticated, anon;

create policy subscriptions_select on public.partner_subscriptions
  for select to authenticated using (public.is_partner_owner(partner_id) or public.is_admin());
revoke insert, update, delete on public.partner_subscriptions from authenticated, anon;

create policy products_select on public.products
  for select to authenticated
  using (
    public.is_partner_owner(partner_id)
    or public.is_admin()
    or (public.is_active_member() and public.product_is_public(id))
  );
create policy products_insert on public.products
  for insert to authenticated with check (public.is_partner_owner(partner_id));
create policy products_update on public.products
  for update to authenticated
  using (public.is_partner_owner(partner_id) and status <> 'blocked')
  with check (public.is_partner_owner(partner_id) and status <> 'blocked');
create policy products_delete on public.products
  for delete to authenticated using (public.is_partner_owner(partner_id) and status <> 'blocked');
revoke insert, update on public.products from authenticated, anon;
grant insert (partner_id, name, description, category, price, sale_price, image_url, external_url,
              whatsapp, status, is_featured, campaign_start, campaign_end)
  on public.products to authenticated;
grant update (name, description, category, price, sale_price, image_url, external_url,
              whatsapp, status, is_featured, campaign_start, campaign_end)
  on public.products to authenticated;

create policy events_select on public.commercial_events
  for select to authenticated using (public.is_partner_owner(partner_id) or public.is_admin());
revoke insert, update, delete on public.commercial_events from authenticated, anon;

-- Vitrine para as motoqueiras: só colunas comerciais (nada de CNPJ, e-mail, telefone,
-- razão social ou responsável) e só parceiros no ar.
create view public.public_partners as
  select p.id, p.trade_name, p.description, p.logo_url, p.category, p.city, p.state,
         p.whatsapp, p.instagram, p.website, pl.in_spotlight, p.created_at
    from public.partners p
    join public.partner_subscriptions s on s.partner_id = p.id
    join public.plans pl on pl.id = s.plan_id
   where p.status = 'approved'
     and s.status in ('trial', 'active')
     and s.starts_at <= now() and (s.ends_at is null or s.ends_at > now())
     and public.is_active_member();
revoke all on public.public_partners from anon;
grant select on public.public_partners to authenticated;

-- ---------------------------------------------------------------------- RPCs
create or replace function public.partner_resubmit()
returns void language sql security definer set search_path = public as $$
  update public.partners set status = 'pending', review_note = null
   where owner_id = auth.uid() and status = 'rejected';
$$;

create or replace function public.track_commercial_event(p_kind text, p_partner uuid, p_product uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('store_view', 'product_click', 'whatsapp_click', 'site_click') then
    raise exception 'Evento inválido.';
  end if;
  -- só a comunidade gera métricas (o parceiro vendo a própria loja não conta)
  if not public.is_active_member() or not public.partner_is_live(p_partner) then return; end if;
  if p_product is not null and not exists (
    select 1 from public.products where id = p_product and partner_id = p_partner
  ) then return; end if;
  insert into public.commercial_events (partner_id, product_id, kind) values (p_partner, p_product, p_kind);
end;
$$;

create or replace function public.track_impressions(p_products uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_member() or p_products is null then return; end if;
  insert into public.commercial_events (partner_id, product_id, kind)
  select pr.partner_id, pr.id, 'impression'
    from public.products pr
   where pr.id = any (p_products[1:50]) and public.product_is_public(pr.id);
end;
$$;

create or replace function public.partner_metrics(p_partner uuid, p_days int default 30)
returns table (kind text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_partner_owner(p_partner) or public.is_admin()) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
    select e.kind, count(*) from public.commercial_events e
     where e.partner_id = p_partner and e.created_at > now() - make_interval(days => p_days)
     group by e.kind;
end;
$$;

create or replace function public.partner_product_metrics(p_partner uuid, p_days int default 30)
returns table (product_id uuid, kind text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_partner_owner(p_partner) or public.is_admin()) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
    select e.product_id, e.kind, count(*) from public.commercial_events e
     where e.partner_id = p_partner and e.product_id is not null
       and e.created_at > now() - make_interval(days => p_days)
     group by e.product_id, e.kind;
end;
$$;

create or replace function public.partner_daily_metrics(p_partner uuid, p_days int default 30)
returns table (day date, kind text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_partner_owner(p_partner) or public.is_admin()) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
    select (e.created_at at time zone 'America/Sao_Paulo')::date, e.kind, count(*)
      from public.commercial_events e
     where e.partner_id = p_partner and e.created_at > now() - make_interval(days => p_days)
     group by 1, 2 order by 1;
end;
$$;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-media', 'partner-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "partner_media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'partner-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.partners where owner_id = auth.uid())
  );
create policy "partner_media_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'partner-media' and (storage.foldername(name))[1] = auth.uid()::text);
