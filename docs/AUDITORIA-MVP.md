# Auditoria do MVP — Multiverso Girls

Data: 19/09/2026 · Escopo: prompts 5–12 (rolês, grupos, chats, moderação, parceiros, planos, painel admin) + revisão geral.

## Como foi verificado (e o que NÃO foi)

| Verificação | Resultado |
| --- | --- |
| `tsc --noEmit`, `eslint`, `next build` | ✅ passam sem erros |
| Migrations 01–09 + 121 verificações de RLS/RPC/trigger num Postgres em memória (PGlite) com `auth`/`storage` simulados | ✅ todas passam |
| Layout em 360, 390, 412, 768 e 1280 px (Edge headless) | ✅ sem rolagem horizontal — **somente nas páginas públicas** |
| Rotas protegidas sem sessão (`/inicio`, `/parceiro`, `/admin`, `/parceiros`, `/moderacao`, `/go/*`) | ✅ redirecionam para `/entrar` |
| Cabeçalhos de segurança HTTP, manifest, cache do `sw.js` | ✅ conferidos via HTTP |
| **Execução contra um projeto Supabase real** (auth, Realtime, Storage, PostgREST) | ❌ **não feita** — não há projeto configurado |
| Telas logadas em navegador (feed, chat, painéis) | ❌ **não vistas** — dependem do item acima |

O SQL foi testado num Postgres real, mas sem as camadas do Supabase; embeds do PostgREST (`profiles!organizer_id`, etc.), filtros do Realtime e políticas de Storage só serão validados de fato no primeiro teste com o projeto.

---

## 1. Funcionalidades implementadas

**Comunidade** — feed "Quem pilha um rolê?" (Pra hoje / Próximos / Minha cidade / Meus rolês, ordenado por cidade e data), rolês com aprovação, lotação, cancelar/encerrar/remover, ponto de encontro restrito às confirmadas; grupos (público/privado, cargos, rolês do grupo); conversas privada/grupo/rolê em tempo real (paginadas, não lidas, "lida", apagar, fixar, imagem); denúncia, bloqueio e Central de Moderação com histórico imutável; cadastro de motoqueira (com aceite de termos e 18+); LGPD (ver, corrigir, exportar, excluir/anonimizar); páginas de regras, segurança, termos e privacidade.

**Parceiros (P9–P11)** — "Quero ser parceiro"; conta 100% separada da comunidade (isolada no banco); aprovação (pending/approved/rejected/suspended); painel com Dashboard, Minha loja, Produtos, Promoções, Métricas, Meu plano e Perfil; página pública da loja; produtos como **vitrine** (sem carrinho/checkout/pagamento/estoque/frete); WhatsApp com mensagem pré-preenchida e link externo via redirecionador `/go/*`; métricas anônimas (impressão, clique no produto, WhatsApp, site); página 🛍️ Parceiros com filtros (minha cidade, categoria, promoções, novidades) e paginação; "Parceiros em destaque" e até N cards "Patrocinado" na Home (limite configurável, padrão 2); planos Básico/Destaque/Premium com limites e recursos aplicados **no banco**; ativação/renovação/suspensão manual; plano vencido tira a loja do ar sem apagar nada e mostra a mensagem de renovação; colunas reservadas para futuro gateway (`payment_provider`, `external_ref`) sem integração.

**Painel admin (P12)** — Dashboard (comunidade, rolês, grupos, segurança, parceiros), Motoqueiras, Cadastros pendentes (aprovar/recusar), Rolês, Grupos, Denúncias, Parceiros (+detalhe), Produtos, Planos (vencendo/vencidos), Configurações, Auditoria; busca, filtros e paginação; **toda ação destrutiva exige motivo e uma segunda confirmação**, e é gravada na auditoria imutável; nada é excluído sem confirmação (produtos "bloqueados"/pausados em vez de apagados).

**Acabamento** — navegação Início/Rolês/Grupos/Conversas/Perfil, com 🛍️ Parceiros e 🔔 Notificações no topo da Home e no menu Perfil; loading, 404 e erro globais em português; PWA (manifest com a descrição oficial, ícones PNG 192/512/maskable, service worker seguro); imagens reduzidas no navegador antes do upload (WebP, ≤1600 px).

## 2. Funcionalidades incompletas

