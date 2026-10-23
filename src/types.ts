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

export type ActiveTab = 'dashboard' | 'debts' | 'forecast' | 'reports' | 'ai_advisor' | 'settings';
