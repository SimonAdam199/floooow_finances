import React, { useState, useRef } from 'react';
import { InsuranceContract, InsuranceCategory, UserRole } from '../types';
import { 
  Car, 
  Home, 
  Heart, 
  Plane, 
  Plus, 
  Trash2, 
  FileText, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  DollarSign, 
  Upload, 
  Download, 
  AlertCircle, 
  ShieldCheck, 
  File, 
  Clock, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InsuranceTrackerProps {
  contracts: InsuranceContract[];
  onAddContract: (contract: Omit<InsuranceContract, 'id'>) => void;
  onDeleteContract: (id: string) => void;
  activeRole?: UserRole;
}

export default function InsuranceTracker({
  contracts,
  onAddContract,
  onDeleteContract,
  activeRole = 'viewer'
}: InsuranceTrackerProps) {
  // Navigation & Filtering
  const [selectedCategory, setSelectedCategory] = useState<'all' | InsuranceCategory>('all');
  
  // UI states
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<InsuranceCategory>('car');
  const [insurer, setInsurer] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'semi-annually' | 'annually'>('annually');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');
  const [brokerEmail, setBrokerEmail] = useState('');
  const [notes, setNotes] = useState('');

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  } | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole === 'viewer') return;

    if (!title || !insurer || !policyNumber || !premiumAmount || !startDate) {
      alert('Prosím, vyplňte všetky povinné polia označené hviezdičkou (*).');
      return;
    }

    onAddContract({
      category,
      title,
      insurer,
      policyNumber,
      premiumAmount: parseFloat(premiumAmount),
      frequency,
      startDate,
      endDate: endDate || undefined,
      contact: {
        name: brokerName || insurer,
        phone: brokerPhone || undefined,
        email: brokerEmail || undefined,
        company: insurer
      },
      notes: notes || undefined,
      fileName: uploadedFile?.name,
      fileSize: uploadedFile?.size,
      fileType: uploadedFile?.type,
      fileDataUrl: uploadedFile?.dataUrl
    });

    // Reset Form
    setTitle('');
    setCategory('car');
    setInsurer('');
    setPolicyNumber('');
    setPremiumAmount('');
    setFrequency('annually');
    setStartDate('');
    setEndDate('');
    setBrokerName('');
    setBrokerPhone('');
    setBrokerEmail('');
    setNotes('');
    setUploadedFile(null);
    setShowAddForm(false);
  };

  // Helper calculations
  const getAnnualEquivalent = (contract: InsuranceContract) => {
    switch (contract.frequency) {
      case 'monthly':
        return contract.premiumAmount * 12;
      case 'quarterly':
        return contract.premiumAmount * 4;
      case 'semi-annually':
        return contract.premiumAmount * 2;
      case 'annually':
      default:
        return contract.premiumAmount;
    }
  };

  const totalAnnualCost = contracts.reduce((sum, c) => sum + getAnnualEquivalent(c), 0);

  // Filtering contracts
  const filteredContracts = contracts.filter(
    (c) => selectedCategory === 'all' || c.category === selectedCategory
  );

  // Expiring policies (Anniversaries in next 60 days)
  const expiringContracts = contracts.filter((c) => {
    if (!c.endDate) return false;
    const now = new Date();
    const expiry = new Date(c.endDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 60;
  });

  const getCategoryDetails = (cat: InsuranceCategory) => {
    switch (cat) {
      case 'car':
        return {
          label: 'Poistenie áut',
          icon: Car,
          color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60',
          hoverColor: 'hover:bg-blue-50/50'
        };
      case 'property':
        return {
          label: 'Poistenie nehnuteľností',
          icon: Home,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60',
          hoverColor: 'hover:bg-emerald-50/50'
        };
      case 'life':
        return {
          label: 'Životné poistenie',
          icon: Heart,
          color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60',
          hoverColor: 'hover:bg-rose-50/50'
        };
      case 'travel':
        return {
          label: 'Cestovné poistenie',
          icon: Plane,
          color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60',
          hoverColor: 'hover:bg-amber-50/50'
        };
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'monthly': return 'mesačne';
      case 'quarterly': return 'štvrťročne';
      case 'semi-annually': return 'polročne';
      case 'annually': return 'ročne';
      default: return freq;
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total annual premium cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Celkové ročné poistné</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalAnnualCost.toLocaleString('sk-SK')} €</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Sčítaný ekvivalent všetkých aktívnych zmlúv</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total count of contracts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Aktívne zmluvy</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{contracts.length}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Poistené riziká a krytia v poriadku</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring / Renewal warnings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Blížiace sa výročia (60 dní)</span>
            <h3 className={`text-2xl font-black mt-1 ${expiringContracts.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {expiringContracts.length}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {expiringContracts.length > 0 
                ? 'Skontrolujte ponuky konkurencie a prepoistite'
                : 'Žiadne kritické termíny v dohľade'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            expiringContracts.length > 0 
              ? 'bg-amber-50 border-amber-100 text-amber-600' 
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Dynamic Expiry Alerts banner */}
      {expiringContracts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-800 text-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block">Upozornenie na blížiacu sa splatnosť / výročie poistenia!</span>
              <p className="mt-0.5">
                Nasledovné zmluvy vyžadujú vašu pozornosť (výročie platnosti končí do 60 dní):{' '}
                <span className="font-semibold">
                  {expiringContracts.map((c) => `${c.title} (${new Date(c.endDate!).toLocaleDateString('sk-SK')})`).join(', ')}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category selector & actions toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Interactive Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              selectedCategory === 'all'
                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-600'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Všetky ({contracts.length})
          </button>

          {(['car', 'property', 'life', 'travel'] as InsuranceCategory[]).map((cat) => {
            const details = getCategoryDetails(cat);
            const count = contracts.filter((c) => c.category === cat).length;
            const Icon = details.icon;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {details.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Add contract toggle button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer self-stretch lg:self-auto"
        >
          <Plus className="w-4 h-4" />
          Pridať zmluvu o poistení
        </button>
      </div>

      {/* Collapsible New Contract Form */}
      <AnimatePresence>
        {showAddForm && activeRole !== 'viewer' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-150 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Nová poistná zmluva</h3>
                <p className="text-xs text-slate-500 mt-0.5">Evidencia zmluvy, kontaktov na makléra a nahranie dokumentov.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contract title */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Názov poistenia *</label>
                  <input
                    type="text"
                    required
                    placeholder="napr. Havarijné Tesla Model Y"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Kategória poistenia *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InsuranceCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  >
                    <option value="car">Poistenie áut</option>
                    <option value="property">Poistenie nehnuteľností</option>
                    <option value="life">Životné poistenie</option>
                    <option value="travel">Cestovné poistenie</option>
                  </select>
                </div>

                {/* Insurer company */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Poisťovňa / Spoločnosť *</label>
                  <input
                    type="text"
                    required
                    placeholder="napr. Allianz, Union, Generali"
                    value={insurer}
                    onChange={(e) => setInsurer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Policy Number */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Číslo zmluvy *</label>
                  <input
                    type="text"
                    required
                    placeholder="napr. 98214-X02"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Premium Price */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Výška poistného (€) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="napr. 450"
                    value={premiumAmount}
                    onChange={(e) => setPremiumAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Premium Payment Frequency */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Periodicita platby *</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  >
                    <option value="monthly">Mesačne</option>
                    <option value="quarterly">Štvrťročne</option>
                    <option value="semi-annually">Polročne</option>
                    <option value="annually">Ročne</option>
                  </select>
                </div>

                {/* Validity dates */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Začiatok platnosti *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Koniec / Výročie zmluvy</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Contact broker information */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Kontakt na makléra / poisťovňu</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">Meno kontaktnej osoby</label>
                    <input
                      type="text"
                      placeholder="Meno makléra"
                      value={brokerName}
                      onChange={(e) => setBrokerName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">Telefónne číslo</label>
                    <input
                      type="tel"
                      placeholder="+421 9xx xxx xxx"
                      value={brokerPhone}
                      onChange={(e) => setBrokerPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">E-mail</label>
                    <input
                      type="email"
                      placeholder="makler@poistovna.sk"
                      value={brokerEmail}
                      onChange={(e) => setBrokerEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Policy notes */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">Detaily krytia, limity a poznámky</label>
                <textarea
                  rows={2}
                  placeholder="napr. Spoluúčasť 5%, pripoistenia kasko, rozsah asistenčných služieb..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white resize-none"
                />
              </div>

              {/* Advanced Drag & Drop File Upload area */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">Sken / PDF poistnej zmluvy (Nahrávanie zmluvy)</label>
                
                {!uploadedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/40 text-indigo-600' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs font-bold block">Potiahnite súbor sem alebo kliknite pre výber</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Podpora pre PDF, PNG, JPG, DOCX (Max 15MB)</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-xs md:max-w-md">{uploadedFile.name}</span>
                        <span className="text-[10px] text-slate-400 block">{formatBytes(uploadedFile.size)} • {uploadedFile.type || 'Súbor'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      Odstrániť
                    </button>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setUploadedFile(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Uložiť zmluvu
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Listing of Policies */}
      {filteredContracts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-xs flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-slate-700 text-sm">Žiadne zaevidované poistenia</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
            {selectedCategory === 'all' 
              ? 'Zatiaľ nemáte pridané žiadne poistné zmluvy. Kliknite na "Pridať zmluvu o poistení" pre začatie evidencie.'
              : 'V tejto kategórii sa nenachádzajú žiadne aktívne poistky.'}
          </p>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Zobraziť všetky poistenia
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContracts.map((contract) => {
            const catDetails = getCategoryDetails(contract.category);
            const CatIcon = catDetails.icon;
            const isExpanded = expandedContractId === contract.id;
            const equivalentAnnual = getAnnualEquivalent(contract);

            return (
              <div 
                key={contract.id}
                id={`insurance-card-${contract.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-sm hover:border-slate-150 transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Header card info */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${catDetails.color}`}>
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition truncate max-w-[180px] sm:max-w-[240px]" title={contract.title}>
                          {contract.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                            {contract.insurer}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete and Expand buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {activeRole !== 'viewer' && (
                        <button
                          onClick={() => {
                            if (confirm(`Naozaj chcete vymazať poistnú zmluvu "${contract.title}"?`)) {
                              onDeleteContract(contract.id);
                            }
                          }}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Vymazať zmluvu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedContractId(isExpanded ? null : contract.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                        title={isExpanded ? 'Zbaliť detaily' : 'Rozbaliť detaily'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Financial premium and payment parameters */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Suma / Platba</span>
                      <span className="font-black text-slate-800 mt-0.5 block">
                        {contract.premiumAmount.toLocaleString('sk-SK')} €{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          / {getFrequencyLabel(contract.frequency)}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ročný ekvivalent</span>
                      <span className="font-extrabold text-indigo-600 mt-0.5 block">
                        {equivalentAnnual.toLocaleString('sk-SK')} € / rok
                      </span>
                    </div>
                  </div>

                  {/* Date fields */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Začiatok: {new Date(contract.startDate).toLocaleDateString('sk-SK')}</span>
                    </div>
                    {contract.endDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className={expiringContracts.includes(contract) ? 'text-amber-600 font-bold' : ''}>
                          Výročie: {new Date(contract.endDate).toLocaleDateString('sk-SK')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes / limits (truncated if not expanded) */}
                  {contract.notes && (
                    <p className={`text-[11px] text-slate-500 leading-relaxed bg-slate-50/30 p-2.5 rounded-lg border border-slate-100 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      <span className="font-bold text-slate-600">Rozsah a poznámky:</span> {contract.notes}
                    </p>
                  )}

                  {/* Expanded detail section (Broker & Attached document file) */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-3 border-t border-slate-100 overflow-hidden"
                    >
                      {/* Contract metadata */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Číslo zmluvy</span>
                          <span className="font-mono font-medium text-slate-800">{contract.policyNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Kategória</span>
                          <span className="font-bold text-slate-800">{catDetails.label}</span>
                        </div>
                      </div>

                      {/* Broker / Hotline Contacts */}
                      <div className="bg-indigo-50/30 border border-indigo-100/50 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Podpora & Kontakt na makléra</span>
                        </div>
                        <div className="text-xs space-y-1.5">
                          <p className="font-extrabold text-slate-800">{contract.contact.name}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-slate-600">
                            {contract.contact.phone && (
                              <a 
                                href={`tel:${contract.contact.phone}`}
                                className="flex items-center gap-1 hover:text-indigo-600 transition cursor-pointer bg-white px-2 py-1 rounded border border-slate-150 text-[11px]"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{contract.contact.phone}</span>
                              </a>
                            )}
                            {contract.contact.email && (
                              <a 
                                href={`mailto:${contract.contact.email}`}
                                className="flex items-center gap-1 hover:text-indigo-600 transition cursor-pointer bg-white px-2 py-1 rounded border border-slate-150 text-[11px] truncate max-w-full"
                              >
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate">{contract.contact.email}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Attached Document File section */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Nahrané dokumenty k zmluve</span>
                        {contract.fileName ? (
                          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <File className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <span className="text-[11px] font-bold text-slate-700 block truncate max-w-[140px] sm:max-w-[220px]" title={contract.fileName}>
                                  {contract.fileName}
                                </span>
                                {contract.fileSize && (
                                  <span className="text-[9px] text-slate-400 block">{formatBytes(contract.fileSize)}</span>
                                )}
                              </div>
                            </div>

                            {/* Download Action */}
                            {contract.fileDataUrl && (
                              <a
                                href={contract.fileDataUrl}
                                download={contract.fileName}
                                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition cursor-pointer"
                                title="Stiahnuť poistnú zmluvu"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                            <span className="text-[11px] text-slate-400 block">K tejto zmluve nie je priložený žiadny súbor.</span>
                            {activeRole !== 'viewer' && (
                              <p className="text-[9px] text-indigo-500 font-semibold mt-1">
                                Súbory sa pridávajú pri vytváraní novej zmluvy.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Footer status bar */}
                <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Zmluva aktívna
                  </span>
                  <button 
                    onClick={() => setExpandedContractId(isExpanded ? null : contract.id)}
                    className="text-indigo-600 hover:text-indigo-700 transition cursor-pointer font-extrabold uppercase"
                  >
                    {isExpanded ? 'Zbaliť' : 'Zobraziť detaily'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