- **Recuperação de senha** ("esqueci minha senha") — não existe.
- **Descobrir motoqueiras** (prompt 4) — só o placeholder; saiu da barra de navegação.
- **Foto de perfil** — não há upload de avatar (só nome, cidade, estado, bio).
- **Criar novas administradoras** — só por SQL (`insert into admin_users`).
- **Notificações por e-mail/push** — só notificações dentro do app; **parceiros não recebem notificações** (veem o status no painel).
- **Logo no cadastro de parceiro** — enviado depois, em "Minha loja" (não há sessão durante o cadastro se o e-mail exigir confirmação).
- **Feed** — até 60 rolês por consulta, sem rolagem infinita; "impressões" contadas no cliente (1 por produto por sessão).
- **Exportação LGPD para parceiros** — só exclusão da conta.
- **Textos jurídicos** — modelos, não revisados.
- **Ícone do app** — provisório (círculo roxo); trocar pela arte final.
- **Premium** — estrutura criada, benefícios finais não definidos (como pedido).

## 3. Problemas encontrados (e situação)

| # | Problema | Situação |
| --- | --- | --- |
| 1 | **Service worker cacheava toda resposta GET** — páginas logadas, exportação LGPD e chamadas cross-origin ao Supabase ficariam no navegador (vazamento em aparelho compartilhado) | ✅ corrigido: só ativos estáticos são cacheados; nada de sessão |
| 2 | `INSERT ... RETURNING` de rolê falhava por RLS (função STABLE não vê a linha nova) | ✅ corrigido (achado pelos testes de banco) |
| 3 | Páginas autenticadas eram prerenderizadas sem `.env` e quebravam o build | ✅ corrigido (`connection()`) |
| 4 | Gate de acesso só no layout — layouts não bloqueiam a página nem reexecutam em navegação | ✅ corrigido: cada página chama `requireMember/requirePartner/requireAdmin` |
| 5 | `UPDATE` sem filtro é rejeitado pelo PostgREST (safeupdate) | ✅ corrigido em `updateStore` |
| 6 | Ícone de Instagram não existe no `lucide-react` v1 | ✅ trocado |
| 7 | Nada impedia uma conta ser parceira **e** motoqueira | ✅ corrigido: `is_active_member()` é falso para dono de parceiro; aprovação de perfil recusa contas de parceiro |
| 8 | Página `/entrar` ignora `?conta=excluida` (sem mensagem de confirmação) | ⚠️ aberto (cosmético) |
| 9 | Aviso do `supabase-js`: Node 20 será descontinuado | ⚠️ atualizar para Node 22 |

## 4. Riscos de segurança

**Mitigados por desenho (testados no banco):** mensagens só legíveis por quem está na conversa (RLS + Realtime); endereço/ponto de encontro em tabela separada com RLS; colunas sensíveis (`status`, `confirmed_count`, plano, `suspended_until`) não graváveis pelo cliente; funções `security definer` com `search_path` fixo e `EXECUTE` fechado (só as RPCs do app são liberadas a `authenticated`; `anon` sem acesso a tabelas); histórico de moderação e auditoria imutáveis; dados do lojista (CNPJ, e-mail, telefone, razão social) nunca visíveis às motoqueiras (view `public_partners`); métricas sem id de usuária; redirecionador `/go` lê o destino do banco (sem open redirect) e só aceita http(s); URLs de imagem/links validadas; service role somente em código `server-only`; cabeçalhos HTTP (nosniff, DENY frame, HSTS, Permissions-Policy).

**Riscos que permanecem:**

1. 🔴 **Sem Content-Security-Policy.** Precisa liberar o host do Supabase (REST, WebSocket, Storage) e nonces do Next — fazer antes de lançar.
2. 🔴 **Sem rate limiting** em cadastro, login, pedidos de conversa e cliques (`track_*`): dá para spammar solicitações ou **inflar métricas de um parceiro**. Ativar o CAPTCHA/rate limit do Supabase Auth e limitar `request_chat`.
3. 🟠 **Parceiro aprovado edita descrição, logo, categoria e produtos sem nova revisão** (moderação só reativa: bloqueio/suspensão). Um lojista pode publicar conteúdo impróprio depois de aprovado.
4. 🟠 **Buckets públicos** (`ride-images`, `group-covers`, `partner-media`): a URL é impossível de adivinhar, mas quem a tiver vê a imagem, inclusive de rolê privado.
5. 🟠 **Descrição pública de rolê pode conter endereço** — só há aviso no formulário, sem detecção automática.
6. 🟠 **Bootstrap de administradora por SQL**; sem 2FA para admins. Recomendado MFA no Supabase Auth para contas admin.
7. 🟡 Imagens de chat apagadas continuam no Storage (falta job de limpeza) — relevante para LGPD.
8. 🟡 Conta banida pode se recadastrar com outro e-mail (sem checagem de reincidência).
9. 🟡 Confirmação de e-mail depende da configuração de *Site URL/Redirect URLs* do Supabase Auth.
10. 🟡 `user_metadata` do Supabase é editável pelo usuário — o app só o usa **na criação** da conta (trigger), nunca para autorização.

