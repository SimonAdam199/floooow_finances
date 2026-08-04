import React, { useState, useEffect } from 'react';
import { Transaction, BudgetLimit, Investment, Mortgage, Liability, DEFAULT_CATEGORIES, FamilyAsset, CATEGORY_MAP, FamilyMember, InsuranceContract } from './types';
import {
  initialTransactions,
  initialBudgets,
  initialInvestments,
  initialMortgages,
  initialLiabilities,
  initialFamilyAssets,
  initialInsuranceContracts
} from './data/demoData';

import TransactionList from './components/TransactionList';
import BudgetLimitManager from './components/BudgetLimitManager';
import InvestmentTracker from './components/InvestmentTracker';
import MortgageLiabilitiesTracker from './components/MortgageLiabilitiesTracker';
import AnnualReports from './components/AnnualReports';
import FamilyAssetsTracker from './components/FamilyAssetsTracker';
import SettingsManager from './components/SettingsManager';
import InsuranceTracker from './components/InsuranceTracker';
import SettleUpTracker from './components/SettleUpTracker';
import CustomAlert, { AlertModalConfig } from './components/CustomAlert';
import { useLanguage } from './context/LanguageContext';
import { LANGUAGES, Language } from './i18n/translations';

import { initAuth, googleSignIn, logout } from './lib/googleAuth';
import { User } from 'firebase/auth';
import { checkDbHealth } from './services/apiClient';

import {
  TrendingUp,
  TrendingDown,
  Gift,
  Home,
  CreditCard,
  Layers,
  Calendar,
  Sparkles,
  DollarSign,
  PieChart,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  FileText,
  Briefcase,
  PiggyBank,
  ArrowUpRight,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Loader2,
  Settings,
  Shield,
  Users,
  Copy,
  Check,
  Globe
} from 'lucide-react';


