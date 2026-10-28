import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Security headers and payload limits
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoint for production uptime monitoring
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Protected server-side Gemini AI integration (User-Isolated & Zero-Hallucination)
app.post('/api/ai-chat', async (req, res) => {
  try {
    const {
      prompt,
      debtsContext,
      goalsContext,
      profileContext,
      analysisContext,
      history,
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A pergunta enviada é inválida ou vazia.' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'A pergunta não pode exceder 2000 caracteres.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'A integração de IA está temporariamente indisponível no servidor. Use os cálculos do sistema.'
      });
    }

    const safeDebts = Array.isArray(debtsContext)
      ? debtsContext.slice(0, 100).map((d) => ({
          title: String(d.title || '').slice(0, 80),
          creditor: String(d.creditor || '').slice(0, 80),
          category: String(d.category || '').slice(0, 50),
          totalAmount: Number(d.totalAmount) || 0,
          remainingAmount: Number(d.remainingAmount) || 0,
          monthlyPayment: Number(d.monthlyPayment) || 0,
          dueDate: String(d.dueDate || '').slice(0, 20),
          status: String(d.status || '').slice(0, 30),
          installmentsPaid: Number(d.installmentsPaid) || 0,
          installmentsTotal: Number(d.installmentsTotal) || 1,
          interestRate: Number(d.interestRate) || 0,
        }))
      : [];

    const safeGoals = Array.isArray(goalsContext)
      ? goalsContext.slice(0, 30).map((g) => ({
          title: String(g.title || '').slice(0, 80),
          monthlyReductionGoal: Number(g.monthlyReductionGoal) || 0,
          extraPaymentGoal: Number(g.extraPaymentGoal) || 0,
          targetPayoffDate: String(g.targetPayoffDate || '').slice(0, 20),
        }))
      : [];

    const safeProfile =
      profileContext && typeof profileContext === 'object'
        ? {
            name: String(profileContext.name || 'Usuário').slice(0, 80),
            currency: String(profileContext.currency || 'BRL').slice(0, 10),
            monthlyIncome: Number(profileContext.monthlyIncome) || 0,
            occupation: String(profileContext.occupation || '').slice(0, 80),
          }
        : { name: 'Usuário', currency: 'BRL', monthlyIncome: 0, occupation: '' };

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .map((m) => ({
            role: m?.sender === 'user' ? 'Usuário' : 'Consultor',
            text: String(m?.text || '').slice(0, 700),
          }))
      : [];

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `Você é o Consultor Financeiro da "Dívida Zero AI", conversando exclusivamente com o usuário autenticado (${safeProfile.name}).

ESTILO DE COMUNICAÇÃO OBRIGATÓRIO:
- Responda SEMPRE em português brasileiro, usando linguagem simples, acolhedora, humana e objetiva (sem jargões financeiros difíceis).
- Vá direto ao ponto, organizando a resposta em tópicos curtos e fáceis de ler no celular ou computador.

OS 4 PILARES DE AJUDA (USANDO APENAS OS DADOS REAIS DO USUÁRIO):
1. ORGANIZAR DÍVIDAS: Classificar por urgência (atrasadas, próximas do vencimento, em dia, quitadas), por categoria e por credor.
2. ANALISAR PARCELAS: Mostrar quanto está comprometido por mês, quantas parcelas já foram pagas e quantas faltam, o peso na renda mensal (se informada) e simular o efeito de novas parcelas.
3. PLANEJAR PAGAMENTOS: Montar um passo a passo prático de pagamentos para o mês atual e próximos vencimentos.
4. EXPLICAR ESTRATÉGIAS DE QUITAÇÃO: Explicar de forma simples o Método Avalanche (atacar primeiro a dívida com maior taxa de juros) e o Método Bola de Neve (atacar primeiro a dívida de menor saldo para liberar o valor da parcela rapidamente).

REGRA DE OURO PARA PLANOS DE QUITAÇÃO, VALORES E PRAZOS:
- Quando o usuário pedir um plano de quitação, estratégia ou prazo, apresente valores, prioridades e prazos SOMENTE quando puder calculá-los com certeza usando os dados disponíveis abaixo (ou informados pelo próprio usuário no histórico da conversa).
- NUNCA chute, assuma ou invente valores, taxas de juros, renda ou aportes extras.
- Se faltarem informações para calcular ou completar uma estimativa (veja o campo "missingDataForCompletePlan" no resumo abaixo — por exemplo: se não houver dívidas cadastradas, se faltar o valor da parcela mensal de alguma dívida, a taxa de juros, a renda mensal ou quanto o usuário consegue separar a mais por mês para antecipar pagamentos), apresente apenas o que já é possível calcular com os dados existentes e FAÇA PERGUNTAS SIMPLES E ACOLHEDORAS antes de estimar o restante.
- Se o usuário pedir para cadastrar, editar, excluir ou quitar uma dívida por comando, oriente de forma gentil que ele pode confirmar essa ação diretamente nos botões da tela.

PERFIL DO USUÁRIO AUTENTICADO:
${JSON.stringify(safeProfile, null, 2)}

RESUMO MATEMÁTICO E DADOS FALTANTES (CALCULADO PELO SISTEMA):
${JSON.stringify(analysisContext || {}, null, 2)}

DÍVIDAS REAIS DO USUÁRIO AUTENTICADO (${safeDebts.length} registros):
${JSON.stringify(safeDebts, null, 2)}

METAS DE QUITAÇÃO DO USUÁRIO (${safeGoals.length} registros):
${JSON.stringify(safeGoals, null, 2)}

HISTÓRICO RECENTE DA CONVERSA ATUAL:
${JSON.stringify(safeHistory, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });

    res.json({ reply: response.text || 'Não consegui processar sua consulta no momento.' });
  } catch (error: any) {
    const errStr = String(error?.message || error);
    if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error: 'Limite de cota de IA atingido. O assistente usará o modo offline de cálculos locais com dados reais.',
        code: 'QUOTA_EXCEEDED'
      });
    }
    console.error('AI Chat Error:', errStr);
    res.status(500).json({ error: 'Erro ao consultar a IA financeira. Usando cálculos locais.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 3000;

  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
