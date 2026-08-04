import React, { useState } from 'react';
import { 
  User, 
  Plus, 
  Trash2, 
  Check, 
  FolderKanban, 
  ChevronRight, 
  ChevronDown, 
  Sun, 
  Moon, 
  Coins, 
  LineChart, 
  Save, 
  Edit3,
  Sparkles,
  Info,
  FileSpreadsheet,
  Globe,
  Mail,
  Send,
  Copy,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import { BudgetLimit, Transaction, FamilyMember, UserRole } from '../types';
import GoogleSheetsSync from './GoogleSheetsSync';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES, Language } from '../i18n/translations';

interface SettingsManagerProps {
  // Users state
  userName: string;
  onSetUserName: (name: string) => void;
  familyMembers: FamilyMember[];
  onSetFamilyMembers: (members: FamilyMember[]) => void;
  activeRole: UserRole;
  
  // Category map state
  categoryMap: Record<string, string[]>;
  onSetCategoryMap: (map: Record<string, string[]>) => void;
  
  // Theme state
  darkMode: boolean;
  onSetDarkMode: (dark: boolean) => void;
  
  // Budget limits state
  budgets: BudgetLimit[];
  onUpdateBudgetLimit: (category: string, limit: number) => void;
  
  // Annual Reports settings
  annualSettings: {
    targetSavingsRate: number;
    annualInflationRate: number;
    incomeGoal: number;
  };
  onSetAnnualSettings: (settings: {
    targetSavingsRate: number;
    annualInflationRate: number;
    incomeGoal: number;
  }) => void;

  // Google Sheets Sync Props
  onImportTransactions: (transactions: Transaction[], replace: boolean) => void;
  onImportBudgets: (budgets: BudgetLimit[]) => void;
  onImportInvestments: (investments: any[]) => void;
  onImportMortgages: (mortgages: any[]) => void;
  onImportLiabilities: (liabilities: any[]) => void;
  onSetCategories: (categories: string[]) => void;
  currentTransactions: Transaction[];
  currentBudgets: BudgetLimit[];
  currentInvestments: any[];
  currentMortgages: any[];
  currentLiabilities: any[];
  onResetAllData?: () => void;
}