export const getRoleDetails = (role: string, t?: (key: any) => string) => {
  switch (role) {
    case 'admin':
      return { label: t ? t('roleAdmin') : 'Správca', style: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60' };
    case 'editor':
      return { label: t ? t('roleEditor') : 'Zápis & Nahrávanie', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60' };
    default:
      return { label: t ? t('roleViewer') : 'Len čítanie', style: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60' };
  }
};

export default function App() {
  const { language, setLanguage, t, langInfo } = useLanguage();

  // Primary application state with local persistence-like reactivity
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('family_budget_transactions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialTransactions;
  });

  // Persist transactions to localStorage
  useEffect(() => {
    localStorage.setItem('family_budget_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const [budgets, setBudgets] = useState<BudgetLimit[]>(initialBudgets);
  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem('family_budget_investments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialInvestments;
  });
  const [mortgages, setMortgages] = useState<Mortgage[]>(initialMortgages);
  const [liabilities, setLiabilities] = useState<Liability[]>(initialLiabilities);
  const [assets, setAssets] = useState<FamilyAsset[]>(initialFamilyAssets);
  const [insuranceContracts, setInsuranceContracts] = useState<InsuranceContract[]>(() => {
    const saved = localStorage.getItem('family_budget_insurance_contracts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialInsuranceContracts;
  });

  // Advanced settings state
  const [categoryMap, setCategoryMap] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('family_budget_category_map');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return CATEGORY_MAP;
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('family_budget_family_members_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
          return parsed;
        }
      } catch (e) {}
    }
    // Backward compatibility conversion
    const legacy = localStorage.getItem('family_budget_family_members');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          return parsed.map((m: any) => {
            if (typeof m === 'string') {
              return { name: m, role: m === 'Adam' ? 'admin' : 'editor' };
            }
            return m;
          });
        }
      } catch (e) {}
    }
    return [
      { name: 'Adam', role: 'admin', email: 'adam@floooow.sk', status: 'active' },
      { name: 'Veri', role: 'editor', email: 'veri@floooow.sk', status: 'active' },
      { name: 'Tomáško', role: 'viewer', email: 'tomasko@floooow.sk', status: 'active' },
      { name: 'Elinka', role: 'viewer', email: 'elinka@floooow.sk', status: 'active' }
    ];
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('family_budget_dark_mode') === 'true';
  });

  const [annualSettings, setAnnualSettings] = useState(() => {
    const saved = localStorage.getItem('family_budget_annual_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      targetSavingsRate: 20,
      annualInflationRate: 2.5,
      incomeGoal: 30000
    };
  });

  // Derived categories list from categoryMap keys
  const categories = Object.keys(categoryMap);

  const handleSetCategoryMap = (newMap: Record<string, string[]>) => {
    setCategoryMap(newMap);
    localStorage.setItem('family_budget_category_map', JSON.stringify(newMap));
    
    // Auto sync budgets with any changes to categories
    const newCats = Object.keys(newMap);
    setBudgets(prevBudgets => {
      const existingMap = new Map(prevBudgets.map(b => [b.category, b.limit]));
      return newCats.map(cat => ({
        category: cat,
        limit: existingMap.get(cat) ?? 300
      }));
    });
  };

  const handleSetFamilyMembers = (newMembers: FamilyMember[]) => {
    setFamilyMembers(newMembers);
    localStorage.setItem('family_budget_family_members_v2', JSON.stringify(newMembers));
    // Fallback for legacy
    localStorage.setItem('family_budget_family_members', JSON.stringify(newMembers.map(m => m.name)));
  };

  const handleSetDarkMode = (val: boolean) => {
    setDarkMode(val);
    localStorage.setItem('family_budget_dark_mode', String(val));
  };

  const handleSetAnnualSettings = (val: typeof annualSettings) => {
    setAnnualSettings(val);
    localStorage.setItem('family_budget_annual_settings', JSON.stringify(val));
  };

  // Custom Alert / Confirm Modal State
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => setAlertConfig(null)
    });
  };

  const showConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    cancelLabel = 'Zrušiť', 
    confirmLabel = 'Potvrdiť', 
    type: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      type,
      cancelLabel,
      confirmLabel,
      onConfirm: () => {
        onConfirm();
        setAlertConfig(null);
      },
      onCancel: () => setAlertConfig(null)
    });
  };

  const handleResetAllData = () => {
    showConfirm(
      'Vynulovanie všetkých dát',
      'Naozaj chcete vynulovať všetky dáta a začať s čistým hárkom? Všetky transakcie, investície, poistenia a Settle Up akcie budú vymazané.',
      () => {
        localStorage.removeItem('family_budget_transactions');
        localStorage.removeItem('family_budget_investments');
        localStorage.removeItem('family_budget_insurance_contracts');
        localStorage.removeItem('family_budget_settleup');
        localStorage.removeItem('family_budget_annual_settings');
        
        setTransactions([]);
        setInvestments([]);
        setInsuranceContracts([]);
        setMortgages([]);
        setLiabilities([]);
        setAssets([]);
        
        window.location.reload();
      },
      'Zrušiť',
      'Vynulovať dáta',
      'danger'
    );
  };

  // Google User Auth state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authErrorModal, setAuthErrorModal] = useState<{ code: string; message: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // User name state with local storage persistence
  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem('family_budget_username');
    if (saved) return saved;
    return 'Adam'; // default based on varga.adamko
  });
  const activeRole = familyMembers.find(m => m.name.toLowerCase() === userName.toLowerCase())?.role || 'viewer';
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  // --- Selected Month State for overview dashboard ---
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // default to the month of the latest transaction to show demo data, or the current month if empty
    if (initialTransactions && initialTransactions.length > 0) {
      const sortedDates = [...initialTransactions].map(t => t.date).sort((a, b) => b.localeCompare(a));
      if (sortedDates[0]) {
        return sortedDates[0].slice(0, 7);
      }
    }
    return new Date().toISOString().slice(0, 7);
  });

  const handleNavigateMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + direction, 15);
    const newMonthStr = d.toISOString().slice(0, 7);
    setSelectedMonth(newMonthStr);
  };

  // Get all unique months available in transactions to populate dropdown
  const uniqueMonths: string[] = Array.from(new Set(
    transactions.map(t => t.date.slice(0, 7))
  ));
  
  // Guarantee current month is in there
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  if (!uniqueMonths.includes(currentMonthStr)) {
    uniqueMonths.push(currentMonthStr);
  }
  uniqueMonths.sort((a, b) => b.localeCompare(a));

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthsSlovak = {
      '01': 'Január',
      '02': 'Február',
      '03': 'Marec',
      '04': 'Apríl',
      '05': 'Máj',
      '06': 'Jún',
      '07': 'Júl',
      '08': 'August',
      '09': 'September',
      '10': 'Október',
      '11': 'November',
      '12': 'December'
    };
    return `${monthsSlovak[month as keyof typeof monthsSlovak] || month} ${year}`;
  };

  // Sync username with Google profile name if signed in
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setGoogleUser(currentUser);
        setGoogleToken(token);
        setAuthChecking(false);
        if (currentUser.displayName) {
          // Get the first name or full name
          const firstWord = currentUser.displayName.split(' ')[0];
          setUserName(firstWord);
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setAuthChecking(false);
        const saved = localStorage.getItem('family_budget_username');
        setUserName(saved || 'Adam');
      }
    );
    return () => unsubscribe();
  }, []);

  // Theme observer
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSetCategories = (newCats: string[]) => {
    const finalMap: Record<string, string[]> = {};
    newCats.forEach(cat => {
      finalMap[cat] = categoryMap[cat] || [];
    });
    handleSetCategoryMap(finalMap);
  };

  // Layout navigation state
  const [activeTab, setActiveTab] = useState<'prehlad' | 'majetok' | 'investicie' | 'deti' | 'rozpocty' | 'hypoteka' | 'poistenie' | 'spravy' | 'nastavenia' | 'settleup'>('prehlad');
  
  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Trend chart detail state
  const [chartMode, setChartMode] = useState<'cumulative' | 'individual'>('cumulative');

  // --- Handlers for mutating data ---
  const handleAddTransaction = (newT: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newT,
      id: `manual-${Date.now()}`
    };
    setTransactions(prev => [transaction, ...prev]);
  };

  const handleAddMultipleTransactions = (newTs: Omit<Transaction, 'id'>[]) => {
    const processed = newTs.map((t, index) => ({
      ...t,
      id: `ai-parsed-${Date.now()}-${index}`
    }));
    setTransactions(prev => [...processed, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTransaction = (updatedT: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));
  };

  const handleAddAsset = (newA: Omit<FamilyAsset, 'id'>) => {
    const asset: FamilyAsset = {
      ...newA,
      id: `asset-${Date.now()}`
    };
    setAssets(prev => [...prev, asset]);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleAddInsuranceContract = (newC: Omit<InsuranceContract, 'id'>) => {
    const contract: InsuranceContract = {
      ...newC,
      id: `ins-${Date.now()}`
    };
    setInsuranceContracts(prev => {
      const updated = [...prev, contract];
      localStorage.setItem('family_budget_insurance_contracts', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteInsuranceContract = (id: string) => {
    setInsuranceContracts(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('family_budget_insurance_contracts', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateLimit = (category: string, newLimit: number) => {
    setBudgets(prev => prev.map(b => b.category === category ? { ...b, limit: newLimit } : b));
  };

  const handleAddInvestment = (newI: Omit<Investment, 'id' | 'history'>) => {
    const inv: Investment = {
      ...newI,
      id: `inv-${Date.now()}`,
      history: [{ date: new Date().toISOString().slice(0, 7), value: newI.initialValue }]
    };
    setInvestments(prev => {
      const updated = [...prev, inv];
      localStorage.setItem('family_budget_investments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateInvestmentValue = (id: string, newValue: number) => {
    setInvestments(prev => {
      const updated = prev.map(inv => {
        if (inv.id !== id) return inv;
        const dateStr = new Date().toISOString().slice(0, 7);
        // Append or replace history point
        const lastHist = inv.history[inv.history.length - 1];
        let newHistory = [...inv.history];
        if (lastHist && lastHist.date === dateStr) {
          newHistory[newHistory.length - 1] = { date: dateStr, value: newValue };
        } else {
          newHistory.push({ date: dateStr, value: newValue });
        }
        return {
          ...inv,
          currentValue: newValue,
          history: newHistory
        };
      });
      localStorage.setItem('family_budget_investments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteInvestment = (id: string) => {
    setInvestments(prev => {
      const updated = prev.filter(inv => inv.id !== id);
      localStorage.setItem('family_budget_investments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddMortgage = (newM: Omit<Mortgage, 'id' | 'extraPayments'>) => {
    const mort: Mortgage = {
      ...newM,
      id: `mort-${Date.now()}`,
      extraPayments: []
    };
    setMortgages(prev => [...prev, mort]);
  };

  const handleAddLiability = (newL: Omit<Liability, 'id'>) => {
    const lia: Liability = {
      ...newL,
      id: `lia-${Date.now()}`
    };
    setLiabilities(prev => [...prev, lia]);
  };

  const handleAddExtraPayment = (mortgageId: string, amount: number, date: string) => {
    setMortgages(prev => prev.map(m => {
      if (m.id !== mortgageId) return m;
      return {
        ...m,
        remainingAmount: Math.max(0, m.remainingAmount - amount),
        extraPayments: [
          ...m.extraPayments,
          { id: `ep-${Date.now()}`, date, amount }
        ]
      };
    }));
  };

  const handleDeleteExtraPayment = (mortgageId: string, extraPaymentId: string) => {
    setMortgages(prev => prev.map(m => {
      if (m.id !== mortgageId) return m;
      const targetEp = m.extraPayments.find(ep => ep.id === extraPaymentId);
      if (!targetEp) return m;
      return {
        ...m,
        remainingAmount: m.remainingAmount + targetEp.amount,
        extraPayments: m.extraPayments.filter(ep => ep.id !== extraPaymentId)
      };
    }));
  };

  // --- Summary & Dashboard Calculations ---
  const totalInvestmentsVal = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const kidsInvestmentsVal = investments.filter(i => i.type === 'kids').reduce((sum, i) => sum + i.currentValue, 0);
  const personalInvestmentsVal = investments.filter(i => i.type === 'personal').reduce((sum, i) => sum + i.currentValue, 0);

  const totalDebt = mortgages.reduce((sum, m) => sum + m.remainingAmount, 0) +
                    liabilities.reduce((sum, l) => sum + l.remainingAmount, 0);

  // Net Worth (Čistá hodnota majetku) = Total Hard Assets + Total Investments - Total Debt
  const totalHardAssetsVal = assets.reduce((sum, a) => sum + a.value, 0);
  const netWorth = totalHardAssetsVal + totalInvestmentsVal - totalDebt;

  // Monthly budget performance
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const actualSpendThisMonth = transactions
    .filter(t => t.date.startsWith(selectedMonth) && t.amount < 0 && t.category !== 'Príjmy')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const budgetUsagePercent = totalBudgetLimit > 0 ? (actualSpendThisMonth / totalBudgetLimit) * 100 : 0;

  // Insurance policies expiring in the next 60 days
  const expiringInsuranceContracts = insuranceContracts.filter((c) => {
    if (!c.endDate) return false;
    const now = new Date();
    const expiry = new Date(c.endDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Let's count anniversaries within 60 days
    return diffDays >= 0 && diffDays <= 60;
  });

  // Render main section based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'prehlad':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Month Selector Panel */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 p-4 md:p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Mesačný prehľad za <span className="text-indigo-600 dark:text-indigo-400">{formatMonth(selectedMonth)}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Zobrazenie finančnej situácie, limitov a transakcií pre zvolený mesiac.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigateMonth(-1)}
                  className="p-2 border border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-xs"
                  title="Predchádzajúci mesiac"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-white/60 dark:border-white/10 rounded-2xl text-xs font-bold bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-indigo-600 shadow-xs"
                >
                  {uniqueMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonth(m)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleNavigateMonth(1)}
                  className="p-2 border border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-xs"
                  title="Nasledujúci mesiac"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Top Stats Row - Liquid Glass Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Stat 1: Net Worth */}
              <div 
                onClick={() => setActiveTab('majetok')}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] flex flex-col justify-between cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 group"
                title="Zobraziť detail celkového majetku"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Čistá hodnota majetku</p>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{netWorth.toLocaleString('sk-SK', { maximumFractionDigits: 0 })} €</p>
                </div>
                <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-t border-slate-100 dark:border-white/5 pt-3">
                  <span>Aktíva: <strong className="text-indigo-600 dark:text-indigo-400">{(totalHardAssetsVal + totalInvestmentsVal).toLocaleString('sk-SK')} €</strong></span>
                  <span>Dlhy: <strong className="text-rose-500">{totalDebt.toLocaleString('sk-SK')} €</strong></span>
                </div>
              </div>

              {/* Stat 2: Kids Savings */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Detské investície & Sporenia</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{kidsInvestmentsVal.toLocaleString('sk-SK')} €</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {investments.filter(i => i.type === 'kids').map(ki => (
                    <span key={ki.id} className="bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-white/10 rounded-full px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      {ki.owner}: <strong>{ki.currentValue} €</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Stat 3: Budget Spending Progress */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mesačné výdavky / Rozpočet</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {actualSpendThisMonth.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} € 
                    <span className="text-lg text-slate-400 font-normal"> / {totalBudgetLimit.toLocaleString('sk-SK')} €</span>
                  </p>
                </div>
                
                {/* Visual mini-bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mb-1.5">
                    <span>Čerpanie rozpočtu</span>
                    <span>{budgetUsagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/20">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        budgetUsagePercent > 100 ? 'bg-rose-500' :
                        budgetUsagePercent > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                      }`}
                      style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Insurance Expiry Alerts Banner on Dashboard */}
            {expiringInsuranceContracts.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/20 backdrop-blur-xl border border-amber-500/30 dark:border-amber-900/50 rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(245,158,11,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0 backdrop-blur-md">
                    <Shield className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-900 dark:text-amber-300">Upozornenie na končiace poistenia ({expiringInsuranceContracts.length})</h3>
                    <p className="text-xs text-amber-800 dark:text-slate-300 mt-1 leading-relaxed">
                      Nasledujúce poistenia majú blížiacu sa splatnosť alebo výročie zmluvy do 60 dní. Skontrolujte podmienky a zabezpečte včasné krytie:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {expiringInsuranceContracts.map((c) => {
                        const daysLeft = Math.ceil((new Date(c.endDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <span 
                            key={c.id} 
                            onClick={() => setActiveTab('poistenie')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 dark:bg-slate-800/80 backdrop-blur-md hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-300/50 dark:border-amber-900/50 text-[11px] font-bold text-amber-900 dark:text-amber-300 rounded-xl cursor-pointer transition shadow-xs"
                            title="Prejsť na detail poistenia"
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {c.title} (výročie o {daysLeft} {daysLeft === 1 ? 'deň' : (daysLeft < 5 ? 'dni' : 'dní')} - {new Date(c.endDate!).toLocaleDateString('sk-SK')})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('poistenie')}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-2xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap self-stretch md:self-auto justify-center border border-white/20"
                >
                  Správa poistení
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Middle Section: Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column: Spending Categories (2/5 size) */}
              <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] flex flex-col justify-between min-h-[340px]">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Kategórie výdavkov tento mesiac</h3>
                  
                  {/* Category Progress Bars */}
                  <div className="space-y-4">
                    {categories.slice(0, 5).map(cat => {
                      const limit = budgets.find(b => b.category === cat)?.limit || 150;
                      const spend = transactions
                        .filter(t => t.date.startsWith(selectedMonth) && t.category === cat && t.amount < 0)
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                      const pct = Math.min((spend / limit) * 100, 100);

                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <span className="truncate max-w-[150px]">{cat}</span>
                            <span>{spend.toLocaleString('sk-SK', { maximumFractionDigits: 0 })}€ / {limit}€</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-white/10">
                            <div 
                              className={`h-full rounded-full ${
                                pct > 90 ? 'bg-rose-500' :
                                pct > 70 ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                              }`} 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <button
                  onClick={() => setActiveTab('rozpocty')}
                  className="mt-6 w-full text-center py-2.5 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-white/50 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-xs backdrop-blur-md"
                >
                  Spravovať podrobné rozpočty
                </button>
              </div>

              {/* Right Column: Historical Investment Trend (3/5 size) */}
              <div className="lg:col-span-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] flex flex-col justify-between min-h-[340px]">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Vývoj investícií (12 mesiacov)</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Celková hodnota majetku v podielových fondoch a ETF.</p>
                    </div>
                    <select
                      value={chartMode}
                      onChange={(e) => setChartMode(e.target.value as 'cumulative' | 'individual')}
                      className="text-xs font-bold border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl px-3 py-1.5 outline-none text-slate-600 dark:text-slate-200 cursor-pointer shadow-xs"
                    >
                      <option value="cumulative">Kumulatívne</option>
                      <option value="individual">Jednotlivé typy</option>
                    </select>
                  </div>

                  {/* Beautiful SVG Growth Chart */}
                  <div className="relative h-44 w-full">
                    {chartMode === 'cumulative' ? (
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                        {/* Area Gradient */}
                        <path
                          d="M0,85 Q50,75 100,80 T200,50 T300,55 T400,25 L400,100 L0,100 Z"
                          fill="url(#indigoGrad2)"
                          opacity="0.1"
                        />
                        {/* Line path */}
                        <path
                          d="M0,85 Q50,75 100,80 T200,50 T300,55 T400,25"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3.5"
                        />
                        {/* Interactive dots */}
                        <circle cx="400" cy="25" r="4.5" fill="#3b82f6" />
                        <circle cx="200" cy="50" r="3" fill="#3b82f6" />

                        <defs>
                          <linearGradient id="indigoGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    ) : (
                      // Multi-line chart (Kids vs Personal)
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                        {/* Line 1: Personal (Blue) */}
                        <path
                          d="M0,85 Q50,78 100,82 T200,58 T300,60 T400,32"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                        />
                        <circle cx="400" cy="32" r="3" fill="#3b82f6" />

                        {/* Line 2: Kids (Amber) */}
                        <path
                          d="M0,95 Q50,92 100,94 T200,85 T300,82 T400,72"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                        />
                        <circle cx="400" cy="72" r="3" fill="#f59e0b" />
                      </svg>
                    )}

                    {/* Horizontal months labels */}
                    <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase">
                      <span>Júl '25</span>
                      <span>Okt</span>
                      <span>Jan '26</span>
                      <span>Apr</span>
                      <span>Jún '26</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Osobný majetok
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Detské sporenia
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Core Transaction Management */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] overflow-hidden">
              <TransactionList
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onAddMultipleTransactions={handleAddMultipleTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                categories={categories}
                categoryMap={categoryMap}
                selectedMonth={selectedMonth}
                onSelectedMonthChange={setSelectedMonth}
                activeRole={activeRole}
              />
            </div>
          </div>
        );

      case 'majetok':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Celkový rodinný majetok</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Komplexný prehľad pevných aktív, nehnuteľností, pozemkov a finančných sporení vašej rodiny.</p>
            </div>
            <FamilyAssetsTracker
              assets={assets}
              investments={investments}
              onAddAsset={handleAddAsset}
              onDeleteAsset={handleDeleteAsset}
              activeRole={activeRole}
            />
          </div>
        );

      case 'investicie':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Osobné investičné portfólio</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Spravujte svoje dlhodobé osobné majetkové účty, nákupy fondov a kryptomien.</p>
            </div>
            <InvestmentTracker
              investments={investments}
              onAddInvestment={handleAddInvestment}
              onUpdateValue={handleUpdateInvestmentValue}
              onDeleteInvestment={handleDeleteInvestment}
              filterType="personal"
              activeRole={activeRole}
            />
          </div>
        );

      case 'deti':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Investície a Sporenia pre Deti</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Portfóliá založené pre vaše deti na štúdium, bývanie alebo štart do dospelosti.</p>
            </div>
            <InvestmentTracker
              investments={investments}
              onAddInvestment={handleAddInvestment}
              onUpdateValue={handleUpdateInvestmentValue}
              onDeleteInvestment={handleDeleteInvestment}
              filterType="kids"
              activeRole={activeRole}
            />
          </div>
        );

      case 'rozpocty':
        return (
          <div className="space-y-6 animate-fade-in">
            <BudgetLimitManager
              budgets={budgets}
              transactions={transactions}
              onUpdateLimit={handleUpdateLimit}
              categories={categories}
              onSetCategories={handleSetCategories}
              activeRole={activeRole}
            />
          </div>
        );

      case 'hypoteka':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Stav hypotéky & Záväzkov</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Detailný pohľad na úrokové sadzby, splatnosti, lízingy a simuláciu mimoriadnych vkladov.</p>
            </div>
            <MortgageLiabilitiesTracker
              mortgages={mortgages}
              liabilities={liabilities}
              onAddMortgage={handleAddMortgage}
              onAddLiability={handleAddLiability}
              onAddExtraPayment={handleAddExtraPayment}
              onDeleteExtraPayment={handleDeleteExtraPayment}
              activeRole={activeRole}
            />
          </div>
        );

      case 'poistenie':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Prehľad a Evidencia Poistení</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Komplexná správa poistných zmlúv pre autá, nehnuteľnosti, životné a cestovné poistenia. Slúži na bezpečné uloženie dokumentov a dôležitých kontaktov.
              </p>
            </div>
            <InsuranceTracker
              contracts={insuranceContracts}
              onAddContract={handleAddInsuranceContract}
              onDeleteContract={handleDeleteInsuranceContract}
              activeRole={activeRole}
            />
          </div>
        );

      case 'spravy':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Výročné finančné správy & AI Poradenstvo</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Prehľadné medziročné bilancie a inteligentný finančný poradca poháňaný Gemini AI.</p>
            </div>
            <AnnualReports
              transactions={transactions}
              investments={investments}
              mortgages={mortgages}
              liabilities={liabilities}
              categories={categories}
            />
          </div>
        );

      case 'settleup':
        return (
          <div className="space-y-6 animate-fade-in">
            <SettleUpTracker activeRole={activeRole} />
          </div>
        );

      case 'nastavenia':
        return (
          <div className="space-y-6 animate-fade-in">
            <SettingsManager
              userName={userName}
              onSetUserName={setUserName}
              familyMembers={familyMembers}
              onSetFamilyMembers={handleSetFamilyMembers}
              categoryMap={categoryMap}
              onSetCategoryMap={handleSetCategoryMap}
              activeRole={activeRole}
              darkMode={darkMode}
              onSetDarkMode={handleSetDarkMode}
              budgets={budgets}
              onUpdateBudgetLimit={(cat, limit) => {
                setBudgets(prev => {
                  const existing = prev.find(b => b.category === cat);
                  if (existing) {
                    return prev.map(b => b.category === cat ? { ...b, limit } : b);
                  } else {
                    return [...prev, { category: cat, limit }];
                  }
                });
              }}
              annualSettings={annualSettings}
              onSetAnnualSettings={handleSetAnnualSettings}
              onImportTransactions={(newTs, replace) => setTransactions(prev => replace ? newTs : [...newTs, ...prev])}
              onImportBudgets={setBudgets}
              onImportInvestments={setInvestments}
              onImportMortgages={setMortgages}
              onImportLiabilities={setLiabilities}
              onSetCategories={handleSetCategories}
              currentTransactions={transactions}
              currentBudgets={budgets}
              currentInvestments={investments}
              currentMortgages={mortgages}
              currentLiabilities={liabilities}
              onResetAllData={handleResetAllData}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
    } catch (e: any) {
      console.error('Sign in failed:', e);
      setAuthErrorModal({
        code: e.code || 'unknown',
        message: e.message || String(e)
      });
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#193463] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#72C6B5] text-[#183047] flex items-center justify-center text-2xl font-black shadow-xl">€</div>
          <div className="w-8 h-8 mx-auto border-4 border-white/20 border-t-[#72C6B5] rounded-full animate-spin" />
          <p className="text-sm font-semibold text-white/75">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!googleUser) {
    return (
      <div className="min-h-screen bg-[#F4F8F9] text-[#183047] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-dominant-gradient opacity-95" />
        <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-[#72C6B5]/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-[#4A9CA0]/30 blur-3xl" />

        <main className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] p-8 md:p-10 shadow-2xl border border-white/60 text-center">
            <div className="mx-auto w-16 h-16 bg-[#72C6B5] text-[#183047] rounded-3xl flex items-center justify-center font-black text-3xl shadow-lg border-4 border-white mb-6">€</div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#4A9CA0] mb-3">Family finance workspace</p>
            <h1 className="text-4xl font-black tracking-tight text-[#193463] lowercase">floooow</h1>
            <p className="mt-4 text-sm leading-6 text-[#47758C]">
              Sign in with Google to access your personal financial dashboard, budgets, investments, and reports.
            </p>

            <button
              onClick={handleGoogleSignIn}
              className="mt-8 w-full flex items-center justify-center gap-3 rounded-2xl bg-[#193463] hover:bg-[#244C75] text-white px-5 py-4 font-extrabold shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.5 15 1 12 1 7.3 1 3.4 3.7 1.6 7.7l3.9 3C6.4 7.6 8.9 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
                <path fill="#FBBC05" d="M5.5 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3l-3.9-3C.8 8 0 10 0 12s.8 3.9 1.6 5.3l3.9-3z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 7.9-3l-3.7-2.9c-1.1.7-2.5 1.2-4.2 1.2-3.1 0-5.6-2.6-6.5-5.6l-3.9 3C3.4 20.3 7.3 23 12 23z" />
              </svg>
              Continue with Google
            </button>

            <p className="mt-6 text-[11px] leading-5 text-[#47758C]">
              Your dashboard will be shown after successful authentication.
            </p>

            {authErrorModal && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-rose-800">
                <p className="font-black text-sm">Sign-in failed</p>
                <p className="mt-1 text-xs break-words">{authErrorModal.code}: {authErrorModal.message}</p>
                <button
                  onClick={() => setAuthErrorModal(null)}
                  className="mt-3 text-xs font-black underline cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8F9] text-[#183047] flex flex-col md:flex-row font-sans antialiased relative overflow-hidden" id="fintrack-app-root">
      
      {/* Ambient Dominant Diagonal Gradient Background with Subtle Tone-on-Tone Diagonal Stripes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-15">
        <div className="absolute inset-0 bg-dominant-gradient" />
      </div>

      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-[#193463] text-white p-4 flex items-center justify-between border-b border-[#244C75] z-40 relative">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#72C6B5] text-[#183047] rounded-xl flex items-center justify-center font-black text-base shadow-xs border border-white/30">€</div>
          <span className="font-bold text-lg tracking-tight lowercase text-white">floooow</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-200 hover:text-white p-1.5 rounded-xl bg-white/10 cursor-pointer border border-white/10"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden animate-fade-in cursor-pointer"
        />
      )}

      {/* Sidebar Navigation - Navy Blue with Mentolová Accent */}
      <aside className={`
        fixed inset-y-0 left-0 bg-[#193463] text-white w-64 flex flex-col border-r border-[#244C75] shadow-lg z-50 transition-all duration-300 transform
        md:translate-x-0 md:static md:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Logo */}
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#72C6B5] text-[#183047] rounded-2xl flex items-center justify-center font-black text-lg shadow-md border border-white/30">€</div>
            <div>
              <span className="text-white font-black text-xl tracking-tight block lowercase leading-none">floooow</span>
              <span className="text-[#72C6B5] text-[9px] font-black uppercase tracking-widest block mt-1 leading-none">Rodinný rozpočet</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'prehlad', label: t('navOverview'), icon: Layers },
            { id: 'rozpocty', label: t('navBudgets'), icon: PiggyBank },
            { id: 'investicie', label: t('navInvestments'), icon: Briefcase },
            { id: 'deti', label: t('navKids'), icon: Gift },
            { id: 'majetok', label: t('navAssets'), icon: PieChart },
            { id: 'hypoteka', label: t('navMortgages'), icon: Home },
            { id: 'poistenie', label: t('navInsurance'), icon: Shield },
            { id: 'spravy', label: t('navReports'), icon: FileText },
            { id: 'settleup', label: t('navSettleUp'), icon: Users },
            { id: 'nastavenia', label: t('navSettings'), icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#81D2C2] to-[#72C6B5] text-[#183047] shadow-md font-extrabold border border-white/40' 
                    : 'text-slate-200 hover:text-white hover:bg-white/10 backdrop-blur-xs'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#183047]' : 'text-[#72C6B5]'}`} />
                <span className="text-left text-[11px] font-bold uppercase tracking-tight leading-snug break-words flex-1">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col md:h-screen md:overflow-y-auto relative z-10">
        
        {/* Dominant Header Visual Surface with Ultra-Smooth Multi-stop Liquid Mesh Gradient & Liquid Glass */}
        <div className="bg-dominant-gradient text-white px-6 md:px-8 py-4 md:py-5 flex items-center justify-between border-b border-white/20 shadow-md relative overflow-hidden shrink-0">
          {/* Ambient Liquid Orbs for Refractive Depth */}
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#72C6B5]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-[#3B818C]/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-10 -translate-y-1/2 w-56 h-56 bg-[#193463]/40 rounded-full blur-2xl pointer-events-none" />

          {/* Liquid Glass Overlay Shield */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[10px] pointer-events-none border-b border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />

          <div className="relative z-10">
            {isEditingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (tempName.trim()) {
                    setUserName(tempName.trim());
                    localStorage.setItem('family_budget_username', tempName.trim());
                  }
                  setIsEditingName(false);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="px-3 py-1 bg-white/90 backdrop-blur-md text-[#183047] border border-[#72C6B5] rounded-xl text-lg font-black uppercase tracking-tight focus:outline-none shadow-sm"
                  autoFocus
                  onBlur={() => {
                    if (tempName.trim()) {
                      setUserName(tempName.trim());
                      localStorage.setItem('family_budget_username', tempName.trim());
                    }
                    setIsEditingName(false);
                  }}
                  maxLength={15}
                />
                <button type="submit" className="text-[10px] liquid-glass-button">
                  Uložiť
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2 md:gap-3 group">
                <h1 
                  onClick={() => {
                    setTempName(userName);
                    setIsEditingName(true);
                  }}
                  className="text-xl md:text-2xl font-black text-white uppercase tracking-tight cursor-pointer hover:bg-white/15 px-2.5 py-1 rounded-xl transition flex items-center gap-1.5 backdrop-blur-xs"
                  title="Kliknite pre úpravu mena"
                >
                  {t('greeting')}, {userName}
                  <span className="text-[10px] text-slate-100 font-medium lowercase hidden group-hover:inline-block border border-white/30 px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-md">
                    Upraviť
                  </span>
                </h1>

                {/* Profile / Role Selector */}
                <select
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    localStorage.setItem('family_budget_username', e.target.value);
                  }}
                  className="bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider focus:outline-none cursor-pointer shadow-xs hover:bg-white/30 transition"
                  title="Prepnúť aktívneho člena rodiny"
                >
                  {familyMembers.map(m => (
                    <option key={m.name} value={m.name} className="bg-[#193463] text-white font-bold">
                      {m.name} ({getRoleDetails(m.role, t).label})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-[11px] text-white/85 font-medium italic mt-0.5 drop-shadow-xs">
              {t('lastBankStatement')}
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 relative z-10">
            <button
              onClick={() => {
                setActiveTab('prehlad');
                setTimeout(() => {
                  const uploadBtn = document.getElementById('btn-upload-statement');
                  if (uploadBtn) uploadBtn.click();
                }, 100);
              }}
              className="hidden sm:flex items-center gap-2 liquid-glass-button text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#183047]" />
              {t('uploadStatement')}
            </button>

            {googleUser ? (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/35 rounded-2xl p-1.5 pr-3 text-white shadow-md">
                <img 
                  src={googleUser.photoURL || undefined}
                  referrerPolicy="no-referrer"
                  alt={googleUser.displayName || 'Google User'}
                  className="w-8 h-8 rounded-full border border-white/60 object-cover shadow-xs"
                />
                <div className="text-left hidden sm:block">
                  <span className="text-[9px] font-black text-[#8FE0D0] block uppercase tracking-wider drop-shadow-xs">Google Pripojený</span>
                  <span className="text-[10px] font-bold text-white block truncate max-w-[120px]" title={googleUser.email || ''}>
                    {googleUser.displayName || googleUser.email}
                  </span>
                </div>
                <button
                  onClick={() => {
                    showConfirm(
                      'Odhlásenie z Google účtu',
                      'Naozaj sa chcete odhlásiť z vášho Google účtu?',
                      async () => {
                        await logout();
                      },
                      'Zrušiť',
                      'Odhlásiť sa',
                      'warning'
                    );
                  }}
                  className="ml-2 text-slate-100 hover:text-rose-200 p-1.5 rounded-xl hover:bg-white/20 transition cursor-pointer"
                  title="Odhlásiť sa"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="btn-secondary text-xs flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.5 15 1 12 1 7.3 1 3.4 3.7 1.6 7.7l3.9 3C6.4 7.6 8.9 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
                  <path fill="#FBBC05" d="M5.5 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3l-3.9-3C.8 8.1 0 10 0 12s.8 3.9 1.6 5.3l3.9-3z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 7.9-3l-3.7-2.9c-1.1.7-2.5 1.2-4.2 1.2-3.1 0-5.6-2.6-6.5-5.6l-3.9 3C3.4 20.3 7.3 23 12 23z" />
                </svg>
                <span className="hidden xs:inline">Prihlásiť s Google</span>
                <span className="xs:hidden">Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Inner Tab Content */}
        <div className="p-4 md:p-8 space-y-6">
          {renderTabContent()}
        </div>

      </main>

      {/* Google Auth Error Guide Modal */}
      {authErrorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in animate-duration-200" id="auth-error-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5 relative my-8 text-slate-800">
            <button 
              onClick={() => setAuthErrorModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Problém s prihlásením cez Google</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pre správne fungovanie prihlásenia v tomto prostredí iFrame / AI Studio je potrebné vykonať nasledujúce kroky.
              </p>
            </div>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 text-xs">
              {/* Error Details */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Systémová chyba</span>
                <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                  {authErrorModal.code !== 'unknown' ? `Kód: ${authErrorModal.code}` : `Chyba: ${authErrorModal.message}`}
                </p>
              </div>

              {/* Step by Step Guide depending on error */}
              {authErrorModal.code === 'auth/operation-not-allowed' ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] text-indigo-600 dark:text-indigo-400">
                    Návod: Ako povoliť Google prihlásenie vo Firebase
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <li>Otvorte svoju <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">Firebase Console</a>.</li>
                    <li>Vyberte váš projekt s ID <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px] font-bold">gothic-vector-bttsj</code>.</li>
                    <li>Prejdite do sekcie <strong>Build</strong> -&gt; <strong>Authentication</strong> v ľavom menu.</li>
                    <li>Zvoľte záložku <strong>Sign-in method</strong> hore.</li>
                    <li>Kliknite na tlačidlo <strong>Add new provider</strong> (Pridať nového poskytovateľa) a zvoľte <strong>Google</strong>.</li>
                    <li>Prepnite prepínač na <strong>Enable</strong> (Povoliť), vyberte kontaktný e-mail pre podporu a kliknite na <strong>Save</strong> (Uložiť).</li>
                  </ol>
                </div>
              ) : authErrorModal.code === 'auth/unauthorized-domain' ? (
                <div className="space-y-3">
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 space-y-2">
                    <h5 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      💡 Rýchle riešenie: Otvoriť v novej karte
                    </h5>
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-400 leading-relaxed">
                      Keďže domény sú už vo Firebase pridané, chyba nastáva preto, že aplikácia beží vo vnútri <strong>iFrame náhľadu v Google AI Studio</strong>. Prehliadače z bezpečnostných dôvodov blokujú prihlasovacie vyskakovacie okná (popups) spúšťané z vnútra iFrame rámcov.
                    </p>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition shadow-md cursor-pointer"
                    >
                      <span>Otvoriť aplikáciu na novej karte ↗</span>
                    </a>
                  </div>

                  <div className="space-y-1.5 pl-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] text-slate-500">
                      Záložný návod (ak by predsa len chýbali domény)
                    </h4>
                    <ol className="list-decimal list-inside space-y-2.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      <li>Otvorte svoju <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">Firebase Console</a>.</li>
                      <li>
                        Projekt: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px] font-bold">gothic-vector-bttsj</code>
                      </li>
                      <li>V menu prejdite na <strong>Build</strong> -&gt; <strong>Authentication</strong> -&gt; záložka <strong>Settings</strong> -&gt; <strong>Authorized domains</strong>.</li>
                      <li>
                        Uistite sa, že sú pridané tieto dve adresy (skopírujte kliknutím):
                        <div className="mt-1.5 pl-4 space-y-1.5">
                          {[
                            'ais-dev-chd3k3urvvrjxxbk3s5isi-25378556432.europe-west1.run.app',
                            'ais-pre-chd3k3urvvrjxxbk3s5isi-25378556432.europe-west1.run.app'
                          ].map((domain) => (
                            <div key={domain} className="flex items-center gap-1.5 max-w-full">
                              <code className="flex-1 block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-[10px] break-all text-slate-700 dark:text-slate-300">
                                {domain}
                              </code>
                              <button
                                onClick={() => handleCopy(domain)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer flex-shrink-0"
                                title="Kopírovať doménu"
                              >
                                {copiedText === domain ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              ) : authErrorModal.code === 'auth/popup-blocked' ? (
                <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Prehliadač zablokoval vyskakovacie okno:</p>
                  <p>Váš internetový prehliadač zablokoval prihlasovacie okno Google. Povoľte, prosím, vyskakovacie okná (pop-ups) pre túto stránku v nastaveniach prehliadača (zvyčajne uvidíte ikonu blokovania v pravom rohu adresného riadku) a skúsili to znova.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 space-y-2">
                    <h5 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      💡 Tip pre iFrame a Safari / Inkognito režim
                    </h5>
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-400 leading-relaxed">
                      Pretože táto aplikácia beží v náhľadovom ráme (iFrame) v Google AI Studio, prehliadače (najmä <strong>Safari</strong>, <strong>Firefox</strong> s prísnou ochranou, alebo akýkoľvek režim <strong>Inkognito</strong>) často blokujú ukladanie prihlasovacích cookies medzi stránkami (cross-site tracking cookies).
                    </p>
                    <p className="text-[11px] text-indigo-950 dark:text-indigo-200 font-bold mt-1">
                      👉 Riešenie: Otvorte aplikáciu v novej samostatnej karte kliknutím na ikonu šípky smerujúcej von v pravom hornom rohu náhľadu AI Studio (šípka vyčnievajúca z rámčeka) a prihláste sa priamo tam.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed pl-1 pt-1">
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px]">Overte tiež konfiguráciu:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Skontrolujte, či máte vo Firebase Console zapnuté Google prihlásenie.</li>
                      <li>Overte, že v zozname &quot;Authorized domains&quot; máte povolené domény <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">*.run.app</code>.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <a 
                href="https://console.firebase.google.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-center text-xs font-black transition shadow-md"
              >
                Otvoriť Firebase Console ⚙️
              </a>
              <button 
                onClick={() => setAuthErrorModal(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Custom Alert / Confirm Modal */}
      <CustomAlert config={alertConfig} onClose={() => setAlertConfig(null)} />

    </div>
  );
}
