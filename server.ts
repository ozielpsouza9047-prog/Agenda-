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

// Protected server-side Gemini AI integration
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { prompt, debtsContext } = req.body || {};

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

    const safeDebts = Array.isArray(debtsContext) ? debtsContext.slice(0, 100).map(d => ({
      title: String(d.title || '').slice(0, 80),
      creditor: String(d.creditor || '').slice(0, 80),
      category: String(d.category || '').slice(0, 50),
      remainingAmount: Number(d.remainingAmount) || 0,
      monthlyPayment: Number(d.monthlyPayment) || 0,
      dueDate: String(d.dueDate || '').slice(0, 20),
      status: String(d.status || '').slice(0, 30),
      installmentsPaid: Number(d.installmentsPaid) || 0,
      installmentsTotal: Number(d.installmentsTotal) || 1,
      interestRate: Number(d.interestRate) || 0
    })) : [];

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `Você é o consultor financeiro especialista da "Dívida Zero AI". 
Você tem acesso aos dados reais e autorizados do usuário autenticado.
Dados atuais das dívidas do usuário:
${JSON.stringify(safeDebts, null, 2)}

Responda de forma objetiva, empática, profissional e precisa em português brasileiro.
Responda diretamente a perguntas como:
- Quanto preciso pagar até o fim do mês?
- Quais contas vencem nos próximos 7 dias?
- Quanto ainda devo no total?
- Quais dívidas estão atrasadas?
- Se eu adicionar uma nova parcela, quanto pagarei por mês?

Se o usuário pedir para cadastrar, editar, excluir ou quitar uma dívida por comando, oriente claramente que é necessária a confirmação explícita na interface ou peça para ele confirmar os dados exatos antes de executar. Nunca invente valores. Baseie-se estritamente nos dados fornecidos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
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
