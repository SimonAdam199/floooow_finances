import React, { useState } from 'react';
import { Transaction, Investment, Mortgage, Liability } from '../types';
import { generateFinancialReport } from '../services/apiClient';
import { Sparkles, Loader2, ArrowUpRight, TrendingUp, DollarSign, Calendar, Download, Printer, PieChart, ShieldCheck, CheckCircle } from 'lucide-react';

interface AnnualReportsProps {
  transactions: Transaction[];
  investments: Investment[];
  mortgages: Mortgage[];
  liabilities: Liability[];
  categories: string[];
}

export default function AnnualReports({
  transactions,
  investments,
  mortgages,
  liabilities,
  categories
}: AnnualReportsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Load annual settings from localStorage
  const annualSettings = (() => {
    const saved = localStorage.getItem('family_budget_annual_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      targetSavingsRate: 20,
      annualInflationRate: 2.5,
      incomeGoal: 30000
    };
  })();

  // Calculate annual statistics for 2026 (based on our demo data)
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Investment stats
  const totalInvestmentsVal = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalInvestmentsMonthly = investments.reduce((sum, i) => sum + i.monthlyContribution, 0);

  // Debts stats
  const totalDebt = mortgages.reduce((sum, m) => sum + m.remainingAmount, 0) +
                    liabilities.reduce((sum, l) => sum + l.remainingAmount, 0);

  // Let's model monthly income and expenses to draw a custom interactive chart
  // Since we only have mostly June transactions, let's spread representative data over 12 months for 2026
  const monthlyData = [
    { month: 'Jan', income: 2450, expense: 1610 },
    { month: 'Feb', income: 2450, expense: 1490 },
    { month: 'Mar', income: 2450, expense: 1820 },
    { month: 'Apr', income: 2450, expense: 1540 },
    { month: 'Máj', income: 2600, expense: 1680 },
    { month: 'Jún', income: totalIncome || 2450, expense: totalExpense || 1720 },
    { month: 'Júl', income: 2500, expense: 1550 },
    { month: 'Aug', income: 2500, expense: 1950 },
    { month: 'Sep', income: 2500, expense: 1620 },
    { month: 'Okt', income: 2700, expense: 1580 },
    { month: 'Nov', income: 2500, expense: 1650 },
    { month: 'Dec', income: 3200, expense: 2200 }
  ];

  const maxMonthlyVal = Math.max(...monthlyData.flatMap(d => [d.income, d.expense]));

  // Calculate expenses by category for breakdown
  const categorySummary = categories.map(cat => {
    const total = transactions
      .filter(t => t.category === cat && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { name: cat, value: total };
  }).filter(c => c.value > 0);

  const totalCategorizedExpense = categorySummary.reduce((sum, c) => sum + c.value, 0);

  // Generate Report via Server-Side Gemini endpoint
  const handleGenerateAiReport = async () => {
    setIsGenerating(true);
    setReportError(null);
    try {
      const data = await generateFinancialReport({
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        totalInvestmentsVal,
        totalInvestmentsMonthly,
        totalDebt,
        numberOfInvestments: investments.length,
        numberOfMortgages: mortgages.length,
        numberOfLiabilities: liabilities.length
      });

      setAiReport(data.report);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || 'Chyba spojenia alebo nastavenia API.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Printing/Saving Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="annual-reports-section">
      
      {/* Upper stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Ročný príjem (Odhad 2026)</span>
          <span className="text-2xl font-bold text-slate-800">
            {monthlyData.reduce((sum, d) => sum + d.income, 0).toLocaleString('sk-SK')} €
          </span>
          <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-1">
            <span>Cieľ: <strong>{annualSettings.incomeGoal.toLocaleString('sk-SK')} €</strong></span>
            {monthlyData.reduce((sum, d) => sum + d.income, 0) >= annualSettings.incomeGoal ? (
              <span className="text-emerald-600 font-bold">✓ Splnený</span>
            ) : (
              <span className="text-slate-400 font-medium">({(monthlyData.reduce((sum, d) => sum + d.income, 0) / annualSettings.incomeGoal * 100).toFixed(0)}%)</span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Ročné výdavky (Odhad 2026)</span>
          <span className="text-2xl font-bold text-slate-800">
            {monthlyData.reduce((sum, d) => sum + d.expense, 0).toLocaleString('sk-SK')} €
          </span>
          <div className="mt-1 text-xs text-slate-500">
            Priemer: <span className="font-semibold text-slate-700">~{Math.round(monthlyData.reduce((sum, d) => sum + d.expense, 0) / 12).toLocaleString('sk-SK')} € / mes</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Čistá ročná úspora</span>
          <span className="text-2xl font-bold text-emerald-600">
            {(monthlyData.reduce((sum, d) => sum + d.income, 0) - monthlyData.reduce((sum, d) => sum + d.expense, 0)).toLocaleString('sk-SK')} €
          </span>
          <div className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1.5 flex-wrap">
            <span>Miera úspor: {savingsRate.toFixed(1)}%</span>
            <span className="text-slate-400 font-normal">(Cieľ: {annualSettings.targetSavingsRate}%)</span>
            {savingsRate >= annualSettings.targetSavingsRate && <span className="text-emerald-600 font-bold">✓</span>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs bg-linear-to-br from-indigo-50/60 to-indigo-100/30 border-indigo-100">
          <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider block mb-1">Investičný pomer</span>
          <span className="text-2xl font-bold text-indigo-950">
            {((totalInvestmentsMonthly * 12) / (monthlyData.reduce((sum, d) => sum + d.income, 0)) * 100).toFixed(1)}%
          </span>
          <div className="mt-1 text-xs text-indigo-700 font-medium">
            Celoročne do aktív: { (totalInvestmentsMonthly * 12).toLocaleString('sk-SK') } €
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Income vs Expenses Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Vývoj príjmov a výdavkov</h3>
              <p className="text-slate-400 text-xs mt-0.5">Porovnanie mesačnej bilancie za celý kalendárny rok 2026.</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Príjmy
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Výdavky
              </span>
            </div>
          </div>

          {/* Custom SVG Grouped Bar Chart */}
          <div className="h-56 w-full relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="80" x2="600" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="130" x2="600" y2="130" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="170" x2="600" y2="170" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Draw bars */}
              {monthlyData.map((d, idx) => {
                const groupWidth = 35;
                const groupGap = 15;
                const startX = idx * (groupWidth + groupGap) + 15;

                // Scale values
                const incomeH = (d.income / maxMonthlyVal) * 140;
                const expenseH = (d.expense / maxMonthlyVal) * 140;

                return (
                  <g key={d.month} className="group cursor-pointer">
                    {/* Income Bar (Indigo) */}
                    <rect
                      x={startX}
                      y={170 - incomeH}
                      width="12"
                      height={incomeH}
                      fill="#6366f1"
                      rx="3.5"
                      className="transition-all hover:fill-indigo-700"
                    />
                    {/* Expense Bar (Slate) */}
                    <rect
                      x={startX + 14}
                      y={170 - expenseH}
                      width="12"
                      height={expenseH}
                      fill="#cbd5e1"
                      rx="3.5"
                      className="transition-all hover:fill-slate-400"
                    />
                    
                    {/* Tooltip triggers / Hover text */}
                    <text
                      x={startX + 10}
                      y={170 - Math.max(incomeH, expenseH) - 8}
                      textAnchor="middle"
                      className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      +{d.income} / -{d.expense}€
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Labels under chart */}
            <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {monthlyData.map(d => (
                <span key={d.month} className="w-12 text-center">{d.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Expense Breakdown Category share */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4">Štruktúra Výdavkov</h3>
            
            {totalCategorizedExpense === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">Nahráte nejaký výpis pre kategórie.</p>
            ) : (
              <div className="space-y-4">
                {categorySummary.map((c, idx) => {
                  const percent = (c.value / totalCategorizedExpense) * 100;
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700">{c.name}</span>
                        <span className="text-slate-500 font-medium">
                          {c.value.toLocaleString('sk-SK', { maximumFractionDigits: 1 })} € ({percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            c.name === 'Potraviny & Reštaurácie' ? 'bg-amber-400' :
                            c.name === 'Bývanie & Energie' ? 'bg-blue-400' :
                            c.name === 'Doprava & Auto' ? 'bg-purple-400' :
                            c.name === 'Zdravie & Lekáreň' ? 'bg-emerald-400' :
                            c.name === 'Zábava & Voľný čas' ? 'bg-rose-400' :
                            c.name === 'Nákupy & Oblečenie' ? 'bg-pink-400' :
                            c.name === 'Investície & Sporenie' ? 'bg-teal-400' :
                            c.name === 'Hypotéka & Úvery' ? 'bg-orange-400' :
                            'bg-slate-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-xs">
            <span className="text-slate-400">Klasifikované výdavky:</span>
            <strong className="text-slate-800">{totalCategorizedExpense.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} €</strong>
          </div>
        </div>
      </div>

      {/* AI Financial Advisory Report Block */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Umelá inteligencia – Finančný poradca</h3>
              <p className="text-slate-400 text-xs">
                Nechajte si zostaviť personalizovanú analýzu, zhodnotenie Vášho investovania, sporenia pre deti a stavu dlhu.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerateAiReport}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Spracovávam analýzu...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Vygenerovať výročnú AI analýzu
                </>
              )}
            </button>
            
            {aiReport && (
              <button
                onClick={handlePrint}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer"
                title="Tlačiť alebo uložiť PDF"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* AI report body layout */}
        {isGenerating && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="font-semibold text-slate-200 text-sm">Gemini prechádza Vaše výdavky, detské sporenia a hypotéku...</p>
            <p className="text-slate-400 text-xs">Pripravujeme detailnú, slovensky písanú správu o zdraví Vašich osobných financií.</p>
          </div>
        )}

        {reportError && (
          <div className="p-4 bg-rose-950/50 border border-rose-900 text-rose-300 rounded-xl text-xs leading-relaxed">
            <p className="font-semibold mb-1">Nepodarilo sa vytvoriť AI analýzu:</p>
            <p>{reportError}</p>
            <p className="mt-2 text-rose-400/80">Skontrolujte, či je spustený server a či je kľúč GEMINI_API_KEY úspešne nastavený v AI Studio secrets.</p>
          </div>
        )}

        {aiReport && !isGenerating && (
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 text-slate-300 text-xs space-y-4 font-normal leading-relaxed overflow-x-auto print:bg-white print:text-slate-900">
            {/* Custom markdown interpreter / formatted output blocks */}
            <div className="prose prose-invert max-w-none text-slate-300">
              {aiReport.split('\n\n').map((para, pIdx) => {
                if (para.startsWith('### ')) {
                  return <h4 key={pIdx} className="text-sm font-bold text-indigo-400 uppercase tracking-wider mt-4 mb-2">{para.replace('### ', '')}</h4>;
                }
                if (para.startsWith('## ')) {
                  return <h3 key={pIdx} className="text-base font-bold text-white mt-5 mb-2">{para.replace('## ', '')}</h3>;
                }
                if (para.startsWith('* ') || para.startsWith('- ')) {
                  return (
                    <ul key={pIdx} className="list-disc pl-4 space-y-1 my-2">
                      {para.split('\n').map((item, iIdx) => (
                        <li key={iIdx}>{item.replace(/^\* |^- /, '')}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={pIdx} className="mb-3">{para}</p>;
              })}
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-indigo-500/15 flex items-start gap-3 mt-6">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-100 text-[11px] uppercase tracking-wider">Garancia bezpečnosti a diskrétnosti</span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Vaše finančné dáta sú vyhodnocované priamo cez dedikované serverové rozhranie. Žiadne osobné ani bankové informácie nie sú uchovávané ani zneužité na iné účely.
                </p>
              </div>
            </div>
          </div>
        )}

        {!aiReport && !isGenerating && (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            Kliknite na tlačidlo vyššie pre vytvorenie komplexnej finančnej analýzy od umelej inteligencie.
          </div>
        )}
      </div>
    </div>
  );
}
