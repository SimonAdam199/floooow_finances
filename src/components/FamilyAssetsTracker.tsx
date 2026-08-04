import React, { useState } from 'react';
import { FamilyAsset, Investment } from '../types';
import { 
  Plus, 
  Trash2, 
  Home, 
  Map, 
  Car, 
  Coins, 
  Briefcase, 
  FileText, 
  Info, 
  TrendingUp, 
  PieChart as PieIcon, 
  DollarSign,
  PlusCircle,
  HelpCircle,
  Sparkles,
  Wand2,
  X,
  Loader2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { UserRole } from '../types';

interface FamilyAssetsTrackerProps {
  assets: FamilyAsset[];
  investments: Investment[];
  onAddAsset: (asset: Omit<FamilyAsset, 'id'>) => void;
  onDeleteAsset: (id: string) => void;
  activeRole?: UserRole;
}

export default function FamilyAssetsTracker({
  assets,
  investments,
  onAddAsset,
  onDeleteAsset,
  activeRole = 'viewer'
}: FamilyAssetsTrackerProps) {
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<FamilyAsset['type']>('real_estate');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  // AI Modal state for Assets
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiProcessAsset = () => {
    if (!aiPrompt.trim()) {
      setAiError('Zadajte prosím popis majetku (napr. Rodinný dom v Nitre za 250 000 €)');
      return;
    }

    setIsAiProcessing(true);
    setAiError(null);

    setTimeout(() => {
      const text = aiPrompt.toLowerCase();
      const numbers = aiPrompt.match(/(\d+[\d\s]*([.,]\d+)?)/g)?.map(n => parseFloat(n.replace(/\s/g, '').replace(',', '.'))) || [];

      let assetType: FamilyAsset['type'] = 'real_estate';
      if (text.includes('pozemok') || text.includes('rola') || text.includes('zahrada') || text.includes('záhrada')) {
        assetType = 'land';
      } else if (text.includes('auto') || text.includes('vozidlo') || text.includes('motorka') || text.includes('skoda') || text.includes('škoda') || text.includes('audi') || text.includes('bmw') || text.includes('volkswagen')) {
        assetType = 'car';
      } else if (text.includes('hotovosť') || text.includes('rezerva') || text.includes('vklad') || text.includes('účet') || text.includes('sporenie')) {
        assetType = 'cash';
      } else if (text.includes('dom') || text.includes('byt') || text.includes('garáž') || text.includes('chata') || text.includes('nehnuteľnosť')) {
        assetType = 'real_estate';
      } else {
        assetType = 'other';
      }

      const val = numbers[0] || 50000;
      const assetName = aiPrompt.split(/\d/)[0].trim() || 'Nový rodinný majetok';

      onAddAsset({
        name: assetName,
        type: assetType,
        value: val,
        description: `Pridané pomocou AI: "${aiPrompt.trim()}"`
      });

      setIsAiProcessing(false);
      setAiPrompt('');
      setShowAiModal(false);
    }, 400);
  };

  // Total values
  const totalHardAssetsVal = assets.reduce((sum, a) => sum + a.value, 0);
  const totalInvestmentsVal = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalOverallAssetsVal = totalHardAssetsVal + totalInvestmentsVal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value) return;

    onAddAsset({
      name: name.trim(),
      type,
      value: Number(value),
      description: description.trim() || undefined
    });

    // Reset form
    setName('');
    setType('real_estate');
    setValue('');
    setDescription('');
    setShowForm(false);
  };

  // Group assets for charting
  const assetsGrouped = [
    {
      name: 'Nehnuteľnosti',
      value: assets.filter(a => a.type === 'real_estate').reduce((sum, a) => sum + a.value, 0),
      color: '#4f46e5' // Indigo
    },
    {
      name: 'Pozemky',
      value: assets.filter(a => a.type === 'land').reduce((sum, a) => sum + a.value, 0),
      color: '#0ea5e9' // Sky
    },
    {
      name: 'Vozidlá',
      value: assets.filter(a => a.type === 'car').reduce((sum, a) => sum + a.value, 0),
      color: '#f59e0b' // Amber
    },
    {
      name: 'Finančná rezerva',
      value: assets.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.value, 0),
      color: '#10b981' // Emerald
    },
    {
      name: 'Investície & Sporenia',
      value: totalInvestmentsVal,
      color: '#8b5cf6' // Violet
    },
    {
      name: 'Iný majetok',
      value: assets.filter(a => a.type === 'other').reduce((sum, a) => sum + a.value, 0),
      color: '#64748b' // Slate
    }
  ].filter(item => item.value > 0);

  const getAssetIcon = (type: FamilyAsset['type']) => {
    switch (type) {
      case 'real_estate':
        return <Home className="w-5 h-5 text-indigo-600" />;
      case 'land':
        return <Map className="w-5 h-5 text-sky-600" />;
      case 'car':
        return <Car className="w-5 h-5 text-amber-600" />;
      case 'cash':
        return <Coins className="w-5 h-5 text-emerald-600" />;
      default:
        return <Briefcase className="w-5 h-5 text-slate-600" />;
    }
  };

  const getAssetTypeName = (type: FamilyAsset['type']) => {
    switch (type) {
      case 'real_estate':
        return 'Nehnuteľnosť';
      case 'land':
        return 'Pozemok';
      case 'car':
        return 'Vozidlo';
      case 'cash':
        return 'Finančná rezerva';
      default:
        return 'Iný majetok';
    }
  };

  return (
    <div className="space-y-6" id="family-assets-section">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total Wealth */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CELKOVÝ RODINNÝ MAJETOK</p>
            <p className="text-3xl font-extrabold tracking-tight">
              {totalOverallAssetsVal.toLocaleString('sk-SK')} €
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-400">
            <span>Súčet hodnôt rodinného vlastníctva</span>
            <span className="font-bold text-emerald-400">100%</span>
          </div>
        </div>

        {/* Card 2: Hard assets (Nehnuteľnosti, autá...) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 flex flex-col justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PEVNÝ MAJETOK & REZERVA</p>
            <p className="text-3xl font-extrabold text-slate-900">
              {totalHardAssetsVal.toLocaleString('sk-SK')} €
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Domy, pozemky, vozidlá, hotovosť</span>
            <span className="font-bold text-indigo-600">
              {((totalHardAssetsVal / (totalOverallAssetsVal || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 3: Financial assets (Investície) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 flex flex-col justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">FINANČNÉ INVESTÍCIE & ETF</p>
            <p className="text-3xl font-extrabold text-slate-900">
              {totalInvestmentsVal.toLocaleString('sk-SK')} €
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Globálne fondy, detské sporenia</span>
            <span className="font-bold text-indigo-600">
              {((totalInvestmentsVal / (totalOverallAssetsVal || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

      </div>

      {/* Main Content Layout - Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Asset Distribution Charts (3/5) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Rozdelenie rodinného majetku</h3>
              <p className="text-xs text-slate-500 mt-0.5">Percentuálne zastúpenie jednotlivých zložiek majetku.</p>
            </div>
            <PieIcon className="w-5 h-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Pie Chart */}
            <div className="md:col-span-6 h-[220px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetsGrouped}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {assetsGrouped.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toLocaleString('sk-SK')} €`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spolu</span>
                <span className="text-sm font-black text-slate-800">
                  {Math.round(totalOverallAssetsVal / 1000)}k €
                </span>
              </div>
            </div>

            {/* Custom Legend details */}
            <div className="md:col-span-6 space-y-3.5">
              {assetsGrouped.map((item, index) => {
                const percentage = ((item.value / (totalOverallAssetsVal || 1)) * 100);
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-950 block">{item.value.toLocaleString('sk-SK')} €</span>
                      <span className="text-[10px] text-slate-400 font-bold block">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asset structure advice */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 flex gap-3 text-xs text-slate-600">
            <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800">Štruktúra celkového majetku</p>
              <p className="leading-relaxed">
                Váš pevný majetok (nehnutelnosti, pozemky) tvorí majoritnú časť vášho portfólia (<strong>{((totalHardAssetsVal / (totalOverallAssetsVal || 1)) * 100).toFixed(0)}%</strong>). Finančné investície a likvidná rezerva (<strong>{((totalInvestmentsVal / (totalOverallAssetsVal || 1)) * 100).toFixed(0)}%</strong>) zabezpečujú dôležitú likviditu a dlhodobé zhodnotenie úspor.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Hard Assets List & Management (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Vlastnený pevný majetok</h3>
                <p className="text-xs text-slate-500 mt-0.5">Zoznam nehnuteľností, áut a finančných rezerv.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAiError(null);
                    setShowAiModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-xs hover:shadow transition-all cursor-pointer border border-white/50"
                  title="Pridať nový majetok pomocou AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#183047] animate-pulse" />
                  <span>Pridať cez AI ✨</span>
                </button>

                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ručne pridať
                </button>
              </div>
            </div>

            {/* Asset Addition Form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 animate-fade-in">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Nový rodinný majetok</h4>
                
                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Názov majetku</label>
                    <input
                      type="text"
                      required
                      placeholder="napr. Rodinný dom"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Typ majetku</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as FamilyAsset['type'])}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-indigo-600 focus:bg-white"
                      >
                        <option value="real_estate">Nehnuteľnosť</option>
                        <option value="land">Pozemok</option>
                        <option value="car">Vozidlo</option>
                        <option value="cash">Finančná rezerva</option>
                        <option value="other">Iný majetok</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Odhadovaná hodnota (€)</label>
                      <input
                        type="number"
                        required
                        placeholder="napr. 220000"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-indigo-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Poznámka / Detaily</label>
                    <textarea
                      placeholder="napr. zakúpený v r. 2021, rekonštrukcia v r. 2024"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Pridať majetok
                  </button>
                </div>
              </form>
            )}

            {/* List of assets */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {assets.map((asset) => (
                <div 
                  key={asset.id} 
                  className="flex items-center justify-between p-3 bg-slate-50/55 hover:bg-slate-50 rounded-xl border border-slate-100 transition group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-3xs">
                      {getAssetIcon(asset.type)}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block leading-tight">{asset.name}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">{getAssetTypeName(asset.type)}</span>
                      {asset.description && (
                        <p className="text-[10px] text-slate-500 mt-1 italic leading-snug">{asset.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-black text-slate-900">{asset.value.toLocaleString('sk-SK')} €</span>
                    <button
                      onClick={() => {
                        if (confirm(`Naozaj chcete vymazať majetok "${asset.name}"?`)) {
                          onDeleteAsset(asset.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Vymazať majetok"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick info list of investments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Prepojené investície</h4>
            <div className="space-y-2">
              {investments.map(inv => (
                <div key={inv.id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <span className="text-slate-600 font-medium truncate max-w-[150px]" title={inv.name}>{inv.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{inv.currentValue.toLocaleString('sk-SK')} €</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* AI Family Asset Creator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in" id="ai-asset-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5 relative my-8 text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => {
                setShowAiModal(false);
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
                <h3 className="text-lg font-black text-slate-900 dark:text-white">AI Asistent pre rodinný majetok</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Opíšte nehnuteľnosť, pozemok, vozidlo alebo hotovosť textom.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Opíšte majetok
                </label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="napr. Rodinný dom v Nitre v hodnote 280 000 €..."
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
                    'Rodinný dom v Poprade za 230 000 €',
                    'Pozemok pri Trnave 50 000 €',
                    'Vozidlo Škoda Kodiaq za 32 000 €',
                    'Nudzová rezerva na sporiacom účte 15 000 €'
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
                  onClick={handleAiProcessAsset}
                  disabled={isAiProcessing}
                  className="px-5 py-2 bg-gradient-to-r from-[#72C6B5] to-[#3B818C] hover:from-[#81D2C2] hover:to-[#4695A2] text-[#183047] font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAiProcessing ? (
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
