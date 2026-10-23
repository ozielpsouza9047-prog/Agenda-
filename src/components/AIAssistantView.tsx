import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { aiRecommendations } from '../mockData';

interface AIAssistantViewProps {
  isDark: boolean;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({ isDark }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Olá, Oziel! Sou o seu Consultor IA Dívida Zero. Analisei seus passivos atuais e notei que amortizar o Cheque Especial e o Cartão Black primeiro gerará o maior alívio nos juros mensais. Como posso ajudar com sua estratégia hoje?'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userMsg = inputQuery;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInputQuery('');

    // Simulate AI response
    setTimeout(() => {
      let aiReply = 'Com base no seu perfil financeiro, recomendo priorizar acordos via Pix parcelado ou portabilidade de crédito com taxas reduzidas. Deseja que eu simule uma proposta para o Banco Santander?';
      if (userMsg.toLowerCase().includes('cartão') || userMsg.toLowerCase().includes('cartao')) {
        aiReply = 'O Cartão Black possui juros rotativos de 12.9% a.m. Sugiro destinar R$ 600 do seu orçamento extra para liquidá-lo em até 4 meses.';
      } else if (userMsg.toLowerCase().includes('acordo') || userMsg.toLowerCase().includes('desconto')) {
        aiReply = 'Bancos costumam aceitar propostas de quitação à vista com 35% a 50% de desconto após 60 dias de atraso. Posso gerar uma carta de proposta formal para você.';
      }

      setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
    }, 800);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div>
        <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>Consultor IA Dívida Zero</span>
        </h2>
        <p className="text-xs opacity-60">
          Estratégias personalizadas de quitação e negociação baseadas em inteligência financeira
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface (2 Cols) */}
        <div className={`lg:col-span-2 rounded-2xl border flex flex-col h-[520px] ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          {/* Chat Header */}
          <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Assistente Especializado Dívida Zero</h3>
              <p className="text-[10px] text-purple-400">Online · Pronto para orientar</p>
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
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className={`p-3 border-t flex items-center gap-2 ${
            isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'
          }`}>
            <input
              type="text"
              placeholder="Pergunte sobre estratégia de quitação, juros ou acordos..."
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

        {/* Right Col: AI Recommendations Cards */}
        <div className="space-y-4">
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Recomendações Ativas da IA
          </h3>
          {aiRecommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-neutral-900/80 border-neutral-800 hover:border-purple-500/30' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {rec.tag}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">{rec.impact}</span>
              </div>
              <h4 className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{rec.title}</h4>
              <p className="text-[11px] opacity-70 leading-relaxed">{rec.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
