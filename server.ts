import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'nexus-empire-server' });
  });

  app.get('/api/nexus/status', (_req, res) => {
    res.json({
      geminiConfigured: isGeminiConfigured(),
      model: GEMINI_MODEL,
      supabaseConfigured: Boolean(
        process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
      ),
    });
  });

  app.post('/api/nexus/core', async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        errorCode: 'AI_NOT_CONFIGURED',
        message:
          'Modo de demonstração ativo: configure GEMINI_API_KEY no servidor para executar o NEXUS CORE em tempo real.',
      });
      return;
    }

    const { directive, employeesSummary, recentTasksSummary } = req.body ?? {};
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
          `Contexto recente de tarefas:\n${String(recentTasksSummary ?? '')}`,
        ].join('\n\n'),
        config: {
          systemInstruction:
            'Você é o NEXUS CORE, a inteligência central do simulador empresarial NEXUS EMPIRE. Interprete a ordem do CEO em português brasileiro, identifique o departamento responsável ("dept_products" para Produtos/Pesquisa/Fornecedores/Precificação/Catálogo no 1º Andar ou "dept_marketing" para Marketing/Tráfego/Social/Design/Sites/Comercial no 2º Andar), selecione o diretor ou especialista mais adequado pelo ID exato fornecido, divida em 2 a 4 subtarefas objetivas com prioridades ("baixa"|"media"|"alta"|"critica"), aponte se exige aprovação do CEO (ações financeiras, externas ou irreversíveis) e redija uma resposta executiva clara e direta.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Resposta executiva ao CEO explicando o encaminhamento.',
              },
              targetDepartment: {
                type: Type.STRING,
                description: 'dept_products ou dept_marketing',
              },
              leadEmployeeId: {
                type: Type.STRING,
                description: 'ID do funcionário responsável principal (ex: emp_01).',
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
                  },
                },
              },
            },
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json({ ok: true, data: parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao consultar Gemini API.';
      res.status(502).json({ errorCode: 'AI_UPSTREAM_ERROR', message });
    }
  });

  app.post('/api/nexus/agent', async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        errorCode: 'AI_NOT_CONFIGURED',
        message:
          'Modo de demonstração ativo: este funcionário responderá com IA real quando GEMINI_API_KEY estiver configurada no servidor.',
      });
      return;
    }

    const { employee, message, activeTasks } = req.body ?? {};
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
          systemInstruction: `Você é ${employee.name}, ${employee.role} do departamento ${employee.departmentId} (${employee.floor}º Andar) da empresa NEXUS EMPIRE. Personalidade: ${employee.personality}. Especialidade: ${employee.specialty}. Instruções: ${employee.instructions}. Nível de autonomia atual: ${employee.autonomyLevel} (1=Assistido, 2=Semiautônomo, 3=Autônomo). Nunca execute ou prometa ações financeiras/externas sem aprovação do CEO. Responda em português brasileiro de forma objetiva, profissional e fiel ao seu cargo.`,
        },
      });

      res.json({
        ok: true,
        reply: response.text ?? 'Sem resposta gerada.',
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao consultar Gemini API.';
      res.status(502).json({ errorCode: 'AI_UPSTREAM_ERROR', message: errMsg });
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
