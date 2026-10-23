import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, ArrowRight, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { DebtItem } from '../types';

interface AIAssistantViewProps {
  debts: DebtItem[];
  isDark: boolean;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({ debts, isDark }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Olá, Oziel! Sou o seu Consultor IA Dívida Zero integrado aos seus dados reais. Como posso te ajudar hoje com suas finanças?'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickPrompts = [
    'Quanto preciso pagar até o fim do mês?',
    'Quais contas vencem nos próximos 7 dias?',
    'Quanto ainda devo no total?',
    'Quais dívidas estão atrasadas?',
    'Se eu adicionar uma nova parcela de R$ 300, quanto pagarei por mês?'
  ];

  const handleSend = async (queryText?: string) => {
    const query = queryText || inputQuery;
    if (!query.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    if (!queryText) setInputQuery('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          debtsContext: debts
        })
      });

      const data = await res.json();
      setIsTyping(false);

      if (data.reply) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: 'Não foi possível obter resposta no momento. Tente novamente.' }]);
      }
    } catch (err) {
      setIsTyping(false);
      // Fallback local smart response if server offline
      let fallbackReply = 'Analisando suas dívidas com base nos cálculos do sistema...';
      const qLower = query.toLowerCase();

      if (qLower.includes('total') || qLower.includes('devo')) {
        const total = debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.remainingAmount, 0);
        fallbackReply = `O seu saldo devedor total em aberto é de R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      } else if (qLower.includes('mês') || qLower.includes('mes')) {
        const monthSum = debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.monthlyPayment, 0);
        fallbackReply = `O valor previsto de parcelas para este mês é de R$ ${monthSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      } else if (qLower.includes('atrasada')) {
        const overdue = debts.filter(d => d.status === 'atrasado');
        fallbackReply = overdue.length > 0
          ? `Você possui ${overdue.length} conta(s) atrasada(s): ${overdue.map(d => d.title).join(', ')}. Recomendo quitação prioritária.`
          : 'Parabéns! Você não possui nenhuma conta atrasada no momento.';
      } else {
        fallbackReply = 'Com base nos seus dados financeiros reais, essa operação requer atenção ao seu fluxo de caixa mensal. Deseja que eu simule a quitação?';
      }

      setMessages(prev => [...prev, { sender: 'ai', text: fallbackReply }]);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      <div>
        <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>Consultor IA Dívida Zero (Dados Reais)</span>
        </h2>
        <p className="text-xs opacity-60">
          Assistente inteligente conectado às suas dívidas e cálculos do sistema
        </p>
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border whitespace-nowrap transition-all ${
              isDark
                ? 'bg-neutral-900 border-neutral-800 text-purple-300 hover:border-purple-500/50 hover:bg-neutral-800'
                : 'bg-white border-slate-200 text-purple-800 hover:border-purple-300 shadow-sm'
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Interface */}
      <div className={`rounded-2xl border flex flex-col h-[520px] ${
        isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        {/* Chat Header */}
        <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Assistente Especializado Dívida Zero</h3>
            <p className="text-[10px] text-purple-400">Online · Conectado aos seus cálculos</p>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${
                msg.sender === 'user' ? 'bg-purple-600' : 'bg-gradient-to-br from-indigo-600 to-purple-700'
              }`}>
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`max-w-[80%] p-3.5 rounded-2xl leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-none'
                  : isDark
                    ? 'bg-neutral-950/80 border border-neutral-800 text-neutral-200 rounded-tl-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${isDark ? 'bg-neutral-950 border border-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-600'}`}>
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Consultando cálculos do sistema...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className={`p-3 border-t flex items-center gap-2 ${
          isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <input
            type="text"
            placeholder="Digite sua pergunta financeira..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className={`flex-1 px-4 py-2.5 text-xs rounded-xl border outline-none transition-all ${
              isDark
                ? 'bg-neutral-900 border-neutral-800 text-white focus:border-purple-500'
                : 'bg-white border-slate-200 text-slate-900 focus:border-purple-400'
            }`}
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
