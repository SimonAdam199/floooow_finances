import { useState, useEffect } from 'react';
import { BudgetLimit, Transaction, UserRole } from '../types';
import { sendBudgetChatMessage, analyzeMonthlyBudget } from '../services/apiClient';
import { Settings, Pencil, Check, X, AlertTriangle, Sparkles, FileSpreadsheet, LogIn, LogOut, RefreshCw, Loader2, CheckCircle, ChevronLeft, ChevronRight, PieChart as PieIcon, ChevronDown, ChevronUp, Send, MessageSquare, Trash2, HelpCircle } from 'lucide-react';
import { initAuth, googleSignIn, logout, fetchSpreadsheetData } from '../lib/googleAuth';
import { User } from 'firebase/auth';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';

interface BudgetLimitManagerProps {
  budgets: BudgetLimit[];
  transactions: Transaction[];
  onUpdateLimit: (category: string, newLimit: number) => void;
  categories: string[];
  onSetCategories: (newCategories: string[]) => void;
  activeRole?: UserRole;
}

const getCategoryColor = (category: string) => {
  const colors = [
    'bg-amber-400', 'bg-blue-400', 'bg-purple-400', 'bg-emerald-400',
    'bg-rose-400', 'bg-pink-400', 'bg-teal-400', 'bg-orange-400',
    'bg-indigo-400', 'bg-cyan-400', 'bg-lime-400', 'bg-violet-400'
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getCategoryHexColor = (category: string) => {
  const hexColors = [
    '#fbbf24', '#60a5fa', '#c084fc', '#34d399',
    '#f43f5e', '#f472b6', '#2dd4bf', '#fb923c',
    '#818cf8', '#22d3ee', '#a3e635', '#a78bfa'
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % hexColors.length;
  return hexColors[index];
};

// Helper to render bold text **like this**
function renderBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Custom simple markdown renderer component
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-4 text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 pt-4 first:pt-0 flex items-center gap-2">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-black text-slate-800 dark:text-white pt-3">
              {line.replace('### ', '')}
            </h3>
          );
        }
        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const content = line.trim().substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-4">
              <span className="text-indigo-500 dark:text-indigo-400 mt-1.5 font-bold text-xs">•</span>
              <p className="flex-1">{renderBoldText(content)}</p>
            </div>
          );
        }
        // Empty lines
        if (line.trim() === '') {
          return null;
        }
        // Regular paragraphs
        return <p key={idx}>{renderBoldText(line)}</p>;
      })}
    </div>
  );
}

