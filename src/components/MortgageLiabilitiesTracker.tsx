import React, { useState } from 'react';
import { Mortgage, Liability, UserRole } from '../types';
import { parseMortgageAgreement } from '../services/apiClient';
import { 
  Plus, 
  Home, 
  CreditCard, 
  Calendar, 
  TrendingDown, 
  ArrowRight, 
  Activity, 
  Percent, 
  ChevronRight, 
  DollarSign, 
  Calculator, 
  Trash2,
  UploadCloud,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Wand2,
  X
} from 'lucide-react';

interface MortgageLiabilitiesTrackerProps {
  mortgages: Mortgage[];
  liabilities: Liability[];
  onAddMortgage: (mort: Omit<Mortgage, 'id' | 'extraPayments'>) => void;
  onAddLiability: (lia: Omit<Liability, 'id'>) => void;
  onAddExtraPayment: (mortgageId: string, amount: number, date: string) => void;
  onDeleteExtraPayment: (mortgageId: string, extraPaymentId: string) => void;
  activeRole?: UserRole;
}

export default function MortgageLiabilitiesTracker({
  mortgages,
  liabilities,
  onAddMortgage,
  onAddLiability,
  onAddExtraPayment,
  onDeleteExtraPayment,
  activeRole = 'viewer'
}: MortgageLiabilitiesTrackerProps) {
  // Form toggles
  const [showMortForm, setShowMortForm] = useState(false);
  const [showLiaForm, setShowLiaForm] = useState(false);

  // New mortgage state
  const [mName, setMName] = useState('');
  const [mBank, setMBank] = useState('');
  const [mTotal, setMTotal] = useState('');
  const [mRemaining, setMRemaining] = useState('');
  const [mInterest, setMInterest] = useState('');
  const [mPayment, setMPayment] = useState('');
  const [mMaturity, setMMaturity] = useState('');

  // AI mortgage agreement parsing state
  const [activeFormTab, setActiveFormTab] = useState<'ai' | 'manual'>('ai');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [contractText, setContractText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const processFile = (file: File) => {
    setSelectedFile(file);
    setAiError(null);
    setAiSuccess(false);
    
    if (file.size > 8 * 1024 * 1024) {
      setAiError('Súbor je príliš veľký. Maximálna veľkosť je 8 MB.');
      return;
    }

    const reader = new FileReader();
    setAiLoading(true);
    setLoadingStep('Nahrávam súbor a pripravujem dáta...');

    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const commaIndex = base64String.indexOf(',');
      const rawBase64 = base64String.substring(commaIndex + 1);
      const mimeType = file.type;

        setLoadingStep('Čítam zmluvu o hypotéke pomocou Gemini AI...');
        
        let timeout1: ReturnType<typeof setTimeout> | undefined;
        let timeout2: ReturnType<typeof setTimeout> | undefined;

        try {
          timeout1 = setTimeout(() => {
            setLoadingStep('Hľadám banku, výšku úveru a zmluvné strany...');
          }, 1800);
          timeout2 = setTimeout(() => {
            setLoadingStep('Extrahujem úrokovú sadzbu, splátky a dátum splatnosti...');
          }, 3600);

          const data = await parseMortgageAgreement({
            fileBase64: rawBase64,
            fileMimeType: mimeType
          });

          if (timeout1) clearTimeout(timeout1);
          if (timeout2) clearTimeout(timeout2);

        const { mortgage } = data;
        setMName(mortgage.name || 'Hypotéka');
        setMBank(mortgage.bank || 'Banka');
        setMTotal(String(mortgage.totalAmount || ''));
        setMRemaining(String(mortgage.remainingAmount || mortgage.totalAmount || ''));
        setMInterest(String(mortgage.interestRate || ''));
        setMPayment(String(mortgage.monthlyPayment || ''));
        setMMaturity(mortgage.maturityDate || '');
        
        setAiSuccess(true);
        setActiveFormTab('manual'); // Switch to let them review and submit
      } catch (err: any) {
        if (timeout1) clearTimeout(timeout1);
        if (timeout2) clearTimeout(timeout2);
        console.error(err);
        setAiError(err.message || 'Chyba pri analýze zmluvy.');
      } finally {
        setAiLoading(false);
        setLoadingStep('');
      }
    };

    reader.onerror = () => {
      setAiError('Chyba pri čítaní súboru.');
      setAiLoading(false);
      setLoadingStep('');
    };

    reader.readAsDataURL(file);
  };

  const handlePasteParse = async () => {
    if (!contractText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuccess(false);
    setLoadingStep('Odosielam text zmluvy na analýzu...');

    try {
      const data = await parseMortgageAgreement({
        contractText: contractText
      });

      const { mortgage } = data;
      setMName(mortgage.name || 'Hypotéka');
      setMBank(mortgage.bank || 'Banka');
      setMTotal(String(mortgage.totalAmount || ''));
      setMRemaining(String(mortgage.remainingAmount || mortgage.totalAmount || ''));
      setMInterest(String(mortgage.interestRate || ''));
      setMPayment(String(mortgage.monthlyPayment || ''));
      setMMaturity(mortgage.maturityDate || '');
      
      setAiSuccess(true);
      setActiveFormTab('manual'); // Switch to manual to let them review
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Nepodarilo sa analyzovať zadaný text.');
    } finally {
      setAiLoading(false);
      setLoadingStep('');
    }
  };

  // New liability state
  const [lName, setLName] = useState('');
  const [lTotal, setLTotal] = useState('');
  const [lRemaining, setLRemaining] = useState('');
  const [lPayment, setLPayment] = useState('');

  // AI Modal state for Liabilities
  const [showAiLiaModal, setShowAiLiaModal] = useState(false);
  const [aiLiaPrompt, setAiLiaPrompt] = useState('');
  const [isAiLiaProcessing, setIsAiLiaProcessing] = useState(false);
  const [aiLiaError, setAiLiaError] = useState<string | null>(null);

  const handleAiProcessLiability = () => {
    if (!aiLiaPrompt.trim()) {
      setAiLiaError('Zadajte prosím popis záväzku (napr. Auto lízing na Škoda Kodiaq za 25 000 €, zostáva 14 000 €, splátka 320 €)');
      return;
    }

    setIsAiLiaProcessing(true);
    setAiLiaError(null);

    setTimeout(() => {
      const numbers = aiLiaPrompt.match(/(\d+[\d\s]*([.,]\d+)?)/g)?.map(n => parseFloat(n.replace(/\s/g, '').replace(',', '.'))) || [];

      let totalVal = numbers[0] || 10000;
      let remainingVal = numbers[1] || totalVal;
      let monthlyVal = numbers[2] || Math.round(remainingVal / 48);

      if (numbers.length === 1) {
        remainingVal = numbers[0];
        totalVal = numbers[0];
        monthlyVal = Math.round(remainingVal / 36);
      } else if (numbers.length === 2) {
        if (numbers[1] < numbers[0] && numbers[1] < 1000) {
          remainingVal = numbers[0];
          monthlyVal = numbers[1];
          totalVal = remainingVal;
        }
      }

      const liaName = aiLiaPrompt.split(/\d/)[0].trim() || 'Nový záväzok / lízing';

      onAddLiability({
        name: liaName,
        totalAmount: totalVal,
        remainingAmount: remainingVal,
        monthlyPayment: monthlyVal
      });

      setIsAiLiaProcessing(false);
      setAiLiaPrompt('');
      setShowAiLiaModal(false);
    }, 400);
  };

  // Extra payment simulator state
  const [simAmount, setSimAmount] = useState('5000');
  const [selectedMortgageId, setSelectedMortgageId] = useState(mortgages[0]?.id || '');

  // Add extra payment state
  const [epAmount, setEpAmount] = useState('');
  const [epDate, setEpDate] = useState(new Date().toISOString().split('T')[0]);

  const handleMortSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName || !mBank || !mTotal || !mRemaining || !mInterest || !mPayment) return;

    onAddMortgage({
      name: mName,
      bank: mBank,
      totalAmount: parseFloat(mTotal),
      remainingAmount: parseFloat(mRemaining),
      interestRate: parseFloat(mInterest),
      monthlyPayment: parseFloat(mPayment),
      maturityDate: mMaturity || '2046-06'
    });

    // Reset
    setMName('');
    setMBank('');
    setMTotal('');
    setMRemaining('');
    setMInterest('');
    setMPayment('');
    setMMaturity('');
    setShowMortForm(false);
  };

  const handleLiaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lName || !lTotal || !lRemaining || !lPayment) return;

    onAddLiability({
      name: lName,
      totalAmount: parseFloat(lTotal),
      remainingAmount: parseFloat(lRemaining),
      monthlyPayment: parseFloat(lPayment)
    });

    setLName('');
    setLTotal('');
    setLRemaining('');
    setLPayment('');
    setShowLiaForm(false);
  };

  const handleAddEpSubmit = (mortgageId: string, e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(epAmount);
    if (!isNaN(amt) && amt > 0 && epDate) {
      onAddExtraPayment(mortgageId, amt, epDate);
      setEpAmount('');
    }
  };

  // Calculations for summary card
  const totalMortgageRemaining = mortgages.reduce((sum, m) => sum + m.remainingAmount, 0);
  const totalLiabilityRemaining = liabilities.reduce((sum, l) => sum + l.remainingAmount, 0);
  const combinedDebt = totalMortgageRemaining + totalLiabilityRemaining;
  const combinedMonthlyPayment = mortgages.reduce((sum, m) => sum + m.monthlyPayment, 0) +
                                 liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);

  // Extra Payment Simulation Logic
  // Given an extra payment of X €, estimate the interest saved and time reduced on the mortgage.
  // Approximation of Amortization formulas:
  const getSimulationResults = () => {
    const mort = mortgages.find(m => m.id === selectedMortgageId);
    if (!mort) return { interestSaved: 0, monthsSaved: 0 };

    const principal = mort.remainingAmount;
    const rate = mort.interestRate / 100 / 12; // monthly rate
    const payment = mort.monthlyPayment;
    const extra = parseFloat(simAmount) || 0;

    if (principal <= 0 || rate <= 0 || payment <= 0 || extra <= 0) return { interestSaved: 0, monthsSaved: 0 };

    // Standard months remaining: log(P / (P - r*S)) / log(1 + r) or simple iterative calculation
    const calculateTermInMonths = (startPrincipal: number) => {
      let tempP = startPrincipal;
      let month = 0;
      while (tempP > 0 && month < 600) {
        const interest = tempP * rate;
        const principalPaid = payment - interest;
        if (principalPaid <= 0) {
          // payment doesn't even cover interest
          return 360; 
        }
        tempP -= principalPaid;
        month++;
      }
      return month;
    };

    const termWithoutExtra = calculateTermInMonths(principal);
    const termWithExtra = calculateTermInMonths(Math.max(0, principal - extra));

    const monthsSaved = Math.max(0, termWithoutExtra - termWithExtra);

    // Interest saved estimate: (extra payment amount) * (rate p.a.) * (remaining years estimate)
    // Detailed formula: Total payments remaining * payment - principal
    const calculateTotalInterest = (startPrincipal: number, months: number) => {
      let tempP = startPrincipal;
      let totalInterest = 0;
      for (let m = 0; m < months; m++) {
        const interest = tempP * rate;
        totalInterest += interest;
        const principalPaid = Math.min(tempP, payment - interest);
        tempP -= principalPaid;
        if (tempP <= 0) break;
      }
      return totalInterest;
    };

    const interestWithoutExtra = calculateTotalInterest(principal, termWithoutExtra);
    const interestWithExtra = calculateTotalInterest(Math.max(0, principal - extra), termWithExtra);

    const interestSaved = Math.max(0, interestWithoutExtra - interestWithExtra);

    return {
      interestSaved: Math.round(interestSaved),
      monthsSaved: Math.round(monthsSaved)
    };
  };

  const simResults = getSimulationResults();

  return (
    <div className="space-y-6" id="mortgage-liabilities-section">
      {/* Debt Summary Header Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Celková výška záväzkov</p>
          <p className="text-3xl font-bold text-slate-900">{combinedDebt.toLocaleString('sk-SK')} €</p>
          <div className="mt-2 text-xs text-slate-500">
            Hypotéky: <span className="font-semibold text-slate-700">{totalMortgageRemaining.toLocaleString('sk-SK')} €</span> | Iné: <span className="font-semibold text-slate-700">{totalLiabilityRemaining.toLocaleString('sk-SK')} €</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mesačné splátky spolu</p>
          <p className="text-3xl font-bold text-slate-900">{combinedMonthlyPayment.toLocaleString('sk-SK')} € / mesiac</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Fixné finančné záväzky</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 bg-linear-to-br from-indigo-50 to-indigo-100/50 border-indigo-100">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Úspora na úrokoch mimoriadnymi splátkami</p>
          <p className="text-3xl font-bold text-indigo-950">
            {mortgages.reduce((sum, m) => sum + m.extraPayments.reduce((s, ep) => s + ep.amount, 0), 0).toLocaleString('sk-SK')} €
          </p>
          <p className="text-xs text-indigo-700 mt-2 font-medium">Už vložené mimoriadne splátky</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main List & Details */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Mortgages Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Hypotéky</h3>
                <p className="text-slate-500 text-xs">Sledujte zostávajúci stav, úrokové sadzby a zapísané splátky.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowMortForm(true);
                    setActiveFormTab('ai');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-xs hover:shadow transition-all cursor-pointer border border-white/50"
                  title="Pridať novú hypotéku pomocou AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#183047] animate-pulse" />
                  <span>Pridať cez AI ✨</span>
                </button>

                <button
                  onClick={() => {
                    setShowMortForm(!showMortForm);
                    setActiveFormTab('manual');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ručne pridať
                </button>
              </div>
            </div>

            {/* Mortgage Form */}
            {showMortForm && (
              <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                    Nová hypotéka
                  </h4>
                  <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('ai')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        activeFormTab === 'ai' 
                          ? 'bg-white text-slate-800 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Načítať zo zmluvy (AI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('manual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer relative ${
                        activeFormTab === 'manual' 
                          ? 'bg-white text-slate-800 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Manuálne zadanie
                      {aiSuccess && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                      )}
                    </button>
                  </div>
                </div>

                {activeFormTab === 'ai' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Nahrajte zmluvu o hypotéke (PDF, scan, obrázok, textový súbor) alebo prilepte text zmluvy. Naša umelá inteligencia Gemini automaticky vyhľadá banku, úrok, výšku úveru, splátku a dátum splatnosti.
                    </p>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processFile(file);
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                        isDragging 
                          ? 'border-indigo-500 bg-indigo-50/50' 
                          : 'border-slate-300 hover:border-slate-400 bg-white'
                      }`}
                      onClick={() => document.getElementById('contract-file-input')?.click()}
                    >
                      <input
                        type="file"
                        id="contract-file-input"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processFile(file);
                        }}
                      />
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        Presuňte sem zmluvu alebo <span className="text-indigo-600 hover:underline">vyberte súbor</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Podporujeme PDF, obrázky (PNG, JPG, WEBP) a TXT do 8 MB
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold truncate flex-1">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-400">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    )}

                    <div className="relative flex py-2 items-center text-xs text-slate-400">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-slate-400">ALEBO prilepte text zmluvy</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={contractText}
                        onChange={(e) => setContractText(e.target.value)}
                        placeholder="Sem prilepte kopírovaný text zmluvy (napr. podmienky úveru, výšku úroku, splátky...)"
                        rows={3}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        disabled={aiLoading || !contractText.trim()}
                        onClick={handlePasteParse}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyzovať vložený text zmluvy
                      </button>
                    </div>

                    {/* AI Loading State */}
                    {aiLoading && (
                      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-indigo-900">Umelá inteligencia Gemini pracuje...</p>
                          <p className="text-[10px] text-indigo-700 font-medium mt-0.5">{loadingStep}</p>
                        </div>
                      </div>
                    )}

                    {/* AI Error */}
                    {aiError && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center gap-3 text-rose-800">
                        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Analýza zlyhala</p>
                          <p className="text-[10px] mt-0.5">{aiError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeFormTab === 'manual' && (
                  <form onSubmit={handleMortSubmit} className="space-y-4">
                    {aiSuccess && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2.5 text-emerald-800 animate-fade-in mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-[11px] font-semibold">
                          ✨ Gemini AI úspešne načítala údaje zo zmluvy. Nižšie ich môžete skontrolovať a uložiť!
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Názov (napr. Byt Bratislava)</label>
                        <input
                          type="text"
                          required
                          placeholder="napr. Byt Bratislava"
                          value={mName}
                          onChange={(e) => setMName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Banka</label>
                        <input
                          type="text"
                          required
                          placeholder="napr. Tatra banka, VÚB..."
                          value={mBank}
                          onChange={(e) => setMBank(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Celková výška úveru (€)</label>
                        <input
                          type="number"
                          required
                          placeholder="napr. 150000"
                          value={mTotal}
                          onChange={(e) => setMTotal(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Zostávajúci dlh (€)</label>
                        <input
                          type="number"
                          required
                          placeholder="napr. 120000"
                          value={mRemaining}
                          onChange={(e) => setMRemaining(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Mesačná splátka (€)</label>
                        <input
                          type="number"
                          required
                          placeholder="napr. 550"
                          value={mPayment}
                          onChange={(e) => setMPayment(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Úroková sadzba (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="napr. 3.89"
                          value={mInterest}
                          onChange={(e) => setMInterest(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Maturita (Rok a mesiac)</label>
                        <input
                          type="text"
                          placeholder="napr. 2045-08-31"
                          value={mMaturity}
                          onChange={(e) => setMMaturity(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMortForm(false);
                          setAiSuccess(false);
                          setSelectedFile(null);
                        }}
                        className="px-4 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs cursor-pointer"
                      >
                        Zrušiť
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Pridať hypotéku
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* List Mortgages */}
            <div className="space-y-6">
              {mortgages.map(m => {
                const paidPercent = ((m.totalAmount - m.remainingAmount) / m.totalAmount) * 100;
                return (
                  <div key={m.id} className="p-5 border border-slate-100 hover:border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                          <Home className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{m.name}</h4>
                          <span className="text-xs text-slate-400 font-medium">{m.bank} • Úrok: <strong>{m.interestRate}%</strong></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 text-xs font-medium">Splátka:</span>
                        <p className="text-lg font-bold text-slate-800">{m.monthlyPayment.toLocaleString('sk-SK')} € / mes</p>
                      </div>
                    </div>

                    {/* Progress Bar of payment */}
                    <div>
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
                        <span>Splatené: <strong>{Math.round(paidPercent)}%</strong> ({ (m.totalAmount - m.remainingAmount).toLocaleString('sk-SK') } €)</span>
                        <span>Dlh: <strong>{ m.remainingAmount.toLocaleString('sk-SK') } €</strong> z { m.totalAmount.toLocaleString('sk-SK') } €</span>
                      </div>
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-800 rounded-full transition-all duration-500"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Extra Payments Registered Sub-section */}
                    <div className="pt-4 border-t border-slate-150/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Log of Extra Payments */}
                      <div>
                        <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">Mimoriadne splátky</h5>
                        {m.extraPayments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Zatiaľ neboli zaevidované žiadne mimoriadne splátky.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {m.extraPayments.map(ep => (
                              <div key={ep.id} className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs">
                                <span className="text-slate-500">{new Date(ep.date).toLocaleDateString('sk-SK')}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-indigo-600">+{ep.amount.toLocaleString('sk-SK')} €</span>
                                  {activeRole !== 'viewer' && (
                                    <button
                                      onClick={() => onDeleteExtraPayment(m.id, ep.id)}
                                      className="text-slate-300 hover:text-red-500 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick form to add extra payment */}
                      {activeRole !== 'viewer' && (
                        <form onSubmit={(e) => handleAddEpSubmit(m.id, e)} className="p-3 bg-white border border-slate-150 rounded-xl space-y-3">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block">Pridať mimoriadnu splátku</span>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              required
                              placeholder="Suma v €"
                              value={epAmount}
                              onChange={(e) => setEpAmount(e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-indigo-600"
                            />
                            <input
                              type="date"
                              required
                              value={epDate}
                              onChange={(e) => setEpDate(e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-indigo-600"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded transition cursor-pointer"
                          >
                            Zaevidovať vklad
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Other Liabilities Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ďalšie záväzky & Leasingy</h3>
                <p className="text-slate-500 text-xs">Pôžičky, lízingy automobilov, kreditné karty a splátkové úvery.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAiLiaError(null);
                    setShowAiLiaModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-xs hover:shadow transition-all cursor-pointer border border-white/50"
                  title="Pridať nový záväzok pomocou AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#183047] animate-pulse" />
                  <span>Pridať cez AI ✨</span>
                </button>

                <button
                  onClick={() => setShowLiaForm(!showLiaForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ručne pridať
                </button>
              </div>
            </div>

            {/* Liability Form */}
            {showLiaForm && (
              <form onSubmit={handleLiaSubmit} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Pridať iný záväzok</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Názov záväzku</label>
                    <input
                      type="text"
                      required
                      placeholder="napr. Auto lízing, spotrebák..."
                      value={lName}
                      onChange={(e) => setLName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Celková suma úveru (€)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 15000"
                      value={lTotal}
                      onChange={(e) => setLTotal(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Zostávajúci dlh (€)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 8000"
                      value={lRemaining}
                      onChange={(e) => setLRemaining(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Mesačná splátka (€)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 250"
                      value={lPayment}
                      onChange={(e) => setLPayment(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLiaForm(false)}
                    className="px-4 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs cursor-pointer"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs cursor-pointer"
                  >
                    Pridať záväzok
                  </button>
                </div>
              </form>
            )}

            {/* List Liabilities */}
            <div className="divide-y divide-slate-100">
              {liabilities.length === 0 ? (
                <p className="py-4 text-center text-slate-400 text-xs italic">Zatiaľ žiadne iné záväzky.</p>
              ) : (
                liabilities.map(l => {
                  const paidPct = ((l.totalAmount - l.remainingAmount) / l.totalAmount) * 100;
                  return (
                    <div key={l.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-sm">{l.name}</h4>
                          
                          {/* Mini Progress Bar */}
                          <div className="mt-2 w-full max-w-xs">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-medium">
                              <span>Splatené: {Math.round(paidPct)}%</span>
                              <span>Dlžíte: {l.remainingAmount.toLocaleString('sk-SK')} €</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-700 rounded-full" style={{ width: `${paidPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right sm:pl-4">
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Splátka</span>
                        <span className="font-bold text-slate-800 text-sm">{l.monthlyPayment.toLocaleString('sk-SK')} € / mes</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Amortization & Extra Payment Calculator Panel */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between h-fit space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm tracking-wide uppercase text-indigo-400">Kalkulačka úspor</h3>
            </div>
            <h4 className="text-lg font-bold mb-2">Simulátor mimoriadnej splátky</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Vložte plánovanú jednorazovú splátku a pozrite sa, koľko mesiacov a tisícov eur na úrokoch zachránite.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vyberte hypotéku</label>
                <select
                  value={selectedMortgageId}
                  onChange={(e) => setSelectedMortgageId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg py-2 px-3 text-xs focus:outline-indigo-500 cursor-pointer"
                >
                  {mortgages.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.bank})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Výška mimoriadnej splátky (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg py-2 pl-3 pr-8 text-xs focus:outline-indigo-500"
                    placeholder="e.g. 5000"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">€</span>
                </div>
              </div>
            </div>

            {/* Results */}
            {selectedMortgageId && mortgages.some(m => m.id === selectedMortgageId) && (
              <div className="mt-6 p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ušetrené na úrokoch</span>
                  <p className="text-2xl font-black text-emerald-400">~{simResults.interestSaved.toLocaleString('sk-SK')} €</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Skrátenie lehoty splácania</span>
                  <p className="text-xl font-bold text-slate-100">
                    O {simResults.monthsSaved} mesiacov 
                    <span className="text-xs text-slate-400 font-normal"> (~{(simResults.monthsSaved / 12).toFixed(1)} r.)</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-3.5 border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Dôležité vedieť</span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Zákon umožňuje vkladať mimoriadne splátky bez akýchkoľvek poplatkov (najčastejšie mesačne alebo raz ročne do určitého %). Využite to na zníženie preplatenia Vašej nehnuteľnosti!
            </p>
          </div>
        </div>
      </div>

      {/* AI Liability Creator Modal */}
      {showAiLiaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in" id="ai-liability-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5 relative my-8 text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => {
                setShowAiLiaModal(false);
                setAiLiaError(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#72C6B5] to-[#3B818C] flex items-center justify-center text-[#183047] shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">AI Asistent pre záväzky & lízingy</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Opíšte lízing, spotrebný úver, nákup na splátky alebo kreditnú kartu.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Opíšte záväzok alebo úver
                </label>
                <textarea
                  rows={3}
                  value={aiLiaPrompt}
                  onChange={(e) => setAiLiaPrompt(e.target.value)}
                  placeholder="napr. Auto lízing na Škoda Kodiaq za 25 000 €, zostáva 14 000 €, splátka 320 € mesačne..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {/* Example Quick Prompt Chips */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <Wand2 className="w-3 h-3 text-teal-500" />
                  Príklady:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Auto lízing Škoda Octavia 18 000 €, zostáva 9 500 €, splátka 220 €',
                    'Spotrebný úver VÚB 6 000 €, zostáva 3 200 €, splátka 140 €',
                    'Kreditná karta Tatra Banka s dlhom 1 500 €, splátka 75 €',
                    'Nákup na splátky v Alze 800 €, splátka 40 €'
                  ].map((exampleText) => (
                    <button
                      key={exampleText}
                      onClick={() => setAiLiaPrompt(exampleText)}
                      className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {exampleText}
                    </button>
                  ))}
                </div>
              </div>

              {aiLiaError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-300">
                  {aiLiaError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAiLiaModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleAiProcessLiability}
                  disabled={isAiLiaProcessing}
                  className="px-5 py-2 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAiLiaProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#183047]" />
                      <span>Spracovávam...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Pridať cez Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
