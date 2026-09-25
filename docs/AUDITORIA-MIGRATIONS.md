# Auditoria técnica das migrations e da estrutura Supabase

Escopo: `supabase/migrations/` (11 arquivos), na ordem de execução, num banco **vazio**. Nada foi aplicado em Supabase real.

## Como foi auditado

- As 11 migrations foram aplicadas, em ordem, num Postgres vazio (PGlite) com o que o Supabase já traz simulado (`auth.users`, `auth.uid()`, `storage.*`, publicação `supabase_realtime`, papéis `anon`/`authenticated`/`service_role`/`supabase_auth_admin` e *default privileges*).
- Inspeção do **catálogo final**: RLS por tabela, todas as policies, privilégios de tabela/coluna para `anon` e `authenticated`, todas as funções (`security definer`, `search_path`, `EXECUTE`), triggers, FKs e `ON DELETE`, buckets e publicação Realtime.
- **Ataques via API** (como `authenticated`, ignorando o frontend): 39 verificações. Mais as suítes de fluxo: 121 (comunidade, parceiros, admin) e 125 (aprovação de motoqueiras). Todas passam.
- `tsc`, `eslint` e `next build` passam.

Limite: não é o Supabase real. Itens que só o primeiro `db push` confirma estão em "Riscos que permanecem".

## 1. Migrations, em ordem

| # | Arquivo | Objetivo |
| --- | --- | --- |
| 01 | `20260918000001_fundacao` | `profiles` (status), `admin_users`, `blocks`, `notifications`; helpers `is_admin`/`is_active_member`/bloqueios; trigger de cadastro; buckets `ride-images` e `group-covers` |
| 02 | `20260918000002_grupos` | grupos, membros, RPCs de entrada/aprovação/cargos |
| 03 | `20260918000003_roles` | rolês, participantes, **ponto de encontro em tabela privada**, RPCs, notificações |
| 04 | `20260918000004_chat` | conversas (privada/grupo/rolê), mensagens, leituras, solicitações de conversa, bucket privado `chat-images`, Realtime |
| 05 | `20260918000005_moderacao_lgpd` | denúncias, histórico de moderação imutável, exportação e anonimização (LGPD) |
| 06 | `20260918000006_grants` | fecha `EXECUTE` das funções e libera só as RPCs do app; `anon` sem tabelas |
| 07 | `20260919000007_parceiros` | parceiros (conta separada), planos, assinaturas, produtos, métricas anônimas, view `public_partners`, bucket `partner-media`; **substitui** `handle_new_user` e `is_active_member` |
| 08 | `20260919000008_admin` | auditoria imutável, configurações, RPCs administrativas, `admin_dashboard()` |
| 09 | `20260919000009_grants_parceiros` | mesmo padrão da 06 para as funções das migrations 07–08 |
| 10 | `20260919000010_approval_hardening` | só conta **ativa** lê membros/participantes/ponto de encontro e bloqueia; fecha escrita em `admin_users` |
| 11 | `20260919000011_security_review` | correções desta auditoria (abaixo) |

**Dependências:** cada arquivo só referencia objetos criados nele ou antes; um banco vazio executa 01→11 sem erro. As migrations 07, 10 e 11 recriam (`create or replace`) funções/policies das anteriores; nomes conferem, **não sobra policy duplicada** (o catálogo final tem exatamente uma policy por operação/tabela, todas `authenticated`, nenhuma para `anon`/`public`). Não há tabela/coluna duplicada.

## 2. Problemas encontrados

