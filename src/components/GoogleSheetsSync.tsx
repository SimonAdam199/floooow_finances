import React, { useState, useEffect } from 'react';
import { Transaction, BudgetLimit, Investment, Mortgage, Liability, UserRole } from '../types';
import { initAuth, googleSignIn, logout, fetchSpreadsheetData, fetchUserSpreadsheets, fetchSpreadsheetSheets, createSpreadsheet, batchUpdateSpreadsheetValues, createSheetTab } from '../lib/googleAuth';
import { analyzeMonthlyBudget } from '../services/apiClient';
import { User } from 'firebase/auth';
import { 
  FileSpreadsheet, LogIn, LogOut, RefreshCw, Loader2, CheckCircle, 
  AlertTriangle, Check, ArrowDownLeft, TrendingUp, HelpCircle, Table,
  Trash2, Database, ChevronDown, ChevronRight, FileCode2, Upload, FileUp, Sparkles, Bot, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface GoogleSheetsSyncProps {
  onImportTransactions: (transactions: Transaction[], replace: boolean) => void;
  onImportBudgets: (budgets: BudgetLimit[]) => void;
  onImportInvestments: (investments: Investment[]) => void;
  onImportMortgages: (mortgages: Mortgage[]) => void;
  onImportLiabilities: (liabilities: Liability[]) => void;
  onSetCategories: (categories: string[]) => void;
  currentTransactions: Transaction[];
  currentBudgets: BudgetLimit[];
  currentInvestments: Investment[];
  currentMortgages: Mortgage[];
  currentLiabilities: Liability[];
  activeRole?: UserRole;
}

interface ParsedBlock {
  type: 'transactions' | 'budgets' | 'investments' | 'mortgages' | 'unknown';
  headerRowIdx: number;
  headers: string[];
  rows: string[][];
  title: string;
}

export default function GoogleSheetsSync({
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
  activeRole = 'viewer'
}: GoogleSheetsSyncProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState('1YAK1gsAIZXwthy1O3H1TtnGCIZcIS7c3');
  const [range, setRange] = useState('400_Rozpočet!A1:Z500');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Import source tab: 'sheets' | 'excel'
  const [importSource, setImportSource] = useState<'sheets' | 'excel'>('sheets');

  // Excel Upload states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [activeExcelSheet, setActiveExcelSheet] = useState<string>('');

  // Parsed data state
  const [sheetRawValues, setSheetRawValues] = useState<string[][]>([]);
  const [detectedBlocks, setDetectedBlocks] = useState<ParsedBlock[]>([]);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);
  const [expandedBlockIdx, setExpandedBlockIdx] = useState<number | null>(null);

  // Manual column mappings for the selected block
  const [colMapping, setColMapping] = useState<Record<string, number>>({});

  // Google Drive Spreadsheets list state
  const [userSpreadsheets, setUserSpreadsheets] = useState<any[]>([]);
  const [isListingSheets, setIsListingSheets] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Spreadsheet sheet tabs state
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isFetchingSheets, setIsFetchingSheets] = useState(false);

  // Export/Save states
  const [syncTab, setSyncTab] = useState<'import' | 'export' | 'ai_monthly'>('import');
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'transactions' | 'budgets' | 'investments' | 'liabilities'>('all');
  const [exportDestination, setExportDestination] = useState<'current' | 'new'>('current');
  const [newSpreadsheetTitle, setNewSpreadsheetTitle] = useState('floooow — Záloha rozpočtu');

  // AI Monthly Export state
  const [monthlyExportMonth, setMonthlyExportMonth] = useState<string>(() => {
    if (currentTransactions && currentTransactions.length > 0) {
      const sorted = [...currentTransactions].map(t => t.date.slice(0, 7)).sort((a, b) => b.localeCompare(a));
      if (sorted[0]) return sorted[0];
    }
    return new Date().toISOString().slice(0, 7);
  });
  const [isGeneratingAiExport, setIsGeneratingAiExport] = useState(false);
  const [aiExportResultText, setAiExportResultText] = useState<string | null>(null);

  // Get unique months from transactions for dropdown
  const availableMonths = Array.from(new Set(
    currentTransactions.map(t => t.date.slice(0, 7))
  )).sort((a, b) => b.localeCompare(a));

  if (!availableMonths.includes(new Date().toISOString().slice(0, 7))) {
    availableMonths.unshift(new Date().toISOString().slice(0, 7));
  }

  const selectSpreadsheetAndLoadTabs = async (id: string, token: string, autoLoadData = true) => {
    let cleanId = id.trim();
    if (cleanId.includes('docs.google.com/spreadsheets')) {
      const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }
    }
    setSpreadsheetId(cleanId);
    setIsFetchingSheets(true);
    setAvailableSheets([]);
    setError(null);
    setSuccessMsg(null);
    try {
      const sheets = await fetchSpreadsheetSheets(token, cleanId);
      setAvailableSheets(sheets);
      if (sheets.length > 0) {
        const matchedSheet = sheets.find(s => s.toLowerCase().includes('rozpo') || s.toLowerCase().includes('budget')) || sheets[0];
        const newRange = `${matchedSheet}!A1:Z500`;
        setRange(newRange);
        
        if (autoLoadData) {
          setIsLoading(true);
          setSheetRawValues([]);
          setDetectedBlocks([]);
          setSelectedBlockIdx(null);
          
          const data = await fetchSpreadsheetData(token, cleanId, newRange);
          const rows = data.values as string[][];
          if (!rows || rows.length === 0) {
            throw new Error('Tabuľka je prázdna alebo zadaný rozsah neobsahuje žiadne riadky.');
          }
          setSheetRawValues(rows);
          analyzeSheetBlocks(rows);
          setSuccessMsg(`Zvolená tabuľka bola úspešne prepojená! List: "${matchedSheet}" bol úspešne načítaný a analyzovaný.`);
        }
      }
    } catch (err: any) {
      console.error('Error loading sheets info:', err);
      setError(err.message || 'Nepodarilo sa načítať štruktúru listov z tejto tabuľky.');
    } finally {
      setIsFetchingSheets(false);
      setIsLoading(false);
    }
  };

  const loadUserSpreadsheets = async (token: string) => {
    if (!token || !token.trim()) {
      setIsListingSheets(false);
      return;
    }
    setIsListingSheets(true);
    setDriveError(null);
    try {
      const files = await fetchUserSpreadsheets(token);
      setUserSpreadsheets(files);
    } catch (err: any) {
      console.error('Error fetching drive files:', err);
      setDriveError(err.message || 'Nepodarilo sa načítať súbory z Google Disku.');
    } finally {
      setIsListingSheets(false);
    }
  };

  // --- Excel File Parser Handler ---
  const handleExcelFileUpload = (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setExcelWorkbook(workbook);
        setExcelSheets(workbook.SheetNames);

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Nahraný Excel súbor neobsahuje žiadne listy.');
        }

        const firstSheet = workbook.SheetNames[0];
        setActiveExcelSheet(firstSheet);
        parseAndSetExcelSheet(workbook, firstSheet);
        setSuccessMsg(`Excel súbor "${file.name}" bol úspešne spracovaný! Zistené listy: ${workbook.SheetNames.join(', ')}.`);
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setError(`Nepodarilo sa načítať Excel súbor: ${err.message || err}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseAndSetExcelSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) return;

    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    const stringRows: string[][] = rawRows.map(row => 
      Array.isArray(row) ? row.map(cell => cell !== null && cell !== undefined ? String(cell) : '') : []
    );

    if (!stringRows || stringRows.length === 0) {
      setError(`List "${sheetName}" v Excel súbore neobsahuje žiadne riadky.`);
      setSheetRawValues([]);
      setDetectedBlocks([]);
      setSelectedBlockIdx(null);
      return;
    }

    setSheetRawValues(stringRows);
    analyzeSheetBlocks(stringRows);
  };

  // --- Monthly AI Export Handler ---
  const handleGenerateAiMonthlyExport = async () => {
    setIsGeneratingAiExport(true);
    setError(null);
    setSuccessMsg(null);
    setAiExportResultText(null);

    try {
      const monthTransactions = currentTransactions.filter(t => t.date.startsWith(monthlyExportMonth));

      // 1. Call Gemini API endpoint for monthly analysis
      const resData = await analyzeMonthlyBudget({
        month: monthlyExportMonth,
        transactions: monthTransactions,
        budgets: currentBudgets
      });

      const aiText = resData.analysis;
      setAiExportResultText(aiText);

      // 2. Build multi-sheet Excel file via SheetJS
      const wb = XLSX.utils.book_new();

      const totalIncome = monthTransactions
        .filter(t => t.amount > 0 || t.category === 'Príjmy')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalExpense = monthTransactions
        .filter(t => t.amount < 0 && t.category !== 'Príjmy')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

      // Sheet 1: Prehľad
      const summaryData = [
        ["FINTRACK - MESAČNÝ REPORT A AI ANALÝZA"],
        ["Sledovaný mesiac", monthlyExportMonth],
        ["Dátum vygenerovania", new Date().toLocaleString('sk-SK')],
        [""],
        ["Finančný ukazovateľ", "Hodnota (€)"],
        ["Celkový príjem v mesiaci", totalIncome],
        ["Celkové výdavky v mesiaci", totalExpense],
        ["Čistý prebytok / úspory", netSavings],
        ["Miera úspor (%)", `${savingsRate.toFixed(1)} %`],
        ["Počet evidovaných transakcií", monthTransactions.length]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Prehľad mesiaca");

      // Sheet 2: Transakcie
      const transRows = [
        ["Dátum", "Popis / Partner", "Suma (EUR)", "Kategória", "Mena"],
        ...monthTransactions.map(t => [
          t.date,
          t.description,
          t.amount,
          t.category,
          t.currency || 'EUR'
        ])
      ];
      const wsTrans = XLSX.utils.aoa_to_sheet(transRows);
      XLSX.utils.book_append_sheet(wb, wsTrans, "Transakcie");

      // Sheet 3: Rozpočty a Plnenie
      const budgetRows = [
        ["Kategória", "Mesačný Limit (EUR)", "Skutočné Výdavky (EUR)", "Rozdiel / Zostatok (EUR)", "Stav plnenia"],
        ...currentBudgets.map(b => {
          const spent = monthTransactions
            .filter(t => t.category === b.category && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const diff = b.limit - spent;
          return [
            b.category,
            b.limit,
            spent,
            diff,
            diff >= 0 ? "V norme ✅" : "Prečerpané ⚠️"
          ];
        })
      ];
      const wsBudgets = XLSX.utils.aoa_to_sheet(budgetRows);
      XLSX.utils.book_append_sheet(wb, wsBudgets, "Rozpočty");

      // Sheet 4: AI Správa
      const aiRows = [
        ["🤖 GEMINI AI FINANČNÁ ANALÝZA A ODPORÚČANIA"],
        ["Mesiac:", monthlyExportMonth],
        [""],
        ["Slovná analýza AI Asistenta:"],
        [aiText]
      ];
      const wsAi = XLSX.utils.aoa_to_sheet(aiRows);
      XLSX.utils.book_append_sheet(wb, wsAi, "AI Odporúčania");

      // 3. Download file
      const fileName = `FinTrack_Rozpocet_${monthlyExportMonth}_AI_Report.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSuccessMsg(`AI analýza za mesiac ${monthlyExportMonth} bola úspešne vygenerovaná a súbor "${fileName}" bol stiahnutý do vášho zariadenia!`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Nepodarilo sa vygenerovať AI export za mesiac.');
    } finally {
      setIsGeneratingAiExport(false);
    }
  };

  const handleExportToGoogleDrive = async () => {
    if (!accessToken) {
      setError('Nie ste prihlásený. Prihláste sa pomocou Google.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let targetSpreadsheetId = spreadsheetId.trim();
      const isNew = exportDestination === 'new';
      
      if (!isNew) {
        if (!targetSpreadsheetId) {
          throw new Error('Prosím zadajte ID Google tabuľky alebo ju vyberte zo zoznamu.');
        }
        if (targetSpreadsheetId.includes('docs.google.com/spreadsheets')) {
          const match = targetSpreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            targetSpreadsheetId = match[1];
            setSpreadsheetId(targetSpreadsheetId);
          }
        }
      }

      const destText = isNew 
        ? `vytvorí novú tabuľku s názvom "${newSpreadsheetTitle}" vo vašom Google Disku`
        : `prepíše/vytvorí vybrané listy v tabuľke s ID "${targetSpreadsheetId}"`;
      
      const confirmMsg = `Chystáte sa uložiť údaje z aplikácie floooow na Google Drive.\n\nTáto operácia ${destText}.\n\nChcete pokračovať?`;
      if (!window.confirm(confirmMsg)) {
        setIsExporting(false);
        return;
      }

      const dataToSave: { range: string; values: string[][] }[] = [];

      if (exportType === 'all' || exportType === 'transactions') {
        const transRows = [
          ['Dátum', 'Popis', 'Suma (EUR)', 'Kategória'],
          ...currentTransactions.map(t => [
            t.date,
            t.description,
            String(t.amount).replace('.', ','),
            t.category
          ])
        ];
        dataToSave.push({ range: 'Transakcie!A1:D1000', values: transRows });
      }

      if (exportType === 'all' || exportType === 'budgets') {
        const budgetRows = [
          ['Kategória', 'Mesačný Limit (EUR)'],
          ...currentBudgets.map(b => [
            b.category,
            String(b.limit).replace('.', ',')
          ])
        ];
        dataToSave.push({ range: 'Rozpočty!A1:B100', values: budgetRows });
      }

      if (exportType === 'all' || exportType === 'investments') {
        const investRows = [
          ['Názov', 'Aktuálna hodnota (EUR)', 'Mesačný príspevok (EUR)', 'Vlastník'],
          ...currentInvestments.map(i => [
            i.name,
            String(i.currentValue).replace('.', ','),
            String(i.monthlyContribution).replace('.', ','),
            i.owner || 'Spoločne'
          ])
        ];
        dataToSave.push({ range: 'Investície!A1:D100', values: investRows });
      }

      if (exportType === 'all' || exportType === 'liabilities') {
        const debtRows = [
          ['Názov', 'Dlžná suma / Zostatok (EUR)', 'Úrok (%)', 'Mesačná splátka (EUR)', 'Typ'],
          ...currentMortgages.map(m => [
            m.name,
            String(m.remainingAmount).replace('.', ','),
            String(m.interestRate).replace('.', ','),
            String(m.monthlyPayment).replace('.', ','),
            'Hypotéka / Úver'
          ]),
          ...currentLiabilities.map(l => [
            l.name,
            String(l.remainingAmount).replace('.', ','),
            '0',
            String(l.monthlyPayment).replace('.', ','),
            'Spotrebný úver / Iné'
          ])
        ];
        dataToSave.push({ range: 'Záväzky!A1:E100', values: debtRows });
      }

      if (isNew) {
        const sheetTitles = dataToSave.map(d => d.range.split('!')[0]);
        const created = await createSpreadsheet(accessToken, newSpreadsheetTitle, sheetTitles);
        targetSpreadsheetId = created.spreadsheetId;
        
        await batchUpdateSpreadsheetValues(accessToken, targetSpreadsheetId, dataToSave);
        setSpreadsheetId(targetSpreadsheetId);
        setSuccessMsg(`Úspešne vytvorená nová tabuľka "${newSpreadsheetTitle}" vo Vašom Google Disku a nahraté údaje!`);
      } else {
        const sheetTitlesToCreate = dataToSave.map(d => d.range.split('!')[0]);
        for (const tabTitle of sheetTitlesToCreate) {
          try {
            await createSheetTab(accessToken, targetSpreadsheetId, tabTitle);
          } catch (e) {
            // Ignore if sheet tab already exists
          }
        }

        await batchUpdateSpreadsheetValues(accessToken, targetSpreadsheetId, dataToSave);
        setSuccessMsg(`Úspešne uložené a aktualizované údaje v tabuľke (listy: ${sheetTitlesToCreate.join(', ')})!`);
      }

      loadUserSpreadsheets(accessToken);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Nepodarilo sa uložiť údaje na Google Drive.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        if (token) {
          loadUserSpreadsheets(token);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setUserSpreadsheets([]);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && accessToken && spreadsheetId) {
      let cleanId = spreadsheetId.trim();
      if (cleanId.includes('docs.google.com/spreadsheets')) {
        const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          cleanId = match[1];
        }
      }
      fetchSpreadsheetSheets(accessToken, cleanId)
        .then(sheets => {
          setAvailableSheets(sheets);
        })
        .catch(err => {
          console.warn('Silent sheet tabs fetch error:', err);
        });
    }
  }, [user, accessToken, spreadsheetId]);

  const handleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        loadUserSpreadsheets(result.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Prihlásenie zlyhalo. Skontrolujte nastavenia alebo skúste znova.');
    }
  };

  const handleLogout = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setSheetRawValues([]);
      setDetectedBlocks([]);
      setSelectedBlockIdx(null);
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
    setSheetRawValues([]);
    setDetectedBlocks([]);
    setSelectedBlockIdx(null);

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
        throw new Error('Tabuľka je prázdna alebo zadaný rozsah neobsahuje žiadne riadky.');
      }

      setSheetRawValues(rows);
      analyzeSheetBlocks(rows);
      setSuccessMsg('Dáta z tabuľky boli úspešne stiahnuté! Analyzujeme ich obsah...');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('unable to parse range') || errMsg.toLowerCase().includes('parse range')) {
        let idToUse = spreadsheetId.trim();
        if (idToUse.includes('docs.google.com/spreadsheets')) {
          const match = idToUse.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            idToUse = match[1];
          }
        }
        try {
          const sheets = await fetchSpreadsheetSheets(accessToken, idToUse);
          setAvailableSheets(sheets);
          setError(`Nenašiel sa list so zadaným názvom v rozsahu "${range}". V tejto tabuľke sme však úspešne detegovali listy: ${sheets.join(', ')}. Kliknite na niektorú z modrých záložiek, ktoré sa zobrazili nižšie.`);
        } catch (fetchSheetsErr) {
          setError(`Nenašiel sa zadaný rozsah "${range}". Skontrolujte, či názov listu existuje vo vašej tabuľke.`);
        }
      } else {
        setError(err.message || 'Nepodarilo sa stiahnuť dáta z Google Tabuľky.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSheetBlocks = (rows: string[][]) => {
    const blocks: { start: number; end: number; values: string[][] }[] = [];
    let currentBlock: string[][] = [];
    let blockStartIdx = 0;

    rows.forEach((row, idx) => {
      const isEmpty = row.every(cell => !cell || cell.trim() === '');
      if (!isEmpty) {
        if (currentBlock.length === 0) {
          blockStartIdx = idx;
        }
        currentBlock.push(row);
      } else {
        if (currentBlock.length > 0) {
          blocks.push({
            start: blockStartIdx,
            end: idx - 1,
            values: currentBlock
          });
          currentBlock = [];
        }
      }
    });

    if (currentBlock.length > 0) {
      blocks.push({
        start: blockStartIdx,
        end: rows.length - 1,
        values: currentBlock
      });
    }

    if (blocks.length === 0) {
      blocks.push({ start: 0, end: rows.length - 1, values: rows });
    }

    const parsedBlocks: ParsedBlock[] = [];

    blocks.forEach((b, bIdx) => {
      if (b.values.length < 2) return;

      const headers = b.values[0].map(h => h.trim());
      const dataRows = b.values.slice(1);

      let transScore = 0;
      let budgetScore = 0;
      let investScore = 0;
      let debtScore = 0;

      headers.forEach(h => {
        const hl = h.toLowerCase();
        
        if (hl.includes('dátum') || hl.includes('datum') || hl.includes('date') || hl.includes('kedy')) transScore += 3;
        if (hl.includes('popis') || hl.includes('poznámka') || hl.includes('partner') || hl.includes('detaily') || hl.includes('text') || hl.includes('správa') || hl.includes('obchodník')) transScore += 2;
        if (hl.includes('suma') || hl.includes('čiastka') || hl.includes('ciastka') || hl.includes('eur') || hl.includes('hodnota') || hl.includes('množstvo')) {
          transScore += 2;
          budgetScore += 1;
          investScore += 1.5;
          debtScore += 1.5;
        }
        if (hl.includes('kategória') || hl.includes('kategoria') || hl.includes('typ') || hl.includes('skupina') || hl.includes('category')) {
          transScore += 2;
          budgetScore += 3;
        }

        if (hl.includes('limit') || hl.includes('rozpočet') || hl.includes('rozpocet') || hl.includes('max')) budgetScore += 3;

        if (hl.includes('investícia') || hl.includes('fond') || hl.includes('akcie') || hl.includes('etf') || hl.includes('instrument')) investScore += 3;
        if (hl.includes('vlastník') || hl.includes('majiteľ') || hl.includes('príspevok') || hl.includes('sporenie')) investScore += 2;

        if (hl.includes('úver') || hl.includes('hypotéka') || hl.includes('hypoteka') || hl.includes('dlh') || hl.includes('lízing') || hl.includes('leasing')) debtScore += 3;
        if (hl.includes('úrok') || hl.includes('sadzba') || hl.includes('p.a.')) debtScore += 3;
        if (hl.includes('splátka') || hl.includes('splatka')) debtScore += 2;
        if (hl.includes('zostatok') || hl.includes('istina') || hl.includes('dlžná')) debtScore += 2;
      });

      let type: ParsedBlock['type'] = 'unknown';
      let title = `Tabuľka ${bIdx + 1} (Riadky ${b.start + 1} - ${b.end + 1})`;

      const maxScore = Math.max(transScore, budgetScore, investScore, debtScore);
      if (maxScore > 2) {
        if (maxScore === transScore) {
          type = 'transactions';
          title = `Transakcie (Riadky ${b.start + 1} - ${b.end + 1})`;
        } else if (maxScore === budgetScore) {
          type = 'budgets';
          title = `Mesačné Rozpočty (Riadky ${b.start + 1} - ${b.end + 1})`;
        } else if (maxScore === investScore) {
          type = 'investments';
          title = `Investičné portfólio (Riadky ${b.start + 1} - ${b.end + 1})`;
        } else if (maxScore === debtScore) {
          type = 'mortgages';
          title = `Hypotéky & Úvery (Riadky ${b.start + 1} - ${b.end + 1})`;
        }
      }

      parsedBlocks.push({
        type,
        headerRowIdx: b.start,
        headers,
        rows: dataRows,
        title
      });
    });

    setDetectedBlocks(parsedBlocks);
    if (parsedBlocks.length > 0) {
      const defaultIdx = parsedBlocks.findIndex(b => b.type === 'transactions') !== -1 
        ? parsedBlocks.findIndex(b => b.type === 'transactions')
        : 0;
      handleSelectBlock(defaultIdx, parsedBlocks);
    }
  };

  const handleSelectBlock = (idx: number, blocksList = detectedBlocks) => {
    setSelectedBlockIdx(idx);
    const block = blocksList[idx];
    if (!block) return;

    const mapping: Record<string, number> = {};
    block.headers.forEach((h, colIdx) => {
      const hl = h.toLowerCase();
      
      if (block.type === 'transactions') {
        if (hl.includes('dátum') || hl.includes('datum') || hl.includes('date') || hl.includes('kedy')) mapping['date'] = colIdx;
        if (hl.includes('popis') || hl.includes('poznámka') || hl.includes('partner') || hl.includes('detaily') || hl.includes('text') || hl.includes('obchodník')) mapping['description'] = colIdx;
        if (hl.includes('suma') || hl.includes('čiastka') || hl.includes('ciastka') || hl.includes('eur') || hl.includes('hodnota') || hl.includes('amount')) mapping['amount'] = colIdx;
        if (hl.includes('kategória') || hl.includes('kategoria') || hl.includes('category') || hl.includes('typ') || hl.includes('skupina')) mapping['category'] = colIdx;
      } else if (block.type === 'budgets') {
        if (hl.includes('kategória') || hl.includes('kategoria') || hl.includes('category') || hl.includes('typ') || hl.includes('skupina')) mapping['category'] = colIdx;
        if (hl.includes('limit') || hl.includes('rozpočet') || hl.includes('rozpocet') || hl.includes('suma') || hl.includes('eur')) mapping['limit'] = colIdx;
      } else if (block.type === 'investments') {
        if (hl.includes('názov') || hl.includes('nazov') || hl.includes('fond') || hl.includes('etf') || hl.includes('investícia') || hl.includes('partner')) mapping['name'] = colIdx;
        if (hl.includes('hodnota') || hl.includes('suma') || hl.includes('aktuálna') || hl.includes('eur') || hl.includes('value')) mapping['currentValue'] = colIdx;
        if (hl.includes('príspevok') || hl.includes('sporenie') || hl.includes('mesačne') || hl.includes('contribution')) mapping['monthlyContribution'] = colIdx;
        if (hl.includes('vlastník') || hl.includes('majiteľ') || hl.includes('typ') || hl.includes('rodina') || hl.includes('owner')) mapping['owner'] = colIdx;
      } else if (block.type === 'mortgages') {
        if (hl.includes('názov') || hl.includes('nazov') || hl.includes('banka') || hl.includes('úver') || hl.includes('hypotéka') || hl.includes('dlh') || hl.includes('name')) mapping['name'] = colIdx;
        if (hl.includes('zostatok') || hl.includes('istina') || hl.includes('dlžná') || hl.includes('suma') || hl.includes('remaining') || hl.includes('výška')) mapping['remainingAmount'] = colIdx;
        if (hl.includes('úrok') || hl.includes('sadzba') || hl.includes('p.a.') || hl.includes('interest')) mapping['interestRate'] = colIdx;
        if (hl.includes('splátka') || hl.includes('splatka') || hl.includes('payment') || hl.includes('mesačná')) mapping['monthlyPayment'] = colIdx;
      }
    });

    if (block.type === 'transactions') {
      if (mapping['date'] === undefined) mapping['date'] = 0;
      if (mapping['description'] === undefined) mapping['description'] = 1 < block.headers.length ? 1 : 0;
      if (mapping['amount'] === undefined) mapping['amount'] = 2 < block.headers.length ? 2 : 0;
      if (mapping['category'] === undefined) mapping['category'] = 3 < block.headers.length ? 3 : 0;
    } else if (block.type === 'budgets') {
      if (mapping['category'] === undefined) mapping['category'] = 0;
      if (mapping['limit'] === undefined) mapping['limit'] = 1 < block.headers.length ? 1 : 0;
    } else if (block.type === 'investments') {
      if (mapping['name'] === undefined) mapping['name'] = 0;
      if (mapping['currentValue'] === undefined) mapping['currentValue'] = 1 < block.headers.length ? 1 : 0;
      if (mapping['monthlyContribution'] === undefined) mapping['monthlyContribution'] = 2 < block.headers.length ? 2 : 0;
      if (mapping['owner'] === undefined) mapping['owner'] = 3 < block.headers.length ? 3 : 0;
    } else if (block.type === 'mortgages') {
      if (mapping['name'] === undefined) mapping['name'] = 0;
      if (mapping['remainingAmount'] === undefined) mapping['remainingAmount'] = 1 < block.headers.length ? 1 : 0;
      if (mapping['interestRate'] === undefined) mapping['interestRate'] = 2 < block.headers.length ? 2 : 0;
      if (mapping['monthlyPayment'] === undefined) mapping['monthlyPayment'] = 3 < block.headers.length ? 3 : 0;
    }

    setColMapping(mapping);
  };

  const handleUpdateMapping = (field: string, colIdx: number) => {
    setColMapping(prev => ({
      ...prev,
      [field]: colIdx
    }));
  };

  const parseAmount = (val: string): number => {
    if (!val) return 0;
    const normalized = val.replace(/\s/g, '').replace(/,/g, '.').replace(/€/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const parsePercent = (val: string): number => {
    if (!val) return 0;
    const normalized = val.replace(/\s/g, '').replace(/,/g, '.').replace(/%/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (val: string): string => {
    if (!val) return new Date().toISOString().slice(0, 10);
    const parts = val.split('.');
    if (parts.length === 3) {
      const day = parts[0].trim().padStart(2, '0');
      const month = parts[1].trim().padStart(2, '0');
      let year = parts[2].trim();
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
    const serial = Number(val);
    if (!isNaN(serial) && serial > 30000 && serial < 60000) {
      const utc_days  = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;                                        
      const date_info = new Date(utc_value * 1000);
      return date_info.toISOString().slice(0, 10);
    }
    return val;
  };

  const executeImport = () => {
    if (selectedBlockIdx === null) return;
    const block = detectedBlocks[selectedBlockIdx];
    if (!block) return;

    try {
      if (block.type === 'transactions') {
        const parsedList: Transaction[] = block.rows.map((row, idx) => {
          const dateStr = parseDate(row[colMapping['date']] || '');
          const desc = (row[colMapping['description']] || `Transakcia #${idx + 1}`).trim();
          const amountVal = parseAmount(row[colMapping['amount']] || '0');
          const cat = (row[colMapping['category']] || 'Iné výdavky').trim();

          return {
            id: `sheet-sync-${Date.now()}-${idx}`,
            date: dateStr,
            description: desc,
            amount: amountVal,
            category: cat === 'Príjem' || cat === 'Príjmy' || amountVal > 0 ? 'Príjmy' : cat,
            currency: 'EUR'
          };
        }).filter(t => t.description !== '' && t.amount !== 0);

        if (parsedList.length === 0) {
          throw new Error('Nenašli sa žiadne platné transakcie na import.');
        }

        const replace = window.confirm(
          `Nájdených ${parsedList.length} transakcií.\nChcete nahradiť doterajšie transakcie novými z tabuľky? \n[Kliknite na OK pre Nahradenie, Zrušiť pre Pridanie k existujúcim]`
        );

        const importedCats = Array.from(new Set(
          parsedList
            .map(t => t.category)
            .filter(c => c !== 'Príjmy' && c.length > 1)
        )) as string[];
        if (importedCats.length > 0) {
          onSetCategories(importedCats);
        }

        onImportTransactions(parsedList, replace);
        setSuccessMsg(`Úspešne naimportovaných ${parsedList.length} transakcií! Aplikácia bola aktualizovaná.`);
      } else if (block.type === 'budgets') {
        const parsedList: BudgetLimit[] = block.rows.map(row => {
          const cat = (row[colMapping['category']] || '').trim();
          const limitVal = Math.abs(parseAmount(row[colMapping['limit']] || '0'));
          return { category: cat, limit: limitVal };
        }).filter(b => b.category !== '' && b.limit > 0);

        if (parsedList.length === 0) {
          throw new Error('Nenašli sa žiadne platné rozpočtové limity.');
        }

        const cats = parsedList.map(b => b.category);
        onSetCategories(cats);
        onImportBudgets(parsedList);
        setSuccessMsg(`Úspešne synchronizovaných ${parsedList.length} mesačných rozpočtov!`);
      } else if (block.type === 'investments') {
        const parsedList: Investment[] = block.rows.map((row, idx) => {
          const nameStr = (row[colMapping['name']] || `Investícia ${idx + 1}`).trim();
          const curVal = parseAmount(row[colMapping['currentValue']] || '0');
          const monthly = parseAmount(row[colMapping['monthlyContribution']] || '0');
          const ownerRaw = (row[colMapping['owner']] || 'personal').trim().toLowerCase();
          
          let type: 'personal' | 'kids' = 'personal';
          if (ownerRaw.includes('deť') || ownerRaw.includes('deti') || ownerRaw.includes('kids') || ownerRaw.includes('spoločne')) {
            type = 'kids';
          }

          return {
            id: `sheet-inv-${Date.now()}-${idx}`,
            name: nameStr,
            currentValue: curVal,
            initialValue: curVal * 0.8,
            monthlyContribution: monthly,
            type,
            owner: type === 'kids' ? 'Kubko & Mimi' : 'Michal',
            history: [
              { date: '2026-01', value: curVal * 0.9 },
              { date: '2026-06', value: curVal }
            ]
          };
        }).filter(i => i.name !== '' && i.currentValue > 0);

        if (parsedList.length === 0) {
          throw new Error('Nenašli sa žiadne platné investície.');
        }

        onImportInvestments(parsedList);
        setSuccessMsg(`Úspešne importovaných ${parsedList.length} investičných pozícií!`);
      } else if (block.type === 'mortgages') {
        const parsedMortgages: Mortgage[] = [];
        const parsedLiabilities: Liability[] = [];

        block.rows.forEach((row, idx) => {
          const nameStr = (row[colMapping['name']] || `Záväzok ${idx + 1}`).trim();
          const remAmt = parseAmount(row[colMapping['remainingAmount']] || '0');
          const rate = parsePercent(row[colMapping['interestRate']] || '0');
          const payment = parseAmount(row[colMapping['monthlyPayment']] || '0');

          if (nameStr === '' || remAmt <= 0) return;

          const isMort = nameStr.toLowerCase().includes('hypo') || remAmt > 30000;

          if (isMort) {
            parsedMortgages.push({
              id: `sheet-mort-${Date.now()}-${idx}`,
              name: nameStr,
              bank: 'Slovenská sporiteľňa',
              totalAmount: remAmt * 1.2,
              remainingAmount: remAmt,
              interestRate: rate,
              monthlyPayment: payment,
              maturityDate: '2046-06-30',
              extraPayments: []
            });
          } else {
            parsedLiabilities.push({
              id: `sheet-lia-${Date.now()}-${idx}`,
              name: nameStr,
              totalAmount: remAmt,
              remainingAmount: remAmt,
              monthlyPayment: payment
            });
          }
        });

        if (parsedMortgages.length === 0 && parsedLiabilities.length === 0) {
          throw new Error('Nenašli sa žiadne platné hypotéky alebo spotrebné úvery.');
        }

        if (parsedMortgages.length > 0) onImportMortgages(parsedMortgages);
        if (parsedLiabilities.length > 0) onImportLiabilities(parsedLiabilities);
        setSuccessMsg(`Úspešne naimportované: ${parsedMortgages.length} hypoték a ${parsedLiabilities.length} spotrebných úverov!`);
      }
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri spracovaní hodnôt stĺpcov.');
    }
  };

  const handleFullFastSync = () => {
    if (detectedBlocks.length === 0) {
      setError('Pred spustením rýchlej synchronizácie najskôr načítajte tabuľku.');
      return;
    }

    const confirmed = window.confirm(
      'Naozaj chcete prepísať CELÚ aplikáciu (Transakcie, Rozpočty, Investície, Hypotéky) na základe automatického skenovania tabuľky? Dotknuté sekcie sa nahradia.'
    );
    if (!confirmed) return;

    let successCount = 0;
    try {
      detectedBlocks.forEach((block, bIdx) => {
        setSelectedBlockIdx(bIdx);
        
        const mapping: Record<string, number> = {};
        block.headers.forEach((h, colIdx) => {
          const hl = h.toLowerCase();
          if (block.type === 'transactions') {
            if (hl.includes('dátum') || hl.includes('datum') || hl.includes('date')) mapping['date'] = colIdx;
            if (hl.includes('popis') || hl.includes('poznámka') || hl.includes('partner') || hl.includes('text')) mapping['description'] = colIdx;
            if (hl.includes('suma') || hl.includes('čiastka') || hl.includes('eur') || hl.includes('amount')) mapping['amount'] = colIdx;
            if (hl.includes('kategória') || hl.includes('kategoria') || hl.includes('category')) mapping['category'] = colIdx;
          } else if (block.type === 'budgets') {
            if (hl.includes('kategória') || hl.includes('kategoria')) mapping['category'] = colIdx;
            if (hl.includes('limit') || hl.includes('rozpočet') || hl.includes('suma')) mapping['limit'] = colIdx;
          } else if (block.type === 'investments') {
            if (hl.includes('názov') || hl.includes('fond') || hl.includes('investícia')) mapping['name'] = colIdx;
            if (hl.includes('hodnota') || hl.includes('suma') || hl.includes('value')) mapping['currentValue'] = colIdx;
            if (hl.includes('príspevok') || hl.includes('sporenie') || hl.includes('mesačne')) mapping['monthlyContribution'] = colIdx;
            if (hl.includes('vlastník') || hl.includes('majiteľ')) mapping['owner'] = colIdx;
          } else if (block.type === 'mortgages') {
            if (hl.includes('názov') || hl.includes('banka') || hl.includes('úver') || hl.includes('dlh')) mapping['name'] = colIdx;
            if (hl.includes('zostatok') || hl.includes('istina') || hl.includes('dlžná') || hl.includes('suma')) mapping['remainingAmount'] = colIdx;
            if (hl.includes('úrok') || hl.includes('sadzba') || hl.includes('interest')) mapping['interestRate'] = colIdx;
            if (hl.includes('splátka') || hl.includes('splatka') || hl.includes('payment')) mapping['monthlyPayment'] = colIdx;
          }
        });

        if (block.type === 'transactions') {
          if (mapping['date'] === undefined) mapping['date'] = 0;
          if (mapping['description'] === undefined) mapping['description'] = 1 < block.headers.length ? 1 : 0;
          if (mapping['amount'] === undefined) mapping['amount'] = 2 < block.headers.length ? 2 : 0;
          if (mapping['category'] === undefined) mapping['category'] = 3 < block.headers.length ? 3 : 0;
          
          const parsed = block.rows.map((row, rIdx) => ({
            id: `full-sync-t-${Date.now()}-${rIdx}`,
            date: parseDate(row[mapping['date']] || ''),
            description: (row[mapping['description']] || `Transakcia ${rIdx + 1}`).trim(),
            amount: parseAmount(row[mapping['amount']] || '0'),
            category: (row[mapping['category']] || 'Iné výdavky').trim(),
            currency: 'EUR'
          })).filter(t => t.description !== '' && t.amount !== 0);

          if (parsed.length > 0) {
            const importedCats = Array.from(new Set(parsed.map(t => t.category).filter(c => c !== 'Príjmy' && c.length > 1))) as string[];
            if (importedCats.length > 0) onSetCategories(importedCats);
            onImportTransactions(parsed, true);
            successCount++;
          }
        } else if (block.type === 'budgets') {
          if (mapping['category'] === undefined) mapping['category'] = 0;
          if (mapping['limit'] === undefined) mapping['limit'] = 1 < block.headers.length ? 1 : 0;

          const parsed = block.rows.map(row => ({
            category: (row[mapping['category']] || '').trim(),
            limit: Math.abs(parseAmount(row[mapping['limit']] || '0'))
          })).filter(b => b.category !== '' && b.limit > 0);

          if (parsed.length > 0) {
            onImportBudgets(parsed);
            successCount++;
          }
        } else if (block.type === 'investments') {
          if (mapping['name'] === undefined) mapping['name'] = 0;
          if (mapping['currentValue'] === undefined) mapping['currentValue'] = 1 < block.headers.length ? 1 : 0;
          if (mapping['monthlyContribution'] === undefined) mapping['monthlyContribution'] = 2 < block.headers.length ? 2 : 0;
          if (mapping['owner'] === undefined) mapping['owner'] = 3 < block.headers.length ? 3 : 0;

          const parsed = block.rows.map((row, rIdx) => {
            const ownerRaw = (row[mapping['owner']] || 'personal').trim().toLowerCase();
            const type = (ownerRaw.includes('det') || ownerRaw.includes('kids') ? 'kids' : 'personal') as 'kids' | 'personal';
            return {
              id: `full-sync-i-${Date.now()}-${rIdx}`,
              name: (row[mapping['name']] || `Fond ${rIdx+1}`).trim(),
              currentValue: parseAmount(row[mapping['currentValue']] || '0'),
              initialValue: parseAmount(row[mapping['currentValue']] || '0') * 0.8,
              monthlyContribution: parseAmount(row[mapping['monthlyContribution']] || '0'),
              type,
              owner: type === 'kids' ? 'Kubko & Mimi' : 'Michal',
              history: [{ date: '2026-06', value: parseAmount(row[mapping['currentValue']] || '0') }]
            };
          }).filter(i => i.name !== '' && i.currentValue > 0);

          if (parsed.length > 0) {
            onImportInvestments(parsed);
            successCount++;
          }
        } else if (block.type === 'mortgages') {
          if (mapping['name'] === undefined) mapping['name'] = 0;
          if (mapping['remainingAmount'] === undefined) mapping['remainingAmount'] = 1 < block.headers.length ? 1 : 0;
          if (mapping['interestRate'] === undefined) mapping['interestRate'] = 2 < block.headers.length ? 2 : 0;
          if (mapping['monthlyPayment'] === undefined) mapping['monthlyPayment'] = 3 < block.headers.length ? 3 : 0;

          const parsedMortgages: Mortgage[] = [];
          const parsedLiabilities: Liability[] = [];

          block.rows.forEach((row, rIdx) => {
            const nameStr = (row[mapping['name']] || `Úver ${rIdx+1}`).trim();
            const rem = parseAmount(row[mapping['remainingAmount']] || '0');
            const rate = parsePercent(row[mapping['interestRate']] || '0');
            const pay = parseAmount(row[mapping['monthlyPayment']] || '0');

            if (nameStr === '' || rem <= 0) return;

            if (nameStr.toLowerCase().includes('hypo') || rem > 30000) {
              parsedMortgages.push({
                id: `full-sync-m-${Date.now()}-${rIdx}`,
                name: nameStr,
                bank: 'Slovenská sporiteľňa',
                totalAmount: rem * 1.2,
                remainingAmount: rem,
                interestRate: rate,
                monthlyPayment: pay,
                maturityDate: '2046-06-30',
                extraPayments: []
              });
            } else {
              parsedLiabilities.push({
                id: `full-sync-l-${Date.now()}-${rIdx}`,
                name: nameStr,
                totalAmount: rem,
                remainingAmount: rem,
                monthlyPayment: pay
              });
            }
          });

          if (parsedMortgages.length > 0) {
            onImportMortgages(parsedMortgages);
            successCount++;
          }
          if (parsedLiabilities.length > 0) {
            onImportLiabilities(parsedLiabilities);
            successCount++;
          }
        }
      });

      setSuccessMsg(`Kompletná rýchla synchronizácia dokončená úspešne! Aktualizovali sme ${successCount} samostatných finančných modulov.`);
    } catch (err: any) {
      setError(`Chyba pri rýchlej synchronizácii: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6" id="google-sheets-sync-panel">
      {activeRole === 'viewer' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span>Ste prihlásený v režime len na čítanie. Prepojenie a synchronizácia sú dostupné iba pre Administrátorov a Editorov.</span>
        </div>
      )}

      {/* Configuration Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600 w-6 h-6" />
              Prepojenie & Import Excel / Google Sheets
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Načítajte alebo exportujte svoje rodinné financie (rozpočty, výdavky, úspory, investície a dlhy) z Microsoft Excel (.xlsx) alebo Google Tabuliek.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {!user ? (
              <button
                onClick={handleLogin}
                disabled={activeRole === 'viewer'}
                className={`flex items-center gap-2.5 px-4 py-2 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                  activeRole === 'viewer'
                    ? 'bg-slate-300 cursor-not-allowed opacity-60'
                    : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Prihlásiť sa cez Google
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="font-bold text-slate-800 text-xs">{user.displayName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{user.email}</span>
                </div>
                {user.photoURL && (
                  <img src={user.photoURL} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                  title="Odhlásiť sa"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-4 bg-teal-50/80 border border-teal-200/80 rounded-2xl flex flex-col sm:flex-row gap-3 items-start text-left">
          <div className="text-xl">📊</div>
          <div>
            <h4 className="font-bold text-teal-900 text-xs uppercase tracking-wider">Možnosti importu a tvorby rozpočtu</h4>
            <p className="text-teal-800 text-[11px] font-semibold leading-relaxed mt-1">
              Môžete priamo nahrať svoj <span className="font-black underline">lokálny Excel súbor (.xlsx / .xls)</span> vytvorený v minulosti, alebo prepojiť živú Google Tabuľku.
            </p>
            <p className="text-teal-700 text-[11px] leading-relaxed mt-1">
              Nový mesačný výkaz výdavkov môžete po mesiacoch exportovať a analyzovať pomocou nášho zabudovaného <span className="font-bold">Gemini AI Asistenta</span>.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 mt-5 overflow-x-auto gap-2">
          <button
            onClick={() => {
              setSyncTab('import');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              syncTab === 'import'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📥 Import z Excelu / Tabuľky
          </button>
          {user && (
            <button
              onClick={() => {
                setSyncTab('export');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                syncTab === 'export'
                  ? 'border-indigo-600 text-indigo-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              📤 Uložiť na Google Disk (Export)
            </button>
          )}
          <button
            onClick={() => {
              setSyncTab('ai_monthly');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              syncTab === 'ai_monthly'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            🤖 AI Mesačný Export (Excel)
          </button>
        </div>

        {/* TAB 1: IMPORT DATA */}
        {syncTab === 'import' && (
          <div className="mt-5 space-y-6">
            {/* Sub-toggle: Google Sheets vs Excel File */}
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 max-w-md">
              <button
                type="button"
                onClick={() => setImportSource('sheets')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  importSource === 'sheets'
                    ? 'bg-white text-indigo-600 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Google Tabuľky (Sheets)
              </button>
              <button
                type="button"
                onClick={() => setImportSource('excel')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  importSource === 'excel'
                    ? 'bg-white text-emerald-600 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileUp className="w-4 h-4" />
                Microsoft Excel (.xlsx)
              </button>
            </div>

            {/* SOURCE A: EXCEL FILE UPLOAD */}
            {importSource === 'excel' && (
              <div className="bg-slate-50/70 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-6 transition text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Načítať Microsoft Excel alebo CSV súbor
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Pre tých, ktorí si vytvárali rozpočty aj predtým. Vyberte svoj Excel súbor (.xlsx, .xls) z počítača.
                  </p>
                </div>

                <div className="flex justify-center">
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm">
                    <FileUp className="w-4 h-4" />
                    {excelFile ? `Zmeniť súbor (${excelFile.name})` : 'Vybrať Excel súbor (.xlsx)'}
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleExcelFileUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {excelFile && (
                  <div className="text-xs text-emerald-700 font-bold bg-emerald-50 inline-block px-3 py-1.5 rounded-lg border border-emerald-200">
                    Súbor: {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}

                {/* Detected sheets/tabs in Excel workbook */}
                {excelSheets.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60 text-left">
                    <span className="font-bold text-slate-700 text-xs block mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-emerald-600" /> Detegované listy (záložky) v Exceli:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {excelSheets.map(sName => {
                        const isActive = activeExcelSheet === sName;
                        return (
                          <button
                            key={sName}
                            type="button"
                            onClick={() => {
                              setActiveExcelSheet(sName);
                              if (excelWorkbook) {
                                parseAndSetExcelSheet(excelWorkbook, sName);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition border ${
                              isActive
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'
                            }`}
                          >
                            {sName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SOURCE B: GOOGLE SHEETS API */}
            {importSource === 'sheets' && (
              <>
                {!user ? (
                  <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Prihláste sa pomocou Google účtu na načítanie živých tabuliek z vášho Google Disku.</p>
                    <button
                      onClick={handleLogin}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      Prihlásiť sa cez Google
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-5">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">ID Google tabuľky alebo URL</label>
                        <input
                          type="text"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-indigo-600 focus:bg-white transition"
                          value={spreadsheetId}
                          onChange={(e) => setSpreadsheetId(e.target.value)}
                          placeholder="Sem vložte ID tabuľky"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Názov listu a rozsah</label>
                        <input
                          type="text"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-600 focus:bg-white transition"
                          value={range}
                          onChange={(e) => setRange(e.target.value)}
                          placeholder="napr. 400_Rozpočet!A1:Z500"
                        />
                      </div>
                      <div className="md:col-span-4 flex gap-2">
                        <button
                          id="btn-load-sheet"
                          onClick={handleLoadSheet}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm h-[42px]"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sťahujem...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Stiahnuť dáta
                            </>
                          )}
                        </button>

                        {detectedBlocks.length > 0 && (
                          <button
                            onClick={handleFullFastSync}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm h-[42px]"
                            title="Spustiť expresnú synchronizáciu všetkých detegovaných modulov"
                          >
                            <Database className="w-4 h-4" />
                            Rýchly Sync
                          </button>
                        )}
                      </div>
                    </div>

                    {availableSheets.length > 0 && (
                      <div className="bg-indigo-50/30 border border-indigo-100/70 rounded-xl p-3 text-left">
                        <span className="font-bold text-indigo-900 block mb-2 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                          <Table className="w-3.5 h-3.5 text-indigo-600" /> Detegované listy (záložky) v tabuľke:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableSheets.map(title => {
                            const isActive = range.startsWith(`${title}!`) || range === title;
                            return (
                              <button
                                key={title}
                                type="button"
                                onClick={() => {
                                  const newRange = `${title}!A1:Z500`;
                                  setRange(newRange);
                                  if (accessToken) {
                                    setIsLoading(true);
                                    setError(null);
                                    setSuccessMsg(null);
                                    setSheetRawValues([]);
                                    setDetectedBlocks([]);
                                    setSelectedBlockIdx(null);
                                    fetchSpreadsheetData(accessToken, spreadsheetId, newRange)
                                      .then(data => {
                                        const rows = data.values as string[][];
                                        if (!rows || rows.length === 0) {
                                          throw new Error('Tento list je prázdny alebo neobsahuje žiadne riadky.');
                                        }
                                        setSheetRawValues(rows);
                                        analyzeSheetBlocks(rows);
                                        setSuccessMsg(`Úspešne načítané dáta z listu "${title}"!`);
                                      })
                                      .catch(err => {
                                        console.error(err);
                                        setError(err.message || `Nepodarilo sa načítať list "${title}".`);
                                      })
                                      .finally(() => {
                                        setIsLoading(false);
                                      });
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition border ${
                                  isActive
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs font-extrabold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-700 hover:border-indigo-100'
                                }`}
                              >
                                {title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: EXPORT TO GOOGLE DRIVE */}
        {syncTab === 'export' && user && (
          <div className="mt-6 space-y-6 animate-fade-in text-left">
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-5">
              <div>
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block">1. Výber cieľa uloženia</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Zvoľte, kam sa majú aktuálne údaje uložiť na Google Drive.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setExportDestination('current')}
                  className={`p-4 border rounded-xl cursor-pointer transition ${
                    exportDestination === 'current'
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-3xs'
                      : 'bg-white border-slate-200/60 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      checked={exportDestination === 'current'} 
                      onChange={() => {}} 
                      className="mt-1 font-sans" 
                    />
                    <div>
                      <span className="font-bold text-slate-700 text-xs block">Aktuálne prepojená tabuľka</span>
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono truncate max-w-[250px]">
                        ID: {spreadsheetId || 'Žiadna vybratá'}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setExportDestination('new')}
                  className={`p-4 border rounded-xl cursor-pointer transition ${
                    exportDestination === 'new'
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-3xs'
                      : 'bg-white border-slate-200/60 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      checked={exportDestination === 'new'} 
                      onChange={() => {}} 
                      className="mt-1 font-sans" 
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-700 text-xs block">Vytvoriť novú tabuľku</span>
                      {exportDestination === 'new' && (
                        <input
                          type="text"
                          value={newSpreadsheetTitle}
                          onChange={(e) => setNewSpreadsheetTitle(e.target.value)}
                          className="w-full mt-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                          placeholder="Názov novej tabuľky"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleExportToGoogleDrive}
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Uložiť na Drive
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: AI MONTHLY EXPORT VIA GEMINI */}
        {syncTab === 'ai_monthly' && (
          <div className="mt-6 space-y-6 animate-fade-in text-left">
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Export rozpočtu po mesiacoch pomocou AI Asistenta Gemini
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vyberte mesiac a vygenerujte si kompletnú finančnú analýzu a formátovaný Excel súbor (.xlsx) s vyhodnotením čerpania limitov.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-2">
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Vyberte mesiac pre export
                  </label>
                  <select
                    value={monthlyExportMonth}
                    onChange={(e) => setMonthlyExportMonth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-indigo-600"
                  >
                    {availableMonths.map(m => (
                      <option key={m} value={m}>
                        {m} ({currentTransactions.filter(t => t.date.startsWith(m)).length} transakcií)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <button
                    onClick={handleGenerateAiMonthlyExport}
                    disabled={isGeneratingAiExport}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md h-[42px]"
                  >
                    {isGeneratingAiExport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analýza AI & Tvorba Excelu...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Vygenerovať AI Správu & Stiahnuť Excel
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Display AI Export Result text if generated */}
            {aiExportResultText && (
              <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    AI Hodnotenie za mesiac {monthlyExportMonth}
                  </h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md">
                    Excel Súbor Stiahnutý ✅
                  </span>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {aiExportResultText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Error Notice */}
        {error && (
          <div className="mt-5 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Chyba</p>
              <p className="mt-0.5 font-semibold leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Global Success Notice */}
        {successMsg && (
          <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wide text-[10px] text-emerald-600">Úspech</p>
              <p className="mt-0.5 font-medium">{successMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* DETECTED BLOCKS AND MAPPING CONFIGURATION */}
      {syncTab === 'import' && detectedBlocks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Detected tables list */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-500" />
                Nájdené finančné tabuľky ({detectedBlocks.length})
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Vybrali sme samostatné sekcie zo súboru. Vyberte sekciu pre manuálny import a doladenie stĺpcov:
              </p>
            </div>

            <div className="space-y-2.5">
              {detectedBlocks.map((block, idx) => {
                const isSelected = selectedBlockIdx === idx;
                const isExpanded = expandedBlockIdx === idx;
                
                return (
                  <div 
                    key={idx}
                    className={`p-4 border rounded-2xl transition cursor-pointer hover:border-indigo-200 ${
                      isSelected ? 'bg-indigo-50/30 border-indigo-200 shadow-xs' : 'bg-white border-slate-100'
                    }`}
                    onClick={() => handleSelectBlock(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          block.type === 'transactions' ? 'bg-amber-100 text-amber-700' :
                          block.type === 'budgets' ? 'bg-purple-100 text-purple-700' :
                          block.type === 'investments' ? 'bg-emerald-100 text-emerald-700' :
                          block.type === 'mortgages' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-800 block uppercase tracking-wide">
                            {block.type === 'transactions' ? 'Transakcie (Platby)' :
                             block.type === 'budgets' ? 'Mesačné limity kategórií' :
                             block.type === 'investments' ? 'Investičné Portfólio' :
                             block.type === 'mortgages' ? 'Hypotéky & Záväzky' :
                             'Neznáma tabuľka'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {block.rows.length} riadkov • {block.headers.length} stĺpcov
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBlockIdx(isExpanded ? null : idx);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-mono space-y-1 bg-slate-50 p-2.5 rounded-lg max-h-40 overflow-y-auto">
                        <span className="font-bold text-slate-400 block mb-1">Hlavičky stĺpcov:</span>
                        {block.headers.map((h, hIdx) => (
                          <div key={hIdx} className="flex justify-between">
                            <span>Stĺpec {String.fromCharCode(65 + hIdx)}:</span>
                            <span className="text-slate-700 font-bold truncate max-w-[150px]">{h || 'prázdny'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Config column mapping and preview */}
          {selectedBlockIdx !== null && (
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Konfigurácia & Mapovanie stĺpcov
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Priraďte stĺpce z Vašej tabuľky k dátovým položkám aplikácie FinTrack.
                    </p>
                  </div>
                  
                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                    Sken {detectedBlocks[selectedBlockIdx].type.toUpperCase()}
                  </span>
                </div>

                {/* Column Selection Grid */}
                <div className="mt-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mapovanie premenných:</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {detectedBlocks[selectedBlockIdx].type === 'transactions' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">📅 Dátum transakcie</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['date'] ?? ''}
                            onChange={(e) => handleUpdateMapping('date', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">🏷️ Popis / Partner</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['description'] ?? ''}
                            onChange={(e) => handleUpdateMapping('description', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">💰 Suma (EUR)</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['amount'] ?? ''}
                            onChange={(e) => handleUpdateMapping('amount', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">📁 Kategória výdavku</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['category'] ?? ''}
                            onChange={(e) => handleUpdateMapping('category', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {detectedBlocks[selectedBlockIdx].type === 'budgets' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">📁 Kategória výdavku</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['category'] ?? ''}
                            onChange={(e) => handleUpdateMapping('category', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">🎯 Mesačný Limit rozpočtu</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['limit'] ?? ''}
                            onChange={(e) => handleUpdateMapping('limit', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {detectedBlocks[selectedBlockIdx].type === 'investments' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">📈 Názov investície / ETF</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['name'] ?? ''}
                            onChange={(e) => handleUpdateMapping('name', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">💰 Aktuálna hodnota portfólia</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['currentValue'] ?? ''}
                            onChange={(e) => handleUpdateMapping('currentValue', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">💵 Mesačný príspevok</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['monthlyContribution'] ?? ''}
                            onChange={(e) => handleUpdateMapping('monthlyContribution', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">👤 Vlastník / Rodina</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['owner'] ?? ''}
                            onChange={(e) => handleUpdateMapping('owner', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {detectedBlocks[selectedBlockIdx].type === 'mortgages' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">🏠 Názov úveru / hypotéky</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['name'] ?? ''}
                            onChange={(e) => handleUpdateMapping('name', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">📉 Zostatok dlhu (EUR)</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['remainingAmount'] ?? ''}
                            onChange={(e) => handleUpdateMapping('remainingAmount', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">% Úroková sadzba</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['interestRate'] ?? ''}
                            onChange={(e) => handleUpdateMapping('interestRate', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">💳 Mesačná splátka</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium cursor-pointer focus:outline-indigo-600"
                            value={colMapping['monthlyPayment'] ?? ''}
                            onChange={(e) => handleUpdateMapping('monthlyPayment', Number(e.target.value))}
                          >
                            {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65+i)} - {h}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Table Data Preview */}
                <div className="mt-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Náhľad prvých 3 riadkov:
                  </span>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          {detectedBlocks[selectedBlockIdx].headers.map((h, i) => (
                            <th key={i} className="p-2 border-r last:border-0 border-slate-100">
                              {String.fromCharCode(65+i)}: {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detectedBlocks[selectedBlockIdx].rows.slice(0, 3).map((r, rIdx) => (
                          <tr key={rIdx} className="border-b last:border-0 border-slate-100 text-slate-700">
                            {r.map((c, cIdx) => (
                              <td key={cIdx} className="p-2 border-r last:border-0 border-slate-100 font-mono text-[10px]">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Confirm Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Riadkov na import: <b>{detectedBlocks[selectedBlockIdx].rows.length}</b>
                </span>
                <button
                  type="button"
                  onClick={executeImport}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Naimportovať tento modul
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
