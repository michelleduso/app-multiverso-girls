-- Multiverso Girls · Superfície de RPC
--
-- Por padrão o Postgres libera EXECUTE de toda função para PUBLIC, e o Supabase
-- expõe funções do schema `public` como RPC. Aqui fechamos tudo e liberamos
-- explicitamente só o que o app usa (para `authenticated`, nunca `anon`).
-- Funções internas (push_notification e funções de trigger) ficam sem acesso.

revoke execute on all functions in schema public from public, anon, authenticated;

-- predicados usados pelas policies de RLS (avaliadas com o privilégio de quem consulta)
grant execute on function
  public.is_admin(),
  public.is_active_member(uuid),
  public.is_blocked_between(uuid, uuid),
  public.i_blocked(uuid),
  public.is_blocked_by(uuid),
  public.is_group_member(uuid, uuid),
  public.is_group_admin(uuid, uuid),
  public.is_ride_organizer(uuid, uuid),
  public.is_ride_participant(uuid, uuid, text),
  public.can_view_ride(uuid),
  public.can_access_conversation(uuid),
  public.can_send_message(uuid),
  public.is_direct_participant(uuid, uuid)
to authenticated;

-- RPCs chamadas pelo app
grant execute on function
  public.join_group(uuid),
  public.leave_group(uuid),
  public.respond_group_join(uuid, uuid, boolean),
  public.remove_group_member(uuid, uuid),
  public.set_group_admin(uuid, uuid, boolean),
  public.join_ride(uuid),
  public.leave_ride(uuid),
  public.respond_ride_participant(uuid, uuid, boolean),
  public.remove_ride_participant(uuid, uuid),
  public.cancel_ride(uuid),
  public.close_ride(uuid),
  public.mark_conversation_read(uuid),
  public.delete_message(uuid),
  public.pin_message(uuid, uuid),
  public.request_chat(uuid, text),
  public.respond_chat_request(uuid, boolean),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.list_blocked(),
  public.list_conversations(),
  public.create_report(text, uuid, text, text),
  public.moderate(uuid, text, text, int, text, uuid),
  public.export_my_data(),
  public.anonymize_my_account()
to authenticated;

-- O app só acessa dados autenticada: `anon` não precisa de nenhuma tabela
-- (a RLS já nega, isto é defesa em profundidade).
revoke all on all tables in schema public from anon;