| Sev. | Problema | Prova |
| --- | --- | --- |
| Alta | Funções auxiliares expostas como RPC aceitavam `uid` arbitrário (`is_blocked_between`, `is_group_member/admin`, `is_ride_organizer/participant`, `is_active_member(uid)`): qualquer autenticada — inclusive *pending* ou lojista — descobria **quem bloqueou quem** e a participação/cargo em grupos e rolês **privados** | 12 testes de ataque falhavam |
| Alta | Conta de **parceiro** podia ser inserida em `admin_users` (sem profile; quebraria também os FKs do histórico de moderação) | teste falhava |
| Média | Sem limites no banco para `display_name`/`bio`/`city`/`state` e **URLs de imagem livres** (`avatar_url`, `rides.image_url`, `groups.cover_url`, logos/produtos): pela API direta, dava para colocar imagem de host externo (pixel de rastreamento) vista por outras membras | 8 testes falhavam |
| Média | `authenticated` com TRUNCATE/REFERENCES/TRIGGER em todas as tabelas (TRUNCATE ignora RLS) e DML "sem policy" (RLS negava, mas o privilégio existia); view `public_partners` com INSERT/UPDATE/DELETE | catálogo |
| Baixa | Funções `security definer` com `search_path = public` (sem `pg_temp` no fim) | catálogo |
| Baixa | Policy de Storage do chat fazia `::uuid` sem garantir ordem de avaliação (pasta não-uuid poderia gerar erro) | revisão |
| Baixa | Perfil `banned`/`deleted` ainda editava os próprios dados | revisão |

O que **já estava certo** (verificado): RLS ligado nas 25 tabelas; nenhuma função executável por `anon`; internas (`push_notification`, `write_audit`, triggers) sem acesso da API; todas as `security definer` com `search_path`; trigger de cadastro funciona mesmo quando disparado por `supabase_auth_admin` (sem EXECUTE direto); FKs com `ON DELETE` coerentes (excluir `auth.users` apaga profile/rolês/participações e **anula** referências de denúncias/moderação/auditoria); `admin_users` sem nenhum privilégio para a API.

## 3. Correções realizadas (migration 11 + ajustes)

1. Helpers com `uid` só respondem sobre **a própria usuária** (ou admin); versões `internal_*` (sem acesso da API) para as duas RPCs que precisam olhar outro uid (`remove_group_member`, `request_chat`).
2. `admin_users.user_id` agora referencia **`profiles`** (não `auth.users`): só motoqueira com profile pode ser admin.
3. Constraints de tamanho/formato em `profiles`; `avatar_url` não é mais gravável pela usuária (não há upload de avatar); trigger `enforce_media_urls` restringe imagens de rolê/grupo/parceiro/produto ao **bucket correto do Storage do projeto** (host fixado quando `app_settings.storage_base_url` está definido).
4. `revoke` de TRUNCATE/REFERENCES/TRIGGER e de DML direto nas tabelas escritas só por RPC; view somente leitura; *default privileges* ajustados.
5. `search_path = public, pg_temp` em todas as funções.
6. Policies de Storage do chat com `storage_conversation_id()` (cast seguro).
7. `profiles_update_own` bloqueia `banned`/`deleted`.
8. Renomeado o arquivo da migration 10 para `…_approval_hardening.sql` (o nome não altera a versão).

Arquivos alterados: `supabase/migrations/20260919000011_security_review.sql` (novo), `supabase/migrations/20260919000010_approval_hardening.sql` (renomeado, conteúdo igual), `README.md`, este documento.
Nenhum arquivo de código do app precisou mudar (verificado: as escritas diretas do app só usam tabelas/colunas que continuam permitidas; RPCs mantêm assinatura).

## 4. RLS — o essencial

