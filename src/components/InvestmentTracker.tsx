import React, { useState } from 'react';
import { Investment, UserRole } from '../types';
import { parseInvestment } from '../services/apiClient';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Gift, 
  User, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  Activity, 
  ArrowUpRight, 
  Trash2, 
  Layers,
  Sparkles,
  Upload,
  Wand2,
  Check,
  X,
  FileText,
  Loader2,
  Bot
} from 'lucide-react';

interface InvestmentTrackerProps {
  investments: Investment[];
  onAddInvestment: (inv: Omit<Investment, 'id' | 'history'>) => void;
  onUpdateValue: (id: string, newValue: number) => void;
  onDeleteInvestment?: (id: string) => void;
  filterType?: 'all' | 'personal' | 'kids';
  activeRole?: UserRole;
}

export default function InvestmentTracker({
  investments,
  onAddInvestment,
  onUpdateValue,
  onDeleteInvestment,
  filterType = 'all',
  activeRole = 'viewer'
}: InvestmentTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'personal' | 'kids'>('personal');
  const [owner, setOwner] = useState('Moje');
  const [initialValue, setInitialValue] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [platform, setPlatform] = useState('Interactive Brokers');
  const [customPlatform, setCustomPlatform] = useState('');

  // Selected platform filter
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Update value state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newValueInput, setNewValueInput] = useState('');

  // AI Modal States
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSelectedFile, setAiSelectedFile] = useState<File | null>(null);
  const [aiFilePreview, setAiFilePreview] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedInvestment, setExtractedInvestment] = useState<{
    name: string;
    platform: string;
    initialValue: number;
    currentValue: number;
    monthlyContribution: number;
    type: 'personal' | 'kids';
    owner: string;
    summaryNote?: string;
  } | null>(null);

  // Filtered by type first
  const filteredByType = investments.filter(inv => {
    if (filterType === 'all') return true;
    return inv.type === filterType;
  });

  // Get available unique platforms inside currently selected type
  const availablePlatforms = Array.from(
    new Set(
      filteredByType
        .map(inv => inv.platform || 'Iná platforma')
        .filter(Boolean)
    )
  );

  // Filtered by type AND platform
  const filtered = filteredByType.filter(inv => {
    if (selectedPlatform === 'all') return true;
    const plat = inv.platform || 'Iná platforma';
    return plat === selectedPlatform;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !initialValue) return;

    const finalPlatform = platform === 'Iná platforma' ? (customPlatform.trim() || 'Iná platforma') : platform;

    onAddInvestment({
      name,
      type,
      owner: type === 'personal' ? 'Moje' : owner,
      initialValue: parseFloat(initialValue),
      currentValue: parseFloat(initialValue),
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      platform: finalPlatform
    });

    // Reset
    setName('');
    setInitialValue('');
    setMonthlyContribution('');
    setOwner('Tomáško');
    setPlatform('Interactive Brokers');
    setCustomPlatform('');
    setShowAddForm(false);
  };

  const handleUpdateSubmit = (id: string) => {
    const val = parseFloat(newValueInput);
    if (!isNaN(val)) {
      onUpdateValue(id, val);
      setUpdatingId(null);
      setNewValueInput('');
    }
  };

  const handleAiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAiSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setAiFilePreview(url);
      } else {
        setAiFilePreview(null);
      }
    }
  };

  const handleAiProcess = async () => {
    if (!aiPrompt.trim() && !aiSelectedFile) {
      setAiError('Zadajte prosím slovný popis investície alebo priložte snímku/súbor.');
      return;
    }

    setIsAiProcessing(true);
    setAiError(null);
    setExtractedInvestment(null);

    let base64 = '';
    let mimeType = '';

    if (aiSelectedFile) {
      try {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const commaIdx = res.indexOf(',');
            resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(aiSelectedFile);
        });
        mimeType = aiSelectedFile.type || 'image/png';
      } catch (err) {
        console.error('Error reading file for AI:', err);
      }
    }

    try {
      const data = await parseInvestment({
        promptText: aiPrompt,
        fileBase64: base64,
        fileMimeType: mimeType
      });

      setExtractedInvestment({
        name: data.investment.name || 'Nová investícia',
        platform: data.investment.platform || 'Portu',
        initialValue: Number(data.investment.initialValue) || 0,
        currentValue: Number(data.investment.currentValue) || Number(data.investment.initialValue) || 0,
        monthlyContribution: Number(data.investment.monthlyContribution) || 0,
        type: data.investment.type === 'kids' || filterType === 'kids' ? 'kids' : 'personal',
        owner: data.investment.owner || (filterType === 'kids' ? 'Tomáško' : 'Moje'),
        summaryNote: data.investment.summaryNote || 'Investícia bola rozpoznaná pomocou Gemini AI.'
      });
    } catch (err: any) {
      console.warn('Backend AI call failed, falling back to smart local parser:', err);
      
      const text = aiPrompt.toLowerCase();
      const numbers = aiPrompt.match(/(\d+[\d\s]*([.,]\d+)?)/g)?.map(n => parseFloat(n.replace(/\s/g, '').replace(',', '.'))) || [];
      
      let plat = 'Portu';
      if (text.includes('finax')) plat = 'Finax';
      else if (text.includes('fumbi') || text.includes('crypto') || text.includes('bitcoin')) plat = 'Fumbi';
      else if (text.includes('ibkr') || text.includes('interactive') || text.includes('brokers')) plat = 'Interactive Brokers';
      else if (text.includes('trading') || text.includes('212')) plat = 'Trading 212';
      else if (text.includes('xtb')) plat = 'XTB';
      else if (text.includes('coinbase')) plat = 'Coinbase';

      const isKids = filterType === 'kids' || text.includes('deti') || text.includes('detsk') || text.includes('syn') || text.includes('dcér') || text.includes('tomáš') || text.includes('emičk');
      const ownerVal = isKids ? (text.includes('emičk') ? 'Emička' : 'Tomáško') : 'Moje';

      let invName = 'S&P 500 ETF';
      if (text.includes('bitcoin') || text.includes('btc')) invName = 'Bitcoin (Crypto)';
      else if (text.includes('finax')) invName = 'Finax Global Equity';
      else if (text.includes('vwce') || text.includes('vanguard')) invName = 'Vanguard All-World ETF (VWCE)';
      else if (aiPrompt.trim().length > 3 && !text.startsWith('kúpil') && !text.startsWith('vklad')) {
        invName = aiPrompt.split(/\d/)[0].trim() || 'Nová investícia';
      }

      const val1 = numbers[0] || 1000;
      const val2 = numbers[1] || (text.includes('mesač') || text.includes('vklad') ? 50 : 0);

      setExtractedInvestment({
        name: invName,
        platform: plat,
        initialValue: val1,
        currentValue: val1,
        monthlyContribution: val2,
        type: isKids ? 'kids' : 'personal',
        owner: ownerVal,
        summaryNote: `Načítané z textu: ${plat} - ${invName}`
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleConfirmAiInvestment = () => {
    if (!extractedInvestment) return;

    onAddInvestment({
      name: extractedInvestment.name,
      type: extractedInvestment.type,
      owner: extractedInvestment.owner,
      initialValue: extractedInvestment.initialValue,
      currentValue: extractedInvestment.currentValue,
      monthlyContribution: extractedInvestment.monthlyContribution,
      platform: extractedInvestment.platform
    });

    setExtractedInvestment(null);
    setAiPrompt('');
    setAiSelectedFile(null);
    setAiFilePreview(null);
    setShowAiModal(false);
  };

  // Calculations based on filtered list (or filteredByType so stats reflect the whole selected segment)
  const totalCurrentValue = filteredByType.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalInitialValue = filteredByType.reduce((sum, inv) => sum + inv.initialValue, 0);
  const totalReturn = totalCurrentValue - totalInitialValue;
  const returnPercentage = totalInitialValue > 0 ? (totalReturn / totalInitialValue) * 100 : 0;
  const totalMonthlyContribution = filteredByType.reduce((sum, inv) => sum + inv.monthlyContribution, 0);

  // Growth projection data for SVG chart
  const annualReturnRate = 0.08;
  const projectionYears = 10;
  const generateProjection = () => {
    const points = [];
    let current = totalCurrentValue;
    for (let year = 0; year <= projectionYears; year++) {
      points.push({
        year: new Date().getFullYear() + year,
        value: Math.round(current)
      });
      current = current * (1 + annualReturnRate) + (totalMonthlyContribution * 12);
    }
    return points;
  };

  const projectionData = generateProjection();
  const maxProjectionValue = Math.max(...projectionData.map(p => p.value));
  const minProjectionValue = Math.min(...projectionData.map(p => p.value));

  const getPlatformBadge = (plat?: string) => {
    if (!plat) return null;
    let bg = 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700';
    if (plat.toLowerCase().includes('broker') || plat.toLowerCase().includes('ibkr') || plat.toLowerCase().includes('interactive')) {
      bg = 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30';
    } else if (plat.toLowerCase().includes('portu')) {
      bg = 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/30';
    } else if (plat.toLowerCase().includes('fumbi')) {
      bg = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30';
    } else if (plat.toLowerCase().includes('finax')) {
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30';
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${bg}`}>
        {plat}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="investment-tracker-section">
      {/* Quick stats panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            {filterType === 'kids' ? 'Detské úspory spolu' : 'Celková hodnota investícií'}
          </p>
          <p className="text-3xl font-bold text-slate-900">{totalCurrentValue.toLocaleString('sk-SK')} €</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Počiatočný vklad:</span>
            <span className="font-semibold text-slate-700">{totalInitialValue.toLocaleString('sk-SK')} €</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Celkový zisk / Výnos</p>
          <p className={`text-3xl font-bold ${totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toLocaleString('sk-SK')} €
          </p>
          <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            <ArrowUpRight className="w-4 h-4" />
            {totalReturn >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mesačný vklad spolu</p>
          <p className="text-3xl font-bold text-slate-900">+{totalMonthlyContribution.toLocaleString('sk-SK')} €</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Pravidelné sporenie</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Odhadovaný výnos p.a.</p>
          <p className="text-3xl font-bold text-indigo-600">~8.0%</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Historický priemer trhu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {filterType === 'kids' ? 'Detské sporenia a portfóliá' : 'Prehľad investičných účtov'}
                </h3>
                <p className="text-slate-500 text-xs">Aktívne investičné účty, fondy a sporenia.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAiError(null);
                    setExtractedInvestment(null);
                    setShowAiModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-sm hover:shadow transition-all cursor-pointer border border-white/50"
                  title="Pridať novú investíciu cez Gemini AI"
                >
                  <Sparkles className="w-4 h-4 text-[#183047] animate-pulse" />
                  <span>Pridať cez AI ✨</span>
                </button>

                <button
                  onClick={() => {
                    setType(filterType === 'kids' ? 'kids' : 'personal');
                    setOwner(filterType === 'kids' ? 'Tomáško' : 'Moje');
                    setShowAddForm(!showAddForm);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ručne pridať
                </button>
              </div>
            </div>

            {/* Platform filter pills */}
            <div className="flex flex-wrap gap-1.5 mb-6 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 w-full mb-1">
                <Layers className="w-3 h-3 text-slate-400" />
                Filtrovať podľa platformy:
              </span>
              <button
                onClick={() => setSelectedPlatform('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  selectedPlatform === 'all'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                Všetky ({filteredByType.length})
              </button>
              {availablePlatforms.map(plat => {
                const count = filteredByType.filter(inv => (inv.platform || 'Iná platforma') === plat).length;
                if (count === 0) return null;
                return (
                  <button
                    key={plat}
                    onClick={() => setSelectedPlatform(plat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      selectedPlatform === plat
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {plat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Add Account Form */}
            {showAddForm && (
              <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-4">
                <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Pridať nové sporenie / investíciu</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Názov účtu / fondu</label>
                    <input
                      type="text"
                      required
                      placeholder="napr. S&P 500 ETF, Bitcoin, apod."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Investičná platforma</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600 cursor-pointer"
                    >
                      <option value="Interactive Brokers">Interactive Brokers</option>
                      <option value="Portu">Portu</option>
                      <option value="Fumbi">Fumbi (Crypto)</option>
                      <option value="Finax">Finax</option>
                      <option value="Iná platforma">Iná platforma...</option>
                    </select>
                  </div>
                </div>

                {/* If custom platform selected */}
                {platform === 'Iná platforma' && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Názov inej platformy</label>
                    <input
                      type="text"
                      required
                      placeholder="napr. Trading 212, Coinbase, Coinmate..."
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Typ účtu</label>
                    <select
                      value={type}
                      onChange={(e) => {
                        const newType = e.target.value as 'personal' | 'kids';
                        setType(newType);
                        setOwner(newType === 'personal' ? 'Moje' : 'Tomáško');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600 cursor-pointer"
                    >
                      <option value="personal">Osobná investícia</option>
                      <option value="kids">Detské sporenie</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Pre koho (Vlastník)</label>
                    <input
                      type="text"
                      disabled={type === 'personal'}
                      value={type === 'personal' ? 'Moje' : owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="napr. Elinka, Kubko"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Počiatočná hodnota (€)</label>
                    <input
                      type="number"
                      required
                      placeholder="napr. 1000"
                      value={initialValue}
                      onChange={(e) => setInitialValue(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Mesačný príspevok (€)</label>
                    <input
                      type="number"
                      placeholder="napr. 50"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs cursor-pointer"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Uložiť investíciu
                  </button>
                </div>
              </form>
            )}

            {/* List Table */}
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Na tejto platforme nie sú evidované žiadne investície.
                </div>
              ) : (
                filtered.map(inv => {
                  const profit = inv.currentValue - inv.initialValue;
                  const pct = inv.initialValue > 0 ? (profit / inv.initialValue) * 100 : 0;
                  const isUpdating = updatingId === inv.id;

                  return (
                    <div key={inv.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${inv.type === 'kids' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                          {inv.type === 'kids' ? <Gift className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{inv.name}</h4>
                            {getPlatformBadge(inv.platform || 'Iná platforma')}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-300" />
                              Pre: <span className="text-slate-600 font-semibold">{inv.owner}</span>
                            </span>
                            <span>•</span>
                            <span>Mesačne: <span className="text-slate-600 font-semibold">{inv.monthlyContribution} €</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          {isUpdating ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                className="w-24 px-2 py-1 text-xs border border-slate-300 rounded font-semibold text-right focus:outline-indigo-600"
                                value={newValueInput}
                                placeholder={inv.currentValue.toString()}
                                onChange={(e) => setNewValueInput(e.target.value)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateSubmit(inv.id)}
                                className="px-2 py-1 bg-slate-800 text-white hover:bg-slate-900 rounded text-[10px] font-semibold cursor-pointer"
                              >
                                Uložiť
                              </button>
                              <button
                                onClick={() => setUpdatingId(null)}
                                className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-800 text-sm block">
                                {inv.currentValue.toLocaleString('sk-SK')} €
                              </span>
                              <span className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {profit >= 0 ? '+' : ''}{pct.toFixed(1)}% ({profit >= 0 ? '+' : ''}{Math.round(profit)} €)
                              </span>
                            </div>
                          )}
                        </div>

                        {!isUpdating && activeRole !== 'viewer' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setUpdatingId(inv.id);
                                setNewValueInput(inv.currentValue.toString());
                              }}
                              className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition font-medium cursor-pointer"
                            >
                              Aktualizovať
                            </button>
                            {onDeleteInvestment && (
                              <button
                                onClick={() => {
                                  if (confirm(`Naozaj chcete vymazať investíciu "${inv.name}"?`)) {
                                    onDeleteInvestment(inv.id);
                                  }
                                }}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                                title="Vymazať investíciu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Projections Visualizer Side Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm tracking-wide uppercase text-indigo-400">Predpokladaný rast</h3>
            </div>
            <h4 className="text-lg font-bold mb-2">Projekcia sporenia na 10 rokov</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              S mesačným vkladom <strong className="text-white">{totalMonthlyContribution} €</strong> a priemerným zhodnotením <strong className="text-white">8% ročne</strong> by Váš majetok rástol nasledovne:
            </p>

            {/* Render a custom mini interactive growth SVG chart */}
            <div className="h-44 relative mb-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                {/* SVG lines */}
                <path
                  d={projectionData.map((p, idx) => {
                    const x = (idx / projectionYears) * 300;
                    const y = 110 - ((p.value - minProjectionValue) / (maxProjectionValue - minProjectionValue || 1)) * 90;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3.5"
                />
                {/* Area fill */}
                <path
                  d={`${projectionData.map((p, idx) => {
                    const x = (idx / projectionYears) * 300;
                    const y = 110 - ((p.value - minProjectionValue) / (maxProjectionValue - minProjectionValue || 1)) * 90;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')} L 300 120 L 0 120 Z`}
                  fill="url(#indigoGrad)"
                  opacity="0.15"
                />
                
                {/* Dots at end and start */}
                <circle cx="300" cy={110 - ((projectionData[projectionYears].value - minProjectionValue) / (maxProjectionValue - minProjectionValue || 1)) * 90} r="4.5" fill="#818cf8" />
                <circle cx="0" cy={110 - ((projectionData[0].value - minProjectionValue) / (maxProjectionValue - minProjectionValue || 1)) * 90} r="3" fill="#818cf8" />

                <defs>
                  <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                <span>Dnes: {totalCurrentValue.toLocaleString('sk-SK', { maximumFractionDigits: 0 })} €</span>
                <span>Za 10r: {projectionData[projectionYears].value.toLocaleString('sk-SK', { maximumFractionDigits: 0 })} €</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 mt-4">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Investičný Tip</span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Zvýšením mesačného vkladu o pouhých <span className="font-semibold text-white">50 €</span> zvýšite cieľovú sumu o viac ako <span className="font-semibold text-emerald-400">9 100 €</span> za 10 rokov vďaka zloženému úročeniu.
            </p>
          </div>
        </div>
      </div>

      {/* AI Investment Creator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in" id="ai-investment-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5 relative my-8 text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => {
                setShowAiModal(false);
                setExtractedInvestment(null);
                setAiError(null);
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
                <h3 className="text-lg font-black text-slate-900 dark:text-white">AI Asistent pre novú investíciu</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Zadajte popis investície textom alebo priložte výpis / snímku obrazovky.
                </p>
              </div>
            </div>

            {!extractedInvestment ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Opíšte svoju investíciu alebo vložte správu
                  </label>
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="napr. Kúpil som S&P 500 ETF na Portu za 1 500 € s mesačným vkladom 100 €..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                {/* Example Quick Prompt Chips */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-teal-500" />
                    Rýchle príklady:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'S&P 500 na Portu za 1500€, 100€/mesačne',
                      'Finax Rôstové pre Tomáška za 1000€, 50€/m',
                      'Bitcoin na Fumbi za 500€',
                      'Interactive Brokers VWCE za 3200€, 200€/m'
                    ].map((exampleText) => (
                      <button
                        key={exampleText}
                        onClick={() => setAiPrompt(exampleText)}
                        className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        {exampleText}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File / Image Upload Box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alebo priložte potvrdenie / výpis (obrázok alebo PDF)
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 rounded-2xl p-4 text-center transition bg-slate-50/50 dark:bg-slate-800/30 group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleAiFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-teal-600 transition" />
                      {aiSelectedFile ? (
                        <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                          {aiSelectedFile.name} ({(aiSelectedFile.size / 1024).toFixed(0)} KB)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Kliknite pre výber snímky z Portu, Finax, IBKR, Fumbi...</span>
                      )}
                    </div>
                  </div>
                  {aiFilePreview && (
                    <div className="mt-2 text-center">
                      <img src={aiFilePreview} alt="Snímka" className="max-h-28 rounded-xl mx-auto border border-slate-200 shadow-xs" />
                    </div>
                  )}
                </div>

                {aiError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-300">
                    {aiError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Zrušiť
                  </button>
                  <button
                    onClick={handleAiProcess}
                    disabled={isAiProcessing}
                    className="px-5 py-2 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#183047]" />
                        <span>Spracovávam cez AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Spracovať pomocou Gemini AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Extracted AI Investment Result Preview */
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 text-xs font-bold">
                    <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>AI úspešne rozpoznala investíciu! Skontrolujte a potvrďte údaje:</span>
                  </div>
                  {extractedInvestment.summaryNote && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/30">
                      💡 {extractedInvestment.summaryNote}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Názov investície / fondu</label>
                    <input
                      type="text"
                      value={extractedInvestment.name}
                      onChange={(e) => setExtractedInvestment({ ...extractedInvestment, name: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Platforma</label>
                    <input
                      type="text"
                      value={extractedInvestment.platform}
                      onChange={(e) => setExtractedInvestment({ ...extractedInvestment, platform: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Počiatočný vklad (€)</label>
                    <input
                      type="number"
                      value={extractedInvestment.initialValue}
                      onChange={(e) => setExtractedInvestment({ ...extractedInvestment, initialValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Mesačný vklad (€)</label>
                    <input
                      type="number"
                      value={extractedInvestment.monthlyContribution}
                      onChange={(e) => setExtractedInvestment({ ...extractedInvestment, monthlyContribution: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Typ účtu</label>
                    <select
                      value={extractedInvestment.type}
                      onChange={(e) => setExtractedInvestment({ ...extractedInvestment, type: e.target.value as 'personal' | 'kids' })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="personal">Osobná investícia</option>
                      <option value="kids">Detské sporenie</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Vlastník</label>
                    <input
                      type="text"
                      value={extractedInvestment.owner}
                      onChange={(e) => setExtractedInvestment({ ...extractedInvestment, owner: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setExtractedInvestment(null)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                  >
                    ← Upraviť zadanie
                  </button>
                  <button
                    onClick={handleConfirmAiInvestment}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Potvrdiť a pridať do portfólia</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
