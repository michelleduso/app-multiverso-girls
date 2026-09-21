-- Multiverso Girls · Fluxo de aprovação de motoqueiras — correções da auditoria
--
-- 1) block_user não exigia conta ativa: uma usuária "pending/rejected/suspended" podia
--    criar bloqueios (e sondar ids de perfis). Agora só conta ativa bloqueia.
-- 2) Defesa em profundidade: mesmo com RLS sem policy, ninguém além do banco/SQL Editor
--    precisa de privilégio de escrita em `admin_users` nem de INSERT/DELETE em `profiles`
--    (profiles nasce pelo trigger de cadastro; a exclusão de conta é pela RPC LGPD).

create or replace function public.block_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not public.is_active_member() then raise exception 'Conta sem permissão para bloquear.'; end if;
  if p_target = me then raise exception 'Você não pode bloquear a si mesma.'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception 'Perfil não encontrado.'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, p_target) on conflict do nothing;
  -- impede novas conexões: cancela solicitações pendentes entre as duas
  delete from public.chat_requests
   where status = 'pending'
     and ((from_id = me and to_id = p_target) or (from_id = p_target and to_id = me));
end;
$$;

revoke all on public.admin_users from authenticated, anon;
revoke insert, delete on public.profiles from authenticated, anon;

-- 3) Vínculo antigo NÃO vale para conta que deixou de estar ativa (suspensa, banida, recusada).
--    Antes, quem já era integrante continuava lendo membros, participantes e o PONTO DE
--    ENCONTRO dos rolês depois de suspensa/banida. Toda leitura da comunidade agora exige
--    is_active_member() (ou is_admin() para a moderação).

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_active_member()
      and (
        user_id = auth.uid()
        or public.is_group_admin(group_id)
        or (status = 'active' and public.is_group_member(group_id))
      )
    )
  );

drop policy if exists ride_participants_select on public.ride_participants;
create policy ride_participants_select on public.ride_participants
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_active_member()
      and (
        user_id = auth.uid()
        or public.is_ride_organizer(ride_id)
        or (status = 'confirmed' and public.is_ride_participant(ride_id, auth.uid(), 'confirmed'))
      )
    )
  );

drop policy if exists ride_details_select on public.ride_private_details;
create policy ride_details_select on public.ride_private_details
  for select to authenticated
  using (
    public.is_active_member()
    and (public.is_ride_organizer(ride_id) or public.is_ride_participant(ride_id, auth.uid(), 'confirmed'))
  );
drop policy if exists ride_details_insert on public.ride_private_details;
create policy ride_details_insert on public.ride_private_details
  for insert to authenticated with check (public.is_active_member() and public.is_ride_organizer(ride_id));
drop policy if exists ride_details_update on public.ride_private_details;
create policy ride_details_update on public.ride_private_details
  for update to authenticated
  using (public.is_active_member() and public.is_ride_organizer(ride_id))
  with check (public.is_active_member() and public.is_ride_organizer(ride_id));
drop policy if exists ride_details_delete on public.ride_private_details;
create policy ride_details_delete on public.ride_private_details
  for delete to authenticated using (public.is_active_member() and public.is_ride_organizer(ride_id));

-- a organizadora só enxerga o próprio rolê se a conta estiver ativa
-- (inline por causa do INSERT ... RETURNING, ver migration 03)
drop policy if exists rides_select on public.rides;
create policy rides_select on public.rides
  for select to authenticated
  using ((organizer_id = auth.uid() and public.is_active_member()) or public.can_view_ride(id));

drop policy if exists chat_requests_select on public.chat_requests;
create policy chat_requests_select on public.chat_requests
  for select to authenticated
  using (public.is_active_member() and (from_id = auth.uid() or to_id = auth.uid()));

drop policy if exists conversation_reads_select on public.conversation_reads;
create policy conversation_reads_select on public.conversation_reads
  for select to authenticated
  using (
    public.is_active_member()
    and (
      user_id = auth.uid()
      or (public.is_direct_participant(conversation_id) and public.can_access_conversation(conversation_id))
    )
  );

-- can_view_ride: a exceção "sou a organizadora" também exige conta ativa.
create or replace function public.can_view_ride(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    public.is_active_member()
    and exists (
      select 1 from public.rides r
      where r.id = rid
        and (
          r.organizer_id = auth.uid()
          or (
            not public.is_blocked_between(r.organizer_id, auth.uid())
            and (
              (r.visibility = 'public' and (r.group_id is null or public.is_group_member(r.group_id)
                                            or (select g.visibility from public.groups g where g.id = r.group_id) = 'public'))
              or exists (select 1 from public.ride_participants p where p.ride_id = r.id and p.user_id = auth.uid())
              or (r.group_id is not null and public.is_group_member(r.group_id))
            )
          )
        )
    )
  );
$$;
