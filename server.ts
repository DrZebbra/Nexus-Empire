import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

function getSupabaseServerConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  if (url.startsWith('http') && key.length > 20) {
    return { url, key };
  }
  return null;
}

let serverSupabase: SupabaseClient | null = null;
function getServerSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseServerConfig();
  if (!cfg) return null;
  if (!serverSupabase) {
    serverSupabase = createClient(cfg.url, cfg.key);
  }
  return serverSupabase;
}

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractTokenUsage(response: {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}) {
  const promptTokens = Number(response.usageMetadata?.promptTokenCount ?? 0);
  const candidatesTokens = Number(response.usageMetadata?.candidatesTokenCount ?? 0);
  const totalTokens = Number(
    response.usageMetadata?.totalTokenCount ?? promptTokens + candidatesTokens
  );
  return { promptTokens, candidatesTokens, totalTokens };
}

function isTokenBudgetExceeded(tokenPolicy: unknown): boolean {
  if (!tokenPolicy || typeof tokenPolicy !== 'object') return false;
  const p = tokenPolicy as { usedTotal?: unknown; dailyLimit?: unknown };
  const used = Number(p.usedTotal ?? 0);
  const limit = Number(p.dailyLimit ?? 0);
  return limit > 0 && used >= limit;
}

function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function formatGeminiUpstreamError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : 'Erro ao consultar Gemini API.';
  if (
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('"code":429') ||
    raw.toLowerCase().includes('quota')
  ) {
    return {
      status: 429,
      message:
        'Cota ou limite de requisições da Gemini API excedido (429). Aguarde alguns instantes ou verifique o faturamento da sua chave GEMINI_API_KEY.',
    };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED')) {
    return {
      status: 401,
      message: 'GEMINI_API_KEY inválida ou sem autorização para este modelo.',
    };
  }
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return { status: 502, message: parsed.error.message };
    }
  } catch {
    // Not JSON
  }
  return { status: 502, message: raw };
}

