import React, { useState, useEffect } from 'react';
import { Sun, Moon, Shield, Bell, User, Lock, Smartphone, Download, Upload, CheckCircle2, AlertTriangle, FileText, Database } from 'lucide-react';
import { DebtItem } from '../types';

interface SettingsViewProps {
  debts: DebtItem[];
  onRestoreDebts: (restored: DebtItem[]) => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ debts, onRestoreDebts, isDark, setIsDark }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [lastBackupDate, setLastBackupDate] = useState<string>('Nunca');
  const [previewData, setPreviewData] = useState<DebtItem[] | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('divida_zero_notif_enabled') !== 'false';
  });

  useEffect(() => {
    const savedDate = localStorage.getItem('divida_zero_last_backup');
    if (savedDate) setLastBackupDate(savedDate);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleToggleNotifications = (val: boolean) => {
    setNotificationsEnabled(val);
    localStorage.setItem('divida_zero_notif_enabled', val.toString());
    if (val && 'Notification' in window) {
      Notification.requestPermission();
    }
  };

  const handleExportJSON = () => {
    const backupPayload = {
      version: '1.0',
      user: 'ozielpsouza9047@gmail.com',
      exportDate: new Date().toISOString(),
      debts
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `divida_zero_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    const nowStr = new Date().toLocaleString('pt-BR');
    localStorage.setItem('divida_zero_last_backup', nowStr);
    setLastBackupDate(nowStr);
    setSuccessMsg('Backup em JSON exportado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Titulo,Credor,Categoria,ValorTotal,SaldoDevedor,ParcelaMensal,Vencimento,Status,ParcelasTotais,ParcelasPagas\r\n";
    debts.forEach(d => {
      csvContent += `"${d.id}","${d.title}","${d.creditor}","${d.category}",${d.totalAmount},${d.remainingAmount},${d.monthlyPayment},"${d.dueDate}","${d.status}",${d.installmentsTotal},${d.installmentsPaid}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `divida_zero_relatorio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    setSuccessMsg('Relatório CSV exportado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.debts)) {
          setPreviewData(json.debts);
          setIsRestoreModalOpen(true);
          setErrorMsg('');
        } else {
          setErrorMsg('Arquivo de backup inválido. O formato JSON não contém o array de dívidas.');
        }
      } catch (err) {
        setErrorMsg('Erro ao ler o arquivo JSON. Verifique se o arquivo está corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = (mode: 'merge' | 'replace') => {
    if (!previewData) return;

    if (mode === 'replace') {
      onRestoreDebts(previewData);
    } else {
      const existingIds = new Set(debts.map(d => d.id));
      const newItems = previewData.filter(d => !existingIds.has(d.id));
      onRestoreDebts([...debts, ...newItems]);
    }

    setIsRestoreModalOpen(false);
    setPreviewData(null);
    setSuccessMsg('Dados restaurados com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      alert('Para instalar o aplicativo no Android ou iOS, abra o menu do navegador e selecione "Adicionar à tela inicial" ou "Instalar aplicativo".');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl">
      <div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Configurações, Backup & Notificações
        </h2>
        <p className="text-xs opacity-60">
          Gerencie notificações de vencimento (7d, 3d, 1d, hoje), backups e preferências
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Notifications Settings */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Notificações de Vencimento
              </h3>
              <p className="text-xs opacity-60 mt-0.5 max-w-md">
                Alertas automáticos para 7 dias, 3 dias, 1 dia antes, no dia do pagamento e contas atrasadas.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => handleToggleNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Backup & Export Section */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Backup e Exportação de Dados
              </h3>
              <p className="text-xs opacity-60">Último backup realizado: <strong className="font-mono text-purple-400">{lastBackupDate}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <button
              onClick={handleExportJSON}
              className="p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Backup (JSON)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Exportar Relatório (CSV)</span>
            </button>

            <label className="p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>Restaurar Backup</span>
              <input type="file" accept=".json" onChange={handleFileSelectForRestore} className="hidden" />
            </label>
          </div>
        </div>

        {/* PWA Install Section */}
        <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Instalar Aplicativo (PWA)
              </h3>
              <p className="text-xs opacity-60 mt-0.5 max-w-md">
                Instale o Dívida Zero AI no seu celular ou computador para acesso offline e tela cheia.
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            disabled={isInstalled}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              isInstalled
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                : 'text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md'
            }`}
          >
            {isInstalled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Aplicativo Instalado</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Instalar Aplicativo</span>
              </>
            )}
          </button>
        </div>

        {/* Theme Appearance Section */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tema Visual (Dark / Light)
            </h3>
            <p className="text-xs opacity-60 mt-0.5">
              Alternar entre o tema escuro preto com roxo neon e o tema claro limpo.
            </p>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              isDark
                ? 'bg-neutral-950 border-purple-500/40 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                : 'bg-slate-100 border-slate-300 text-purple-700'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Tema Escuro Neon Ativo' : 'Tema Claro Ativo'}</span>
          </button>
        </div>
      </div>

      {/* Restore Preview & Validation Modal */}
      {isRestoreModalOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative ${
            isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-base font-bold mb-2">Pré-visualização do Backup</h3>
            <p className="text-xs opacity-60 mb-4">
              O arquivo selecionado contém <strong className="font-mono text-purple-400">{previewData.length} dívida(s)</strong>. Revise antes de confirmar.
            </p>

            <div className={`max-h-60 overflow-y-auto space-y-2 p-3 rounded-xl mb-6 text-xs ${
              isDark ? 'bg-neutral-950/80 border border-neutral-800' : 'bg-slate-50 border border-slate-200'
            }`}>
              {previewData.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-inherit pb-2">
                  <div>
                    <span className="font-bold">{d.title}</span>
                    <span className="block opacity-60 text-[10px]">{d.creditor} · {d.category}</span>
                  </div>
                  <span className="font-mono font-bold text-purple-400">R$ {d.totalAmount?.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => { setIsRestoreModalOpen(false); setPreviewData(null); }}
                className={`px-4 py-2.5 rounded-xl border ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmRestore('merge')}
                className={`px-4 py-2.5 rounded-xl border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 font-semibold`}
              >
                Mesclar com Dados Atuais
              </button>
              <button
                onClick={() => handleConfirmRestore('replace')}
                className="px-4 py-2.5 rounded-xl text-white bg-rose-600 hover:bg-rose-500 font-semibold shadow-md"
              >
                Substituir Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
