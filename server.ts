import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { prompt, debtsContext } = req.body;

    const systemInstruction = `Você é o consultor financeiro especialista da "Dívida Zero AI". 
Você tem acesso aos dados reais e autorizados do usuário.
Dados atuais das dívidas do usuário:
${JSON.stringify(debtsContext, null, 2)}

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
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message || 'Erro ao consultar a IA financeira.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 3000;

  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
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
