import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DebtsView } from './components/DebtsView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { PayoffPlannerView } from './components/PayoffPlannerView';
import { GoalsView } from './components/GoalsView';
import { AIAssistantView } from './components/AIAssistantView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { AddDebtModal } from './components/AddDebtModal';
import { CalculationMemoryModal } from './components/CalculationMemoryModal';
import { ImportBoletoModal } from './components/ImportBoletoModal';
import { SupabaseAuthModal } from './components/SupabaseAuthModal';
import { SupabaseSyncBanner } from './components/SupabaseSyncBanner';
import {
  supabase,
  getCurrentAuthUser,
  fetchCloudDebts,
  saveCloudDebt,
  deleteCloudDebt,
  fetchCloudProfile,
  saveCloudProfile,
  signOutUser,
  isSupabaseConfigured
} from './lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { ActiveTab, DebtItem, FinancialSummary, UserProfile } from './types';
import { initialDebts, initialSummary } from './mockData';
import { calculateFinancialSummary } from './utils/calculations';
import { checkAndTriggerNotifications } from './utils/notifications';
import { X, ShieldAlert, LayoutDashboard, Wallet, Calendar, BarChart3, Target, Trophy, Sparkles, Settings, Calculator, User } from 'lucide-react';

const defaultProfile: UserProfile = {
  name: 'Oziel Souza',
  email: 'ozielpsouza9047@gmail.com',
  avatarUrl: '',
  currency: 'BRL',
  createdAt: '15 de Outubro de 2026',
  role: 'user',
  hideValuesOnDashboard: false,
  allowAiDataAnalysis: true,
  biometricLock: false,
  notificationPreferences: {
    enabled: true,
    notify7Days: true,
    notify3Days: true,
    notify1Day: true,
    notifyDueDay: true,
    notifyOverdue: true,
    emailSummary: false,
  },
};

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // User Profile state with localStorage persistence
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('divida_zero_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse profile from localStorage', e);
      }
    }
    return defaultProfile;
  });
  
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase Auth and Cloud Session initialization
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (!isSupabaseConfigured() || !supabase) return;

      try {
        const user = await getCurrentAuthUser();
        if (user && isMounted) {
          setAuthUser(user);
          // Load cloud profile if exists
          const cloudProfile = await fetchCloudProfile(user.id);
          if (cloudProfile && isMounted) {
            setUserProfile(cloudProfile);
          } else if (isMounted) {
            setUserProfile(prev => ({
              ...prev,
              email: user.email || prev.email,
              name: user.user_metadata?.name || prev.name,
            }));
          }

          // Load cloud debts if available
          const cloudDebts = await fetchCloudDebts(user.id);
          if (cloudDebts && cloudDebts.length > 0 && isMounted) {
            setDebts(cloudDebts);
          }
        }
      } catch (err) {
        console.warn('Initial Supabase auth check:', err);
      }
    };

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setAuthUser(session.user);
          const cloudProfile = await fetchCloudProfile(session.user.id);
          if (cloudProfile && isMounted) {
            setUserProfile(cloudProfile);
          }
          const cloudDebts = await fetchCloudDebts(session.user.id);
          if (cloudDebts && cloudDebts.length > 0 && isMounted) {
            setDebts(cloudDebts);
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }
  }, []);

  // Automatic recalculation hook and notifications check whenever debts change
  useEffect(() => {
    localStorage.setItem('divida_zero_debts', JSON.stringify(debts));
    const result = calculateFinancialSummary(debts);
    setSummary(result.summary);
    setMemoryItems(result.memory);

    const notifEnabled = localStorage.getItem('divida_zero_notif_enabled') !== 'false';
    checkAndTriggerNotifications(debts, notifEnabled);
  }, [debts]);

  // Refresh debts from Supabase Cloud
  const handleRefreshCloudData = async () => {
    if (!authUser) return;
    try {
      const cloudDebts = await fetchCloudDebts(authUser.id);
      if (cloudDebts && cloudDebts.length > 0) {
        setDebts(cloudDebts);
      }
    } catch (err) {
      console.error('Error refreshing cloud data:', err);
    }
  };

  // Handle saving (add or update) a debt
  const handleSaveDebt = async (debtItem: DebtItem) => {
    const exists = debts.some(d => d.id === debtItem.id);
    let updatedDebts: DebtItem[];
    if (exists) {
      updatedDebts = debts.map(d => d.id === debtItem.id ? debtItem : d);
    } else {
      updatedDebts = [debtItem, ...debts];
    }
    setDebts(updatedDebts);
    setEditingDebt(null);

    // Persist to Supabase if authenticated
    if (authUser) {
      await saveCloudDebt(debtItem, authUser.id);
    }
  };

  // Handle importing a debt from PDF boleto
  const handleImportDebt = async (debtItem: DebtItem) => {
    setDebts(prev => [debtItem, ...prev]);
    if (authUser) {
      await saveCloudDebt(debtItem, authUser.id);
    }
  };

  // Handle editing request
  const handleOpenEditDebt = (debt: DebtItem) => {
    setEditingDebt(debt);
    setIsAddModalOpen(true);
  };

  // Handle deleting a debt
  const handleDeleteDebt = async (id: string) => {
    const updatedDebts = debts.filter(d => d.id !== id);
    setDebts(updatedDebts);
    if (authUser) {
      await deleteCloudDebt(id, authUser.id);
    }
  };

  // Handle restoring debts from backup
  const handleRestoreDebts = (restored: DebtItem[]) => {
    setDebts(restored);
  };

  // Handle updating user profile
  const handleUpdateProfile = async (updated: UserProfile) => {
    setUserProfile(updated);
    localStorage.setItem('divida_zero_profile', JSON.stringify(updated));
    if (authUser) {
      await saveCloudProfile(updated, authUser.id);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await signOutUser();
    setAuthUser(null);
    setActiveTab('dashboard');
  };

  // Handle complete account deletion
  const handleDeleteAccount = async () => {
    if (authUser) {
      for (const d of debts) {
        await deleteCloudDebt(d.id, authUser.id);
      }
      await signOutUser();
      setAuthUser(null);
    }
    localStorage.removeItem('divida_zero_debts');
    localStorage.removeItem('divida_zero_profile');
    localStorage.removeItem('divida_zero_goals');
    localStorage.removeItem('divida_zero_sent_alerts');
    localStorage.removeItem('divida_zero_notif_enabled');
    setDebts([]);
    setUserProfile(defaultProfile);
    setActiveTab('dashboard');
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        userProfile={userProfile}
      />

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
          onOpenProfile={() => setActiveTab('profile')}
          userProfile={userProfile}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          isCloudConnected={Boolean(authUser)}
        />

        {/* Calculation Memory Trigger Bar */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between text-xs ${
          isDark ? 'bg-neutral-900/60 border-neutral-900 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>
              {isOnline
                ? `Recálculo Automático Ativo · ${debts.length} dívidas monitoradas`
                : `Modo Offline Ativo · ${debts.length} dívidas salvas com segurança`}
            </span>
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
          {/* Cloud Sync & RLS Isolation Banner */}
          <SupabaseSyncBanner
            authUser={authUser}
            debts={debts}
            isDark={isDark}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onRefreshCloudData={handleRefreshCloudData}
          />

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
              hideValues={userProfile.hideValuesOnDashboard}
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

          {activeTab === 'planner' && (
            <PayoffPlannerView debts={debts} isDark={isDark} />
          )}

          {activeTab === 'goals' && (
            <GoalsView debts={debts} isDark={isDark} />
          )}

          {activeTab === 'ai_advisor' && (
            <AIAssistantView debts={debts} isDark={isDark} />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              profile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              debts={debts}
              isDark={isDark}
              setIsDark={setIsDark}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              isCloudConnected={Boolean(authUser)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              debts={debts}
              onRestoreDebts={handleRestoreDebts}
              isDark={isDark}
              setIsDark={setIsDark}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              isCloudConnected={Boolean(authUser)}
            />
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
                { id: 'planner' as ActiveTab, label: 'Planejador', icon: Target },
                { id: 'goals' as ActiveTab, label: 'Minhas Metas', icon: Trophy },
                { id: 'ai_advisor' as ActiveTab, label: 'IA Dívida Zero', icon: Sparkles },
                { id: 'profile' as ActiveTab, label: 'Meu Perfil', icon: User },
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

      {/* Supabase Authentication and Configuration Modal */}
      <SupabaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDark={isDark}
        onAuthSuccess={async (email, name) => {
          setIsAuthModalOpen(false);
          const user = await getCurrentAuthUser();
          if (user) {
            setAuthUser(user);
            await handleRefreshCloudData();
          }
        }}
      />
    </div>
  );
}
