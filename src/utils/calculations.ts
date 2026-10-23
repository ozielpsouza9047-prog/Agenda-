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

  const activeDebts = debts.filter(d => d.status !== 'quitado');
  const sortedByDueDate = [...activeDebts].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextActive = sortedByDueDate[0] || debts[0];

  const summary: FinancialSummary = {
    totalDebts: Math.round(totalDebts * 100) / 100,
    projectedMonthAmount: Math.round(projectedMonthAmount * 100) / 100,
    nextDueDate: nextActive ? nextActive.dueDate : 'N/A',
    nextDueTitle: nextActive ? nextActive.title : 'Nenhuma',
    nextDueAmount: nextActive ? Math.round(nextActive.monthlyPayment * 100) / 100 : 0,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    overdueCount,
    upcomingInstallmentsCount: activeDebts.length
  };

  return { summary, memory: memoryItems };
}
