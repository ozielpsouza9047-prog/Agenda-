import { DebtItem } from '../types';

export function checkAndTriggerNotifications(debts: DebtItem[], notificationsEnabled: boolean) {
  if (!notificationsEnabled) return;
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }

  if (Notification.permission !== 'granted') return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sentAlertsKey = 'divida_zero_sent_alerts';
  const sentAlerts: Record<string, string> = JSON.parse(localStorage.getItem(sentAlertsKey) || '{}');

  debts.forEach(debt => {
    if (debt.status === 'quitado') return;

    const due = new Date(debt.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let alertType = '';
    if (diffDays === 7) alertType = '7d';
    else if (diffDays === 3) alertType = '3d';
    else if (diffDays === 1) alertType = '1d';
    else if (diffDays === 0) alertType = 'today';
    else if (diffDays < 0) alertType = 'overdue';

    if (!alertType) return;

    const alertId = `${debt.id}-${alertType}-${debt.dueDate}`;
    const todayStr = today.toISOString().split('T')[0];

    if (sentAlerts[alertId] === todayStr) return; // Already alerted today

    let title = 'Lembrete Dívida Zero';
    let body = `A conta "${debt.title}" vence em ${diffDays} dias no valor de R$ ${debt.monthlyPayment.toFixed(2)}.`;

    if (diffDays === 0) {
      title = '⚠️ Vencimento Hoje!';
      body = `A conta "${debt.title}" vence HOJE. Valor: R$ ${debt.monthlyPayment.toFixed(2)}.`;
    } else if (diffDays < 0) {
      title = '🚨 Conta Atrasada!';
      body = `A conta "${debt.title}" está atrasada há ${Math.abs(diffDays)} dias. Saldo: R$ ${debt.remainingAmount.toFixed(2)}.`;
    }

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
      sentAlerts[alertId] = todayStr;
      localStorage.setItem(sentAlertsKey, JSON.stringify(sentAlerts));
    } catch (e) {
      console.error('Notification error', e);
    }
  });
}
