import React, { useState, useEffect } from 'react';
import { Transaction, CATEGORY_MAP, UserRole } from '../types';
import { Plus, Upload, FileText, Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, Sparkles, Loader2, Check, MessageSquare, MessageSquarePlus, Edit2, X, Shield } from 'lucide-react';
import { mockBankStatementText } from '../data/demoData';
import { parseBankStatement } from '../services/apiClient';

interface TransactionListProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddMultipleTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction?: (transaction: Transaction) => void;
  categories: string[];
  categoryMap?: Record<string, string[]>;
  selectedMonth?: string;
  onSelectedMonthChange?: (month: string) => void;
  activeRole?: UserRole;
}

export default function TransactionList({
  transactions,
  onAddTransaction,
  onAddMultipleTransactions,
  onDeleteTransaction,
  onUpdateTransaction,
  categories,
  categoryMap,
  selectedMonth,
  onSelectedMonthChange,
  activeRole = 'viewer'
}: TransactionListProps) {
  const catMap = categoryMap || CATEGORY_MAP;

  // Manual transaction form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [addSuccessNotice, setAddSuccessNotice] = useState<string | null>(null);

  // Inline comment editing state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  
  // Exclude 'PRÍJMY' as the default category for expenses
  const expenseCategories = categories.filter(c => c !== 'PRÍJMY');
  const [category, setCategory] = useState(expenseCategories[0] || 'POTRAVINY');
  const [subcategory, setSubcategory] = useState(() => {
    const defaultCat = expenseCategories[0] || 'POTRAVINY';
    return (categoryMap || CATEGORY_MAP)[defaultCat]?.[0] || '';
  });
  const [isExpense, setIsExpense] = useState(true);

  // Helper to change category and subcategory safely
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const subcats = catMap[newCat] || [];
    setSubcategory(subcats[0] || '');
  };

  // Notice modal / toast state for blocked viewer actions or messages
  const [viewerNotice, setViewerNotice] = useState<string | null>(null);

  const handleOpenAddIncome = () => {
    if (activeRole === 'viewer') {
      setViewerNotice('Prístup odmietnutý: Členovia rodiny s rolou "Len čítanie" nemôžu pridávať transakcie. Vpravo hore si môžete prepnúť rolu na "Adam (Správca)" alebo "Veri (Editor)".');
      return;
    }
    setIsExpense(false);
    handleCategoryChange('PRÍJMY');
    setShowAddForm(true);
    setTimeout(() => {
      document.getElementById('manual-add-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const handleOpenAddExpense = () => {
    if (activeRole === 'viewer') {
      setViewerNotice('Prístup odmietnutý: Členovia rodiny s rolou "Len čítanie" nemôžu pridávať transakcie. Vpravo hore si môžete prepnúť rolu na "Adam (Správca)" alebo "Veri (Editor)".');
      return;
    }
    setIsExpense(true);
    handleCategoryChange(expenseCategories[0] || 'POTRAVINY');
    setShowAddForm(true);
    setTimeout(() => {
      document.getElementById('manual-add-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };


  // Bank statement parsing state
  const [statementText, setStatementText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<Omit<Transaction, 'id'>[]>([]);
  const [showParserModal, setShowParserModal] = useState(false);
  const [revisionTab, setRevisionTab] = useState<'all' | 'income' | 'expense'>('all');
  const [isDragging, setIsDragging] = useState(false);

  // Bank statement management
  const [banks, setBanks] = useState<string[]>(() => {
    const saved = localStorage.getItem('family_budget_active_banks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['Slovenská sporiteľňa', 'Tatra banka', 'VÚB banka'];
  });

  const [selectedBank, setSelectedBank] = useState<string>(() => {
    return banks[0] || 'Slovenská sporiteľňa';
  });

  const [newBankName, setNewBankName] = useState('');
  const [uploadBank, setUploadBank] = useState<string>(() => selectedBank);
  const [formBank, setFormBank] = useState<string>(() => selectedBank);

  useEffect(() => {
    setUploadBank(selectedBank);
    setFormBank(selectedBank);
  }, [selectedBank]);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Sledovanie týždenných výkazov state
  const [trackerMonth, setTrackerMonth] = useState('2026-07');

  // Sync trackerMonth and default form date with selectedMonth prop
  useEffect(() => {
    if (selectedMonth) {
      setTrackerMonth(selectedMonth);
      const todayStr = new Date().toISOString().split('T')[0];
      if (todayStr.startsWith(selectedMonth)) {
        setDate(todayStr);
      } else {
        setDate(`${selectedMonth}-01`);
      }
    }
  }, [selectedMonth]);
  const [closedWeeks, setClosedWeeks] = useState<string[]>(() => {
    const saved = localStorage.getItem('family_budget_closed_weeks');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleClosedWeek = (weekId: string) => {
    setClosedWeeks(prev => {
      const next = prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId];
      localStorage.setItem('family_budget_closed_weeks', JSON.stringify(next));
      return next;
    });
  };

  const getTransactionsForWeekRange = (yearMonth: string, startDay: number, endDay: number, bankName: string) => {
    return transactions.filter(t => {
      if (!t.date.startsWith(yearMonth)) return false;
      const parts = t.date.split('-');
      if (parts.length < 3) return false;
      const day = parseInt(parts[2], 10);
      const isDateInWeek = day >= startDay && day <= endDay;
      if (!isDateInWeek) return false;

      const tBank = t.bank || (banks[0] || 'Slovenská sporiteľňa');
      return tBank.toLowerCase() === bankName.toLowerCase();
    });
  };

  // Handle manual submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const numAmount = parseFloat(amount);
    const finalAmount = isExpense ? -Math.abs(numAmount) : Math.abs(numAmount);

    const finalCat = isExpense ? category : 'PRÍJMY';
    const finalSubcat = subcategory || (catMap[finalCat]?.[0] || '');

    onAddTransaction({
      date,
      description,
      amount: finalAmount,
      category: finalCat,
      subcategory: finalSubcat,
      currency: 'EUR',
      bank: formBank,
      comment: comment.trim() ? comment.trim() : undefined
    });

    const typeLabel = isExpense ? 'Výdavok' : 'Príjem';
    const formattedVal = Math.abs(finalAmount).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setAddSuccessNotice(`Úspešne pridaný ${typeLabel}: "${description}" (${formattedVal} €)`);
    setTimeout(() => setAddSuccessNotice(null), 4500);

    // Reset fields
    setDescription('');
    setAmount('');
    setComment('');
  };

  // Call Express API to parse statement
  const handleParseStatement = async (textToParse: string) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const data = await parseBankStatement({ statementText: textToParse });
      setParsedTransactions(data.transactions);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Nepodarilo sa spracovať výpis cez AI. Skontrolujte kľúč GEMINI_API_KEY.');
    } finally {
      setIsParsing(false);
    }
  };

  // Process uploaded or dropped files (images or text bank statements)
  const processFile = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setParsedTransactions([]);
    setStatementText('');

    try {
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const dataUrl = event.target?.result as string;
            const base64Content = dataUrl.split(',')[1];
            
            const data = await parseBankStatement({
              fileBase64: base64Content,
              fileMimeType: file.type
            });

            setParsedTransactions(data.transactions);
          } catch (err: any) {
            console.error(err);
            setParseError(err.message || 'Nepodarilo sa spracovať obrázok cez AI. Skontrolujte kľúč GEMINI_API_KEY.');
          } finally {
            setIsParsing(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const text = event.target?.result as string;
            setStatementText(text);

            const data = await parseBankStatement({ statementText: text });
            setParsedTransactions(data.transactions);
          } catch (err: any) {
            console.error(err);
            setParseError(err.message || 'Nepodarilo sa spracovať výpis cez AI. Skontrolujte kľúč GEMINI_API_KEY.');
          } finally {
            setIsParsing(false);
          }
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      console.error(err);
      setParseError('Chyba pri spracovaní súboru.');
      setIsParsing(false);
    }
  };

  // Read uploaded file as text or image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleUpdateParsedField = (index: number, field: keyof Omit<Transaction, 'id'>, value: any) => {
    setParsedTransactions(prev => prev.map((t, i) => {
      if (i !== index) return t;
      let updated = { ...t };
      if (field === 'amount') {
        const numVal = Math.abs(parseFloat(value) || 0);
        updated.amount = t.amount >= 0 ? numVal : -numVal;
      } else if (field === 'category') {
        updated.category = value;
        const subcats = catMap[value] || [];
        updated.subcategory = subcats[0] || '';
        if (value === 'PRÍJMY' || value === 'Príjmy') {
          updated.amount = Math.abs(updated.amount);
        } else if (t.category === 'PRÍJMY' || t.category === 'Príjmy') {
          updated.amount = -Math.abs(updated.amount);
        }
      } else {
        (updated as any)[field] = value;
      }
      return updated;
    }));
  };

  const handleToggleParsedType = (index: number) => {
    setParsedTransactions(prev => prev.map((t, i) => {
      if (i !== index) return t;
      const wasPositive = t.amount >= 0;
      const defaultExpenseCat = expenseCategories[0] || 'POTRAVINY';
      return {
        ...t,
        amount: wasPositive ? -Math.abs(t.amount) : Math.abs(t.amount),
        category: wasPositive 
          ? defaultExpenseCat
          : 'PRÍJMY',
        subcategory: wasPositive
          ? (catMap[defaultExpenseCat]?.[0] || '')
          : (catMap['PRÍJMY']?.[0] || '')
      };
    }));
  };

  const handleRemoveParsed = (index: number) => {
    setParsedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  // Commit all approved parsed transactions
  const handleCommitParsed = () => {
    const transactionsWithBank = parsedTransactions.map(t => ({
      ...t,
      bank: uploadBank
    }));
    onAddMultipleTransactions(transactionsWithBank);
    setParsedTransactions([]);
    setStatementText('');
    setShowParserModal(false);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'income' && t.amount > 0) || 
      (filterType === 'expense' && t.amount < 0);
    
    const matchesMonth = !selectedMonth || t.date.startsWith(selectedMonth);
    
    return matchesSearch && matchesCategory && matchesType && matchesMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]" id="transaction-list-container">
      {/* Header and Quick Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Transakcie & Výpisy z banky
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Nahrávajte výpisy alebo pridávajte transakcie ručne.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-upload-statement"
            onClick={() => {
              if (activeRole === 'viewer') {
                setViewerNotice('Prístup odmietnutý: Členovia rodiny s rolou "Len čítanie" nemôžu nahrávať bankové výpisy. Vpravo hore si môžete prepnúť rolu na "Adam (Správca)" alebo "Veri (Editor)".');
                return;
              }
              setParsedTransactions([]);
              setParseError(null);
              setShowParserModal(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 font-bold rounded-xl transition text-xs cursor-pointer border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs ${
              activeRole === 'viewer'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
            }`}
            title={activeRole === 'viewer' ? 'Nemáte oprávnenie nahrávať výkazy' : 'Nahrať výpis z banky'}
          >
            <Upload className="w-3.5 h-3.5" />
            Nahrať výpis {activeRole === 'viewer' && '🔒'}
          </button>

          <button
            id="btn-add-income"
            onClick={handleOpenAddIncome}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-extrabold rounded-xl transition text-xs cursor-pointer shadow-xs border ${
              activeRole === 'viewer'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-500/10'
            }`}
            title={activeRole === 'viewer' ? 'Nemáte oprávnenie pridávať transakcie' : 'Pridať manuálny príjem'}
          >
            <ArrowUpRight className="w-4 h-4" />
            + Pridať príjem {activeRole === 'viewer' && '🔒'}
          </button>

          <button
            id="btn-add-expense"
            onClick={handleOpenAddExpense}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-extrabold rounded-xl transition text-xs cursor-pointer shadow-xs border ${
              activeRole === 'viewer'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-rose-500/10'
            }`}
            title={activeRole === 'viewer' ? 'Nemáte oprávnenie pridávať transakcie' : 'Pridať manuálny výdavok'}
          >
            <ArrowDownRight className="w-4 h-4" />
            - Pridať výdavok {activeRole === 'viewer' && '🔒'}
          </button>
        </div>
      </div>

      {/* Toast Banner for Added Transaction */}
      {addSuccessNotice && (
        <div className="mb-6 p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{addSuccessNotice}</span>
          </div>
          <button 
            onClick={() => setAddSuccessNotice(null)}
            className="text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Manual Add Form */}
      {showAddForm && (
        <form 
          id="manual-add-form"
          onSubmit={handleSubmit} 
          className={`mb-6 p-5 rounded-2xl border transition-all animate-fade-in shadow-md ${
            !isExpense 
              ? 'bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-900/50' 
              : 'bg-gradient-to-b from-rose-50/80 to-white dark:from-rose-950/20 dark:to-slate-900 border-rose-200 dark:border-rose-900/50'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white ${!isExpense ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {!isExpense ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                  Nová manuálna transakcia - {!isExpense ? 'PRÍJEM (+)' : 'VÝDAVOK (-)'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {!isExpense ? 'Zadajte príjem (mzda, dar, predaj, výnos...)' : 'Zadajte výdavok (nákup, faktúra, služba...)'}
                </p>
              </div>
            </div>

            {/* Type selector toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setIsExpense(false);
                  handleCategoryChange('PRÍJMY');
                }}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  !isExpense 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Príjem
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExpense(true);
                  handleCategoryChange(expenseCategories[0] || 'POTRAVINY');
                }}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isExpense 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" /> Výdavok
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dátum *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Banka / Účet *</label>
              <select
                value={formBank}
                onChange={(e) => setFormBank(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-indigo-600 cursor-pointer"
              >
                {banks.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {!isExpense ? 'Zdroj príjmu / Popis *' : 'Obchodník / Popis výdavku *'}
              </label>
              <input
                type="text"
                required
                placeholder={!isExpense ? 'napr. Mzda za júl, Predaj auta, Darček...' : 'napr. TESCO, Slovnaft, Telekom...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Suma (€) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-indigo-600 pr-8"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">€</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Kategória</label>
              <select
                disabled={!isExpense}
                value={isExpense ? category : 'PRÍJMY'}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-indigo-600 disabled:opacity-60 cursor-pointer"
              >
                {!isExpense ? (
                  <option value="PRÍJMY">PRÍJMY</option>
                ) : (
                  expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Podkategória</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-indigo-600 cursor-pointer"
              >
                {(catMap[isExpense ? category : 'PRÍJMY'] || []).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Poznámka / Komentár (nepovinné)</label>
            <input
              type="text"
              placeholder="Zadajte ľubovoľnú poznámku..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-indigo-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Zatvoriť
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow-md flex items-center gap-1.5 ${
                !isExpense
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              <Check className="w-4 h-4" />
              Uložiť {!isExpense ? 'príjem' : 'výdavok'}
            </button>
          </div>
        </form>
      )}

      {/* Sledovanie týždenných výkazov */}
      <div className="mb-6 p-5 bg-indigo-50/40 border border-indigo-100/60 rounded-2xl text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-indigo-100/20">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-950 flex items-center gap-2">
              📅 Týždenná evidencia výkazov (Bankové výpisy)
            </h3>
            <p className="text-[11px] text-indigo-700 font-semibold leading-relaxed mt-0.5">
              Sledujte stav nahratých výkazov po jednotlivých týždňoch mesiaca pre vybranú banku.
            </p>
          </div>
          
          {/* Month selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-black uppercase text-slate-400">Mesiac:</span>
            <select
              value={trackerMonth}
              onChange={(e) => setTrackerMonth(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-indigo-600 cursor-pointer"
            >
              <option value="2026-07">Júl 2026</option>
              <option value="2026-06">Jún 2026</option>
              <option value="2026-05">Máj 2026</option>
              <option value="2026-04">Apríl 2026</option>
              <option value="2026-03">Marec 2026</option>
              <option value="2026-02">Február 2026</option>
              <option value="2026-01">Január 2026</option>
            </select>
          </div>
        </div>

        {/* Bank Tabs and Add Bank Inline Form */}
        <div className="mb-5 pb-4 border-b border-indigo-100/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-indigo-950/60 mr-1">Aktívna banka:</span>
            {banks.map((bank) => (
              <button
                key={bank}
                onClick={() => setSelectedBank(bank)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                  selectedBank === bank
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {bank}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Názov novej banky..."
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-indigo-600 placeholder-slate-400 w-36"
            />
            <button
              onClick={() => {
                if (newBankName.trim() === '') return;
                const trimmed = newBankName.trim();
                if (!banks.includes(trimmed)) {
                  const updatedBanks = [...banks, trimmed];
                  setBanks(updatedBanks);
                  localStorage.setItem('family_budget_active_banks', JSON.stringify(updatedBanks));
                  setSelectedBank(trimmed);
                }
                setNewBankName('');
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-lg transition cursor-pointer"
            >
              + Pridať
            </button>
            {banks.length > 1 && (
              <button
                onClick={() => {
                  const updatedBanks = banks.filter(b => b !== selectedBank);
                  setBanks(updatedBanks);
                  localStorage.setItem('family_budget_active_banks', JSON.stringify(updatedBanks));
                  setSelectedBank(updatedBanks[0]);
                }}
                className="text-[10px] font-black text-red-500 hover:text-red-700 cursor-pointer ml-2 hover:underline"
                title={`Vymazať banku ${selectedBank}`}
              >
                Vymazať banku
              </button>
            )}
          </div>
        </div>

        {/* 5-week Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { id: 'w1', label: '1. týždeň', start: 1, end: 7, desc: '1. - 7. deň' },
            { id: 'w2', label: '2. týždeň', start: 8, end: 14, desc: '8. - 14. deň' },
            { id: 'w3', label: '3. týždeň', start: 15, end: 21, desc: '15. - 21. deň' },
            { id: 'w4', label: '4. týždeň', start: 22, end: 28, desc: '22. - 28. deň' },
            { id: 'w5', label: '5. týždeň', start: 29, end: 31, desc: '29. - koniec' },
          ].map((week) => {
            const weekId = `${selectedBank}-${trackerMonth}-${week.id}`;
            const weekTransactions = getTransactionsForWeekRange(trackerMonth, week.start, week.end, selectedBank);
            const hasTransactions = weekTransactions.length > 0;
            const isClosed = closedWeeks.includes(weekId);

            let statusBg = 'bg-white border-slate-200/80';
            let statusText = '⏳ Chýba výkaz';
            let statusDesc = `${week.desc}`;
            let showButton = !hasTransactions && !isClosed;

            if (hasTransactions) {
              statusBg = 'bg-emerald-50/70 border-emerald-100 text-emerald-900';
              statusText = '✅ Spracované';
              statusDesc = `${weekTransactions.length} transakcií`;
            } else if (isClosed) {
              statusBg = 'bg-slate-100/80 border-slate-200 text-slate-500';
              statusText = '⚪ Bez transakcií';
              statusDesc = 'Uzavretý týždeň';
            }

            return (
              <div
                key={week.id}
                className={`p-3.5 border rounded-xl flex flex-col justify-between min-h-[110px] transition duration-150 ${statusBg}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-[11px] text-slate-700 block">{week.label}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{week.desc}</span>
                  </div>
                  
                  <span className="font-extrabold text-xs block mt-2">
                    {statusText}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5 font-bold">
                    {statusDesc}
                  </span>
                </div>

                <div className="mt-3.5 pt-2 border-t border-dotted border-slate-200/50 flex items-center justify-between gap-2">
                  {showButton ? (
                    <button
                      onClick={() => {
                        if (activeRole === 'viewer') {
                          setViewerNotice('Prístup odmietnutý: Členovia rodiny s rolou "Len čítanie" nemôžu nahrávať bankové výpisy.');
                          return;
                        }
                        setParsedTransactions([]);
                        setParseError(null);
                        setUploadBank(selectedBank);
                        setShowParserModal(true);
                      }}
                      className={`text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                        activeRole === 'viewer'
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-indigo-700 hover:text-indigo-900'
                      }`}
                    >
                      🚀 Nahrať {activeRole === 'viewer' && '🔒'}
                    </button>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400">Pripravené</span>
                  )}

                  {!hasTransactions && (
                    <button
                      onClick={() => {
                        if (activeRole === 'viewer') {
                          setViewerNotice('Prístup odmietnutý: Členovia rodiny s rolou "Len čítanie" nemôžu meniť stav uzávierky týždňa.');
                          return;
                        }
                        toggleClosedWeek(weekId);
                      }}
                      className={`text-[9px] font-bold transition cursor-pointer ${
                        activeRole === 'viewer'
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-400 hover:text-indigo-600'
                      }`}
                      title={isClosed ? 'Znovu otvoriť týždeň' : 'Označiť týždeň ako prázdny'}
                    >
                      {isClosed ? 'Otvoriť' : 'Zavrieť'} {activeRole === 'viewer' && '🔒'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4 pb-4 border-b border-slate-100">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Hľadať v popise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-indigo-600"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md transition ${filterType === 'all' ? 'bg-white font-semibold text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Všetko
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1 rounded-md transition ${filterType === 'expense' ? 'bg-white font-semibold text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Výdavky
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1 rounded-md transition ${filterType === 'income' ? 'bg-white font-semibold text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Príjmy
            </button>
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs focus:outline-indigo-600 cursor-pointer"
            >
              <option value="All">Všetky kategórie</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
              <th className="py-3 px-4">Dátum</th>
              <th className="py-3 px-4">Popis</th>
              <th className="py-3 px-4">Kategória</th>
              <th className="py-3 px-4 text-right">Suma</th>
              <th className="py-3 px-4 text-right">Akcia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                  Nenašli sa žiadne transakcie zodpovedajúce filtrom.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 group transition duration-150">
                  <td className="py-3 px-4 text-slate-500 text-sm whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('sk-SK')}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 text-sm">
                    <div className="break-all">{t.description}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {t.bank && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 px-1.5 py-0.5 rounded-sm">
                          🏦 {t.bank}
                        </span>
                      )}
                    </div>

                    {/* Interactive Comment Section */}
                    {editingCommentId === t.id ? (
                      <div className="mt-2 p-1.5 bg-indigo-50/40 border border-indigo-100 rounded-lg flex items-center gap-1.5 animate-fade-in max-w-sm">
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-indigo-600 font-semibold text-slate-800"
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          placeholder="Zadajte komentár..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (onUpdateTransaction) {
                                onUpdateTransaction({ ...t, comment: editingCommentText.trim() || undefined });
                              }
                              setEditingCommentId(null);
                            } else if (e.key === 'Escape') {
                              setEditingCommentId(null);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (onUpdateTransaction) {
                              onUpdateTransaction({ ...t, comment: editingCommentText.trim() || undefined });
                            }
                            setEditingCommentId(null);
                          }}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer transition"
                        >
                          Uložiť
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer px-1 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-center gap-2">
                        {t.comment ? (
                          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 italic flex items-center gap-1.5 group/comment">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="break-words font-medium">{t.comment}</span>
                            {activeRole !== 'viewer' && (
                              <button
                                onClick={() => {
                                  setEditingCommentId(t.id);
                                  setEditingCommentText(t.comment || '');
                                }}
                                className="text-slate-400 hover:text-indigo-600 ml-1 sm:opacity-0 group-hover/comment:opacity-100 transition cursor-pointer"
                                title="Upraviť komentár"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          activeRole !== 'viewer' && (
                            <button
                              onClick={() => {
                                setEditingCommentId(t.id);
                                setEditingCommentText('');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-600 font-bold transition cursor-pointer sm:opacity-0 group-hover:opacity-100"
                              title="Pridať komentár"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
                              Pridať komentár
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        t.category === 'PRÍJMY' || t.category === 'Príjmy' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        t.category === 'POTRAVINY' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        t.category === 'BÝVANIE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        t.category === 'DOPRAVA A MOBILITA' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        t.category === 'DETI' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        t.category === 'ZDRAVIE A STAROSTLIVOSŤ' ? 'bg-red-50 text-red-700 border-red-100' :
                        t.category === 'VOĽNÝ ČAS A ODDÝCH, DOMÁCE ZVIERATÁ' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        t.category === 'PREDPLATNÉ' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                        t.category === 'SPORENIE' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                        t.category === 'CHARITA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        t.category === 'DROGÉRIA' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' :
                        t.category === 'OBLEČENIE' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-slate-50 text-slate-700 border-slate-100'
                      }`}>
                        {t.category}
                      </span>
                      {t.subcategory && (
                        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                          {t.subcategory}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold text-sm whitespace-nowrap ${t.amount > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="py-3 px-4 text-right">
                    {activeRole !== 'viewer' && (
                      <button
                        onClick={() => onDeleteTransaction(t.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition group-hover:opacity-100 sm:opacity-0 cursor-pointer"
                        title="Vymazať"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* AI statement upload modal */}
      {showParserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Spracovanie výpisu pomocou AI (Gemini)
              </h3>
              <button
                onClick={() => {
                  setShowParserModal(false);
                  setParsedTransactions([]);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1.5 cursor-pointer"
              >
                Zatvoriť
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              Nasaďte súbor s výpisom (alebo vložte text transakcií) a naša umelá inteligencia automaticky prečíta, extrahuje a správne kategorizuje všetky Vaše výdavky a príjmy.
            </p>

            {/* Input area */}
            <div className="space-y-4">
              {/* Bank selector for upload */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  🏦 Tento výpis patrí banke:
                </span>
                <select
                  value={uploadBank}
                  onChange={(e) => setUploadBank(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer focus:outline-indigo-600 sm:w-48"
                >
                  {banks.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setStatementText(mockBankStatementText);
                    handleParseStatement(mockBankStatementText);
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-300 text-indigo-700 font-semibold rounded-xl transition text-sm cursor-pointer"
                >
                  <FileText className="w-5 h-5" />
                  Vyskúšať Demo Výpis (Slovak)
                </button>

                <label 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processFile(file);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition text-center ${
                    isDragging 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <Upload className={`w-5 h-5 mb-1 ${isDragging ? 'text-indigo-600 animate-bounce' : 'text-slate-500'}`} />
                  <span className="text-slate-700 font-semibold text-sm">Nahrať súbor (.csv, .txt, .jpg, .png)</span>
                  <span className="text-slate-400 text-xs mt-1">Alebo pretiahnite súbor / obrázok sem</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 mb-1">Alebo vložte skopírovaný text z banky:</label>
                <textarea
                  rows={4}
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  placeholder="01.06.2026 | TESCO VÝDAJ | -45.20 EUR ..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-indigo-600 focus:bg-white bg-slate-50"
                />
                <button
                  type="button"
                  disabled={isParsing || !statementText.trim()}
                  onClick={() => handleParseStatement(statementText)}
                  className="mt-2 self-end flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-xl text-sm transition cursor-pointer"
                >
                  {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Analyzovať vložený text
                </button>
              </div>
            </div>

            {/* Parsing feedback */}
            {isParsing && (
              <div className="mt-6 flex flex-col items-center justify-center py-8 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="font-semibold text-indigo-900 text-sm">Gemini AI analyzuje Váš výpis...</p>
                <p className="text-indigo-600/70 text-xs mt-1">Spracovávame transakcie a priraďujeme kategórie.</p>
              </div>
            )}

            {parseError && (
              <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs">
                <p className="font-semibold mb-1">Chyba pri AI analýze:</p>
                <p>{parseError}</p>
                <p className="mt-2 text-rose-600">Tip: Uistite sa, že server beží a v AI Studio Secrets je nastavený platný kľúč GEMINI_API_KEY.</p>
              </div>
            )}

            {/* Parsed results list / Revision view */}
            {parsedTransactions.length > 0 && (() => {
              const parsedIncomesList = parsedTransactions.filter(pt => pt.amount >= 0);
              const parsedExpensesList = parsedTransactions.filter(pt => pt.amount < 0);
              
              const totalParsedIncomes = parsedIncomesList.reduce((acc, curr) => acc + curr.amount, 0);
              const totalParsedExpenses = parsedExpensesList.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
              const netParsedBalance = totalParsedIncomes - totalParsedExpenses;

              // Filter parsed transactions based on selected revision tab
              const visibleParsed = parsedTransactions.map((pt, idx) => ({ pt, idx })).filter(({ pt }) => {
                if (revisionTab === 'income') return pt.amount >= 0;
                if (revisionTab === 'expense') return pt.amount < 0;
                return true;
              });

              return (
                <div className="mt-6 border border-slate-200 rounded-2xl bg-slate-50/50 p-4 animate-fade-in text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 bg-emerald-50 p-0.5 rounded-full" />
                        Revízia, korekcia a udobrenie transakcií
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Pred finálnym prevzatím údajov skontrolujte sumy, kategórie a upravte automatické triedenie podľa potreby.
                      </p>
                    </div>
                  </div>

                  {/* Revision Summary Dashboard */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-center">
                      <span className="block text-[9px] font-black uppercase text-emerald-700 tracking-wider">Celkom Príjmy</span>
                      <span className="text-sm font-extrabold text-emerald-800 mt-0.5 block">
                        +{totalParsedIncomes.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{parsedIncomesList.length} položiek</span>
                    </div>
                    <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 text-center">
                      <span className="block text-[9px] font-black uppercase text-rose-700 tracking-wider">Celkom Výdavky</span>
                      <span className="text-sm font-extrabold text-rose-800 mt-0.5 block">
                        -{totalParsedExpenses.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                      </span>
                      <span className="text-[10px] text-rose-600 font-semibold">{parsedExpensesList.length} položiek</span>
                    </div>
                    <div className={`rounded-xl p-3 text-center border ${
                      netParsedBalance >= 0 
                        ? 'bg-indigo-50/80 border-indigo-100 text-indigo-800' 
                        : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Čistá bilancia</span>
                      <span className="text-sm font-extrabold mt-0.5 block">
                        {netParsedBalance >= 0 ? '+' : ''}{netParsedBalance.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">Rozdiel výpisu</span>
                    </div>
                  </div>

                  {/* Subtabs to filter revision list */}
                  <div className="flex border-b border-slate-200 mb-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setRevisionTab('all')}
                      className={`px-3 py-2 font-bold tracking-wide border-b-2 transition cursor-pointer ${
                        revisionTab === 'all' 
                          ? 'border-indigo-600 text-indigo-600' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Všetko ({parsedTransactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevisionTab('income')}
                      className={`px-3 py-2 font-bold tracking-wide border-b-2 transition cursor-pointer ${
                        revisionTab === 'income' 
                          ? 'border-emerald-600 text-emerald-600' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Iba Príjmy ({parsedIncomesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevisionTab('expense')}
                      className={`px-3 py-2 font-bold tracking-wide border-b-2 transition cursor-pointer ${
                        revisionTab === 'expense' 
                          ? 'border-rose-600 text-rose-600' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Iba Výdavky ({parsedExpensesList.length})
                    </button>
                  </div>

                  {/* Revision Scrollable Table-List */}
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 border border-slate-200/80 rounded-xl bg-white shadow-xs">
                    {visibleParsed.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        V tejto záložke nie sú žiadne položky na revíziu.
                      </div>
                    ) : (
                      visibleParsed.map(({ pt, idx }) => {
                        const isIncome = pt.amount >= 0;
                        return (
                          <div key={idx} className="p-3 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-3 transition">
                            
                            {/* Left part: Date, Type Toggle & Description */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                              {/* Date input */}
                              <div className="md:col-span-3">
                                <input
                                  type="date"
                                  value={pt.date}
                                  onChange={(e) => handleUpdateParsedField(idx, 'date', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-indigo-500 font-mono"
                                />
                              </div>
                              
                              {/* Type Toggle */}
                              <div className="md:col-span-3 flex justify-start">
                                <button
                                  type="button"
                                  onClick={() => handleToggleParsedType(idx)}
                                  className={`w-full text-[9px] font-black uppercase px-2 py-1 rounded text-center transition tracking-wide cursor-pointer ${
                                    isIncome 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                  title="Kliknite pre zmenu typu (Príjem / Výdavok)"
                                >
                                  {isIncome ? '➕ PRÍJEM' : '➖ VÝDAVOK'}
                                </button>
                              </div>

                              {/* Description input */}
                              <div className="md:col-span-6">
                                <input
                                  type="text"
                                  value={pt.description}
                                  onChange={(e) => handleUpdateParsedField(idx, 'description', e.target.value)}
                                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-indigo-500 focus:bg-white"
                                  placeholder="Popis transakcie"
                                />
                              </div>
                            </div>

                            {/* Right part: Category select, Subcategory select, Amount & Remove Action */}
                            <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0">
                              
                              {/* Category Dropdown */}
                              <div className="w-28">
                                <select
                                  value={pt.category}
                                  onChange={(e) => handleUpdateParsedField(idx, 'category', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs focus:outline-indigo-500 font-medium cursor-pointer"
                                >
                                  {isIncome ? (
                                    <option value="PRÍJMY">PRÍJMY</option>
                                  ) : (
                                    expenseCategories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))
                                  )}
                                </select>
                              </div>

                              {/* Subcategory Dropdown */}
                              <div className="w-28">
                                <select
                                  value={pt.subcategory || ''}
                                  onChange={(e) => handleUpdateParsedField(idx, 'subcategory', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs focus:outline-indigo-500 font-medium cursor-pointer"
                                >
                                  {(catMap[pt.category] || []).map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Amount Input */}
                              <div className="relative w-24">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={Math.abs(pt.amount) || ''}
                                  onChange={(e) => handleUpdateParsedField(idx, 'amount', e.target.value)}
                                  className={`w-full pr-5 pl-2 py-1 border border-slate-200 rounded text-xs text-right font-bold focus:outline-indigo-500 ${
                                    isIncome ? 'text-emerald-600 focus:text-emerald-700' : 'text-slate-800'
                                  }`}
                                  placeholder="0.00"
                                />
                                <span className="absolute right-1.5 top-1 text-[10px] font-bold text-slate-400">€</span>
                              </div>

                              {/* Delete action */}
                              <button
                                type="button"
                                onClick={() => handleRemoveParsed(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-md transition cursor-pointer"
                                title="Odstrániť z výpisu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setParsedTransactions([])}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 transition uppercase tracking-wider cursor-pointer"
                    >
                      Zahodiť / Vyčistiť všetko
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitParsed}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider rounded-xl text-xs shadow-xs transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Schváliť a importovať ({parsedTransactions.length})
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Viewer Notice Modal */}
      {viewerNotice && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Obmedzenie roly</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{viewerNotice}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewerNotice(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
