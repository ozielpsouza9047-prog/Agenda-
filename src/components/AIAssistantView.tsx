import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  CalendarClock,
  TrendingDown,
  ShieldAlert,
  MessageSquarePlus,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { ActiveTab, DebtItem, GoalItem, UserProfile } from '../types';
import {
  AiChatMessage,
  AiConversationSession,
  askFinancialAssistant,
  buildUserFinancialAnalysis,
  fetchCloudGoals,
  loadUserAiConversations,
  saveUserAiConversations,
} from '../lib/supabase';

interface AIAssistantViewProps {
  debts: DebtItem[];
  isDark: boolean;
  userId?: string;
  userProfile?: UserProfile;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  debts,
  isDark,
  userId,
  userProfile,
}) => {
  const firstName = useMemo(() => {
    const raw = (userProfile?.name || '').trim();
    if (!raw) return 'Usuário';
    return raw.split(/\s+/)[0];
  }, [userProfile?.name]);

  const currency = userProfile?.currency || 'BRL';

  const formatCurrency = (val: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
      }).format(Number(val) || 0);
    } catch {
      return `R$ ${(Number(val) || 0).toFixed(2)}`;
    }
  };

  // Load authenticated user's goals for payment planning context
  const [userGoals, setUserGoals] = useState<GoalItem[]>(() => {
    if (typeof localStorage === 'undefined') return [];
    const key = userId ? `divida_zero_goals_${userId}` : 'divida_zero_goals';
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    if (!userId) {
      setUserGoals([]);
      return;
    }
    fetchCloudGoals(userId).then((cloudGoals) => {
      if (isMounted && cloudGoals && cloudGoals.length > 0) {
        setUserGoals(cloudGoals);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const analysis = useMemo(
    () => buildUserFinancialAnalysis(debts, userGoals, userProfile),
    [debts, userGoals, userProfile]
  );

  const buildWelcomeMessage = (name: string, activeCount: number, remainingTotal: number): AiChatMessage => {
    if (activeCount === 0) {
      return {
        sender: 'ai',
        text: `Olá, ${name}! Que bom ter você aqui. Sou o seu Consultor IA Dívida Zero.\n\nNo momento você não tem dívidas ativas cadastradas na sua conta. Se quiser montar um plano de quitação ou tirar dúvidas, me conte quais contas você quer organizar ou cadastre uma nova dívida!`,
      };
    }
    return {
      sender: 'ai',
      text: `Olá, ${name}! Sou o seu Consultor IA Dívida Zero. Já estou vendo suas ${activeCount} dívida(s) ativa(s) (total de ${formatCurrency(remainingTotal)} em aberto).\n\nComo posso te ajudar hoje? Posso organizar suas contas por prioridade, analisar suas parcelas, planejar os pagamentos do mês ou montar um plano de quitação passo a passo para o seu bolso.`,
    };
  };

  const welcomeMessage = useMemo(
    () => buildWelcomeMessage(firstName, analysis.activeDebtsCount, analysis.totalRemainingAmount),
    [firstName, analysis.activeDebtsCount, analysis.totalRemainingAmount, currency]
  );

  // User-isolated conversations state
  const [conversations, setConversations] = useState<AiConversationSession[]>(() =>
    loadUserAiConversations(userId, welcomeMessage)
  );
  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const initial = loadUserAiConversations(userId, welcomeMessage);
    return initial[0]?.id || `conv-${Date.now()}`;
  });

  // Reload isolated conversations strictly when authenticated userId changes
  useEffect(() => {
    const loaded = loadUserAiConversations(userId, welcomeMessage);
    setConversations(loaded);
    setActiveConversationId(loaded[0]?.id || `conv-${Date.now()}`);
  }, [userId]);

  // Keep the welcome message updated on untouched conversations when user profile/debts finish loading
  useEffect(() => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.messages.length === 1 && conv.messages[0].sender === 'ai') {
          return {
            ...conv,
            messages: [welcomeMessage],
          };
        }
        return conv;
      })
    );
  }, [welcomeMessage]);

  // Persist user-isolated conversations whenever they change
  useEffect(() => {
    saveUserAiConversations(userId, conversations);
    // Keep sessionStorage synced for the active conversation of this userId
    if (userId && typeof sessionStorage !== 'undefined') {
      const current = conversations.find((c) => c.id === activeConversationId) || conversations[0];
      if (current) {
        try {
          sessionStorage.setItem(`divida_zero_ai_chat_${userId}`, JSON.stringify(current.messages));
        } catch {
          // Ignore quota errors
        }
      }
    }
  }, [conversations, activeConversationId, userId]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || conversations[0];
  }, [conversations, activeConversationId]);

  const messages = activeConversation?.messages || [welcomeMessage];

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, isTyping, isChatOpen]);

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

  const assistantPillars = [
    {
      id: 'organize',
      title: '1. Organizar Dívidas',
      subtitle: `${analysis.activeDebtsCount} ativa(s) · ${analysis.categories.length} categoria(s)`,
      prompt: 'Organize minhas dívidas atuais por prioridade, status e categoria, mostrando os valores reais.',
      icon: Layers,
      accent: 'text-purple-400',
    },
    {
      id: 'installments',
      title: '2. Analisar Parcelas',
      subtitle: `${analysis.totalInstallmentsPaid}/${analysis.totalInstallmentsContracted} pagas · ${formatCurrency(analysis.totalMonthlyPayment)}/mês`,
      prompt: 'Analise minhas parcelas atuais, quantas faltam pagar e o comprometimento do meu orçamento mensal.',
      icon: CalendarClock,
      accent: 'text-cyan-400',
    },
    {
      id: 'plan',
      title: '3. Planejar Pagamentos',
      subtitle:
        analysis.overdueCount > 0
          ? `${analysis.overdueCount} atrasada(s) · ${analysis.dueNext7Days.length} vencem em 7d`
          : `${analysis.dueNext7Days.length} vencem nos próximos 7 dias`,
      prompt: 'Monte um plano prático de pagamentos para este mês com base nos vencimentos e nas minhas metas.',
      icon: ShieldAlert,
      accent: analysis.overdueCount > 0 ? 'text-rose-400' : 'text-amber-400',
    },
    {
      id: 'strategies',
      title: '4. Estratégias de Quitação',
      subtitle: analysis.avalancheOrder[0]
        ? `Avalanche (${analysis.avalancheOrder[0].interestRate}% a.m.) vs Bola de Neve`
        : 'Avalanche vs Bola de Neve',
      prompt: 'Monte um plano de quitação comparando Avalanche e Bola de Neve com meus dados disponíveis.',
      icon: TrendingDown,
      accent: 'text-emerald-400',
    },
  ];

  const quickPrompts = [
    'Monte um plano de quitação para mim',
    'Quanto preciso pagar até o fim do mês?',
    'Quais contas vencem nos próximos 7 dias?',
    'Quanto ainda devo no total?',
    'Quais dívidas estão atrasadas?',
    'Se eu adicionar uma nova parcela de R$ 300, quanto pagarei por mês?',
  ];

  // Start a brand-new conversation isolated for this authenticated user
  const handleStartNewConversation = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isChatOpen) setIsChatOpen(true);

    const nowIso = new Date().toISOString();
    const nextNumber = conversations.length + 1;
    const newSession: AiConversationSession = {
      id: `conv-${Date.now()}-${nextNumber}`,
      title: `Conversa ${nextNumber}`,
      createdAt: nowIso,
      updatedAt: nowIso,
      messages: [welcomeMessage],
    };

    setConversations((prev) => [newSession, ...prev]);
    setActiveConversationId(newSession.id);
    setInputQuery('');
  };

  // Clear the message history of the currently active conversation
  const handleClearCurrentHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeConversation) return;

    const nowIso = new Date().toISOString();
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation.id
          ? {
              ...conv,
              title: conv.title.startsWith('Conversa') ? conv.title : 'Conversa atual',
              updatedAt: nowIso,
              messages: [welcomeMessage],
            }
          : conv
      )
    );
    if (userId && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`divida_zero_ai_chat_${userId}`);
    }
  };

  const deriveConversationTitle = (query: string, fallbackTitle: string): string => {
    const clean = query.trim().replace(/\s+/g, ' ');
    if (!clean) return fallbackTitle;
    return clean.length > 28 ? `${clean.slice(0, 28)}...` : clean;
  };

  const handleSend = async (queryText?: string) => {
    const query = (queryText ?? inputQuery).trim();
    if (!query || isTyping || !activeConversation) return;

    if (!isChatOpen) {
      setIsChatOpen(true);
    }

    const targetConvId = activeConversation.id;
    const isFirstUserTurn = activeConversation.messages.every((m) => m.sender !== 'user');
    const updatedMessages: AiChatMessage[] = [
      ...activeConversation.messages,
      { sender: 'user', text: query },
    ];
    const nowIso = new Date().toISOString();

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === targetConvId
          ? {
              ...conv,
              title: isFirstUserTurn ? deriveConversationTitle(query, conv.title) : conv.title,
              updatedAt: nowIso,
              messages: updatedMessages,
            }
          : conv
      )
    );

    if (!queryText) setInputQuery('');
    setIsTyping(true);

    try {
      const result = await askFinancialAssistant({
        prompt: query,
        userId,
        debts,
        goals: userGoals,
        profile: userProfile,
        history: updatedMessages,
      });

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === targetConvId
            ? {
                ...conv,
                updatedAt: new Date().toISOString(),
                messages: [...conv.messages, { sender: 'ai', text: result.reply }],
              }
            : conv
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Consultor IA Dívida Zero (Dados Reais)</span>
          </h2>
          <p className="text-xs opacity-60">
            Orientação acolhedora e objetiva com os dados reais de {userProfile?.name || 'sua conta'} · Sem estimativas no escuro
          </p>
        </div>
      </div>

      {/* Interactive Chat Wrapper (Ref protects internal buttons, diagnostic cards, quick prompts, and inputs from outside-click close) */}
      <div ref={chatContainerRef} className="space-y-4">
        {/* 4 Core Financial Assistant Action Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {assistantPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => handleSend(pillar.prompt)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isDark
                    ? 'bg-neutral-900/90 border-neutral-800 hover:border-purple-500/50 hover:bg-neutral-900'
                    : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {pillar.title}
                  </span>
                  <Icon className={`w-4 h-4 shrink-0 ${pillar.accent}`} />
                </div>
                <p className="text-[11px] font-mono opacity-70 truncate">{pillar.subtitle}</p>
              </button>
            );
          })}
        </div>

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
            isChatOpen ? 'h-[540px]' : 'h-auto'
          } ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'}`}
        >
          {/* Chat Header with New Conversation, Clear History, and Collapse/Reopen Arrow */}
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
                    ? `Online · Conectado às ${analysis.activeDebtsCount} dívida(s) ativas de ${firstName}`
                    : 'Chat recolhido · Clique na seta para reabrir'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Start New Conversation Button */}
              <button
                type="button"
                onClick={handleStartNewConversation}
                title="Iniciar nova conversa"
                aria-label="Iniciar nova conversa"
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                  isDark
                    ? 'bg-neutral-900 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                    : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white'
                }`}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nova conversa</span>
              </button>

              {/* Clear Current Conversation History Button */}
              <button
                type="button"
                disabled={messages.length <= 1}
                onClick={handleClearCurrentHistory}
                title="Limpar histórico da conversa atual"
                aria-label="Limpar histórico da conversa atual"
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-rose-500/40 hover:text-rose-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar histórico</span>
              </button>

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
          </div>

          {/* Collapsible Chat Body: User-Isolated Conversation Tabs + Messages + Input */}
          {isChatOpen && (
            <>
              {/* User-Isolated Conversation Selector Bar (when multiple conversations exist) */}
              {conversations.length > 1 && (
                <div
                  className={`px-4 py-2 border-b flex items-center gap-2 overflow-x-auto text-[11px] ${
                    isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <span className="opacity-60 shrink-0 font-mono text-[10px] uppercase">Suas conversas:</span>
                  {conversations.map((conv) => {
                    const isActive = conv.id === activeConversation?.id;
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => setActiveConversationId(conv.id)}
                        className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-semibold'
                            : isDark
                            ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span>{conv.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}

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
                      className={`max-w-[82%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line ${
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
                      <span>Calculando com os seus dados reais...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
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
                  placeholder="Pergunte sobre suas dívidas, parcelas, plano de quitação ou responda aqui..."
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
                  disabled={isTyping}
                  className="p-2.5 rounded-xl text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 shadow-md transition-all"
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

