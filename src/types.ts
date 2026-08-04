export type UserRole = 'admin' | 'editor' | 'viewer';

export type InsuranceCategory = 'car' | 'property' | 'life' | 'travel';

export interface InsuranceContact {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

export interface InsuranceContract {
  id: string;
  category: InsuranceCategory;
  title: string;          // e.g. "PZP + Kasko Tesla Model S"
  insurer: string;        // e.g. "Allianz"
  policyNumber: string;   // e.g. "123456789"
  premiumAmount: number;  // e.g. 450
  frequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually'; // mesačne, štvrťročne, polročne, ročne
  startDate: string;      // e.g. "2024-05-15"
  endDate?: string;       // e.g. "2025-05-14" (výročie / platnosť)
  contact: InsuranceContact;
  notes?: string;
  // Uploaded file metadata
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileDataUrl?: string;   // base64 data URL to allow previewing / saving
}

export interface FamilyMember {
  name: string;
  role: UserRole;
  email?: string;
  status?: 'active' | 'invited';
  invitedAt?: string;
  inviteToken?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  currency: string;
  bank?: string;
  comment?: string;
}

export interface BudgetLimit {
  category: string;
  limit: number;
}

export interface Investment {
  id: string;
  name: string;
  type: 'personal' | 'kids';
  owner: string; // e.g., "Moje", "Mimi", "Kubko"
  initialValue: number;
  currentValue: number;
  monthlyContribution: number;
  history: { date: string; value: number }[];
  platform?: string; // e.g. "Interactive Brokers", "Portu", "Fumbi", "Finax"
}

export interface Mortgage {
  id: string;
  name: string;
  bank: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number; // percentage, e.g. 4.2
  monthlyPayment: number;
  maturityDate: string;
  extraPayments: { id: string; date: string; amount: number }[];
}

export interface Liability {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
}

export interface FamilyAsset {
  id: string;
  name: string;
  type: 'real_estate' | 'land' | 'car' | 'cash' | 'other';
  value: number;
  description?: string;
}

export const CATEGORY_MAP: Record<string, string[]> = {
  "PRÍJMY": [
    "Výplata 1_BVK",
    "Výplata 2_BVK",
    "Nemocenská dávka",
    "AV PROJEKT s.r.o.",
    "Úrad práce",
    "Anszi - tankovanie",
    "Iné príjmy"
  ],
  "BÝVANIE": [
    "Splátka úveru",
    "Poistenie RD",
    "Plyn",
    "Elektrina",
    "Voda",
    "Odvoz odpadu",
    "Upratovanie",
    "Zabezpečenie - Jablotron",
    "Dane",
    "Zariadenie domu",
    "Údržba, záhrada"
  ],
  "DOPRAVA A MOBILITA": [
    "Palivo VV",
    "Palivo ÁV",
    "Verejná doprava",
    "Leasing",
    "Údržba",
    "Poistenie - Tesla",
    "Poistenie - Mazda",
    "Parkovné"
  ],
  "DETI": [
    "Oblečenie a obuv",
    "Školné, škôlka",
    "Školské potreby",
    "Krúžky šport, hudba",
    "Darčeky",
    "Vreckové"
  ],
  "ZDRAVIE A STAROSTLIVOSŤ": [
    "Liek, suplementy",
    "Návšteva lekára",
    "Životné poistenie VV,NV",
    "Životné poistenie ÁV",
    "Preventívne prehliadky",
    "Fyzioterapia, pomôcky",
    "Terápia",
    "Cestovné poistenie"
  ],
  "VOĽNÝ ČAS A ODDÝCH, DOMÁCE ZVIERATÁ": [
    "Domáce zvieratá",
    "Dovolenky, víkendy",
    "Reštaurácie",
    "Kultúra, vstupné",
    "Hobby a šport",
    "VV - Költőpénz",
    "ÁV - Költőpénz"
  ],
  "PREDPLATNÉ": [
    "Denník N",
    "Netflix",
    "Spotify",
    "Youtube premium",
    "Tesla conect",
    "iCloud+",
    "O2 - VV",
    "Oura membership"
  ],
  "SPORENIE": [
    "Sporenie - dôchodok",
    "Fumby",
    "Nina - sporenie",
    "Sporenie na Porsche",
    "Sporenie 365",
    "Sporenie - rezerva"
  ],
  "CHARITA": [
    "Liga proti rakovine",
    "Sloboda zvierat"
  ],
  "POTRAVINY": [
    "Potraviny",
    "Gym beam",
    "Pekáreň",
    "Farmove-bio zelenina a ovocie, mäso, zelovoc",
    "Káva",
    "Mesiarstvo",
    "Med"
  ],
  "DROGÉRIA": [
    "Drogéria",
    "Čistiace prostriedky"
  ],
  "OBLEČENIE": [
    "Veri oblečenie",
    "Ádám oblečenie"
  ],
  "OSTATNÉ NEPRAVIDELNÉ VÝDAVKY": [
    "Dane, poplatky",
    "Dary_Darčeky",
    "Nečakané opravy",
    "Poplatky za služby",
    "Predmety, domáce potreby"
  ]
};

export const DEFAULT_CATEGORIES = Object.keys(CATEGORY_MAP);

export interface SettleUpExpense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  splitWith: string[];
  date: string;
  category: string;
  isSettlement?: boolean;
}

export interface SettleUpGroup {
  id: string;
  name: string;
  members: string[];
  expenses: SettleUpExpense[];
  createdDate: string;
  isSyncedOnline?: boolean;
  firebaseId?: string;
  pinCode?: string;
}


