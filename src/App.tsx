import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DebtsView } from './components/DebtsView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { AIAssistantView } from './components/AIAssistantView';
import { SettingsView } from './components/SettingsView';
import { AddDebtModal } from './components/AddDebtModal';
import { CalculationMemoryModal } from './components/CalculationMemoryModal';
import { ImportBoletoModal } from './components/ImportBoletoModal';
import { ActiveTab, DebtItem, FinancialSummary } from './types';
import { initialDebts, initialSummary } from './mockData';
import { calculateFinancialSummary } from './utils/calculations';
import { X, ShieldAlert, LayoutDashboard, Wallet, Calendar, BarChart3, Sparkles, Settings, Calculator } from 'lucide-react';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Initialize debts from localStorage if available, otherwise initialDebts
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    const saved = localStorage.getItem('divida_zero_debts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse debts from localStorage', e);
      }
    }
    return initialDebts;
  });

  const [summary, setSummary] = useState<FinancialSummary>(initialSummary);
  const [memoryItems, setMemoryItems] = useState<{ label: string; formula: string; value: string }[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Automatic recalculation hook whenever debts change
  useEffect(() => {
    localStorage.setItem('divida_zero_debts', JSON.stringify(debts));
    const result = calculateFinancialSummary(debts);
    setSummary(result.summary);
    setMemoryItems(result.memory);
  }, [debts]);

  // Handle saving (add or update) a debt
  const handleSaveDebt = (debtItem: DebtItem) => {
    const exists = debts.some(d => d.id === debtItem.id);
    let updatedDebts: DebtItem[];
    if (exists) {
      updatedDebts = debts.map(d => d.id === debtItem.id ? debtItem : d);
    } else {
      updatedDebts = [debtItem, ...debts];
    }
    setDebts(updatedDebts);
    setEditingDebt(null);
  };

  // Handle importing a debt from PDF boleto
  const handleImportDebt = (debtItem: DebtItem) => {
    setDebts(prev => [debtItem, ...prev]);
  };

  // Handle editing request
  const handleOpenEditDebt = (debt: DebtItem) => {
    setEditingDebt(debt);
    setIsAddModalOpen(true);
  };

  // Handle deleting a debt
  const handleDeleteDebt = (id: string) => {
    const updatedDebts = debts.filter(d => d.id !== id);
    setDebts(updatedDebts);
  };

  // Handle restoring debts from backup
  const handleRestoreDebts = (restored: DebtItem[]) => {
    setDebts(restored);
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Desktop Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          isDark={isDark}
          setIsDark={setIsDark}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAddDebt={() => {
            setEditingDebt(null);
            setIsAddModalOpen(true);
          }}
          onOpenImportBoleto={() => setIsImportModalOpen(true)}
        />

        {/* Calculation Memory Trigger Bar */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between text-xs ${
          isDark ? 'bg-neutral-900/60 border-neutral-900 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Recálculo Automático Ativo · {debts.length} dívidas monitoradas</span>
          </div>
          <button
            onClick={() => setIsMemoryModalOpen(true)}
            className="flex items-center gap-1.5 font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Ver Memória de Cálculo</span>
          </button>
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              debts={debts}
              isDark={isDark}
              onOpenAddDebt={() => {
                setEditingDebt(null);
                setIsAddModalOpen(true);
              }}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              debts={debts}
              isDark={isDark}
              onOpenAddDebt={() => {
                setEditingDebt(null);
                setIsAddModalOpen(true);
              }}
              onEditDebt={handleOpenEditDebt}
              onDeleteDebt={handleDeleteDebt}
            />
          )}

          {activeTab === 'forecast' && (
            <CalendarView debts={debts} isDark={isDark} onUpdateDebt={handleSaveDebt} />
          )}

          {activeTab === 'reports' && (
            <ReportsView debts={debts} isDark={isDark} />
          )}

          {activeTab === 'ai_advisor' && (
            <AIAssistantView debts={debts} isDark={isDark} />
          )}

          {activeTab === 'settings' && (
            <SettingsView debts={debts} onRestoreDebts={handleRestoreDebts} isDark={isDark} setIsDark={setIsDark} />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`w-72 h-full flex flex-col p-6 ${isDark ? 'bg-neutral-950 text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex items-center justify-between pb-6 border-b border-inherit">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-base tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                    Dívida Zero
                  </span>
                  <span className="block text-[10px] font-mono text-purple-400 uppercase">AI Assistant</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-6 space-y-2">
              {[
                { id: 'dashboard' as ActiveTab, label: 'Visão Geral', icon: LayoutDashboard },
                { id: 'debts' as ActiveTab, label: 'Minhas Dívidas', icon: Wallet },
                { id: 'forecast' as ActiveTab, label: 'Calendário & Fluxo', icon: Calendar },
                { id: 'reports' as ActiveTab, label: 'Relatórios', icon: BarChart3 },
                { id: 'ai_advisor' as ActiveTab, label: 'IA Dívida Zero', icon: Sparkles },
                { id: 'settings' as ActiveTab, label: 'Configurações', icon: Settings },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md'
                        : isDark ? 'text-neutral-300 hover:bg-neutral-900' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Add / Edit Debt Modal */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDebt(null);
        }}
        onSaveDebt={handleSaveDebt}
        editingDebt={editingDebt}
        isDark={isDark}
      />

      {/* Import Boleto Modal */}
      <ImportBoletoModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportDebt={handleImportDebt}
        existingDebts={debts}
        isDark={isDark}
      />

      {/* Calculation Memory Modal */}
      <CalculationMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        memoryItems={memoryItems}
        totalDebts={summary.totalDebts}
        projectedMonth={summary.projectedMonthAmount}
        overdueAmount={summary.overdueAmount}
        isDark={isDark}
      />
    </div>
  );
}