## 5. Melhorias recomendadas

1. Fluxo "esqueci minha senha" e reenvio de confirmação de e-mail.
2. CSP + rate limiting + CAPTCHA no cadastro.
3. Reaprovação automática quando o parceiro altera nome/descrição/logo/categoria (ou fila de "alterações pendentes").
4. Job periódico (Edge Function/cron) para limpar imagens órfãs e marcar assinaturas vencidas como `expired` (hoje o vencimento já é efetivo por cálculo).
5. Notificações por e-mail (aprovação de cadastro, plano vencendo) e push (PWA).
6. Paginação/scroll infinito no feed; índice `pg_trgm` para busca por cidade/nome se crescer.
7. Gerar tipos com `supabase gen types` e passar `<Database>` aos clientes (hoje as linhas são tipadas à mão).
8. Testes automatizados: converter `sqltest` (RLS) em suíte de CI e adicionar testes E2E (Playwright) com um projeto Supabase de teste.
9. Monitoramento de erros (Sentry) e logs de auditoria com retenção definida.
10. Avaliar custo das funções de RLS por linha (`can_view_ride`, `is_active_member`) quando houver milhares de rolês/mensagens.
11. UI para promover/remover administradoras (com MFA obrigatório).
12. Arte final do ícone e *splash screens* do PWA.

## 6. Checklist antes de colocar o MVP no ar

**Infra e banco**
- [ ] Criar o projeto Supabase; aplicar as migrations `01`→`09` em ordem.
- [ ] Preencher `.env.local`/variáveis do host: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (nunca `NEXT_PUBLIC_`).
- [ ] Conferir que `messages`, `conversation_reads`, `conversations` e `notifications` estão na publicação `supabase_realtime`.
- [ ] Conferir os buckets `ride-images`, `group-covers`, `partner-media` (públicos) e `chat-images` (privado) e suas policies.
- [ ] Auth: definir Site URL/Redirect URLs, e-mails em português, exigir confirmação de e-mail, senha mínima, CAPTCHA/rate limit; ligar MFA para admins.
- [ ] Criar a(s) administradora(s): `insert into admin_users (user_id) values ('<uuid>')`.
- [ ] Preencher Configurações → contato do suporte (aparece na mensagem de plano vencido).
- [ ] Ativar backups (PITR) e definir retenção de logs.

**Testes com o projeto real** (o que ainda não foi validado)
- [ ] Cadastro de motoqueira → aprovação em "Cadastros pendentes" → acesso liberado.
- [ ] Cadastro de parceiro → aprovação → ativar plano → publicar produto → aparece em 🛍️ Parceiros.
- [ ] Com duas contas: criar rolê, confirmar, checar que o ponto de encontro só aparece à confirmada.
- [ ] Chat em tempo real (grupo, rolê, privado), imagem, "lida", bloqueio.
- [ ] Vencer um plano (definir `ends_at` no passado) → loja sai do ar e a mensagem de renovação aparece.
- [ ] Conta de parceiro tentando abrir `/inicio`, `/grupos`, `/mensagens` → redireciona para `/parceiro`.
- [ ] Testar as telas logadas em 360/390/412 px, tablet e desktop, em iOS Safari e Android Chrome; instalar como PWA.

**Segurança e legal**
- [ ] Adicionar CSP e rate limiting (itens 4.1 e 4.2).
- [ ] Revisão jurídica de Termos, Política de Privacidade e regras; definir controladora, DPO e canal de contato.
- [ ] Definir política de retenção de denúncias/auditoria e de dados de contas banidas.
- [ ] Trocar o ícone provisório e revisar textos/nome do app.

**Operação**
- [ ] Definir quem modera e o tempo de resposta às denúncias; plano de resposta a conteúdo grave (ameaça, menor de idade).
- [ ] Processo comercial para ativar/renovar planos (o pagamento é externo) e avisar parceiros antes do vencimento.
- [ ] Atualizar o Node do ambiente para 22+.
