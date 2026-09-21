-- Multiverso Girls · Superfície de RPC das migrations 07 e 08
-- (mesmo padrão da migration 06: fecha tudo e libera só o que o app usa)

revoke execute on function
  public.is_partner_owner(uuid),
  public.partner_plan_in_force(uuid),
  public.partner_is_live(uuid),
  public.product_is_public(uuid),
  public.products_guard(),
  public.partner_resubmit(),
  public.track_commercial_event(text, uuid, uuid),
  public.track_impressions(uuid[]),
  public.partner_metrics(uuid, int),
  public.partner_product_metrics(uuid, int),
  public.partner_daily_metrics(uuid, int),
  public.write_audit(text, text, text, jsonb),
  public.admin_set_setting(text, jsonb),
  public.admin_review_profile(uuid, text, text),
  public.admin_review_partner(uuid, text, text),
  public.admin_set_subscription(uuid, text, text, timestamptz, timestamptz, text),
  public.admin_set_product_status(uuid, text, text),
  public.admin_dashboard()
from public, anon, authenticated;

-- predicados usados por policies (avaliados com o privilégio de quem consulta)
grant execute on function
  public.is_partner_owner(uuid),
  public.partner_is_live(uuid),
  public.product_is_public(uuid)
to authenticated;

-- RPCs chamadas pelo app (write_audit e products_guard ficam internas)
grant execute on function
  public.partner_resubmit(),
  public.track_commercial_event(text, uuid, uuid),
  public.track_impressions(uuid[]),
  public.partner_metrics(uuid, int),
  public.partner_product_metrics(uuid, int),
  public.partner_daily_metrics(uuid, int),
  public.admin_set_setting(text, jsonb),
  public.admin_review_profile(uuid, text, text),
  public.admin_review_partner(uuid, text, text),
  public.admin_set_subscription(uuid, text, text, timestamptz, timestamptz, text),
  public.admin_set_product_status(uuid, text, text),
  public.admin_dashboard()
to authenticated;

revoke all on all tables in schema public from anon;
