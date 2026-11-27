# NEXUS EMPIRE

Simulador empresarial 3D interativo com estética futurista, no qual o usuário atua como **CEO** de uma operação corporativa composta por **2 andares**, **12 especialistas virtuais** com funções e habilidades definidas, **orquestração central (NEXUS CORE)**, **governança de permissões**, **controle de tokens**, **canais oficiais conectáveis**, **livro histórico auditável** e um **Cérebro evolutivo em 3D (Nexus Mind)**.

> **Princípio de dados reais:** O sistema inicia sem tarefas, vendas, produtos ou métricas fictícias. Os funcionários mantêm suas especialidades e habilidades e só executam ações reais após autorização do superior/CEO e conexão oficial dos canais necessários.

---

## Sumário

1. [Stack Tecnológica](#stack-tecnológica)
2. [Estrutura de Pastas](#estrutura-de-pastas)
3. [Organização da Empresa e Funcionários](#organização-da-empresa-e-funcionários)
4. [Como o Fluxo Operacional Funciona](#como-o-fluxo-operacional-funciona)
5. [Módulo Cérebro (Nexus Mind)](#módulo-cérebro-nexus-mind)
6. [Canais Oficiais e Variáveis de Ambiente](#canais-oficiais-e-variáveis-de-ambiente)
7. [Persistência e Supabase](#persistência-e-supabase)
8. [Endpoints do Servidor (`server.ts`)](#endpoints-do-servidor-serverts)
9. [Como Rodar, Testar e Compilar](#como-rodar-testar-e-compilar)

---

## Stack Tecnológica

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Framer Motion (`motion`), Lucide React
- **Ambiente 3D:** Three.js (`three`) procedural (prédio isométrico de 2 andares, personagens estilizados com animações e globo neural interativo)
- **Backend Proxy & API:** Node.js + Express (`server.ts`) servindo o Vite em desenvolvimento e os arquivos estáticos em produção
- **Inteligência Artificial:** `@google/genai` (executado exclusivamente no servidor, com suporte a Google Search Grounding)
- **Persistência em Nuvem:** `@supabase/supabase-js` + fallback local em `localStorage`

---

## Estrutura de Pastas

```text
.
├── .env.example                     # Modelo de variáveis de ambiente
├── index.html                       # Entrada HTML
├── metadata.json                    # Metadados e capacidades da aplicação
├── package.json                     # Dependências e scripts npm
├── server.ts                        # Servidor Express + rotas /api/nexus/* + integração Gemini/Supabase
├── tsconfig.json                    # Configuração TypeScript
├── vite.config.ts                   # Configuração Vite + Tailwind
└── src/
    ├── App.tsx                      # Orquestração de estado global, navegação e ciclo de simulação
    ├── index.css                    # Estilos globais Tailwind + animações CSS
    ├── main.tsx                     # Bootstrap React
    ├── components/
    │   ├── Brain3DViewport.tsx      # Viewport 3D interativo do Cérebro (rotação, zoom, drag, pulsação)
    │   ├── CoreComputerModal.tsx    # Terminal Azul & Vermelho (Livro Histórico definitivo)
    │   ├── EmployeeModal.tsx        # Ficha do funcionário, chat com agente e histórico
    │   ├── EntryScreen.tsx          # Tela de entrada na sede 3D
    │   ├── NexusCoreDrawer.tsx      # Painel de comando executivo do NEXUS CORE
    │   ├── Office3DViewport.tsx     # Viewport 3D isométrico do prédio (1º e 2º andar)
    │   ├── Sidebar.tsx              # Navegação lateral entre todos os módulos
    │   └── views/
    │       ├── BrainView.tsx        # Módulo Cérebro (leitura, filtros, limite e exportação em KB)
    │       ├── DashboardView.tsx    # Visão executiva, logs de atividade e consumo de tokens
    │       ├── DepartmentsView.tsx  # Departamentos e solicitações interdepartamentais
    │       ├── EmployeesView.tsx    # Equipe completa, autonomia e habilidades
    │       ├── FunctionLibraryView.tsx # Biblioteca de funções parametrizáveis
    │       ├── OperationsViews.tsx  # Produtos, Marketing, Lojas, Sites, Automações, Financeiro, Relatórios e Configurações
    │       └── TasksView.tsx        # Central de Tarefas, aprovações hierárquicas e execução real
    ├── core/
    │   ├── brainRules.ts            # Lógica pura do Nexus Mind (vetores esféricos, filtro de importância, exportação KB)
    │   ├── simulationRules.ts       # Regras puras de governança, permissões, tokens, IDs únicos e métricas
    │   └── simulationRules.test.ts  # Testes unitários das regras de simulação e do Cérebro
    ├── data/
    │   └── seedData.ts              # Estado inicial limpo (2 departamentos, 12 funcionários, habilidades, ferramentas, canais)
    ├── services/
    │   ├── aiService.ts             # Cliente HTTP para os endpoints /api/nexus/*
    │   └── supabaseService.ts       # Persistência localStorage, sincronização Supabase e schema SQL
    ├── three/
    │   ├── proceduralBrain.ts       # Geometrias e shaders procedurais do planeta/neurônios do Nexus Mind
    │   ├── proceduralBuilding.ts    # Construção 3D do prédio de 2 andares e zonas operacionais
    │   └── proceduralCharacters.ts  # Avatares 3D imutáveis e animações por estado
    └── types/
        └── nexus.ts                 # Tipagem completa de todo o domínio NEXUS EMPIRE
```

---

## Organização da Empresa e Funcionários

### 1º Andar — Produtos e Desenvolvimento (`dept_products`)
Identidade visual em **verde esmeralda e ciano**. Responsável por pesquisa de mercado, fornecedores, especificação técnica, precificação e catálogo.

1. **João Mendes** — Diretor de Produtos *(Gerente do 1º Andar)*
2. **Maria Clara** — Pesquisadora de Mercado *(Pesquisa Google em Tempo Real)*
3. **Rafael Costa** — Analista de Fornecedores *(Homologação e Supply Chain)*
4. **Camila Rocha** — Especialista em Produtos *(Qualidade e Ficha Técnica)*
5. **Bruno Oliveira** — Analista de Precificação *(Markup, Impostos e Margem)*
6. **Larissa Silva** — Gestora de Catálogo *(SKUs e Publicação Omnichannel)*

### 2º Andar — Marketing e Comercial (`dept_marketing`)
Identidade visual em **roxo e azul**. Responsável por aquisição paga, social media, criação/copy, páginas/lojas e fechamento comercial.

7. **Mariana Duarte** — Diretora de Marketing *(Gerente do 2º Andar)*
8. **Lucas Ferreira** — Gestor de Tráfego *(Mídia Paga, CPA e ROAS)*
9. **Beatriz Lima** — Social Media *(Calendário e Engajamento)*
10. **Thiago Alves** — Designer e Copywriter *(Criativos e Copywriting)*
11. **Gabriel Santos** — Desenvolvedor Digital *(Landing Pages, Lojas e CRO)*
12. **Fernanda Nogueira** — Gestora Comercial *(Pipeline B2B, Propostas e WhatsApp)*

---

## Como o Fluxo Operacional Funciona

1. **Diretriz do CEO (NEXUS CORE):** O usuário envia uma ordem estratégica no drawer do NEXUS CORE (`/api/nexus/core`), que analisa a equipe e divide a demanda em subtarefas objetivas com prioridade e canais exigidos.
2. **Aprovação Hierárquica em 2 Estágios (`pending_supervisor` → `pending_ceo` → `approved`):**
   - Antes de executar uma tarefa, o funcionário solicita permissão ao **Diretor do andar** (que emite parecer técnico via `/api/nexus/supervisor-review`).
   - Em seguida, a solicitação vai para aprovação final do **CEO**.
3. **Trava de Canais Oficiais:** A execução no backend (`/api/nexus/execute-task`) bloqueia qualquer tarefa cujo canal exigido esteja desconectado (`CHANNEL_DISCONNECTED`).
4. **Controle de Tokens:** Existe política configurável de **limite diário** (`dailyLimit`) e **limite por tarefa** (`perTaskLimit`) verificada antes de chamadas à Gemini API.
5. **Execução Real e Auditoria:** Quando aprovada e com canais conectados, a tarefa é executada pela IA (com fontes verificáveis da web quando usa Pesquisa Google) e o resultado é registrado no **Computador Azul & Vermelho** (`historicalLedger`).

---

## Módulo Cérebro (Nexus Mind)

O módulo **Cérebro** (`BrainView` + `Brain3DViewport` + `brainRules.ts`) é um mecanismo **somente leitura** de memória evolutiva:

- **Visualização 3D Planetária:** Núcleo central conectado a âncoras das habilidades dos funcionários distribuídas em esfera (Fibonacci sphere), com suporte a rotação, zoom, arraste esférico e pulsação sináptica animada quando novos pensamentos surgem.
- **Evolução Autônoma com Filtro de Relevância:** Conversas entre agentes, diretrizes do CORE, revisões de supervisores e execuções de tarefas passam por filtragem (local e via `/api/nexus/brain/distill`) para descartar mensagens triviais e salvar apenas decisões/insights relevantes.
- **Barreira de Crescimento:** Limite configurável de conexões (padrão de `0` até `1000`).
- **Exportação de Mentalidade em KB:** Permite exportar toda a rede neural em um arquivo `.json` compacto (em kilobytes), contendo metadados enxutos e indexados para reaproveitamento econômico por outras IAs.

---

## Canais Oficiais e Variáveis de Ambiente

Copie `.env.example` para `.env` e configure as chaves no servidor (nunca exponha segredos privados no frontend):

| Variável | Onde atua | Finalidade |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Servidor | Habilita NEXUS CORE, agentes, parecer de supervisores, destilação neural e Pesquisa Google (`ch_google_search`) |
| `APP_URL` | Servidor | URL base da aplicação para callbacks e referências |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Frontend | Conexão direta do navegador com o projeto Supabase |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`) | Servidor | Proxy de persistência Supabase via backend (`/api/nexus/supabase/state`) |
| `GOOGLE_ADS_TOKEN` | Servidor | Credencial oficial do canal `ch_google_ads` |
| `META_ADS_TOKEN` | Servidor | Credencial oficial do canal `ch_meta_ads` |
| `STORE_API_TOKEN` | Servidor | Credencial oficial do canal `ch_ecommerce` |
| `WHATSAPP_TOKEN` | Servidor | Credencial oficial do canal `ch_whatsapp` |

> **Observação:** Atualmente, o canal `ch_google_search` executa buscas reais via Gemini Search Grounding, enquanto `ch_google_ads`, `ch_meta_ads`, `ch_ecommerce` e `ch_whatsapp` realizam verificação da presença das credenciais no servidor como trava preventiva antes de liberar tarefas dependentes desses canais.

---

## Persistência e Supabase

- Sem Supabase configurado, o estado completo é salvo localmente no navegador (`localStorage` sob a chave `nexus_empire_real_v2`), com sanitização automática de IDs duplicados na hidratação.
- Com Supabase configurado, o sistema sincroniza o estado na tabela `nexus_workspace_state` (`company_id` + `state_json`).
- O SQL de criação das tabelas (`nexus_workspace_state`, `companies`, `profiles`, `departments`, `employees`, `channel_connections`, `tasks`, `token_usage_logs`, `brain_nodes`) com ativação de **Row Level Security (RLS)** está disponível em `src/services/supabaseService.ts` (`SUPABASE_SCHEMA_SQL`) e também pode ser consultado diretamente na interface em **Configurações**.

---

## Endpoints do Servidor (`server.ts`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck do servidor |
| `GET` | `/api/nexus/status` | Retorna status da `GEMINI_API_KEY`, modelo ativo, Supabase e canais disponíveis |
| `POST` | `/api/nexus/channels/verify` | Valida no servidor se o canal oficial possui credencial configurada |
| `GET` | `/api/nexus/supabase/state/:companyId` | Lê o estado persistido no Supabase via proxy |
| `POST` | `/api/nexus/supabase/state` | Grava/atualiza o estado no Supabase via proxy |
| `POST` | `/api/nexus/core` | Interpreta diretriz do CEO e gera plano com subtarefas em JSON |
| `POST` | `/api/nexus/agent` | Conversa individual com um dos 12 funcionários |
| `POST` | `/api/nexus/supervisor-review` | Gera parecer técnico do diretor responsável para aprovação |
| `POST` | `/api/nexus/execute-task` | Executa tarefa aprovada (com Google Search Grounding quando aplicável) |
| `POST` | `/api/nexus/brain/distill` | Destila interações em metadados compactos para o Cérebro (`Nexus Mind`) |

---

## Como Rodar, Testar e Compilar

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar em desenvolvimento (porta `3000`)
```bash
npm run dev
```

### 3. Verificação de tipos (`TypeScript`)
```bash
npm run lint
```

### 4. Executar testes unitários das regras de simulação e do Cérebro
```bash
npx tsx --test src/core/simulationRules.test.ts
```

### 5. Build de produção
```bash
npm run build
```