| Tabela | Regra |
| --- | --- |
| `profiles` | ler: própria, admin, ou membro **ativa** (exceto quem me bloqueou); editar: só a própria, só `display_name/bio/city/state`, não `banned/deleted`; sem INSERT/DELETE |
| `admin_users` | RLS ligado, **nenhuma policy e nenhum privilégio** para a API; só `is_admin()` (definer) lê |
| `rides` / `group_members` / `ride_participants` | ler exige `is_active_member()`; escrita só por RPC |
| `ride_private_details` (**ponto de encontro**) | só organizadora ou participante **confirmada**, e conta **ativa** |
| `conversations`, `messages`, `conversation_*` | `can_access_conversation()`: privada = participante; grupo = membro ativo (grupo ativo); rolê = confirmada; sempre conta ativa; envio via `can_send_message()` (bloqueios, rolê cancelado) |
| `blocks`, `reports`, `chat_requests`, `notifications`, `lgpd_requests` | só linhas próprias; escrita por RPC (exceto `notifications.read_at`) |
| `moderation_actions`, `audit_log` | leitura só admin; **imutáveis** (ninguém tem INSERT/UPDATE/DELETE; nascem dentro de RPCs) |
| `partners` | dono ou admin; dono edita só campos da loja (não `status`); view `public_partners` expõe só colunas comerciais de lojas aprovadas com plano em vigor, apenas para membro ativa |
| `products`, `commercial_events`, `partner_subscriptions`, `partner_admin_notes` | produtos públicos só se ativo+campanha+loja no ar e leitor membro ativo; métricas/assinaturas só dono/admin; **observações internas só admin**; eventos sem id de usuária |
| `storage.objects` | pasta = `auth.uid()` para escrever em `ride-images`/`group-covers`/`partner-media` (mídia pública, leitura por URL); `chat-images` **privado**, leitura/escrita só com acesso à conversa |

## 5. Funções `security definer` e proteção

Todas com `set search_path = public, pg_temp`, `EXECUTE` revogado de `public`/`anon` e só liberado a `authenticated` quando faz parte da API.

- **Predicados de RLS (auth-exec):** `is_admin`, `is_active_member`, `is_blocked_between/by`, `i_blocked`, `is_group_member/admin`, `is_ride_organizer/participant`, `is_direct_participant`, `is_partner_owner`, `can_view_ride`, `can_access_conversation`, `can_send_message`, `partner_is_live`, `product_is_public` — só falam da própria `auth.uid()`.
- **RPCs do app (auth-exec, cada uma valida `auth.uid()`/`is_active_member()`/`is_admin()` no corpo):** grupos (`join/leave/respond/remove/set_group_admin`), rolês (`join/leave/respond/remove/cancel/close`), chat (`mark_conversation_read`, `delete_message`, `pin_message`, `request_chat`, `respond_chat_request`, `block/unblock`, `list_blocked`), denúncia/moderação (`create_report`, `moderate`), LGPD (`export_my_data`, `anonymize_my_account`), parceiros (`partner_resubmit`, `track_*`, `partner_*_metrics`), admin (`admin_review_profile/partner`, `admin_set_subscription/product_status/setting`, `admin_dashboard`).
- **Internas (sem acesso da API):** `push_notification`, `write_audit`, `internal_member_ok`, `internal_group_admin`, `internal_media_url_ok`, `partner_plan_in_force` e todas as funções de trigger (`handle_new_user`, `products_guard`, `enforce_media_urls`, contadores, notificações, conversas).
- **Sem `service_role` no banco.** No app só existe em `lib/supabase/admin.ts` (`server-only`), importado apenas por Server Actions (excluir conta no Auth); nenhuma variável `NEXT_PUBLIC_` a expõe.

## 6. Estratégia do primeiro administrador

- Impossível pela API: `admin_users` não tem policy nem privilégio de escrita para `authenticated`/`anon`; a coluna de status de `profiles` não é gravável pela usuária; `user_metadata` do Auth nunca dá papel (só é lido no cadastro, e o trigger ignora `status`/`role`).
- Só conta com **profile** (motoqueira) pode ser admin; conta de parceiro é recusada pelo banco.
- Criação inicial = procedimento excepcional, manual, no **SQL Editor** (papel `postgres`). Não aparece na auditoria do app — registre externamente.

## 7. Riscos que permanecem

