# Multiverso Girls

Comunidade (PWA) para motoqueiras encontrarem outras mulheres que andam de
moto na sua região, criarem amizades, grupos e combinarem rolês. MVP focado
no Rio Grande do Sul, com arquitetura preparada para expansão a outros
estados.

Nome do projeto é provisório.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript
- Tailwind CSS v4
- Componentes estilo [shadcn/ui](https://ui.shadcn.com) em `components/ui`
- [Supabase](https://supabase.com) (`@supabase/ssr`) para auth, banco, Storage e Realtime
- PWA instalável (manifest + service worker)

## Princípios do produto

- Sem mapa e sem localização exata — apenas cidade e estado.
- Interface 100% em português brasileiro, mobile-first.
- Identidade visual ligada a estrada/moto/liberdade — deliberadamente sem
  paleta rosa como cor de marca (ver tokens em `app/globals.css`).
- Três tipos de acesso com áreas isoladas: motoqueira (comunidade), lojista/
  parceiro (sem acesso a chats/grupos/rolês da comunidade) e administrador.
- Sem pagamentos dentro do app.

## Estrutura de pastas

```
app/
  page.tsx              → landing pública ("/")
  (auth)/               → entrar, cadastro (fluxo completo na próxima etapa)
  (comunidade)/         → área logada da motoqueira, com bottom nav mobile
  (parceiro)/           → área do lojista, isolada da comunidade
  (admin)/               → painel administrativo
  manifest.ts / icon.svg → PWA
components/
  ui/                   → primitives (shadcn/ui)
  layout/               → shells (mobile, placeholder de tela)
  pwa/                  → registro do service worker
features/
  auth/                 → server actions e formulários de autenticação
lib/
  supabase/             → clientes browser/server + refresh de sessão
  constants/             → UFs, estilos de rolê, status de perfil
  utils.ts
types/
  database.types.ts     → tipos do Supabase (placeholder até a modelagem do banco)
proxy.ts                → equivalente ao middleware.ts no Next.js 16 (refresh de sessão)
```

`features/` isola regras de negócio por domínio (auth, e futuramente profile,
community, partners, admin) para a pasta `app/` continuar sendo só rotas.

## Configuração

1. Instale as dependências: `npm install`
2. Copie `.env.local.example` para `.env.local` e preencha com os dados do
   seu projeto Supabase (URL e anon key). **Nunca** coloque a service role
   key em variáveis `NEXT_PUBLIC_*`.
3. Rode o projeto: `npm run dev`

> Observação: os pacotes do Supabase pedem Node.js 22+; o projeto funciona
> em versões anteriores, mas vale considerar atualizar o Node.

## Banco de dados (Supabase)

As migrations ficam em `supabase/migrations` e devem ser aplicadas em ordem
(`supabase db push` ou colando no SQL Editor):

| Migration | Conteúdo |
| --- | --- |
| `…01_fundacao` | `profiles` (status de aprovação/suspensão), `admin_users`, `blocks`, notificações, buckets `ride-images` e `group-covers` |
| `…02_grupos` | grupos, membros, RPCs de entrada/aprovação/cargos |
| `…03_roles` | rolês, participantes, **ponto de encontro em tabela privada**, RPCs (`join_ride`, `cancel_ride`, …) |
| `…04_chat` | conversas privada/grupo/rolê, mensagens, leituras, solicitações de conversa, bucket privado `chat-images`, Realtime |
| `…05_moderacao_lgpd` | denúncias, histórico imutável de moderação, exportação e anonimização de conta |
| `…06_grants` | fecha o `EXECUTE` de todas as funções e libera só as RPCs usadas pelo app |
| `…07_parceiros` | parceiros (conta separada da comunidade), planos, assinaturas, produtos (vitrine), métricas anônimas, view `public_partners`, bucket `partner-media` |
| `…08_admin` | auditoria imutável, configurações, RPCs administrativas e `admin_dashboard()` |
| `…09_grants_parceiros` | fecha/libera o `EXECUTE` das funções das migrations 07–08 |
| `…10_aprovacao_hardening` | correções da auditoria do fluxo de aprovação: só conta ativa lê membros/participantes/ponto de encontro e bloqueia; fecha escrita em `admin_users` |

Depois de aplicar:

1. **Primeira administradora** — veja "Criando o primeiro administrador" abaixo.
2. Preencha `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` — usada **somente** para remover a conta do Auth na exclusão LGPD.
3. Confirme que `messages`, `conversation_reads`, `conversations` e `notifications` estão na publicação `supabase_realtime` (a migration 04 já tenta adicioná-las).

### Fluxo de aprovação de motoqueiras

`/cadastro` → `auth.signUp` (metadados: nome, cidade, UF, aceite) → trigger `handle_new_user` cria `profiles` com `status = 'pending'`
→ a usuária cai em `/aguardando` (qualquer página da comunidade redireciona para lá) → a administradora vê a fila em
**Admin → Cadastros pendentes** → **Aprovar** chama a RPC `admin_review_profile` (só `is_admin()`, grava auditoria e notifica)
→ `status = 'approved'` → `is_active_member()` passa a ser verdadeiro e a comunidade abre. Pending, rejected, suspended (em vigor),
banned e deleted **não** acessam nada da comunidade: o gate existe nas páginas (`requireMember`) **e** no banco (toda policy/RPC usa `is_active_member()`).

### Criando o primeiro administrador

A tabela `admin_users` não tem policy nem privilégio de escrita para `authenticated`/`anon`: **nenhuma chamada da API consegue criar
admin** — só o SQL Editor do Supabase (papel `postgres`) ou a service role.

1. Crie a conta com um e-mail dedicado (pelo app em `/cadastro` ou em *Authentication → Users → Add user*).
2. No **SQL Editor** do painel do Supabase:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@seu-dominio.com';

   -- opcional: liberar também o uso da comunidade com esta conta
   update public.profiles set status = 'approved'
    where id = (select id from auth.users where email = 'admin@seu-dominio.com');

   select * from public.admin_users;  -- confira
   ```
3. Entre em `/entrar`: quem é admin e não tem perfil aprovado vai direto para `/admin`.
4. Ative MFA nessa conta (Supabase Auth) e não use a service role no navegador.

Para remover: `delete from public.admin_users where user_id = '<uuid>';`. A criação de admin por SQL **não** aparece na auditoria do app.

### Privacidade por desenho

- Feed e páginas públicas de rolê carregam só **cidade/UF**. O "ponto de encontro" vive em `ride_private_details`, com RLS para organizadora e participantes **confirmadas**.
- `messages` só é legível/gravável por quem passa em `can_access_conversation()` / `can_send_message()` (RLS); o Realtime respeita a mesma regra. Imagens de chat ficam em bucket privado com URLs assinadas.
- Colunas sensíveis (`status`, `confirmed_count`, `suspended_until`…) não são graváveis pelo cliente: só por RPC `security definer`.
- Histórico de moderação (`moderation_actions`) é append-only: ninguém tem privilégio de escrita direta.

## Áreas do app

| Área | Rotas | Quem acessa |
| --- | --- | --- |
| Comunidade | `/inicio`, `/roles`, `/grupos`, `/mensagens`, `/parceiros`, `/perfil`... | motoqueira aprovada |
| Parceiro (lojista) | `/parceiro/*` (dashboard, loja, produtos, promoções, métricas, plano, perfil) | conta de parceiro — **sem** acesso à comunidade |
| Admin | `/admin/*` e `/moderacao/*` | contas em `admin_users` |
| Público | `/`, `/entrar`, `/cadastro`, `/quero-ser-parceiro`, `/regras`, `/seguranca`, `/termos`, `/privacidade` | todos |

`/go/{produto|whatsapp-produto|whatsapp-loja|site}/{id}` registra o clique (anônimo) e redireciona para o destino cadastrado pelo lojista.

## Estado atual

MVP funcional de ponta a ponta (comunidade, parceiros, planos manuais e painel admin).
**Leia [docs/AUDITORIA-MVP.md](docs/AUDITORIA-MVP.md)**: funcionalidades incompletas, riscos de segurança
e o checklist do que falta antes de publicar (o app ainda não foi testado contra um projeto Supabase real).
