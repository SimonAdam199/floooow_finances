import React, { useState, useEffect } from 'react';
import { SettleUpGroup, SettleUpExpense, UserRole } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Coins, 
  Check, 
  User, 
  Sparkles, 
  Undo,
  Utensils,
  Home,
  Car,
  Wine,
  Activity,
  Layers,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface SettleUpTrackerProps {
  activeRole?: UserRole;
}

const DEFAULT_GROUPS: SettleUpGroup[] = [];

const CATEGORIES = [
  { name: 'Jedlo', icon: Utensils, bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' },
  { name: 'Ubytovanie', icon: Home, bg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' },
  { name: 'Cestovné', icon: Car, bg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' },
  { name: 'Nápoje & Bary', icon: Wine, bg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' },
  { name: 'Zábava', icon: Activity, bg: 'bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400' },
  { name: 'Ostatné', icon: Layers, bg: 'bg-slate-50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400' }
];

export default function SettleUpTracker({ activeRole = 'viewer' }: SettleUpTrackerProps) {
  // State for all Settle Up groups
  const [groups, setGroups] = useState<SettleUpGroup[]>(() => {
    const saved = localStorage.getItem('family_budget_settleup');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse settleup groups', e);
      }
    }
    return DEFAULT_GROUPS;
  });

  // Active selected group
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    return groups.length > 0 ? groups[0].id : '';
  });

  // Save to localStorage when groups state changes
  useEffect(() => {
    localStorage.setItem('family_budget_settleup', JSON.stringify(groups));
  }, [groups]);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

  // Forms / UI interactive states
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');

  const [newMemberName, setNewMemberName] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);

  // New Expense form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [expenseSplitWith, setExpenseSplitWith] = useState<string[]>([]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState('Jedlo');

  // Helper to handle local state updates
  const updateGroupState = (updatedGroup: SettleUpGroup) => {
    setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
  };

  // Pre-fill fields on group change
  useEffect(() => {
    if (activeGroup) {
      setExpensePaidBy(activeGroup.members[0] || '');
      setExpenseSplitWith(activeGroup.members);
    }
  }, [activeGroupId]);

  // Handle adding a new group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const membersList = newGroupMembers
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    const finalMembers = membersList.length >= 2 ? membersList : ['Ja', 'Kamoš'];

    const newGroup: SettleUpGroup = {
      id: `g-${Date.now()}`,
      name: newGroupName.trim(),
      members: Array.from(new Set(finalMembers)),
      expenses: [],
      createdDate: new Date().toISOString().split('T')[0]
    };

    setGroups(prev => [newGroup, ...prev]);
    setActiveGroupId(newGroup.id);
    setNewGroupName('');
    setNewGroupMembers('');
    setShowAddGroup(false);
  };

  // Add a member to current group
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !activeGroup) return;

    const trimmed = newMemberName.trim();
    if (activeGroup.members.includes(trimmed)) return;

    const updatedGroup = {
      ...activeGroup,
      members: [...activeGroup.members, trimmed]
    };

    updateGroupState(updatedGroup);
    setNewMemberName('');
  };

  // Remove member from group
  const handleRemoveMember = (member: string) => {
    if (!activeGroup) return;
    if (activeGroup.members.length <= 2) {
      alert('Skupina musí mať aspoň 2 členov.');
      return;
    }

    const hasExpenses = activeGroup.expenses.some(e => e.paidBy === member || e.splitWith.includes(member));
    if (hasExpenses) {
      if (!confirm(`Člen "${member}" figuruje v niektorých výdavkoch. Jeho vymazaním môžete narušiť výpočty. Naozaj vymazať?`)) {
        return;
      }
    }

    const updatedGroup = {
      ...activeGroup,
      members: activeGroup.members.filter(m => m !== member),
      expenses: activeGroup.expenses.map(e => ({
        ...e,
        splitWith: e.splitWith.filter(m => m !== member)
      })).filter(e => e.paidBy !== member)
    };

    updateGroupState(updatedGroup);
  };

  // Delete whole group
  const handleDeleteGroup = (id: string) => {
    if (groups.length <= 1) {
      alert('Musí zostať aspoň jedna skupina.');
      return;
    }
    if (confirm('Naozaj chcete vymazať celú túto akciu a všetky jej výdavky?')) {
      const remaining = groups.filter(g => g.id !== id);
      setGroups(remaining);
      setActiveGroupId(remaining[0].id);
    }
  };

  // Toggle select member in split list
  const handleToggleSplitMember = (member: string) => {
    if (expenseSplitWith.includes(member)) {
      if (expenseSplitWith.length > 1) {
        setExpenseSplitWith(prev => prev.filter(m => m !== member));
      }
    } else {
      setExpenseSplitWith(prev => [...prev, member]);
    }
  };

  // Add new Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amount) || amount <= 0 || !activeGroup) return;

    const newExp: SettleUpExpense = {
      id: `e-${Date.now()}`,
      title: expenseTitle.trim(),
      amount,
      paidBy: expensePaidBy,
      splitWith: expenseSplitWith,
      date: expenseDate,
      category: expenseCategory
    };

    const updatedGroup = {
      ...activeGroup,
      expenses: [newExp, ...activeGroup.expenses]
    };

    updateGroupState(updatedGroup);

    setExpenseTitle('');
    setExpenseAmount('');
    setShowAddExpense(false);
  };

  // Delete single expense
  const handleDeleteExpense = (expId: string) => {
    if (!activeGroup) return;
    const updatedGroup = {
      ...activeGroup,
      expenses: activeGroup.expenses.filter(e => e.id !== expId)
    };
    updateGroupState(updatedGroup);
  };

  // Balance calculations
  const calculateBalancesAndDebts = () => {
    if (!activeGroup) return { balances: {}, totalPaid: {}, totalShare: {}, debts: [] };

    const balances: Record<string, number> = {};
    const totalPaid: Record<string, number> = {};
    const totalShare: Record<string, number> = {};

    activeGroup.members.forEach(m => {
      balances[m] = 0;
      totalPaid[m] = 0;
      totalShare[m] = 0;
    });

    activeGroup.expenses.forEach(exp => {
      const { paidBy, amount, splitWith } = exp;

      if (totalPaid[paidBy] !== undefined) {
        totalPaid[paidBy] += amount;
      }

      if (balances[paidBy] !== undefined) {
        balances[paidBy] += amount;
      }

      if (splitWith.length > 0) {
        const share = amount / splitWith.length;
        splitWith.forEach(m => {
          if (totalShare[m] !== undefined) {
            totalShare[m] += share;
          }
          if (balances[m] !== undefined) {
            balances[m] -= share;
          }
        });
      }
    });

    const debtors: { name: string; amount: number }[] = [];
    const creditors: { name: string; amount: number }[] = [];

    Object.entries(balances).forEach(([name, balance]) => {
      if (balance < -0.01) {
        debtors.push({ name, amount: -balance });
      } else if (balance > 0.01) {
        creditors.push({ name, amount: balance });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debts: { from: string; to: string; amount: number }[] = [];
    let i = 0, j = 0;
    const tempDebtors = debtors.map(d => ({ ...d }));
    const tempCreditors = creditors.map(c => ({ ...c }));

    while (i < tempDebtors.length && j < tempCreditors.length) {
      const debtor = tempDebtors[i];
      const creditor = tempCreditors[j];

      const payment = Math.min(debtor.amount, creditor.amount);
      if (payment > 0.01) {
        debts.push({
          from: debtor.name,
          to: creditor.name,
          amount: parseFloat(payment.toFixed(2))
        });
      }

      debtor.amount -= payment;
      creditor.amount -= payment;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return { balances, totalPaid, totalShare, debts };
  };

  const { balances, totalPaid, totalShare, debts } = calculateBalancesAndDebts();
  const totalGroupSpent = activeGroup ? activeGroup.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
  const averageSpentPerPerson = activeGroup && activeGroup.members.length > 0 ? totalGroupSpent / activeGroup.members.length : 0;

  // Settle up a specific debt automatically
  const handleSettleDebt = (from: string, to: string, amount: number) => {
    if (!activeGroup) return;

    const newSettlement: SettleUpExpense = {
      id: `e-settle-${Date.now()}`,
      title: `Vyrovnanie: ${from} ➔ ${to}`,
      amount,
      paidBy: from,
      splitWith: [to],
      date: new Date().toISOString().split('T')[0],
      category: 'Ostatné',
      isSettlement: true
    };

    const updatedGroup = {
      ...activeGroup,
      expenses: [newSettlement, ...activeGroup.expenses]
    };

    updateGroupState(updatedGroup);
  };

  const getCategoryColor = (catName: string) => {
    const found = CATEGORIES.find(c => c.name === catName);
    return found ? found.bg : 'bg-slate-100 text-slate-600';
  };

  const getCategoryIcon = (catName: string) => {
    const found = CATEGORIES.find(c => c.name === catName);
    const IconComponent = found ? found.icon : Layers;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6" id="settleup-app-section">
      {/* Group Switcher and Header panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
              Settle Up - Rozdelenie výdavkov
            </span>
            <h2 className="text-xl font-bold text-slate-800 mt-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Spoločné akcie a vyrovnanie
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Pridajte ľudí, zaznamenajte spoločné nákupy a zistite kto má komu vrátiť peniaze s najnižším počtom platieb.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Akcia:</span>
              <select
                value={activeGroupId}
                onChange={(e) => setActiveGroupId(e.target.value)}
                className="bg-white px-3 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-indigo-600"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {activeRole !== 'viewer' && (
              <button
                onClick={() => setShowAddGroup(!showAddGroup)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Nová akcia
              </button>
            )}

            {activeRole !== 'viewer' && activeGroup && (
              <button
                onClick={() => handleDeleteGroup(activeGroup.id)}
                className="p-2 border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                title="Vymazať celú túto akciu"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Create Group Slide-down Form */}
        {showAddGroup && (
          <form onSubmit={handleCreateGroup} className="mt-6 p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-4 animate-fade-in">
            <h3 className="font-bold text-sm text-indigo-900">Vytvoriť novú spoločnú akciu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Názov akcie / výletu</label>
                <input
                  type="text"
                  required
                  placeholder="napr. Dovolenka Chorvátsko 2026, Piatková večera"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Mená členov (oddelené čiarkou)</label>
                <input
                  type="text"
                  placeholder="napr. Adam, Elenka, Marek, Zuzka"
                  value={newGroupMembers}
                  onChange={(e) => setNewGroupMembers(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 font-medium"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Zadajte aspoň dvoch ľudí.</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddGroup(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs cursor-pointer text-slate-600 font-bold"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                Vytvoriť akciu
              </button>
            </div>
          </form>
        )}
      </div>

      {activeGroup ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT/MIDDLE: Expenses list and Add form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick stats for selected event */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Celkové výdavky akcie</span>
                <span className="text-2xl font-black text-slate-900 block mt-1">{totalGroupSpent.toLocaleString('sk-SK')} €</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Spolu nakúpené</span>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Počet ľudí v skupine</span>
                <span className="text-2xl font-black text-indigo-600 block mt-1">{activeGroup.members.length}</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Aktívni účastníci</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Priemer na osobu</span>
                <span className="text-2xl font-black text-slate-900 block mt-1">{averageSpentPerPerson.toLocaleString('sk-SK', { maximumFractionDigits: 1 })} €</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Fér podiel každého</span>
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Zoznam výdavkov a platieb</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Zoznam nákupov evidovaných pre túto akciu.</p>
                </div>

                {activeRole !== 'viewer' && (
                  <button
                    onClick={() => {
                      setExpensePaidBy(activeGroup.members[0] || '');
                      setExpenseSplitWith(activeGroup.members);
                      setShowAddExpense(!showAddExpense);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nový nákup
                  </button>
                )}
              </div>

              {/* Add Expense Form */}
              {showAddExpense && (
                <form onSubmit={handleAddExpense} className="mb-6 p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-4 animate-fade-in">
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Zaevidovať nový spoločný nákup</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Názov výdavku</label>
                      <input
                        type="text"
                        required
                        placeholder="napr. Nákup v Lidli, Taxi, Pivo"
                        value={expenseTitle}
                        onChange={(e) => setExpenseTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Suma (€)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        placeholder="napr. 45.50"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Kto to zaplatil?</label>
                      <select
                        value={expensePaidBy}
                        onChange={(e) => setExpensePaidBy(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 cursor-pointer font-semibold"
                      >
                        {activeGroup.members.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Kategória</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 cursor-pointer font-semibold"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Dátum</label>
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Multi-select split members */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Medzi koho sa to delí? ({expenseSplitWith.length} ľudí)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {activeGroup.members.map(m => {
                        const isSelected = expenseSplitWith.includes(m);
                        return (
                          <button
                            type="button"
                            key={m}
                            onClick={() => handleToggleSplitMember(m)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                                : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {m}
                          </button>
                        );
                      })}
                    </div>
                    {expenseSplitWith.length > 0 && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Každý zaplatí rovným dielom: <strong className="text-slate-600">{((parseFloat(expenseAmount) || 0) / expenseSplitWith.length).toFixed(2)} €</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddExpense(false)}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer text-slate-600"
                    >
                      Zrušiť
                    </button>
                    <button
                      type="submit"
                      disabled={expenseSplitWith.length === 0}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition"
                    >
                      Uložiť nákup
                    </button>
                  </div>
                </form>
              )}

              {/* Table / List */}
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                {activeGroup.expenses.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Nie sú zaevidované žiadne výdavky pre túto akciu. Kliknite na "Nový nákup".
                  </div>
                ) : (
                  activeGroup.expenses.map(e => (
                    <div key={e.id} className="py-3.5 flex items-center justify-between gap-4 group">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${getCategoryColor(e.category)}`}>
                          {getCategoryIcon(e.category)}
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs font-black text-slate-800 truncate flex items-center gap-1.5 ${e.isSettlement ? 'italic text-indigo-700' : ''}`}>
                            {e.title}
                            {e.isSettlement && (
                              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">
                                Vyrovnanie
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>Zaplatil: <strong className="text-slate-600">{e.paidBy}</strong></span>
                            <span>•</span>
                            <span>Pre: <strong className="text-slate-600" title={e.splitWith.join(', ')}>
                              {e.splitWith.length === activeGroup.members.length ? 'Všetkých' : `${e.splitWith.length} členov`}
                            </strong></span>
                            <span>•</span>
                            <span>{new Date(e.date).toLocaleDateString('sk-SK')}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900 block">
                            {e.amount.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                          </span>
                          {!e.isSettlement && e.splitWith.length > 0 && (
                            <span className="text-[9px] text-slate-400 block font-medium">
                              {Math.round(e.amount / e.splitWith.length * 100) / 100} € / os.
                            </span>
                          )}
                        </div>

                        {activeRole !== 'viewer' && (
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                            title="Vymazať výdavok"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Balances & Optimal settlement transactions */}
          <div className="space-y-6">
            
            {/* Balance panel of members */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" />
                Bilancia účastníkov
              </h3>
              
              <div className="space-y-4">
                {activeGroup.members.map(m => {
                  const balance = balances[m] || 0;
                  const paid = totalPaid[m] || 0;
                  const share = totalShare[m] || 0;
                  const isCreditor = balance > 0.01;
                  const isDebtor = balance < -0.01;

                  return (
                    <div key={m} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {m}
                        </span>
                        <span className={`text-xs font-extrabold ${isCreditor ? 'text-emerald-600' : isDebtor ? 'text-rose-600' : 'text-slate-500'}`}>
                          {balance > 0.01 ? `Má dostať: +${balance.toFixed(2)} €` : balance < -0.01 ? `Dlh: ${balance.toFixed(2)} €` : 'Vyrovnaný'}
                        </span>
                      </div>

                      {/* Visual gauge */}
                      <div className="w-full h-1.5 bg-slate-150 rounded-full overflow-hidden flex">
                        {isCreditor ? (
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${Math.min(100, (balance / (totalGroupSpent || 1)) * 200)}%` }} 
                          />
                        ) : isDebtor ? (
                          <div 
                            className="h-full bg-rose-500 ml-auto" 
                            style={{ width: `${Math.min(100, (Math.abs(balance) / (totalGroupSpent || 1)) * 200)}%` }} 
                          />
                        ) : null}
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>Zaplatil(a): {paid.toFixed(1)} €</span>
                        <span>Skutočný podiel: {share.toFixed(1)} €</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Members Manager (add members) */}
              {activeRole !== 'viewer' && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Pridať ďalšieho človeka..."
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Pridať
                    </button>
                  </form>
                  
                  {activeGroup.members.length > 2 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {activeGroup.members.map(m => (
                        <span 
                          key={m} 
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-lg border border-slate-200/60"
                        >
                          {m}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveMember(m)}
                            className="text-slate-400 hover:text-rose-500 font-black cursor-pointer ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Optimal debts solver panel */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Odporúčané vyrovnanie
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                Settle Up inteligentne zjednodušil platby medzi ľuďmi na minimum. Tu sú transakcie potrebné na plné vyrovnanie:
              </p>

              <div className="space-y-2.5">
                {debts.length === 0 ? (
                  <div className="p-4 bg-slate-800/50 border border-slate-800 rounded-xl text-center text-xs text-emerald-400 font-bold flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                    Všetky výdavky v tejto akcii sú plne vyrovnané!
                  </div>
                ) : (
                  debts.map((d, index) => (
                    <div 
                      key={index} 
                      className="bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/debt"
                    >
                      <div className="text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-rose-300 font-black">{d.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-emerald-300 font-black">{d.to}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">Pošle peniaze</span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5">
                        <span className="text-sm font-black text-indigo-300">
                          {d.amount.toFixed(2)} €
                        </span>
                        
                        {activeRole !== 'viewer' && (
                          <button
                            onClick={() => handleSettleDebt(d.from, d.to, d.amount)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                            title="Kliknutím zaznamenáte túto platbu ako vykonanú"
                          >
                            <Check className="w-3 h-3" />
                            Zaplatené
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {activeGroup.expenses.some(e => e.isSettlement) && (
                <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Evidujete vyrovnávacie platby</span>
                  <button
                    onClick={() => {
                      if (confirm('Naozaj chcete vymazať všetky ručne zaevidované vyrovnávacie platby v tejto akcii?')) {
                        const updatedGroup = {
                          ...activeGroup,
                          expenses: activeGroup.expenses.filter(e => !e.isSettlement)
                        };
                        updateGroupState(updatedGroup);
                      }
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Undo className="w-3 h-3" />
                    Reset vyrovnaní
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white p-12 text-center text-slate-400 border border-slate-100 rounded-2xl shadow-xs">
          Vytvorte svoju prvú spoločnú akciu alebo výlet, aby ste mohli začať deliť výdavky.
        </div>
      )}
    </div>
  );
}