1. **Primeira aplicação no Supabase real** pode revelar diferenças de permissão que o PGlite não reproduz: criar policy em `storage.objects`, `alter publication supabase_realtime`, trigger em `auth.users` (todos costumam funcionar como `postgres`). Aplicar **primeiro num projeto descartável**.
2. Aviso do linter do Supabase sobre a view `public_partners` (é intencional: ela roda com direitos do dono para esconder colunas e filtra por `is_active_member()`).
3. Sem rate limiting (mensagens, solicitações de chat, criação de rolês, `track_*` que pode inflar métricas). Usar o rate limit/CAPTCHA do Supabase Auth e considerar limites em RPCs.
4. Sem CAPTCHA no cadastro: fila de "Cadastros pendentes" pode ser inundada; **desative login anônimo** no Auth (criaria `authenticated` sem cadastro; ficaria *pending*, mas polui a fila).
5. `storage_base_url` é opcional no banco: enquanto não for definida, só o **formato** da URL de imagem é exigido (host livre). Defina no bootstrap.
6. Mídia em buckets públicos: quem tem a URL vê a imagem (inclusive de rolê privado); imagens de chat apagadas continuam no Storage (sem job de limpeza).
7. Parceiro aprovado edita conteúdo sem nova revisão.
8. Um usuário removido de grupo **público** pode voltar a entrar (sem lista de vetados); bloqueio não impede coexistir em grupo.
9. Criar admin por SQL não gera trilha no app; sem MFA obrigatório (ligar MFA para contas admin).
10. Confirmação de e-mail depende de *Site URL/Redirect URLs* do Auth; após confirmar, a usuária entra manualmente em `/entrar`.

## 8. Veredito

**Seguro aplicar em um Supabase novo** — com a ressalva da primeira aplicação em projeto descartável/staging (item 1 acima) e dos ajustes de Auth abaixo. Justificativa: banco vazio executa 01→11 sem erro; RLS em todas as tabelas; nenhuma via de escalada encontrada por API (0 falhas nas baterias); funções `security definer` fechadas; isolamento parceiro↔comunidade, chats, ponto de encontro, bloqueios e moderação verificados por ataque; `service_role` nunca no navegador.

## 9. Comandos (para executar depois — nada foi executado)

Pré-requisito: Node 22+, projeto **novo e vazio** criado em supabase.com (anote *Project ref* e a *senha do banco*).

```bash
# 1) Autenticar e vincular a pasta ao projeto
npx supabase login
npx supabase link --project-ref <PROJECT_REF>

# 2) Conferir o que será aplicado (não altera nada)
npx supabase migration list
npx supabase db push --dry-run

# 3) Aplicar as 11 migrations
npx supabase db push

# 4) Verificar
npx supabase migration list          # 11 aplicadas
npx supabase db lint --linked        # avisos de SQL/funções
```

Ajustes no painel Supabase (*Authentication*): desligar **Anonymous sign-ins**; ligar **Confirm email**; definir **Site URL** e **Redirect URLs**; senha mínima ≥ 8; ligar CAPTCHA/rate limits. Em *Storage*, conferir os buckets `ride-images`, `group-covers`, `partner-media` (públicos) e `chat-images` (privado). Em *Database → Publications*, conferir `messages`, `conversations`, `conversation_reads`, `notifications` em `supabase_realtime`.

Bootstrap, no **SQL Editor** (uma única vez):

```sql
-- (a) prender as imagens ao Storage deste projeto
insert into public.app_settings (key, value)
values ('storage_base_url', to_jsonb('https://<PROJECT_REF>.supabase.co'::text))
on conflict (key) do update set value = excluded.value;

-- (b) primeira administradora — a conta precisa existir (criada em Authentication → Users ou em /cadastro)
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@seu-dominio.com'
returning user_id;                       -- deve devolver 1 linha

-- (c) opcional: liberar também o uso da comunidade com essa conta
update public.profiles set status = 'approved'
 where id = (select id from auth.users where email = 'admin@seu-dominio.com');
```

Depois: preencher `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — esta última nunca com prefixo `NEXT_PUBLIC_`), `npm run dev`, entrar em `/entrar` com a conta admin (vai para `/admin`) e ativar MFA nela.