export default function BudgetLimitManager({
  budgets,
  transactions,
  onUpdateLimit,
  categories,
  onSetCategories,
  activeRole = 'viewer'
}: BudgetLimitManagerProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // --- Selected Month State for Budgets ---
  const [budgetMonth, setBudgetMonth] = useState<string>(() => {
    // Default to the month of the latest transaction, or the current month if empty
    if (transactions && transactions.length > 0) {
      const sortedDates = [...transactions].map(t => t.date).sort((a, b) => b.localeCompare(a));
      if (sortedDates[0]) {
        return sortedDates[0].slice(0, 7);
      }
    }
    return new Date().toISOString().slice(0, 7);
  });

  const handleNavigateMonth = (direction: number) => {
    const [year, month] = budgetMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + direction, 15);
    setBudgetMonth(d.toISOString().slice(0, 7));
  };

  // Get all unique months available in transactions to populate dropdown
  const uniqueMonths = Array.from(new Set(
    transactions.map(t => t.date.slice(0, 7))
  ));
  
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

  // Google Sheets integration state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState('1YAK1gsAIZXwthy1O3H1TtnGCIZcIS7c3');
  const [range, setRange] = useState('400_Rozpočet!A1:Z200');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [columns, setColumns] = useState<{ index: number; letter: string; header: string; uniqueValues: string[]; count: number }[]>([]);
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [detectedCategories, setDetectedCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  // --- AI Monthly Analysis States ---
  const [analysesCache, setAnalysesCache] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('family_budget_monthly_ai_analyses');
    return saved ? JSON.parse(saved) : {};
  });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('family_budget_monthly_ai_analyses', JSON.stringify(analysesCache));
  }, [analysesCache]);

  // --- AI Chat with Gemini States ---
  const [chatMessages, setChatMessages] = useState<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>(() => {
    const saved = localStorage.getItem('family_budget_ai_chats');
    return saved ? JSON.parse(saved) : {};
  });
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('family_budget_ai_chats', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const PREDEFINED_QUESTIONS = [
    "Ako môžem ušetriť viac v kategórii POTRAVINY?",
    "Mám preťažený rozpočet? Kde sú najväčšie úniky?",
    "Čo odporúčaš urobiť s ušetreným prebytkom?",
    "Sú moje rozpočtové limity nastavené reálne?"
  ];

  const handleSendChatMessage = async (textToSend?: string) => {
    const messageText = textToSend || currentChatMessage;
    if (!messageText.trim()) return;

    const currentHistory = chatMessages[budgetMonth] || [];
    const updatedHistory = [...currentHistory, { role: 'user', content: messageText }];

    // Update local UI immediately so the user's message is visible
    setChatMessages(prev => ({
      ...prev,
      [budgetMonth]: updatedHistory
    }));

    if (!textToSend) {
      setCurrentChatMessage('');
    }
    
    setIsChatLoading(true);
    setChatError(null);

    const monthTransactions = transactions.filter(t => t.date.startsWith(budgetMonth));

    try {
      const data = await sendBudgetChatMessage({
        message: messageText,
        history: currentHistory.map(h => ({ role: h.role === 'user' ? 'user' : 'model', content: h.content })),
        month: budgetMonth,
        transactions: monthTransactions,
        budgets: budgets
      });

      setChatMessages(prev => ({
        ...prev,
        [budgetMonth]: [...updatedHistory, { role: 'assistant', content: data.reply }]
      }));
    } catch (err: any) {
      console.error(err);
      setChatError(err?.message || 'Nastala chyba pri komunikácii s AI. Skontrolujte pripojenie a kľúč API.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages(prev => {
      const copy = { ...prev };
      delete copy[budgetMonth];
      return copy;
    });
  };

  const handleGenerateAnalysis = async () => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);

    const monthTransactions = transactions.filter(t => t.date.startsWith(budgetMonth));
    const budgetLimits = budgets;

    try {
      const data = await analyzeMonthlyBudget({
        month: budgetMonth,
        transactions: monthTransactions,
        budgets: budgetLimits
      });

      setAnalysesCache(prev => ({
        ...prev,
        [budgetMonth]: data.analysis
      }));
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err?.message || 'Nastala chyba pri generovaní analýzy. Skontrolujte pripojenie a kľúč API.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Prihlásenie zlyhalo.');
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setColumns([]);
      setDetectedCategories([]);
    } catch (err: any) {
      setError(err.message || 'Odhlásenie zlyhalo.');
    }
  };

  const handleLoadSheet = async () => {
    if (!accessToken) {
      setError('Nie ste prihlásený. Prihláste sa pomocou Google.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setColumns([]);
    setDetectedCategories([]);
    try {
      let idToUse = spreadsheetId.trim();
      if (idToUse.includes('docs.google.com/spreadsheets')) {
        const match = idToUse.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          idToUse = match[1];
          setSpreadsheetId(idToUse);
        }
      }

      const data = await fetchSpreadsheetData(accessToken, idToUse, range);
      const rows = data.values as string[][];
      
      if (!rows || rows.length === 0) {
        throw new Error('Vybraná tabuľka alebo rozsah neobsahuje žiadne riadky.');
      }

      const maxCols = Math.max(...rows.map(r => r.length));
      const colsList = [];
      
      for (let c = 0; c < maxCols; c++) {
        const colValues = rows.map(r => r[c] || '').map(v => v.trim()).filter(v => v !== '');
        if (colValues.length === 0) continue;
        
        const header = rows[0]?.[c] || `Stĺpec ${String.fromCharCode(65 + c)}`;
        const rawUnique = colValues.slice(1);
        const uniqueValues = Array.from(new Set(rawUnique));
        
        colsList.push({
          index: c,
          letter: String.fromCharCode(65 + c),
          header,
          uniqueValues,
          count: colValues.length
        });
      }

      setColumns(colsList);

      const bestCol = colsList.find(col => {
        const h = col.header.toLowerCase();
        return h.includes('kateg') || h.includes('categ') || h.includes('typ') || h.includes('skupin');
      }) || colsList[0];

      if (bestCol) {
        setSelectedColIndex(bestCol.index);
        const validCats = bestCol.uniqueValues.filter(v => {
          return v.length > 1 && isNaN(Number(v)) && !v.includes('.') && !v.includes('-');
        });
        setDetectedCategories(validCats);
        
        const selectionMap: Record<string, boolean> = {};
        validCats.forEach(cat => {
          selectionMap[cat] = true;
        });
        setSelectedCategories(selectionMap);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Nepodarilo sa stiahnuť kategórie z Google Tabuľky.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnChange = (colIdx: number) => {
    setSelectedColIndex(colIdx);
    const col = columns.find(c => c.index === colIdx);
    if (col) {
      const validCats = col.uniqueValues.filter(v => {
        return v.length > 1 && isNaN(Number(v)) && !v.includes('.') && !v.includes('-');
      });
      setDetectedCategories(validCats);
      const selectionMap: Record<string, boolean> = {};
      validCats.forEach(cat => {
        selectionMap[cat] = true;
      });
      setSelectedCategories(selectionMap);
    }
  };

  const handleApplyCategories = () => {
    const selectedList = detectedCategories.filter(cat => selectedCategories[cat]);
    if (selectedList.length === 0) {
      setError('Vyberte aspoň jednu kategóriu.');
      return;
    }

    const confirmed = window.confirm(
      `Naozaj chcete nahradiť aktuálne kategórie výdavkov (${budgets.length}) novými kategóriami (${selectedList.length}) z Vašej Google Tabuľky?`
    );
    if (!confirmed) return;

    onSetCategories(selectedList);
    setSuccessMsg(`Kategórie boli úspešne synchronizované! Nastavili sme ${selectedList.length} nových kategórií.`);
    setColumns([]);
    setDetectedCategories([]);
  };

  // Calculate actual spending per category for the selected month
  const getCategorySpend = (category: string) => {
    return transactions
      .filter(t => t.date.startsWith(budgetMonth) && t.category === category && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const handleStartEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setEditValue(currentLimit.toString());
  };

  const handleSave = (category: string) => {
    const num = parseFloat(editValue);
    if (!isNaN(num) && num >= 0) {
      onUpdateLimit(category, num);
    }
    setEditingCategory(null);
  };

  // Aggregated totals
  const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpend = budgets.reduce((sum, b) => sum + getCategorySpend(b.category), 0);
  const totalSavings = totalLimit - totalSpend;
  const overallPercentage = totalLimit > 0 ? (totalSpend / totalLimit) * 100 : 0;

  const chartData = budgets
    .map(b => ({
      name: b.category,
      value: getCategorySpend(b.category),
      limit: b.limit,
      color: getCategoryHexColor(b.category)
    }))
    .filter(item => item.value > 0);

  return (
    <div className="space-y-6" id="budget-limit-manager">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/40 dark:border-white/10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Mesačné Rozpočty
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Nastavte si limity na kategórie a sledujte svoje míňanie.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40 rounded-2xl transition cursor-pointer backdrop-blur-md shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Prepojiť Google Sheet
            </button>
            <div className="p-2 bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/10 rounded-2xl text-slate-400 backdrop-blur-md">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Month Selector Panel */}
        <div className="mb-6 p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Vybraný mesiac rozpočtu</span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">{formatMonth(budgetMonth)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigateMonth(-1)}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition cursor-pointer"
              title="Predchádzajúci mesiac"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={budgetMonth}
              onChange={(e) => setBudgetMonth(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer focus:outline-indigo-600"
            >
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleNavigateMonth(1)}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition cursor-pointer"
              title="Nasledujúci mesiac"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Google Sheets Sync Panel */}
        {showSyncPanel && (
          <div className="mb-6 p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Synchronizácia kategórií z Google Tabuľky
                </h4>
                <p className="text-slate-500 text-xs mt-1">
                  Po prihlásení cez Google načíta kategórie priamo zo zadaného dokumentu.
                </p>
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Odhlásiť sa z Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Odhlásiť
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {successMsg}
              </div>
            )}

            {!user ? (
              <div className="py-4 text-center">
                <button
                  onClick={handleLogin}
                  className="gsi-material-button mx-auto shadow-sm inline-flex items-center justify-center cursor-pointer"
                  style={{
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span className="text-slate-700 font-bold text-sm">Prihlásiť sa pomocou Google</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block">{user.displayName}</span>
                    <span className="text-slate-400 text-[10px] block">{user.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Adresa alebo ID Google tabuľky</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-indigo-600 focus:bg-white"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="Sem vložte ID tabuľky alebo celú URL adresu"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Rozsah / Tabuľka</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      placeholder="napr. A1:Z200"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      onClick={handleLoadSheet}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg text-xs transition cursor-pointer h-9"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Sťahujem...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Načítať tabuľku
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Column Selection & Category Preview */}
                {columns.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Zvoľte stĺpec s kategóriami</label>
                        <select
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 bg-white cursor-pointer"
                          value={selectedColIndex ?? ''}
                          onChange={(e) => handleColumnChange(Number(e.target.value))}
                        >
                          {columns.map(col => (
                            <option key={col.index} value={col.index}>
                              {col.letter} - {col.header} ({col.count} riadkov)
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedColIndex !== null && (
                        <div className="flex justify-end items-end pb-1.5">
                          <button
                            onClick={handleApplyCategories}
                            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Aplikovať vybrané kategórie
                          </button>
                        </div>
                      )}
                    </div>

                    {detectedCategories.length > 0 && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500 mb-2">
                          Rozpoznané kategórie v stĺpci ({detectedCategories.length})
                        </span>
                        
                        <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-2.5 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detectedCategories.map(cat => (
                            <label key={cat} className="flex items-center gap-2 p-1.5 bg-white rounded-md border border-slate-100 cursor-pointer text-xs select-none hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={!!selectedCategories[cat]}
                                onChange={(e) => {
                                  setSelectedCategories(prev => ({
                                    ...prev,
                                    [cat]: e.target.checked
                                  }));
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                              />
                              <span className="font-medium text-slate-700 truncate">{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aggregate Overview Card */}
        <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider mb-1">Mesačný limit spolu</span>
            <span className="text-2xl font-bold text-slate-800">{totalLimit.toLocaleString('sk-SK')} €</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider mb-1">Aktuálne minuté</span>
            <span className={`text-2xl font-bold ${totalSpend > totalLimit ? 'text-red-600' : 'text-slate-800'}`}>
              {totalSpend.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} €
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider mb-1">Zostáva do rozpočtu</span>
            <span className={`text-2xl font-bold ${totalSavings < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalSavings.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          {/* Global Progress Bar */}
          <div className="md:col-span-3">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
              <span>Celkové vyčerpanie rozpočtu</span>
              <span className="font-semibold">{overallPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  overallPercentage > 100 ? 'bg-red-500' : 
                  overallPercentage > 85 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Individual Categories Limits List */}
        <div className="space-y-5">
          {budgets.map((b) => {
            const spend = getCategorySpend(b.category);
            const pct = b.limit > 0 ? (spend / b.limit) * 100 : 0;
            const isEditing = editingCategory === b.category;
            const isOver = spend > b.limit;

            const categoryTransactions = transactions.filter(
              t => t.date.startsWith(budgetMonth) && t.category === b.category && t.amount < 0
            );

            const subcategorySums: Record<string, number> = {};
            categoryTransactions.forEach(t => {
              const sub = t.subcategory || 'Nešpecifikované';
              subcategorySums[sub] = (subcategorySums[sub] || 0) + Math.abs(t.amount);
            });

            const sortedSubcategories = Object.entries(subcategorySums).sort((a, b) => b[1] - a[1]);
            const sortedCategoryTransactions = [...categoryTransactions].sort((a, b) => b.date.localeCompare(a.date));
            const isExpanded = !!expandedCategories[b.category];

            return (
              <div 
                key={b.category} 
                className="p-4 bg-white hover:bg-slate-50/50 border border-slate-100 rounded-xl transition group cursor-pointer"
                onClick={() => {
                  if (isEditing) return;
                  setExpandedCategories(prev => ({
                    ...prev,
                    [b.category]: !prev[b.category]
                  }));
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(b.category)}`} />
                    <span className="font-semibold text-slate-800 text-sm">{b.category}</span>
                    {isOver && (
                      <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded-full border border-red-100">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        Prekročené!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-indigo-600 font-semibold"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                        />
                        <span className="text-slate-500 text-xs">€</span>
                        <button
                          onClick={() => handleSave(b.category)}
                          className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                          title="Uložiť"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                          title="Zrušiť"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {spend.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} € z
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          {b.limit.toLocaleString('sk-SK')} €
                        </span>
                        {activeRole !== 'viewer' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(b.category, b.limit);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Upraviť limit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar with Indicator */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 100 ? 'bg-red-500' :
                      pct > 80 ? 'bg-amber-400' : 'bg-slate-800'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {/* Extra micro-tip */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
                  <span>Využité: {pct.toFixed(1)}%</span>
                  <span>Zostáva: {Math.max(0, b.limit - spend).toLocaleString('sk-SK', { maximumFractionDigits: 1 })} €</span>
                </div>

                {/* Expanded Subcategories and Items List */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    {/* Subcategories Breakdown */}
                    {sortedSubcategories.length > 0 ? (
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                          📂 Členenie podľa podkategórií
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {sortedSubcategories.map(([subName, subAmount]) => {
                            const subPct = spend > 0 ? (subAmount / spend) * 100 : 0;
                            return (
                              <div key={subName} className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-lg flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-semibold text-slate-700 truncate">{subName}</span>
                                  <div className="text-right">
                                    <span className="text-xs font-extrabold text-slate-900">{subAmount.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                                    <span className="text-[10px] text-indigo-600 font-bold ml-1.5">({subPct.toFixed(1)}%)</span>
                                  </div>
                                </div>
                                <div className="h-1 bg-slate-200/60 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                    style={{ width: `${subPct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Individual Items / Transactions */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                        💸 Zoznam položiek ({sortedCategoryTransactions.length})
                      </h4>
                      {sortedCategoryTransactions.length > 0 ? (
                        <div className="border border-slate-150 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto bg-white">
                          {sortedCategoryTransactions.map((t) => {
                            const formattedDate = new Date(t.date).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
                            return (
                              <div key={t.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50/50 transition text-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="bg-slate-50 px-2 py-0.5 rounded text-slate-500 font-bold text-[10px] whitespace-nowrap border border-slate-100">
                                    {formattedDate}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-semibold text-slate-700 truncate block">{t.description}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      {t.subcategory && (
                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                          {t.subcategory}
                                        </span>
                                      )}
                                      {t.bank && (
                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 px-1.5 py-0.2 rounded-sm">
                                          🏦 {t.bank}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="font-extrabold text-rose-600 whitespace-nowrap pl-2">
                                  -{Math.abs(t.amount).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center">
                          <span className="text-xs text-slate-400">V tomto mesiaci nie sú žiadne položky pre túto kategóriu.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pie Chart displaying spend breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              Podiel výdavkov podľa kategórií
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Grafická vizualizácia reálnych výdavkov pre {formatMonth(budgetMonth)}.
            </p>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm">Pre zvolený mesiac {formatMonth(budgetMonth)} nie sú evidované žiadne výdavky.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            {/* Pie Chart */}
            <div className="lg:col-span-5 h-[240px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toLocaleString('sk-SK', { maximumFractionDigits: 2 })} €`]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spolu</span>
                <span className="text-lg font-extrabold text-slate-800">
                  {totalSpend.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} €
                </span>
              </div>
            </div>

            {/* Legend detailing categories, amounts, percentages */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {chartData.map((item, index) => {
                const percentage = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="text-xs font-extrabold text-slate-900 block">
                        {item.value.toLocaleString('sk-SK', { maximumFractionDigits: 1 })} €
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold block">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Month-by-month AI Budget Analysis & Recommendations */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm" id="ai-monthly-analysis">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              Mesačná AI analýza rozpočtu & odporúčania
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Inteligentné vyhodnotenie výdavkov a rozpočtových limitov pre mesiac {formatMonth(budgetMonth)}.
            </p>
          </div>

          {analysesCache[budgetMonth] && !isLoadingAnalysis && (
            <button
              onClick={handleGenerateAnalysis}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:border-indigo-200 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Aktualizovať analýzu
            </button>
          )}
        </div>

        {isLoadingAnalysis ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-800 font-bold text-sm">Finančný kouč analyzuje vaše dáta...</p>
              <p className="text-slate-400 text-xs mt-1">Spracovávame {transactions.filter(t => t.date.startsWith(budgetMonth)).length} transakcií a rozpočtové limity.</p>
            </div>
            {/* Visual simulation of work */}
            <div className="w-48 h-1.5 bg-slate-150 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        ) : analysisError ? (
          <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100 text-center space-y-4">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-red-800 font-bold text-sm">Chyba pri generovaní analýzy</h4>
              <p className="text-red-600 text-xs mt-1">{analysisError}</p>
            </div>
            <button
              onClick={handleGenerateAnalysis}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              Skúsiť znova
            </button>
          </div>
        ) : analysesCache[budgetMonth] ? (
          <div className="space-y-6">
            <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
              <SimpleMarkdown text={analysesCache[budgetMonth]} />
            </div>

            {/* Chat section */}
            <div className="border-t border-slate-100 pt-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Chat s Gemini AI o Vašom rozpočte
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Môžete sa spýtať na konkrétne kategórie, tipy na sporenie alebo poprosiť o detailnejšie vysvetlenie analýzy za mesiac {formatMonth(budgetMonth)}.
                </p>
              </div>

              {/* Chat Messages */}
              {chatMessages[budgetMonth] && chatMessages[budgetMonth].length > 0 && (
                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 max-h-96 overflow-y-auto space-y-4">
                  {chatMessages[budgetMonth].map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-2xs ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none prose prose-slate max-w-none'
                      }`}>
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <SimpleMarkdown text={msg.content} />
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-slate-500 border border-slate-150 rounded-2xl rounded-tl-none p-4 text-xs font-bold flex items-center gap-2 shadow-2xs">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span>Gemini píše odpoveď...</span>
                      </div>
                    </div>
                  )}
                  {chatError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100">
                      {chatError}
                    </div>
                  )}
                </div>
              )}

              {/* Predefined Questions / Suggestions */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2.5 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Časté otázky (kliknite pre opýtanie)
                </span>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      disabled={isChatLoading}
                      onClick={() => handleSendChatMessage(q)}
                      className="text-xs bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 px-3.5 py-2 rounded-xl transition cursor-pointer text-left font-medium shadow-2xs hover:shadow-xs disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Opýtajte sa čokoľvek o Vašom rozpočte..."
                  value={currentChatMessage}
                  onChange={(e) => setCurrentChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendChatMessage();
                    }
                  }}
                  disabled={isChatLoading}
                  className="flex-1 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50 transition"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  disabled={isChatLoading || !currentChatMessage.trim()}
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl flex items-center justify-center transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
                {chatMessages[budgetMonth] && chatMessages[budgetMonth].length > 0 && (
                  <button
                    onClick={handleClearChat}
                    title="Vymazať históriu chatu"
                    className="px-3.5 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50/50 rounded-xl transition cursor-pointer flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center max-w-2xl mx-auto space-y-6">
            <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-slate-800 font-extrabold text-base">
                Získajte inteligentný pohľad na financie za {formatMonth(budgetMonth)}
              </h4>
              <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                AI analyzuje prekročenia nastavených limitov kategórií, porovná príjmy s výdavkami a navrhne vám 3 konkrétne akčné kroky pre zdravší rodinný rozpočet.
              </p>
            </div>
            <button
              onClick={handleGenerateAnalysis}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200"
            >
              <Sparkles className="w-4 h-4" />
              Spustiť AI analýzu rozpočtu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

