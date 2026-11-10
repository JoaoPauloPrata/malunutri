# Malu Nutri

PWA para a nutricionista e os pacientes. Funciona no celular (instalável) e no desktop.

| Área | O que tem |
|---|---|
| **Nutricionista** | Painel "Hoje" (agenda, planos pra montar, check-ins novos), cadastro de pacientes, ficha por paciente com **transcrição → prontuário com IA**, **plano alimentar** com "enviar pro app", **exames** com status automático (baixo/normal/alto), **evolução** e **recados** |
| **Paciente** | "Oi, Mariana. Hora do almoço." com a refeição do horário, proteína e água do dia, **balança de substituições**, **check-in semanal de 1 minuto**, evolução de peso/cintura e recados |

## Arquitetura

```
frontend/   React 19 + Vite + Tailwind v4 + vite-plugin-pwa (Supabase Auth só para login)
backend/    .NET 10 — Clean Architecture em camadas
  MaluNutri.Domain          entidades e regras (sem dependências)
  MaluNutri.Application     casos de uso, DTOs, contratos (repositórios, IA, Auth)
  MaluNutri.Infrastructure  EF Core + Npgsql, funções SQL, Supabase Admin, Claude
  MaluNutri.Api             controllers, JWT do Supabase, ProblemDetails, serve o PWA
supabase/migrations/        schema versionado (Supabase CLI)
Dockerfile + fly.toml       uma máquina mínima no Fly servindo API + PWA
```

### O que roda no Postgres

Tudo fica no schema `nutri`, que **não** é exposto pela API REST do Supabase; só a API .NET acessa.

- `fn_food_substitutions`: balança de trocas pelo macronutriente dominante do grupo (100 g de arroz ≈ 235 g de batata inglesa ≈ 50 g de pão francês).
- `fn_patient_today`: refeição do horário, proteína e água do dia, semana do plano e recados não lidos.
- `fn_nutritionist_today`: agenda do dia e pendências.
- `fn_patient_progress`: série de peso/cintura, variação e adesão média.
- `fn_monthly_report`: resumo do mês.
- `fn_add_daily_log`: soma atômica de água/proteína (upsert).
- `v_patient_overview`: lista de pacientes com idade, último peso, plano ativo e check-ins pendentes.
- Coluna gerada `exam_results.status`, índice único parcial (um plano ativo por paciente), trigram + `unaccent` na busca, trigger de semana do check-in.
- Trigger em `auth.users`: cria o perfil e **vincula o paciente pelo e-mail** quando ele aceita o convite. O papel de nutricionista vem de `nutri.nutritionist_allowlist`, nunca do cliente.

## Configuração

### 1. Supabase

1. Crie o projeto e aplique as migrations:
   ```bash
   npx supabase link --project-ref SEU_REF
   npx supabase db push
   ```
2. Autorize a conta da nutricionista (SQL Editor):
   ```sql
   insert into nutri.nutritionist_allowlist (email, full_name) values ('malu@exemplo.com', 'Malu Lage');
   ```
   Depois crie o usuário em **Authentication → Users → Invite user** com esse e-mail.
3. Em **Authentication → URL Configuration**:
   - Site URL: `https://malu-nutri.fly.dev`
   - Redirect URLs: `https://malu-nutri.fly.dev/definir-senha` e `http://localhost:5173/definir-senha`

### 2. Rodar local

```bash
# backend (user-secrets, para não versionar segredos)
cd backend/src/MaluNutri.Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=aws-0-sa-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.SEU_REF;Password=...;SSL Mode=Require"
dotnet user-secrets set "Supabase:Url" "https://SEU_REF.supabase.co"
dotnet user-secrets set "Supabase:ServiceRoleKey" "sb_secret_..."
dotnet user-secrets set "Supabase:InviteRedirectUrl" "http://localhost:5173/definir-senha"
dotnet user-secrets set "Ai:AnthropicApiKey" "sk-ant-..."     # opcional: transcrição → prontuário
dotnet run   # http://localhost:5253

# frontend
cd frontend
cp .env.example .env.local   # preencha URL e chave publishable
npm install && npm run dev   # http://localhost:5173 (proxy /api → 5253)
```

> Use a connection string do **Session pooler** (porta 5432). Ela funciona em IPv4 e no Fly.
> Projetos antigos que assinam o JWT com HS256 precisam também de `Supabase:JwtSecret`. Os novos usam JWKS automaticamente.

### 3. Deploy no Fly.io

```bash
fly apps create malu-nutri                     # uma vez
fly secrets set \
  ConnectionStrings__Default="Host=...pooler.supabase.com;Port=5432;..." \
  Supabase__Url="https://SEU_REF.supabase.co" \
  Supabase__ServiceRoleKey="sb_secret_..." \
  Supabase__InviteRedirectUrl="https://malu-nutri.fly.dev/definir-senha" \
  Ai__AnthropicApiKey="sk-ant-..."
fly deploy --ha=false                         # 1 máquina só
```

A máquina é `shared-cpu-1x` com 256 MB (+512 MB de swap) e desliga sozinha quando não há acesso (`auto_stop_machines`). O .NET roda com GC de estação de trabalho para caber na memória. Se aparecer OOM nos logs, suba para `memory = "512mb"`.

## Notas

- **Transcrição:** o botão "Gravar consulta" usa o reconhecimento de voz do navegador (pt-BR; Chrome e Edge). Também dá para colar a conversa. "Organizar prontuário com IA" envia o texto ao Claude (`claude-opus-5-5`, saída em JSON Schema) e preenche queixa, rotina, atividade física e objetivo para a nutricionista revisar. Sem `Ai:AnthropicApiKey`, o resto do app funciona normalmente.
- **Tabela de alimentos:** valores aproximados da TACO para 41 alimentos (`20261110035530_seed_foods.sql`). Ajuste e amplie conforme o método da Malu.
- **Fuso:** "hoje" é calculado em `America/Sao_Paulo`.
