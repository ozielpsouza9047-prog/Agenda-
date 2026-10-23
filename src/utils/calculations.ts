import { DebtItem, FinancialSummary } from '../types';

export function calculateFinancialSummary(debts: DebtItem[]): { summary: FinancialSummary; memory: { label: string; formula: string; value: string }[] } {
  let totalDebts = 0;
  let projectedMonthAmount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let paidTotal = 0;

  const memoryItems: { label: string; formula: string; value: string }[] = [];

  debts.forEach((debt) => {
    const paidSoFar = debt.monthlyPayment * debt.installmentsPaid;
    const currentRemaining = Math.max(0, debt.totalAmount - paidSoFar);

    if (debt.status !== 'quitado') {
      totalDebts += currentRemaining;
      projectedMonthAmount += debt.monthlyPayment;
    }

    if (debt.status === 'atrasado') {
      overdueAmount += currentRemaining;
      overdueCount += 1;
    }

    paidTotal += paidSoFar;

    memoryItems.push({
      label: `${debt.title} (${debt.creditor})`,
      formula: `Total R$ ${debt.totalAmount.toFixed(2)} - (${debt.installmentsPaid} pagas de ${debt.installmentsTotal} × R$ ${debt.monthlyPayment.toFixed(2)}) + Juros (${debt.interestRate}% a.m.)`,
      value: `R$ ${currentRemaining.toFixed(2)}`
    });
  });

  const nextActive = debts.find(d => d.status !== 'quitado') || debts[0];

  const summary: FinancialSummary = {
    totalDebts,
    projectedMonthAmount,
    nextDueDate: nextActive ? nextActive.dueDate : 'N/A',
    nextDueTitle: nextActive ? nextActive.title : 'Nenhuma',
    nextDueAmount: nextActive ? nextActive.monthlyPayment : 0,
    overdueAmount,
    overdueCount,
    upcomingInstallmentsCount: debts.filter(d => d.status !== 'quitado').length
  };

  return { summary, memory: memoryItems };
}