function getChannelAvailability() {
  return {
    ch_google_search: isGeminiConfigured(),
    ch_supabase: Boolean(getSupabaseServerConfig()),
    ch_google_ads: Boolean(process.env.GOOGLE_ADS_TOKEN?.trim()),
    ch_meta_ads: Boolean(process.env.META_ADS_TOKEN?.trim()),
    ch_ecommerce: Boolean(process.env.STORE_API_TOKEN?.trim()),
    ch_whatsapp: Boolean(process.env.WHATSAPP_TOKEN?.trim()),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'nexus-empire-server' });
  });

  app.get('/api/nexus/status', (_req, res) => {
    res.json({
      geminiConfigured: isGeminiConfigured(),
      model: GEMINI_MODEL,
      supabaseConfigured: Boolean(getSupabaseServerConfig()),
      channelAvailability: getChannelAvailability(),
    });
  });

  // Verify official channel readiness without faking credentials
  app.post('/api/nexus/channels/verify', (req, res) => {
    const { channelId } = req.body ?? {};
    const avail = getChannelAvailability() as Record<string, boolean>;
    if (typeof channelId !== 'string' || !(channelId in avail)) {
      res.status(400).json({ errorCode: 'INVALID_CHANNEL', message: 'Canal inválido.' });
      return;
    }

    if (!avail[channelId]) {
      const secretHints: Record<string, string> = {
        ch_google_search:
          'Configure GEMINI_API_KEY nos segredos do servidor para ativar a Pesquisa Google oficial.',
        ch_supabase:
          'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou SUPABASE_URL / SUPABASE_ANON_KEY) para sincronizar com Supabase.',
        ch_google_ads:
          'Configure a credencial oficial GOOGLE_ADS_TOKEN (OAuth Google Ads) no servidor.',
        ch_meta_ads:
          'Configure a credencial oficial META_ADS_TOKEN (Meta Graph API) no servidor.',
        ch_ecommerce:
          'Configure a credencial oficial STORE_API_TOKEN da sua loja/gateway no servidor.',
        ch_whatsapp:
          'Configure a credencial oficial WHATSAPP_TOKEN (Meta Cloud API) no servidor.',
      };
      res.status(428).json({
        errorCode: 'CHANNEL_CREDENTIALS_MISSING',
        message: secretHints[channelId],
      });
      return;
    }

    res.json({
      ok: true,
      channelId,
      verifiedAt: new Date().toISOString(),
      accountLabel:
        channelId === 'ch_google_search'
          ? 'Gemini Google Search Grounding (Ativo)'
          : channelId === 'ch_supabase'
          ? 'Supabase Cloud Conectado'
          : 'Credencial Oficial Verificada',
    });
  });

  // Server-side Supabase persistence proxy (when SUPABASE_URL is set on server)
  app.get('/api/nexus/supabase/state/:companyId', async (req, res) => {
    const sb = getServerSupabaseClient();
    if (!sb) {
      res.status(200).json({ ok: false, configured: false, data: null });
      return;
    }
    const companyId = req.params.companyId;
    if (!/^[a-zA-Z0-9_-]{3,40}$/.test(companyId)) {
      res.status(400).json({ error: 'Identificador de empresa inválido.' });
      return;
    }
    try {
      const { data, error } = await sb
        .from('nexus_workspace_state')
        .select('state_json, updated_at')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        res.status(502).json({ errorCode: 'SUPABASE_READ_ERROR', message: error.message });
        return;
      }
      res.json({ ok: true, configured: true, data: data?.state_json ?? null, updatedAt: data?.updated_at ?? null });
    } catch (err) {
      res.status(502).json({
        errorCode: 'SUPABASE_READ_ERROR',
        message: err instanceof Error ? err.message : 'Erro ao ler Supabase.',
      });
    }
  });

  app.post('/api/nexus/supabase/state', async (req, res) => {
    const sb = getServerSupabaseClient();
    if (!sb) {
      res.status(200).json({ ok: false, configured: false });
      return;
    }
    const { companyId, state } = req.body ?? {};
    if (typeof companyId !== 'string' || !/^[a-zA-Z0-9_-]{3,40}$/.test(companyId) || !state) {
      res.status(400).json({ error: 'Payload inválido para persistência Supabase.' });
      return;
    }
    try {
      const { error } = await sb.from('nexus_workspace_state').upsert(
        {
          company_id: companyId,
          state_json: state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
      if (error) {
        res.status(502).json({ errorCode: 'SUPABASE_WRITE_ERROR', message: error.message });
        return;
      }
      res.json({ ok: true, syncedAt: new Date().toISOString() });
    } catch (err) {
      res.status(502).json({
        errorCode: 'SUPABASE_WRITE_ERROR',
        message: err instanceof Error ? err.message : 'Erro ao gravar Supabase.',
      });
    }
  });

  app.post('/api/nexus/core', async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        errorCode: 'AI_NOT_CONFIGURED',
        message:
          'GEMINI_API_KEY não configurada no servidor. Configure a chave nos segredos para usar o NEXUS CORE.',
      });
      return;
    }

    const { directive, employeesSummary, recentTasksSummary, tokenPolicy } = req.body ?? {};
    if (isTokenBudgetExceeded(tokenPolicy)) {
      res.status(429).json({
        errorCode: 'TOKEN_LIMIT_REACHED',
        message: 'Limite diário de tokens de IA atingido. Ajuste o limite em Configurações.',
      });
      return;
    }
    if (typeof directive !== 'string' || directive.trim().length < 2) {
      res.status(400).json({ error: 'Diretriz executiva inválida.' });
      return;
    }

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          `Ordem do CEO: "${directive.trim()}"`,
          `Funcionários disponíveis:\n${String(employeesSummary ?? '')}`,
          `Contexto de tarefas atuais:\n${String(recentTasksSummary ?? '')}`,
        ].join('\n\n'),
        config: {
          systemInstruction:
            'Você é o NEXUS CORE, a inteligência central do NEXUS EMPIRE. Interprete a ordem do CEO em português brasileiro, identifique o departamento responsável ("dept_products" ou "dept_marketing"), selecione o diretor ou especialista pelo ID exato fornecido, divida em 1 a 3 subtarefas reais e objetivas com prioridades ("baixa"|"media"|"alta"|"critica") e os canais necessários (use ["ch_google_search"] para pesquisa de mercado/fornecedores/tendências, ["ch_meta_ads"] para tráfego/social, ["ch_ecommerce"] para catálogo/loja, ["ch_whatsapp"] para comercial). Lembre-se que os funcionários pedirão permissão ao superior e exigirão conexão oficial dos canais antes de executar.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
              },
              targetDepartment: {
                type: Type.STRING,
              },
              leadEmployeeId: {
                type: Type.STRING,
              },
              requiresApproval: {
                type: Type.BOOLEAN,
              },
              subtasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    assigneeId: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    requiredChannelIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json({
        ok: true,
        data: parsed,
        tokenUsage: extractTokenUsage(response),
        model: GEMINI_MODEL,
      });
    } catch (err) {
      const formatted = formatGeminiUpstreamError(err);
      res.status(formatted.status).json({ errorCode: 'AI_UPSTREAM_ERROR', message: formatted.message });
    }
  });

  app.post('/api/nexus/agent', async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        errorCode: 'AI_NOT_CONFIGURED',
        message:
          'GEMINI_API_KEY não configurada no servidor. Configure a chave para conversar com este funcionário em tempo real.',
      });
      return;
    }

    const { employee, message, activeTasks, tokenPolicy } = req.body ?? {};
    if (isTokenBudgetExceeded(tokenPolicy)) {
      res.status(429).json({
        errorCode: 'TOKEN_LIMIT_REACHED',
        message: 'Limite diário de tokens de IA atingido.',
      });
      return;
    }
    if (!employee || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Parâmetros inválidos para consulta ao agente.' });
      return;
    }

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Mensagem do CEO: "${message.trim()}"\n\nSuas tarefas atuais:\n${JSON.stringify(
          activeTasks ?? []
        )}`,
        config: {
          systemInstruction: `Você é ${employee.name}, ${employee.role} do departamento ${employee.departmentId} (${employee.floor}º Andar) da empresa NEXUS EMPIRE. Personalidade: ${employee.personality}. Especialidade: ${employee.specialty}. Instruções: ${employee.instructions}. Nunca invente dados fictícios, vendas ou métricas que não existam. Se precisar executar uma ação externa ou pesquisa, informe que solicitará permissão ao seu superior e verificará se o canal oficial está conectado. Responda em português brasileiro de forma objetiva.`,
        },
      });

      res.json({
        ok: true,
        reply: response.text ?? 'Sem resposta gerada.',
        tokenUsage: extractTokenUsage(response),
        model: GEMINI_MODEL,
      });
    } catch (err) {
      const formatted = formatGeminiUpstreamError(err);
      res.status(formatted.status).json({ errorCode: 'AI_UPSTREAM_ERROR', message: formatted.message });
    }
  });

  app.post('/api/nexus/supervisor-review', async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        errorCode: 'AI_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY não configurada no servidor.',
      });
      return;
    }
    const { supervisor, requester, task, requiredChannelNames, tokenPolicy } = req.body ?? {};
    if (isTokenBudgetExceeded(tokenPolicy)) {
      res.status(429).json({
        errorCode: 'TOKEN_LIMIT_REACHED',
        message: 'Limite diário de tokens de IA atingido.',
      });
      return;
    }
    if (!supervisor || !requester || !task) {
      res.status(400).json({ error: 'Dados insuficientes para parecer do superior.' });
      return;
    }

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `O especialista ${requester.name} (${requester.role}) solicitou permissão para executar a tarefa "${task.title}": ${task.description}. Canais exigidos: ${JSON.stringify(
          requiredChannelNames ?? []
        )}. Avalie tecnicamente em até 3 frases se a tarefa está aderente ao departamento e dê seu parecer formal para o CEO autorizar.`,
        config: {
          systemInstruction: `Você é ${supervisor.name}, ${supervisor.role} e superior direto de ${requester.name}. Seja direto, técnico e transparente em português brasileiro.`,
        },
      });

      res.json({
        ok: true,
        comment: (response.text ?? 'Parecer técnico favorável para autorização do CEO.').trim(),
        tokenUsage: extractTokenUsage(response),
        model: GEMINI_MODEL,
      });
    } catch (err) {
      const formatted = formatGeminiUpstreamError(err);
      res.status(formatted.status).json({
        errorCode: 'AI_UPSTREAM_ERROR',
        message: formatted.message,
      });
    }
  });

  app.post('/api/nexus/execute-task', async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        errorCode: 'AI_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY não configurada no servidor.',
      });
      return;
    }

    const { task, employee, connectedChannelIds, tokenPolicy } = req.body ?? {};
    if (!task || !employee) {
      res.status(400).json({ error: 'Dados da tarefa ou funcionário ausentes.' });
      return;
    }

    if (task.permissionStatus !== 'approved') {
      res.status(403).json({
        errorCode: 'PERMISSION_REQUIRED',
        message:
          'Execução bloqueada: a tarefa precisa de permissão aprovada pelo superior e pelo CEO.',
      });
      return;
    }

    const requiredIds: string[] = Array.isArray(task.requiredChannelIds)
      ? task.requiredChannelIds
      : [];
    const connectedSet = new Set<string>(
      Array.isArray(connectedChannelIds) ? connectedChannelIds : []
    );
    const missing = requiredIds.filter((id) => !connectedSet.has(id));
    if (missing.length > 0) {
      res.status(403).json({
        errorCode: 'CHANNEL_DISCONNECTED',
        message: `Execução bloqueada: conecte oficialmente os canais (${missing.join(', ')}) antes de executar.`,
      });
      return;
    }

    if (isTokenBudgetExceeded(tokenPolicy)) {
      res.status(429).json({
        errorCode: 'TOKEN_LIMIT_REACHED',
        message: 'Limite diário de tokens de IA atingido.',
      });
      return;
    }

    const usesGoogleSearch = requiredIds.includes('ch_google_search');
    const perTaskLimit = Number(tokenPolicy?.perTaskLimit ?? 16000);

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          `Tarefa autorizada para execução real: "${task.title}"`,
          `Descrição e critérios: ${task.description}`,
          `Canais oficiais conectados nesta execução: ${requiredIds.join(', ') || 'Execução analítica interna'}`,
          `Produza uma entrega real, concreta e estruturada dentro de aproximadamente ${Math.min(
            1200,
            Math.max(250, Math.floor(perTaskLimit / 10))
          )} palavras. Não invente vendas, links ou números fictícios; baseie-se apenas em dados reais obtidos.`,
        ].join('\n\n'),
        config: {
          systemInstruction: `Você é ${employee.name}, ${employee.role} da NEXUS EMPIRE (${employee.floor}º Andar). Especialidade: ${employee.specialty}. Execute a tarefa com rigor profissional em português brasileiro. Quando a Pesquisa Google estiver habilitada, consulte fontes reais e cite informações verificáveis.`,
          ...(usesGoogleSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const rawChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const groundingSources: Array<{ title: string; uri: string }> = [];
      const seenUris = new Set<string>();

      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (typeof uri === 'string' && isSafeHttpUrl(uri) && !seenUris.has(uri)) {
          seenUris.add(uri);
          groundingSources.push({
            title: typeof title === 'string' && title.trim() ? title.trim() : uri,
            uri,
          });
        }
      }

      res.json({
        ok: true,
        resultText: (response.text ?? 'Execução concluída sem texto retornado.').trim(),
        groundingSources,
        tokenUsage: extractTokenUsage(response),
        model: GEMINI_MODEL,
      });
    } catch (err) {
      const formatted = formatGeminiUpstreamError(err);
      res.status(formatted.status).json({
        errorCode: 'AI_UPSTREAM_ERROR',
        message: formatted.message,
      });
    }
  });

  app.post('/api/nexus/brain/distill', async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        errorCode: 'AI_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY não configurada no servidor.',
      });
      return;
    }

    const { text, actors, skills, sourceType, tokenPolicy } = req.body ?? {};
    if (isTokenBudgetExceeded(tokenPolicy)) {
      res.status(429).json({
        errorCode: 'TOKEN_LIMIT_REACHED',
        message: 'Limite diário de tokens de IA atingido.',
      });
      return;
    }

    if (typeof text !== 'string' || !text.trim() || !Array.isArray(skills)) {
      res.status(400).json({ error: 'Dados insuficientes para destilação neural.' });
      return;
    }

    try {
      const ai = getAiClient();
      const skillsList = skills
        .map((s: { id?: string; name?: string }) => `${s.id}: ${s.name}`)
        .join(', ');
      const actorsList = Array.isArray(actors)
        ? actors.map((a: { id?: string; name?: string; role?: string }) => `${a.name} (${a.role})`).join(' & ')
        : 'Equipe NEXUS';

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          `Origem: ${String(sourceType ?? 'conversation')} | Participantes: ${actorsList}`,
          `Habilidades válidas (escolha um skillId exato): ${skillsList}`,
          `Conteúdo da interação:\n"${text.trim().slice(0, 1200)}"`,
        ].join('\n\n'),
        config: {
          systemInstruction:
            'Você é o filtro neural do NEXUS MIND. Avalie se o conteúdo representa um insight estratégico, decisão de negócio, método técnico ou aprendizado operacional reutilizável. Se for apenas saudação, confirmação trivial ("oi", "ok", "entendido") ou conversa vazia, retorne important=false. Se for importante, retorne important=true, concept (título curto <= 52 caracteres), essence (metadado ultra-compacto <= 132 caracteres sem enchimento), o skillId mais aderente dentre os fornecidos, e importance (0.65 a 0.99). Responda em português brasileiro.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              important: { type: Type.BOOLEAN },
              concept: { type: Type.STRING },
              essence: { type: Type.STRING },
              skillId: { type: Type.STRING },
              importance: { type: Type.NUMBER },
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw) as {
        important?: boolean;
        concept?: string;
        essence?: string;
        skillId?: string;
        importance?: number;
      };

      res.json({
        ok: true,
        important: Boolean(parsed.important),
        candidate: parsed.important
          ? {
              concept: String(parsed.concept ?? '').slice(0, 64),
              essence: String(parsed.essence ?? '').slice(0, 148),
              skillId: String(parsed.skillId ?? ''),
              importance: Number(parsed.importance ?? 0.78),
            }
          : null,
        tokenUsage: extractTokenUsage(response),
        model: GEMINI_MODEL,
      });
    } catch (err) {
      const formatted = formatGeminiUpstreamError(err);
      res.status(formatted.status).json({
        errorCode: 'AI_UPSTREAM_ERROR',
        message: formatted.message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXUS EMPIRE server listening on http://localhost:${PORT}`);
  });
}

startServer();
