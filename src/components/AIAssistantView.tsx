import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isChatOpen, setIsChatOpen] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Close/collapse the chat when clicking outside the chat area without interfering with internal buttons/inputs
  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (!isChatOpen) return;
      const target = event.target as Node | null;
      if (chatContainerRef.current && target && !chatContainerRef.current.contains(target)) {
        setIsChatOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isChatOpen]);

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

    if (!isChatOpen) {
      setIsChatOpen(true);
    }

    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    if (!queryText) setInputQuery('');
    setIsTyping(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: query,
          debtsContext: debts
        })
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();
      setIsTyping(false);

      if (data.reply) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        throw new Error('Resposta vazia');
      }
    } catch (err) {
      setIsTyping(false);
      // Fallback local smart response if server offline or timeout
      let fallbackReply = 'Analisando suas dívidas com base nos cálculos do sistema...';
      const qLower = query.toLowerCase();

      if (qLower.includes('total') || qLower.includes('devo')) {
        const total = debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.remainingAmount, 0);
        fallbackReply = `O seu saldo devedor total em aberto é de R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      } else if (qLower.includes('mês') || qLower.includes('mes')) {
        const monthSum = debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.monthlyPayment, 0);
        fallbackReply = `O valor previsto de parcelas para este mês é de R$ ${monthSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      } else if (qLower.includes('atrasada') || qLower.includes('atraso')) {
        const overdue = debts.filter(d => d.status === 'atrasado');
        fallbackReply = overdue.length > 0
          ? `Você possui ${overdue.length} conta(s) atrasada(s): ${overdue.map(d => d.title).join(', ')}. Recomendo quitação prioritária.`
          : 'Parabéns! Você não possui nenhuma conta atrasada no momento.';
      } else if (qLower.includes('7 dias') || qLower.includes('vencem') || qLower.includes('próximo') || qLower.includes('proximo')) {
        const today = new Date();
        const in7Days = new Date();
        in7Days.setDate(today.getDate() + 7);
        const upcoming7 = debts.filter(d => {
          if (d.status === 'quitado') return false;
          const due = new Date(d.dueDate);
          return due >= today && due <= in7Days;
        });
        fallbackReply = upcoming7.length > 0
          ? `Nos próximos 7 dias vencem ${upcoming7.length} conta(s): ${upcoming7.map(d => `${d.title} (R$ ${d.monthlyPayment.toFixed(2)})`).join(', ')}.`
          : 'Não há contas com vencimento programado para os próximos 7 dias.';
      } else if (qLower.includes('adicionar') || qLower.includes('parcela')) {
        const currentMonth = debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.monthlyPayment, 0);
        const matchNumber = query.match(/(\d+([.,]\d+)?)/);
        const extraVal = matchNumber ? parseFloat(matchNumber[1].replace(',', '.')) : 300;
        const newTotal = currentMonth + extraVal;
        fallbackReply = `Ao adicionar uma nova parcela de R$ ${extraVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, seu pagamento mensal estimado passará de R$ ${currentMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      } else {
        fallbackReply = 'Com base nos seus dados financeiros reais cadastrados, essa operação requer atenção ao seu fluxo de caixa mensal. Você pode simular cenários na aba Planejador.';
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

      {/* Interactive Chat Wrapper (Ref protects internal buttons, quick prompts, and inputs from outside-click close) */}
      <div ref={chatContainerRef} className="space-y-4">
        {/* Quick Prompts Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
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
        <div
          className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${
            isChatOpen ? 'h-[520px]' : 'h-auto'
          } ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'}`}
        >
          {/* Chat Header with Small Arrow Button to Collapse and Reopen */}
          <div
            onClick={() => setIsChatOpen((prev) => !prev)}
            className={`p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
              isChatOpen ? 'border-b' : ''
            } ${
              isDark
                ? 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-950/70'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Assistente Especializado Dívida Zero
                </h3>
                <p className="text-[10px] text-purple-400 truncate">
                  {isChatOpen
                    ? 'Online · Conectado aos seus cálculos'
                    : 'Chat recolhido · Clique na seta para reabrir'}
                </p>
              </div>
            </div>

            {/* Small Arrow Button to Collapse / Reopen Chat */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsChatOpen((prev) => !prev);
              }}
              title={isChatOpen ? 'Recolher chat' : 'Reabrir chat'}
              aria-label={isChatOpen ? 'Recolher chat' : 'Reabrir chat'}
              aria-expanded={isChatOpen}
              className={`p-2 rounded-xl border transition-all shrink-0 ${
                isDark
                  ? 'bg-neutral-900 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                  : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white'
              }`}
            >
              {isChatOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Collapsible Chat Body: Messages + Input */}
          {isChatOpen && (
            <>
              {/* Messages list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${
                        msg.sender === 'user'
                          ? 'bg-purple-600'
                          : 'bg-gradient-to-br from-indigo-600 to-purple-700'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        <User className="w-3.5 h-3.5" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-purple-600 text-white rounded-tr-none'
                          : isDark
                          ? 'bg-neutral-950/80 border border-neutral-800 text-neutral-200 rounded-tl-none'
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                        isDark
                          ? 'bg-neutral-950 border border-neutral-800 text-neutral-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Consultando cálculos do sistema...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className={`p-3 border-t flex items-center gap-2 ${
                  isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
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
                  title="Enviar mensagem"
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

