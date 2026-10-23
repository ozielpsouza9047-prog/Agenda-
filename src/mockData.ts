import { DebtItem, FinancialSummary } from './types';

export const initialDebts: DebtItem[] = [
  {
    id: 'd-1',
    title: 'Cartão Black Mastercard',
    creditor: 'Banco Itaú',
    category: 'Cartão de Crédito',
    totalAmount: 4850.00,
    remainingAmount: 4850.00,
    monthlyPayment: 1200.00,
    dueDate: '2026-10-25',
    status: 'proximo_vencimento',
    installmentsTotal: 5,
    installmentsPaid: 1,
    interestRate: 12.9
  },
  {
    id: 'd-2',
    title: 'Empréstimo Consignado',
    creditor: 'Caixa Econômica',
    category: 'Empréstimo',
    totalAmount: 12400.00,
    remainingAmount: 8900.00,
    monthlyPayment: 650.00,
    dueDate: '2026-10-24',
    status: 'proximo_vencimento',
    installmentsTotal: 24,
    installmentsPaid: 8,
    interestRate: 2.1
  },
  {
    id: 'd-3',
    title: 'Financiamento Automotivo',
    creditor: 'Banco Santander',
    category: 'Financiamento',
    totalAmount: 35000.00,
    remainingAmount: 22400.00,
    monthlyPayment: 1150.00,
    dueDate: '2026-10-18',
    status: 'atrasado',
    installmentsTotal: 48,
    installmentsPaid: 18,
    interestRate: 1.8
  },
  {
    id: 'd-4',
    title: 'Conta de Energia Elétrica',
    creditor: 'Enel Distribuição',
    category: 'Conta Básica',
    totalAmount: 340.00,
    remainingAmount: 340.00,
    monthlyPayment: 340.00,
    dueDate: '2026-10-15',
    status: 'atrasado',
    installmentsTotal: 1,
    installmentsPaid: 0,
    interestRate: 5.0
  },
  {
    id: 'd-5',
    title: 'Cheque Especial',
    creditor: 'Banco Bradesco',
    category: 'Outros',
    totalAmount: 2100.00,
    remainingAmount: 2100.00,
    monthlyPayment: 500.00,
    dueDate: '2026-11-05',
    status: 'em_dia',
    installmentsTotal: 4,
    installmentsPaid: 0,
    interestRate: 14.5
  },
  {
    id: 'd-6',
    title: 'Crédito Rotativo Store X',
    creditor: 'Magazine Luiza',
    category: 'Cartão de Crédito',
    totalAmount: 1250.00,
    remainingAmount: 750.00,
    monthlyPayment: 250.00,
    dueDate: '2026-11-12',
    status: 'em_dia',
    installmentsTotal: 5,
    installmentsPaid: 2,
    interestRate: 9.8
  }
];

export const initialSummary: FinancialSummary = {
  totalDebts: 39340.00,
  projectedMonthAmount: 3090.00,
  nextDueDate: '24/10/2026',
  nextDueTitle: 'Empréstimo Consignado',
  nextDueAmount: 650.00,
  overdueAmount: 1590.00,
  overdueCount: 2,
  upcomingInstallmentsCount: 6
};

export const aiRecommendations = [
  {
    id: 'rec-1',
    title: 'Estratégia Bola de Neve vs. Avalanche',
    description: 'Amortizar primeiro o Cheque Especial (Juros de 14.5% a.m.) poupará aproximadamente R$ 890 em encargos até o final do ano.',
    tag: 'Recomendação IA',
    impact: 'Alto Impacto'
  },
  {
    id: 'rec-2',
    title: 'Oportunidade de Acordo Pix',
    description: 'O Banco Santander possui campanha de renegociação com até 40% de desconto para liquidação à vista do saldo atrasado.',
    tag: 'Negociação',
    impact: 'Economia R$ 1.200'
  },
  {
    id: 'rec-3',
    title: 'Organização de Vencimentos',
    description: 'Consolidar seus vencimentos para o dia 10 de cada mês (após o recebimento do salário) evitará novas taxas de atraso.',
    tag: 'Planejamento',
    impact: 'Prevenção'
  }
];
