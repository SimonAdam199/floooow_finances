import { Transaction, BudgetLimit, Investment, Mortgage, Liability, FamilyAsset, InsuranceContract } from '../types';

export const initialFamilyAssets: FamilyAsset[] = [];

export const initialTransactions: Transaction[] = [];

export const initialBudgets: BudgetLimit[] = [
  { category: 'BÝVANIE', limit: 0 },
  { category: 'DOPRAVA A MOBILITA', limit: 0 },
  { category: 'DETI', limit: 0 },
  { category: 'ZDRAVIE A STAROSTLIVOSŤ', limit: 0 },
  { category: 'VOĽNÝ ČAS A ODDÝCH, DOMÁCE ZVIERATÁ', limit: 0 },
  { category: 'PREDPLATNÉ', limit: 0 },
  { category: 'SPORENIE', limit: 0 },
  { category: 'CHARITA', limit: 0 },
  { category: 'POTRAVINY', limit: 0 },
  { category: 'DROGÉRIA', limit: 0 },
  { category: 'OBLEČENIE', limit: 0 },
  { category: 'OSTATNÉ NEPRAVIDELNÉ VÝDAVKY', limit: 0 }
];

export const initialInvestments: Investment[] = [];

export const initialMortgages: Mortgage[] = [];

export const initialLiabilities: Liability[] = [];

export const initialInsuranceContracts: InsuranceContract[] = [];

export const mockBankStatementText = ``;
