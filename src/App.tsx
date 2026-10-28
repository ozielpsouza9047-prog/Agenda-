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
import { Calculator, Loader2 } from 'lucide-react';

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
  
  // Initialize debts empty before authentication; debts are loaded only after a valid session is verified
  const [debts, setDebts] = useState<DebtItem[]>([]);

  const [summary, setSummary] = useState<FinancialSummary>(initialSummary);
  const [memoryItems, setMemoryItems] = useState<{ label: string; formula: string; value: string }[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

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

  // Load authenticated user's profile and debts (strictly after valid authentication)
  const loadAuthenticatedUserData = async (
    user: SupabaseUser,
    fallbackEmail?: string,
    fallbackName?: string
  ) => {
    if (!isSupabaseConfigured() || !supabase) return;

    const userProfileKey = `divida_zero_profile_${user.id}`;
    const userDebtsKey = `divida_zero_debts_${user.id}`;

    // 1. Load cloud profile for this authenticated user
    const cloudProfile = await fetchCloudProfile(user.id);
    const savedUserProfileRaw = localStorage.getItem(userProfileKey);
    let savedUserProfile: Partial<UserProfile> = {};
    if (savedUserProfileRaw) {
      try {
        savedUserProfile = JSON.parse(savedUserProfileRaw);
      } catch {
        savedUserProfile = {};
      }
    }

    if (cloudProfile) {
      setUserProfile(prev => {
        const merged: UserProfile = {
          ...prev,
          ...savedUserProfile,
          ...cloudProfile,
          email: cloudProfile.email || fallbackEmail || user.email || savedUserProfile.email || '',
          name:
            cloudProfile.name ||
            fallbackName ||
            user.user_metadata?.name ||
            savedUserProfile.name ||
            user.email?.split('@')[0] ||
            'Usuário',
          avatarUrl: cloudProfile.avatarUrl || savedUserProfile.avatarUrl || '',
        };
        localStorage.setItem(userProfileKey, JSON.stringify(merged));
        localStorage.setItem('divida_zero_profile', JSON.stringify(merged));
        return merged;
      });
    } else {
      setUserProfile(prev => {
        const updated: UserProfile = {
          ...prev,
          ...savedUserProfile,
          email: fallbackEmail || user.email || savedUserProfile.email || '',
          name:
            fallbackName ||
            user.user_metadata?.name ||
            savedUserProfile.name ||
            user.email?.split('@')[0] ||
            'Usuário',
          avatarUrl: savedUserProfile.avatarUrl || user.user_metadata?.avatar_url || '',
        };
        localStorage.setItem(userProfileKey, JSON.stringify(updated));
        localStorage.setItem('divida_zero_profile', JSON.stringify(updated));
        return updated;
      });
    }

    // 2. Load cloud debts bound to this authenticated user (RLS: auth.uid() = user_id)
    const cloudDebts = await fetchCloudDebts(user.id);
    if (cloudDebts && cloudDebts.length > 0) {
      setDebts(cloudDebts);
      localStorage.setItem(userDebtsKey, JSON.stringify(cloudDebts));
    } else {
      const savedUserDebts = localStorage.getItem(userDebtsKey);
      if (savedUserDebts) {
        try {
          const parsed = JSON.parse(savedUserDebts);
          if (Array.isArray(parsed)) {
            setDebts(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse user-scoped debts from localStorage', e);
        }
      }
      setDebts(cloudDebts || []);
    }
  };

  // Supabase Auth and Persistent Cloud Session initialization
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const user = await getCurrentAuthUser();
        if (user && isMounted) {
          setAuthUser(user);
          await loadAuthenticatedUserData(user);
        } else if (isMounted) {
          setAuthUser(null);
          setDebts([]);
        }
      } catch (err) {
        console.warn('Initial Supabase auth check:', err);
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setAuthUser(session.user);
          setIsCheckingAuth(false);
          if (event === 'PASSWORD_RECOVERY') {
            setActiveTab('profile');
          }
          if (
            event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED'
          ) {
            await loadAuthenticatedUserData(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setDebts([]);
          setIsCheckingAuth(false);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Automatic recalculation hook and notifications check whenever debts change (only when authenticated)
  useEffect(() => {
    const result = calculateFinancialSummary(debts);
    setSummary(result.summary);
    setMemoryItems(result.memory);

    if (!authUser) return;

    localStorage.setItem(`divida_zero_debts_${authUser.id}`, JSON.stringify(debts));
    localStorage.setItem('divida_zero_debts', JSON.stringify(debts));

    const notifEnabled = localStorage.getItem('divida_zero_notif_enabled') !== 'false';
    checkAndTriggerNotifications(debts, notifEnabled);
  }, [debts, authUser]);

  // Refresh debts from Supabase Cloud
  const handleRefreshCloudData = async () => {
    if (!authUser) return;
    try {
      const cloudDebts = await fetchCloudDebts(authUser.id);
      if (cloudDebts) {
        setDebts(cloudDebts);
        localStorage.setItem(`divida_zero_debts_${authUser.id}`, JSON.stringify(cloudDebts));
      }
    } catch (err) {
      console.error('Error refreshing cloud data:', err);
    }
  };

  // Handle saving (add or update) a debt
  const handleSaveDebt = async (debtItem: DebtItem) => {
    if (!authUser) return;
    const exists = debts.some(d => d.id === debtItem.id);
    let updatedDebts: DebtItem[];
    if (exists) {
      updatedDebts = debts.map(d => d.id === debtItem.id ? debtItem : d);
    } else {
      updatedDebts = [debtItem, ...debts];
    }
    setDebts(updatedDebts);
    setEditingDebt(null);

    await saveCloudDebt(debtItem, authUser.id);
  };

  // Handle importing a debt from PDF boleto
  const handleImportDebt = async (debtItem: DebtItem) => {
    if (!authUser) return;
    setDebts(prev => [debtItem, ...prev]);
    await saveCloudDebt(debtItem, authUser.id);
  };

  // Handle editing request
  const handleOpenEditDebt = (debt: DebtItem) => {
    setEditingDebt(debt);
    setIsAddModalOpen(true);
  };

  // Handle deleting a debt
  const handleDeleteDebt = async (id: string) => {
    if (!authUser) return;
    const updatedDebts = debts.filter(d => d.id !== id);
    setDebts(updatedDebts);
    await deleteCloudDebt(id, authUser.id);
  };

  // Handle restoring debts from backup
  const handleRestoreDebts = async (restored: DebtItem[]) => {
    setDebts(restored);
    if (authUser) {
      for (const item of restored) {
        await saveCloudDebt(item, authUser.id);
      }
    }
  };

  // Handle updating user profile
  const handleUpdateProfile = async (updated: UserProfile) => {
    setUserProfile(updated);
    localStorage.setItem('divida_zero_profile', JSON.stringify(updated));
    if (authUser) {
      localStorage.setItem(`divida_zero_profile_${authUser.id}`, JSON.stringify(updated));
      await saveCloudProfile(updated, authUser.id);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await signOutUser();
    setAuthUser(null);
    setDebts([]);
    setIsAuthModalOpen(false);
    setActiveTab('dashboard');
  };

  // Handle complete account deletion
  const handleDeleteAccount = async () => {
    if (authUser) {
      for (const d of debts) {
        await deleteCloudDebt(d.id, authUser.id);
      }
      localStorage.removeItem(`divida_zero_debts_${authUser.id}`);
      localStorage.removeItem(`divida_zero_profile_${authUser.id}`);
      localStorage.removeItem(`divida_zero_goals_${authUser.id}`);
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

  // 1. Loading Screen while verifying active session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#07070C] text-slate-100">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(168,85,247,0.35)] border border-purple-400/30">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Dívida Zero AI</h1>
            <p className="text-xs text-slate-400 mt-1">Verificando sessão autenticada...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authentication Gate: block access to financial dashboard and private data when there is no valid session
  if (!authUser) {
    return (
      <SupabaseAuthModal
        isOpen={true}
        requireAuth={true}
        authenticatedProfile={null}
        savedAvatarUrl={userProfile.avatarUrl}
        onClose={() => {}}
        isDark={isDark}
        onAuthSuccess={async (email, name) => {
          const user = await getCurrentAuthUser();
          if (user) {
            setAuthUser(user);
            await loadAuthenticatedUserData(user, email, name);
          }
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Internal Collapsible Sidebar (Desktop & Mobile) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        userProfile={userProfile}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          isDark={isDark}
          setIsDark={setIsDark}
          onOpenMobileMenu={() => setIsSidebarCollapsed(prev => !prev)}
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
            <GoalsView debts={debts} isDark={isDark} userId={authUser.id} />
          )}

          {activeTab === 'ai_advisor' && (
            <AIAssistantView debts={debts} isDark={isDark} />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              userId={authUser.id}
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

      {/* Supabase Authentication and Configuration Screen */}
      <SupabaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDark={isDark}
        savedAvatarUrl={userProfile.avatarUrl}
        authenticatedProfile={
          authUser
            ? {
                name: userProfile.name,
                email: authUser.email || userProfile.email,
                avatarUrl: userProfile.avatarUrl,
              }
            : null
        }
        onAuthSuccess={async (email, name) => {
          setIsAuthModalOpen(false);
          const user = await getCurrentAuthUser();
          if (user) {
            setAuthUser(user);
            await loadAuthenticatedUserData(user, email, name);
          }
        }}
      />
    </div>
  );
}
