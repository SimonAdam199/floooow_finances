import { getIdToken } from '../lib/googleAuth';

export interface DbHealthResponse {
  status: string;
  dbConnected?: boolean;
  databaseConnected?: boolean;
  timestamp?: string;
  error?: string;
}

export interface BankTransactionParsed {
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  currency?: string;
}

export interface ParseBankStatementPayload {
  statementText?: string;
  fileBase64?: string;
  fileMimeType?: string;
}

export interface ParseBankStatementResponse {
  success: boolean;
  transactions: BankTransactionParsed[];
  error?: string;
}

export interface MortgageParsed {
  bank: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  monthlyPayment: number;
  maturityDate: string;
}

export interface ParseMortgagePayload {
  fileBase64?: string;
  fileMimeType?: string;
  contractText?: string;
}

export interface ParseMortgageResponse {
  success: boolean;
  mortgage: MortgageParsed;
  error?: string;
}

export interface GenerateReportStats {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  totalInvestmentsVal: number;
  totalInvestmentsMonthly: number;
  totalDebt: number;
  numberOfInvestments: number;
  numberOfMortgages: number;
  numberOfLiabilities: number;
}

export interface GenerateReportResponse {
  success: boolean;
  report: string;
  error?: string;
}

export interface AnalyzeMonthlyBudgetPayload {
  month: string;
  transactions: any[];
  budgets: any[];
}

export interface AnalyzeMonthlyBudgetResponse {
  success: boolean;
  analysis: string;
  error?: string;
}

export interface BudgetChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface BudgetChatPayload {
  message: string;
  history?: BudgetChatMessage[];
  month: string;
  transactions?: any[];
  budgets?: any[];
}

export interface BudgetChatResponse {
  success: boolean;
  reply: string;
  error?: string;
}

export interface InvestmentParsed {
  name: string;
  platform: string;
  initialValue: number;
  currentValue: number;
  monthlyContribution: number;
  type: 'personal' | 'kids';
  owner: string;
  summaryNote: string;
}

export interface ParseInvestmentPayload {
  promptText?: string;
  fileBase64?: string;
  fileMimeType?: string;
}

export interface ParseInvestmentResponse {
  success: boolean;
  investment: InvestmentParsed;
  error?: string;
}

// Database API interfaces
export interface DbTransaction {
  id: number;
  date: string;
  bank?: string | null;
  category: string;
  subcategory?: string | null;
  description: string;
  amount: string | number;
  comment?: string | null;
  userId?: string | null;
  createdAt?: string;
}

export interface DbFamilyMember {
  id: number;
  name: string;
  role: string;
  avatar?: string | null;
}

// Internal helper for JSON fetch requests
async function postJson<T>(url: string, payload: any, defaultErrorMsg: string): Promise<T> {
  const token = await getIdToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = defaultErrorMsg;
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.error || parsed.message || errorMsg;
    } catch {
      errorMsg = `Chyba na serveri (Status ${response.status}): ${response.statusText || 'Neočakávaná odpoveď'}`;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (data.success === false) {
    throw new Error(data.error || defaultErrorMsg);
  }
  return data as T;
}

async function getJson<T>(url: string, defaultErrorMsg: string): Promise<T> {
  const token = await getIdToken();
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = defaultErrorMsg;
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.error || parsed.message || errorMsg;
    } catch {
      errorMsg = `Chyba na serveri (Status ${response.status})`;
    }
    throw new Error(errorMsg);
  }
  return await response.json();
}

async function deleteJson<T>(url: string, defaultErrorMsg: string): Promise<T> {
  const token = await getIdToken();
  const response = await fetch(url, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = defaultErrorMsg;
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.error || parsed.message || errorMsg;
    } catch {
      errorMsg = `Chyba na serveri (Status ${response.status})`;
    }
    throw new Error(errorMsg);
  }
  return await response.json();
}

