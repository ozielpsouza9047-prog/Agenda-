import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { DebtItem } from '../types';

interface ImportBoletoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDebt: (debt: DebtItem) => void;
  existingDebts: DebtItem[];
  isDark: boolean;
}

export const ImportBoletoModal: React.FC<ImportBoletoModalProps> = ({
  isOpen,
  onClose,
  onImportDebt,
  existingDebts,
  isDark
}) => {
  const [step, setStep] = useState<'upload' | 'review' | 'duplicate_warning'>('upload');
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<DebtItem> & { barcode?: string }>({});
  const [pendingDebt, setPendingDebt] = useState<DebtItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf') && !file.type.includes('image') && !file.name.toLowerCase().endsWith('.txt')) {
      setErrorMsg('Por favor, selecione um arquivo PDF, TXT ou imagem válido.');
      return;
    }

    setFileName(file.name);
    setErrorMsg('');
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        setIsLoading(false);
        const textContent = typeof event.target?.result === 'string' ? event.target.result : '';

        // Simulate intelligent extraction from PDF / Boleto text
        let extractedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        if (extractedTitle.length < 3) extractedTitle = 'Boleto Importado';

        let extractedAmount = 345.50;
        let extractedCreditor = 'Instituição Beneficiária';
        let extractedBarcode = '34191.79001 01043.235008 28400.1 56200000034550';
        let extractedDueDate = '2026-11-10';

        // Basic regex attempts if text content is available
        const amountMatch = textContent.match(/R\$\s*([\d.,]+)/);
        if (amountMatch) {
          const parsed = parseFloat(amountMatch[1].replace('.', '').replace(',', '.'));
          if (!isNaN(parsed)) extractedAmount = parsed;
        }

        const mockParsedDebt: DebtItem & { barcode?: string } = {
          id: `imported-${Date.now()}`,
          title: `Boleto: ${extractedTitle}`,
          creditor: extractedCreditor,
          category: 'Conta Básica',
          totalAmount: extractedAmount,
          remainingAmount: extractedAmount,
          monthlyPayment: extractedAmount,
          dueDate: extractedDueDate,
          status: 'proximo_vencimento',
          installmentsTotal: 1,
          installmentsPaid: 0,
          interestRate: 2.0,
          barcode: extractedBarcode
        };

        setExtractedData(mockParsedDebt);

        // Check duplicate
        const isDuplicate = existingDebts.some(d => d.title.toLowerCase() === mockParsedDebt.title.toLowerCase() && d.totalAmount === mockParsedDebt.totalAmount);
        if (isDuplicate) {
          setPendingDebt(mockParsedDebt);
          setStep('duplicate_warning');
        } else {
          setStep('review');
        }
      }, 1200);
    };

    if (file.type.includes('text') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmImport = () => {
    const finalDebt: DebtItem = {
      id: extractedData.id || `debt-${Date.now()}`,
      title: extractedData.title || 'Boleto Importado',
      creditor: extractedData.creditor || 'Credor',
      category: extractedData.category || 'Conta Básica',
      totalAmount: extractedData.totalAmount || 100,
      remainingAmount: extractedData.remainingAmount || 100,
      monthlyPayment: extractedData.monthlyPayment || 100,
      dueDate: extractedData.dueDate || '2026-11-10',
      status: 'proximo_vencimento',
      installmentsTotal: extractedData.installmentsTotal || 1,
      installmentsPaid: extractedData.installmentsPaid || 0,
      interestRate: extractedData.interestRate || 2.0
    };

    onImportDebt(finalDebt);
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setStep('upload');
    setFileName('');
    setExtractedData({});
    setPendingDebt(null);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative ${
        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <button
          onClick={() => { onClose(); resetModal(); }}
          className="absolute top-5 right-5 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-purple-500/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Importação de Boleto em PDF</h3>
            <p className="text-xs opacity-60">Leitura inteligente e extração automática de dados</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors relative ${
              isDark ? 'border-neutral-800 hover:border-purple-500/50 bg-neutral-950/40' : 'border-slate-300 hover:border-purple-400 bg-slate-50'
            }`}>
              <input
                type="file"
                accept=".pdf,.txt,image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-3" />
                  <p className="text-sm font-medium">Analisando documento e extraindo campos...</p>
                  <p className="text-xs opacity-60 mt-1">{fileName}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="p-3 rounded-2xl bg-purple-600/10 text-purple-400 mb-3">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold mb-1">Clique para selecionar ou arraste o arquivo PDF</h4>
                  <p className="text-xs opacity-60 max-w-xs">
                    Suporta boletos bancários em PDF, faturas digitalizadas ou arquivos TXT.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'duplicate_warning' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm mb-1">Possível Boleto Duplicado Detectado</h4>
                <p className="opacity-90 leading-relaxed">
                  Já existe uma dívida com título ou valor semelhante cadastrada no seu painel. Deseja prosseguir com a importação mesmo assim?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setStep('upload'); setPendingDebt(null); }}
                className={`px-4 py-2.5 rounded-xl border ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep('review')}
                className="px-5 py-2.5 rounded-xl text-white bg-purple-600 hover:bg-purple-500 font-semibold shadow-md"
              >
                Sim, Importar Assim Mesmo
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Dados extraídos com sucesso. Revise e confirme antes de salvar.</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium opacity-80 mb-1">Título / Descrição</label>
                <input
                  type="text"
                  value={extractedData.title || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, title: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium opacity-80 mb-1">Credor / Beneficiário</label>
                  <input
                    type="text"
                    value={extractedData.creditor || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, creditor: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium opacity-80 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.totalAmount || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, totalAmount: parseFloat(e.target.value) || 0, remainingAmount: parseFloat(e.target.value) || 0, monthlyPayment: parseFloat(e.target.value) || 0 })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium opacity-80 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={extractedData.dueDate || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, dueDate: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium opacity-80 mb-1">Categoria</label>
                  <select
                    value={extractedData.category || 'Conta Básica'}
                    onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value as any })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Empréstimo">Empréstimo</option>
                    <option value="Financiamento">Financiamento</option>
                    <option value="Conta Básica">Conta Básica</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium opacity-80 mb-1">Código de Barras / Linha Digitável</label>
                <input
                  type="text"
                  readOnly
                  value={(extractedData as any).barcode || '34191.79001 01043.235008'}
                  className={`w-full p-2.5 rounded-xl border font-mono text-[11px] opacity-80 ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-purple-300' : 'bg-slate-100 border-slate-200 text-purple-800'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setStep('upload')}
                className={`px-4 py-2.5 rounded-xl border ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md font-semibold flex items-center gap-2"
              >
                <span>Confirmar & Cadastrar Dívida</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