export default function SettingsManager({
  userName,
  onSetUserName,
  familyMembers,
  onSetFamilyMembers,
  categoryMap,
  onSetCategoryMap,
  activeRole,
  darkMode,
  onSetDarkMode,
  budgets,
  onUpdateBudgetLimit,
  annualSettings,
  onSetAnnualSettings,
  onImportTransactions,
  onImportBudgets,
  onImportInvestments,
  onImportMortgages,
  onImportLiabilities,
  onSetCategories,
  currentTransactions,
  currentBudgets,
  currentInvestments,
  currentMortgages,
  currentLiabilities,
  onResetAllData
}: SettingsManagerProps) {
  const { language, setLanguage, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'categories' | 'appearance' | 'budgets' | 'reports' | 'sync'>('users');

  // Local state for adding family members
  const [newMember, setNewMember] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('viewer');
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [editingMemberValue, setEditingMemberValue] = useState('');
  const [editingMemberEmail, setEditingMemberEmail] = useState('');
  const [editingMemberRole, setEditingMemberRole] = useState<UserRole>('viewer');
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [inviteModalMember, setInviteModalMember] = useState<FamilyMember | null>(null);

  // Local state for categories editing
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingCatKey, setEditingCatKey] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [editingSubIndex, setEditingSubIndex] = useState<number | null>(null);
  const [editingSubValue, setEditingSubValue] = useState('');

  // Local state for Annual settings
  const [targetSavingsRate, setTargetSavingsRate] = useState(annualSettings.targetSavingsRate);
  const [annualInflationRate, setAnnualInflationRate] = useState(annualSettings.annualInflationRate);
  const [incomeGoal, setIncomeGoal] = useState(annualSettings.incomeGoal);

  // --- Handlers for Family Members ---
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newMember.trim();
    const trimmedEmail = newMemberEmail.trim();
    if (!trimmedName) return;

    if (familyMembers.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('Člen rodiny s týmto menom už existuje.');
      return;
    }

    const memberObj: FamilyMember = {
      name: trimmedName,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      role: newMemberRole,
      status: trimmedEmail ? 'invited' : 'active',
      ...(trimmedEmail ? {
        invitedAt: new Date().toLocaleDateString('sk-SK'),
        inviteToken: Math.random().toString(36).substring(2, 10),
      } : {}),
    };

    onSetFamilyMembers([...familyMembers, memberObj]);
    setInviteModalMember(memberObj);
    setNewMember('');
    setNewMemberEmail('');
    setNewMemberRole('viewer');
  };

  const handleDeleteMember = (memberToDelete: string) => {
    if (familyMembers.length <= 1) {
      alert('Aplikácia musí obsahovať aspoň jedného člena rodiny.');
      return;
    }
    if (confirm(`Naozaj chcete vymazať člena / zrušiť účet pre "${memberToDelete}"?`)) {
      const updated = familyMembers.filter(m => m.name !== memberToDelete);
      onSetFamilyMembers(updated);
      
      // Auto-switch profile if deleted user was active
      if (memberToDelete === userName && updated.length > 0) {
        onSetUserName(updated[0].name);
      }
      setResendNotice(`Používateľ "${memberToDelete}" bol úspešne vymazaný.`);
      setTimeout(() => setResendNotice(null), 3000);
    }
  };

  const handleStartEditMember = (index: number, member: FamilyMember) => {
    setEditingMemberIndex(index);
    setEditingMemberValue(member.name);
    setEditingMemberEmail(member.email || '');
    setEditingMemberRole(member.role);
  };

  const handleSaveEditMember = (index: number) => {
    if (!editingMemberValue.trim()) return;
    const updated = [...familyMembers];
    const oldName = updated[index].name;
    
    updated[index] = {
      ...updated[index],
      name: editingMemberValue.trim(),
      email: editingMemberEmail.trim() || updated[index].email,
      role: editingMemberRole
    };
    
    onSetFamilyMembers(updated);
    
    if (userName === oldName) {
      onSetUserName(editingMemberValue.trim());
    }
    setEditingMemberIndex(null);
  };

  const handleResendInvite = (member: FamilyMember) => {
    const emailAddr = member.email || `${member.name.toLowerCase()}@floooow.sk`;
    setResendNotice(`E-mailová pozvánka bola úspešne opätovne odoslaná na: ${emailAddr}`);
    setTimeout(() => setResendNotice(null), 4000);
  };

  const handleActivateMember = (memberName: string) => {
    const updated = familyMembers.map(m => {
      if (m.name === memberName) {
        return { ...m, status: 'active' as const };
      }
      return m;
    });
    onSetFamilyMembers(updated);
    setResendNotice(`Konto pre člena "${memberName}" bolo úspešne aktivované.`);
    setTimeout(() => setResendNotice(null), 3500);
  };

  // --- Handlers for Categories and Subcategories ---
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newCategoryName.trim().toUpperCase();
    if (formatted && !categoryMap[formatted]) {
      const updatedMap = { ...categoryMap, [formatted]: [] };
      onSetCategoryMap(updatedMap);
      setNewCategoryName('');
      setExpandedCategory(formatted);
    }
  };

  const handleDeleteCategory = (catKey: string) => {
    if (catKey === 'PRÍJMY' || catKey === 'POTRAVINY') {
      alert(`Kategóriu "${catKey}" nie je možné odstrániť, pretože je dôležitá pre stabilitu aplikácie.`);
      return;
    }
    if (confirm(`Naozaj chcete odstrániť celú kategóriu "${catKey}" a všetky jej podkategórie?`)) {
      const updatedMap = { ...categoryMap };
      delete updatedMap[catKey];
      onSetCategoryMap(updatedMap);
      if (expandedCategory === catKey) setExpandedCategory(null);
    }
  };

  const handleRenameCategory = (oldKey: string) => {
    const formatted = editingCatValue.trim().toUpperCase();
    if (!formatted || formatted === oldKey) {
      setEditingCatKey(null);
      return;
    }
    if (categoryMap[formatted]) {
      alert('Kategória s týmto názvom už existuje.');
      return;
    }
    const updatedMap = { ...categoryMap };
    updatedMap[formatted] = updatedMap[oldKey];
    delete updatedMap[oldKey];
    
    onSetCategoryMap(updatedMap);
    setEditingCatKey(null);
    if (expandedCategory === oldKey) setExpandedCategory(formatted);
  };

  const handleAddSubcategory = (catKey: string, e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubcategoryName.trim();
    if (name && !categoryMap[catKey].includes(name)) {
      const updatedMap = {
        ...categoryMap,
        [catKey]: [...categoryMap[catKey], name]
      };
      onSetCategoryMap(updatedMap);
      setNewSubcategoryName('');
    }
  };

  const handleDeleteSubcategory = (catKey: string, subName: string) => {
    if (confirm(`Naozaj chcete vymazať podkategóriu "${subName}" z kategórie "${catKey}"?`)) {
      const updatedMap = {
        ...categoryMap,
        [catKey]: categoryMap[catKey].filter(s => s !== subName)
      };
      onSetCategoryMap(updatedMap);
    }
  };

  const handleSaveSubcategory = (catKey: string, index: number) => {
    const name = editingSubValue.trim();
    if (!name) return;
    const updatedSubs = [...categoryMap[catKey]];
    updatedSubs[index] = name;
    
    const updatedMap = {
      ...categoryMap,
      [catKey]: updatedSubs
    };
    onSetCategoryMap(updatedMap);
    setEditingSubIndex(null);
  };

  // --- Handlers for Annual settings ---
  const handleSaveAnnualSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSetAnnualSettings({
      targetSavingsRate: Number(targetSavingsRate),
      annualInflationRate: Number(annualInflationRate),
      incomeGoal: Number(incomeGoal)
    });
    alert('Výročné ciele boli úspešne uložené.');
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} shadow-xs`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-6 border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight flex items-center gap-2">
            {t('settingsTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation panel */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 lg:pr-4">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer text-left ${
              activeSubTab === 'users' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            {t('settingsTabUsers')}
          </button>
          
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer text-left ${
              activeSubTab === 'categories' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            {t('settingsTabCategories')}
          </button>

          <button
            onClick={() => setActiveSubTab('budgets')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer text-left ${
              activeSubTab === 'budgets' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            {t('settingsTabBudgets')}
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer text-left ${
              activeSubTab === 'reports' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LineChart className="w-4 h-4" />
            {t('settingsTabReports')}
          </button>

          <button
            onClick={() => setActiveSubTab('appearance')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer text-left ${
              activeSubTab === 'appearance' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            {t('settingsTabAppearance')}
          </button>

          <button
            onClick={() => setActiveSubTab('sync')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer text-left ${
              activeSubTab === 'sync' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('settingsTabSync')}
          </button>
        </div>

        {/* Action content panel */}
        <div className="lg:col-span-9 animate-fade-in">
          
          {/* Sub Tab: USERS */}
          {activeSubTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Členovia rodiny, e-mailové pozvánky a profily
                </h3>
                <p className="text-xs text-slate-400">
                  Pridajte nových členov rodiny odoslaním e-mailovej pozvánky. Pozvaný člen dostane e-mail s odkazom na vytvorenie účtu a hesla.
                </p>
              </div>

              {/* Status Notice Toast */}
              {resendNotice && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>{resendNotice}</span>
                  </div>
                  <button 
                    onClick={() => setResendNotice(null)}
                    className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Current Default Profile selector */}
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block mb-1">Aktuálny hlavný používateľ</span>
                  <p className="text-sm font-bold">Systém je momentálne prihlásený a optimalizovaný pre člena: <strong className="text-indigo-600 dark:text-indigo-400">{userName}</strong></p>
                </div>
                <select
                  value={userName}
                  onChange={(e) => onSetUserName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold cursor-pointer text-slate-800 dark:text-white"
                >
                  {familyMembers.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.role === 'admin' ? 'Správca' : m.role === 'editor' ? 'Zápis & Nahrávanie' : 'Len čítanie'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Form to add a family member & send email invite */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Pridať nového člena a poslať e-mailovú pozvánku
                </h4>
                
                <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Meno člena *</label>
                    <input
                      type="text"
                      placeholder="Napr. Oliver, Mamička..."
                      value={newMember}
                      onChange={(e) => setNewMember(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-indigo-600"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">E-mail pre pozvánku *</label>
                    <input
                      type="email"
                      placeholder="oliver@domena.sk"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-indigo-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rola prístupu</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                      className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-indigo-600 cursor-pointer"
                    >
                      <option value="admin">Správca</option>
                      <option value="editor">Zápis</option>
                      <option value="viewer">Len čítanie</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" /> Pozvať
                    </button>
                  </div>
                </form>
              </div>

              {/* List of family members */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {familyMembers.map((member, idx) => (
                  <div 
                    key={member.name}
                    className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 group transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs">
                          {member.name.charAt(0)}
                        </div>
                        
                        {editingMemberIndex === idx ? (
                          <div className="flex flex-col gap-2 flex-1">
                            <input
                              type="text"
                              value={editingMemberValue}
                              onChange={(e) => setEditingMemberValue(e.target.value)}
                              placeholder="Meno člena"
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
                              autoFocus
                            />
                            <input
                              type="email"
                              value={editingMemberEmail}
                              onChange={(e) => setEditingMemberEmail(e.target.value)}
                              placeholder="E-mailová adresa"
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">Rola:</span>
                              <select
                                value={editingMemberRole}
                                onChange={(e) => setEditingMemberRole(e.target.value as UserRole)}
                                className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-[10px] bg-white dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
                              >
                                <option value="admin">Správca (Admin)</option>
                                <option value="editor">Zápis & Nahrávanie</option>
                                <option value="viewer">Len čítanie (Viewer)</option>
                              </select>
                            </div>
                            <div className="flex gap-1.5 mt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditMember(idx)}
                                className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Uložiť
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMemberIndex(null)}
                                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Zrušiť
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                                {member.name}
                              </span>
                              {userName === member.name && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-[9px] text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-900/60 font-semibold">
                                  Aktívny
                                </span>
                              )}
                            </div>
                            
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              {member.email || `${member.name.toLowerCase()}@floooow.sk`}
                            </span>

                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                member.role === 'admin' 
                                  ? 'bg-indigo-50/50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/40' 
                                  : member.role === 'editor'
                                    ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40'
                                    : 'bg-amber-50/50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                              }`}>
                                {member.role === 'admin' ? 'Správca (Admin)' : member.role === 'editor' ? 'Zápis & Nahrávanie' : 'Len čítanie (Viewer)'}
                              </span>

                              {member.status === 'invited' ? (
                                <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Mail className="w-2.5 h-2.5" /> Pozvánka odoslaná
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Účet aktívny
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {editingMemberIndex !== idx && (
                        <div className="flex items-center gap-1">
                          {member.status === 'invited' && (
                            <button
                              type="button"
                              onClick={() => handleActivateMember(member.name)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Aktivovať účet teraz"
                            >
                              <UserCheck className="w-3 h-3" /> Aktivovať
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditMember(idx, member)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Upraviť meno, e-mail a rolu"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Vymazať člena / zrušiť pozvánku"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Resend invite button if invited */}
                    {member.status === 'invited' && editingMemberIndex !== idx && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                        <span>Pozvánka odoslaná: {member.invitedAt || 'Dnes'}</span>
                        <button
                          type="button"
                          onClick={() => handleResendInvite(member)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-2.5 h-2.5" /> Znovu poslať e-mail
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Invitation Sent Success Modal */}
              {inviteModalMember && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Pozvánka bola úspešne odoslaná!</h3>
                      </div>
                      <button 
                        onClick={() => setInviteModalMember(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                      <p>
                        Pozvánkový e-mail bol odoslaný na adresu: <strong className="text-indigo-600 dark:text-indigo-400">{inviteModalMember.email}</strong>
                      </p>
                      <p>
                        Člen <strong>{inviteModalMember.name}</strong> obdrží e-mail s odkazom pre nastavenie vlastného hesla a vytvorenie účtu s rolou <strong>{inviteModalMember.role === 'admin' ? 'Správca' : inviteModalMember.role === 'editor' ? 'Zápis & Nahrávanie' : 'Len čítanie'}</strong>.
                      </p>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Registračný odkaz pozvánky:</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={`https://floooow.sk/invite?token=${inviteModalMember.inviteToken}`}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://floooow.sk/invite?token=${inviteModalMember.inviteToken}`);
                              alert('Odkaz pozvánky bol skopírovaný do schránky!');
                            }}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex-shrink-0"
                            title="Kopírovať odkaz"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          handleActivateMember(inviteModalMember.name);
                          setInviteModalMember(null);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Aktivovať účet ihneď
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteModalMember(null)}
                        className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Zatvoriť
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub Tab: CATEGORIES & SUBCATEGORIES */}
          {activeSubTab === 'categories' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Kategórie a podkategórie výdavkov
                </h3>
                <p className="text-xs text-slate-400">
                  Nastavte si vlastnú kategorizáciu výdavkov a príjmov. Kliknutím na kategóriu zobrazíte jej podkategórie.
                </p>
              </div>

              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Nová kategória, napr. STRAVA, PETS..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-indigo-600 uppercase"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Pridať kategóriu
                </button>
              </form>

              {/* Categories list accordion */}
              <div className="space-y-2 max-w-2xl">
                {Object.keys(categoryMap).map((catKey) => {
                  const isExpanded = expandedCategory === catKey;
                  const subCount = (categoryMap[catKey] || []).length;
                  return (
                    <div 
                      key={catKey}
                      className="border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40"
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between p-3.5 bg-slate-100/60 dark:bg-slate-850/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <div 
                          onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                          className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          
                          {editingCatKey === catKey ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingCatValue}
                                onChange={(e) => setEditingCatValue(e.target.value)}
                                className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold uppercase"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameCategory(catKey)}
                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white truncate">
                              {catKey} 
                              <span className="ml-2 font-semibold text-[10px] text-slate-400 lowercase italic">
                                ({subCount} podkategórií)
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatKey(catKey);
                              setEditingCatValue(catKey);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            title="Premenovať kategóriu"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(catKey)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Zmazať kategóriu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Subcategories */}
                      {isExpanded && (
                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-850 space-y-3">
                          {/* Add subcategory form */}
                          <form onSubmit={(e) => handleAddSubcategory(catKey, e)} className="flex gap-2 max-w-sm">
                            <input
                              type="text"
                              placeholder="Nová podkategória, napr. Pekáreň, Hračky..."
                              value={newSubcategoryName}
                              onChange={(e) => setNewSubcategoryName(e.target.value)}
                              className="flex-1 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-indigo-500"
                            />
                            <button
                              type="submit"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Pridať pod.
                            </button>
                          </form>

                          {/* Subcategories list */}
                          {categoryMap[catKey] && categoryMap[catKey].length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {categoryMap[catKey].map((subName, subIdx) => (
                                <div 
                                  key={subName} 
                                  className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition"
                                >
                                  {editingSubIndex === subIdx ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={editingSubValue}
                                        onChange={(e) => setEditingSubValue(e.target.value)}
                                        className="px-1 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-[11px] bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveSubcategory(catKey, subIdx)}
                                        className="p-0.5 bg-green-500 text-white rounded cursor-pointer"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span>{subName}</span>
                                      <div className="flex items-center gap-0.5 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSubIndex(subIdx);
                                            setEditingSubValue(subName);
                                          }}
                                          className="text-slate-400 hover:text-indigo-600"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubcategory(catKey, subName)}
                                          className="text-slate-400 hover:text-rose-500"
                                        >
                                          <Plus className="w-3 h-3 rotate-45" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">Táto kategória nemá definované žiadne podkategórie.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub Tab: BUDGETS */}
          {activeSubTab === 'budgets' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nastavenie mesačných limitov rozpočtu
                </h3>
                <p className="text-xs text-slate-400">
                  Priradením limitov pre jednotlivé výdavkové kategórie môžete lepšie sledovať mesačnú spotrebu.
                </p>
              </div>

              {/* Grid of editable budgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                {Object.keys(categoryMap)
                  .filter(cat => cat !== 'PRÍJMY')
                  .map(cat => {
                    const budget = budgets.find(b => b.category === cat);
                    const limitVal = budget ? budget.limit : 0;
                    return (
                      <div 
                        key={cat}
                        className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider block truncate">{cat}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Mesačný limit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={limitVal || ''}
                            onChange={(e) => onUpdateBudgetLimit(cat, Number(e.target.value))}
                            placeholder="300"
                            className="w-24 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-right focus:outline-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-500">€</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Sub Tab: ANNUAL REPORT SETTINGS */}
          {activeSubTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nastavenia výročných správ a AI poradcu
                </h3>
                <p className="text-xs text-slate-400">
                  Parametre pre finančné výpočty, cieľovú mieru úspor a zhodnotenie inflácie vo výročných reportoch.
                </p>
              </div>

              <form onSubmit={handleSaveAnnualSettings} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    Cieľová miera úspor (%)
                  </label>
                  <input
                    type="number"
                    value={targetSavingsRate}
                    onChange={(e) => setTargetSavingsRate(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 text-slate-800 dark:text-white focus:outline-indigo-600 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Ideálna miera úspor, s ktorou bude systém porovnávať váš ročný výsledok (napr. 20%).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    Očakávaná ročná inflácia (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={annualInflationRate}
                    onChange={(e) => setTargetSavingsRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 text-slate-800 dark:text-white focus:outline-indigo-600 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Používa sa na výpočet reálneho znehodnotenia neinvestovaných úspor.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    Ročný cieľ čistého príjmu (€)
                  </label>
                  <input
                    type="number"
                    value={incomeGoal}
                    onChange={(e) => setIncomeGoal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 text-slate-800 dark:text-white focus:outline-indigo-600 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Váš ročný finančný míľnik pre celú rodinu.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition"
                  >
                    <Save className="w-3.5 h-3.5" /> Uložiť nastavenia reportov
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sub Tab: THEME / DARK MODE / LANGUAGE */}
          {activeSubTab === 'appearance' && (
            <div className="space-y-8">
              {/* Language Selector Section */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('languageSelectionTitle')}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  {t('languageSelectionSubtitle')}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                  {LANGUAGES.map((langItem) => {
                    const isSelected = language === langItem.code;
                    return (
                      <button
                        key={langItem.code}
                        type="button"
                        onClick={() => setLanguage(langItem.code)}
                        className={`p-3.5 rounded-2xl border-2 transition text-left cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-950 dark:text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl transition ${
                            isSelected 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}>
                            {langItem.code}
                          </span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">{langItem.nativeName}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme selector section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('themeTitle')}
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Prepnite si motív aplikácie na svetlý alebo tmavý pre šetrnosť vašich očí.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  {/* Light Mode Card */}
                  <div 
                    onClick={() => onSetDarkMode(false)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between h-36 transition ${
                      !darkMode 
                        ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <Sun className={`w-6 h-6 ${!darkMode ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!darkMode && <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold"><Check className="w-3 h-3" /></div>}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">{t('lightMode')}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{t('lightModeDesc')}</span>
                    </div>
                  </div>

                  {/* Dark Mode Card */}
                  <div 
                    onClick={() => onSetDarkMode(true)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between h-36 transition ${
                      darkMode 
                        ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/10' 
                        : 'border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <Moon className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-slate-400'}`} />
                      {darkMode && <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold"><Check className="w-3 h-3" /></div>}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">{t('darkMode')}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{t('darkModeDesc')}</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* Reset Data Section */}
              {onResetAllData && activeRole === 'admin' && (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4" />
                        Vynulovanie všetkých dát (Čistý hárok)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Vymaže všetky uložené transakcie, investície, záväzky, majetok, poistenia a Settle Up akcie z pamäte prehliadača.
                      </p>
                    </div>
                    <button
                      onClick={onResetAllData}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 shadow-xs"
                    >
                      Vymazať & Vynulovať dáta
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub Tab: GOOGLE SHEET SYNC */}
          {activeSubTab === 'sync' && (
            <div className="space-y-6">
              <GoogleSheetsSync
                onImportTransactions={onImportTransactions}
                onImportBudgets={onImportBudgets}
                onImportInvestments={onImportInvestments}
                onImportMortgages={onImportMortgages}
                onImportLiabilities={onImportLiabilities}
                onSetCategories={onSetCategories}
                currentTransactions={currentTransactions}
                currentBudgets={currentBudgets}
                currentInvestments={currentInvestments}
                currentMortgages={currentMortgages}
                currentLiabilities={currentLiabilities}
                activeRole={activeRole}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