// Exported API client functions
export async function checkDbHealth(): Promise<DbHealthResponse> {
  return getJson<DbHealthResponse>('/api/db/health', 'Chyba pri kontrole stavu databázy');
}

export interface DbUserProfile {
  id: number;
  uid: string;
  email: string;
  name?: string | null;
  profile: Record<string, unknown>;
}

export async function getDbUserProfile(): Promise<{ success: boolean; data: DbUserProfile }> {
  return getJson('/api/db/me', 'Chyba pri načítaní profilu.');
}

export async function saveDbUserProfile(profile: Record<string, unknown>): Promise<{ success: boolean; data: Record<string, unknown> }> {
  const token = await getIdToken();
  const response = await fetch('/api/db/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ profile }),
  });
  if (!response.ok) throw new Error('Chyba pri ukladaní profilu.');
  return response.json();
}

export async function parseBankStatement(payload: ParseBankStatementPayload): Promise<ParseBankStatementResponse> {
  return postJson<ParseBankStatementResponse>('/api/parse-bank-statement', payload, 'Nastala chyba pri spracovaní výpisu.');
}

export async function parseMortgageAgreement(payload: ParseMortgagePayload): Promise<ParseMortgageResponse> {
  return postJson<ParseMortgageResponse>('/api/parse-mortgage-agreement', payload, 'Nepodarilo sa analyzovať zmluvu.');
}

export async function generateFinancialReport(stats: GenerateReportStats): Promise<GenerateReportResponse> {
  return postJson<GenerateReportResponse>('/api/generate-financial-report', { stats }, 'Nepodarilo sa vygenerovať výročnú správu.');
}

export async function analyzeMonthlyBudget(payload: AnalyzeMonthlyBudgetPayload): Promise<AnalyzeMonthlyBudgetResponse> {
  return postJson<AnalyzeMonthlyBudgetResponse>('/api/analyze-monthly-budget', payload, 'Nepodarilo sa vygenerovať AI analýzu rozpočtu.');
}

export async function sendBudgetChatMessage(payload: BudgetChatPayload): Promise<BudgetChatResponse> {
  return postJson<BudgetChatResponse>('/api/budget-chat', payload, 'Nepodarilo sa získať odpoveď od AI.');
}

export async function parseInvestment(payload: ParseInvestmentPayload): Promise<ParseInvestmentResponse> {
  return postJson<ParseInvestmentResponse>('/api/parse-investment', payload, 'Nepodarilo sa spracovať AI požiadavku.');
}

export async function getDbTransactions(): Promise<{ success: boolean; data: DbTransaction[] }> {
  return getJson<{ success: boolean; data: DbTransaction[] }>('/api/db/transactions', 'Chyba pri načítaní transakcií z databázy.');
}

export async function createDbTransaction(tx: Omit<DbTransaction, 'id' | 'createdAt'>): Promise<{ success: boolean; data: DbTransaction }> {
  return postJson<{ success: boolean; data: DbTransaction }>('/api/db/transactions', tx, 'Chyba pri ukladaní transakcie.');
}

export async function deleteDbTransaction(id: number): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`/api/db/transactions/${id}`, 'Chyba pri mazaní transakcie.');
}

export async function getDbFamilyMembers(): Promise<{ success: boolean; data: DbFamilyMember[] }> {
  return getJson<{ success: boolean; data: DbFamilyMember[] }>('/api/db/family-members', 'Chyba pri načítaní členov rodiny.');
}

export async function createDbFamilyMember(member: Omit<DbFamilyMember, 'id'>): Promise<{ success: boolean; data: DbFamilyMember }> {
  return postJson<{ success: boolean; data: DbFamilyMember }>('/api/db/family-members', member, 'Chyba pri pridaní člena rodiny.');
}

export async function deleteDbFamilyMember(id: number): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`/api/db/family-members/${id}`, 'Chyba pri mazaní člena rodiny.');
}
