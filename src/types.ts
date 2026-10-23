export interface DebtItem {
  id: string;
  title: string;
  creditor: string;
  category: 'Cartão de Crédito' | 'Empréstimo' | 'Financiamento' | 'Conta Básica' | 'Outros';
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  dueDate: string; // e.g. "2026-10-28"
  status: 'em_dia' | 'atrasado' | 'proximo_vencimento' | 'quitado';
  installmentsTotal: number;
  installmentsPaid: number;
  interestRate: number; // monthly %
}

export interface FinancialSummary {
  totalDebts: number;
  projectedMonthAmount: number;
  nextDueDate: string;
  nextDueTitle: string;
  nextDueAmount: number;
  overdueAmount: number;
  overdueCount: number;
  upcomingInstallmentsCount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  currency: 'BRL' | 'USD' | 'EUR';
  createdAt: string;
  role: 'user';
  hideValuesOnDashboard: boolean;
  allowAiDataAnalysis: boolean;
  biometricLock: boolean;
  notificationPreferences: {
    enabled: boolean;
    notify7Days: boolean;
    notify3Days: boolean;
    notify1Day: boolean;
    notifyDueDay: boolean;
    notifyOverdue: boolean;
    emailSummary: boolean;
  };
}

export type ActiveTab = 'dashboard' | 'debts' | 'forecast' | 'reports' | 'planner' | 'goals' | 'ai_advisor' | 'profile' | 'settings';
