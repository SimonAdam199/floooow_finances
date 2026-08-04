export type Language = 'SK' | 'CZ' | 'HU' | 'EN';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'SK', name: 'Slovenčina', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { code: 'CZ', name: 'Čeština', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'HU', name: 'Maďarčina', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'EN', name: 'Angličtina', nativeName: 'English', flag: '🇬🇧' }
];

export const translations = {
  SK: {
    // Navigation
    navOverview: 'Prehľad',
    navBudgets: 'Rozpočty',
    navInvestments: 'Investície',
    navKids: 'Detské sporenia',
    navAssets: 'Celkový majetok',
    navMortgages: 'Hypotéka & Záväzky',
    navInsurance: 'Poistenie',
    navReports: 'Výročné správy',
    navSettleUp: 'Settle Up / Výdavky',
    navSettings: 'Nastavenia',

    // Header
    greeting: 'AHOJ',
    lastBankStatement: 'Posledný výpis spracovaný pomocou Gemini AI pred 2 dňami (Tatra Banka)',
    uploadStatement: 'Nahrat výpis',
    manualTransaction: 'Pridať transakciu',
    language: 'Jazyk',

    // Roles
    roleAdmin: 'Správca',
    roleEditor: 'Zápis & Nahrávanie',
    roleViewer: 'Len čítanie',

    // Overview Stats
    netAssetValue: 'Čistá hodnota majetku',
    kidsInvestmentsTitle: 'Detské investície & sporenia',
    monthlyExpensesTitle: 'Mesačné výdavky / Rozpočet',
    monthlyOverviewFor: 'MESAČNÝ PREHĽAD ZA',
    financialSituationSubtitle: 'Zobrazenie finančnej situácie, limitov a transakcií pre zvolený mesiac.',
    activeAssets: 'Aktíva',
    debts: 'Dlhy',
    budgetUsage: 'Čerpanie rozpočtu',
    investmentGrowth12M: 'Vývoj investícií (12 mesiacov)',
    totalAssetGrowthSubtitle: 'Celková hodnota majetku v podielových fondoch a ETF.',
    spendingCategoriesMonth: 'Kategórie výdavkov tento mesiac',
    manageDetailedBudgets: 'Spravovať podrobné rozpočty',
    cumulative: 'Kumulatívne',

    // Actions
    add: 'Pridať',
    addViaAi: 'Pridať cez AI ✨',
    addManually: 'Ručne pridať',
    edit: 'Upraviť',
    delete: 'Vymazať',
    cancel: 'Zrušiť',
    save: 'Uložiť',
    confirm: 'Potvrdiť',

    // Settings
    settingsTitle: 'Nastavenia systému',
    settingsSubtitle: 'Upravte si rodinné profily, finančné kategórie, rozpočtové ciele, jazyk a motív vzhľadu.',
    settingsTabUsers: 'Členovia rodiny',
    settingsTabCategories: 'Kategórie',
    settingsTabBudgets: 'Rozpočty',
    settingsTabReports: 'Výročné správy',
    settingsTabAppearance: 'Vzhľad & Jazyk',
    settingsTabSync: 'Google Sheets Sync',

    // Appearance & Language settings
    languageSelectionTitle: 'Jazyková mutácia / Jazyk aplikácie',
    languageSelectionSubtitle: 'Vyberte požadovaný jazyk pre užívateľské rozhranie (SK, CZ, HU, EN).',
    themeTitle: 'Režim vzhľadu aplikácie',
    lightMode: 'Svetlý režim (Light Mode)',
    lightModeDesc: 'Klasický elegantný biely vzhľad s vysokým kontrastom.',
    darkMode: 'Tmavý režim (Dark Mode)',
    darkModeDesc: 'Šetrný tmavomodrý / antracitový režim pre nočné sledovanie.',
    resetData: 'Vynulovanie všetkých dát (Čistý hárok)',
    resetDataDesc: 'Vymaže všetky uložené transakcie, investície, záväzky, majetok, poistenia a Settle Up akcie z pamäte prehliadača.'
  },

  CZ: {
    // Navigation
    navOverview: 'Přehled',
    navBudgets: 'Rozpočty',
    navInvestments: 'Investice',
    navKids: 'Dětská spoření',
    navAssets: 'Celkový majetek',
    navMortgages: 'Hypotéka & Závazky',
    navInsurance: 'Pojištění',
    navReports: 'Výroční zprávy',
    navSettleUp: 'Settle Up / Výdaje',
    navSettings: 'Nastavení',

    // Header
    greeting: 'AHOJ',
    lastBankStatement: 'Poslední výpis zpracovaný pomocí Gemini AI před 2 dny (Tatra Banka)',
    uploadStatement: 'Nahrát výpis',
    manualTransaction: 'Přidat transakci',
    language: 'Jazyk',

    // Roles
    roleAdmin: 'Správce',
    roleEditor: 'Zápis & Nahrávání',
    roleViewer: 'Pouze čtení',

    // Overview Stats
    netAssetValue: 'Čistá hodnota majetku',
    kidsInvestmentsTitle: 'Dětské investice & spoření',
    monthlyExpensesTitle: 'Měsíční výdaje / Rozpočet',
    monthlyOverviewFor: 'MĚSÍČNÍ PŘEHLED ZA',
    financialSituationSubtitle: 'Zobrazení finanční situace, limitů a transakcí pro zvolený měsíc.',
    activeAssets: 'Aktivní majetek',
    debts: 'Dluhy',
    budgetUsage: 'Čerpání rozpočtu',
    investmentGrowth12M: 'Vývoj investic (12 měsíců)',
    totalAssetGrowthSubtitle: 'Celková hodnota majetku v podílových fondech a ETF.',
    spendingCategoriesMonth: 'Kategorie výdajů tento měsíc',
    manageDetailedBudgets: 'Spravovat podrobné rozpočty',
    cumulative: 'Kumulativní',

    // Actions
    add: 'Přidat',
    addViaAi: 'Přidat přes AI ✨',
    addManually: 'Ručně přidat',
    edit: 'Upravit',
    delete: 'Smazat',
    cancel: 'Zrušit',
    save: 'Uložit',
    confirm: 'Potvrdit',

    // Settings
    settingsTitle: 'Nastavení systému',
    settingsSubtitle: 'Upravte si rodinné profily, finanční kategorie, rozpočtové cíle, jazyk a motiv vzhledu.',
    settingsTabUsers: 'Členové rodiny',
    settingsTabCategories: 'Kategorie',
    settingsTabBudgets: 'Rozpočty',
    settingsTabReports: 'Výroční zprávy',
    settingsTabAppearance: 'Vzhled & Jazyk',
    settingsTabSync: 'Google Sheets Sync',

    // Appearance & Language settings
    languageSelectionTitle: 'Jazyková verze / Jazyk aplikace',
    languageSelectionSubtitle: 'Vyberte požadovaný jazyk pro uživatelské rozhraní (SK, CZ, HU, EN).',
    themeTitle: 'Režim vzhledu aplikace',
    lightMode: 'Světlý režim (Light Mode)',
    lightModeDesc: 'Klasický elegantní bílý vzhled s vysokým kontrastem.',
    darkMode: 'Tmavý režim (Dark Mode)',
    darkModeDesc: 'Šetrný tmavě modrý / antracitový režim pro noční sledování.',
    resetData: 'Vynulování všech dat (Čistý list)',
    resetDataDesc: 'Vymaže všechny uložené transakce, investice, závazky, majetek, pojištění a Settle Up akce z paměti prohlížeče.'
  },

  HU: {
    // Navigation
    navOverview: 'Áttekintés',
    navBudgets: 'Költségvetés',
    navInvestments: 'Befektetések',
    navKids: 'Gyerek megtakarítás',
    navAssets: 'Teljes vagyon',
    navMortgages: 'Jelzálog & Hitelek',
    navInsurance: 'Biztosítás',
    navReports: 'Éves jelentések',
    navSettleUp: 'Settle Up / Kiadások',
    navSettings: 'Beállítások',

    // Header
    greeting: 'SZIA',
    lastBankStatement: 'Legutóbbi bankkivonat feldolgozva Gemini AI-val 2 napja (Tatra Banka)',
    uploadStatement: 'Kivonat feltöltése',
    manualTransaction: 'Tranzakció hozzáadása',
    language: 'Nyelv',

    // Roles
    roleAdmin: 'Rendszergazda',
    roleEditor: 'Szerkesztő',
    roleViewer: 'Csak olvasás',

    // Overview Stats
    netAssetValue: 'Nettó vagyoni érték',
    kidsInvestmentsTitle: 'Gyermek befektetések & megtakarítások',
    monthlyExpensesTitle: 'Havi kiadások / Költségvetés',
    monthlyOverviewFor: 'HAVI ÁTTEKINTÉS -',
    financialSituationSubtitle: 'A kiválasztott hónap pénzügyi helyzetének, korlátainak és tranzakcióinak megjelenítése.',
    activeAssets: 'Ezközök',
    debts: 'Tartozások',
    budgetUsage: 'Költségvetés felhasználása',
    investmentGrowth12M: 'Befektetések alakulása (12 hónap)',
    totalAssetGrowthSubtitle: 'Eszközök teljes értéke befektetési alapokban és ETF-ekben.',
    spendingCategoriesMonth: 'Kiadási kategóriák ebben a hónapban',
    manageDetailedBudgets: 'Részletes költségvetések kezelése',
    cumulative: 'Kumulatív',

    // Actions
    add: 'Hozzáadás',
    addViaAi: 'Hozzáadás AI-val ✨',
    addManually: 'Kézi hozzáadás',
    edit: 'Szerkesztés',
    delete: 'Törlés',
    cancel: 'Mégse',
    save: 'Mentés',
    confirm: 'Megerősítés',

    // Settings
    settingsTitle: 'Rendszerbeállítások',
    settingsSubtitle: 'Személyre szabhatja a családtagok profilját, pénzügyi kategóriáit, nyelvet és a témát.',
    settingsTabUsers: 'Családtagok',
    settingsTabCategories: 'Kategóriák',
    settingsTabBudgets: 'Költségvetések',
    settingsTabReports: 'Éves jelentések',
    settingsTabAppearance: 'Megjelenés & Nyelv',
    settingsTabSync: 'Google Sheets Szinkronizálás',

    // Appearance & Language settings
    languageSelectionTitle: 'Nyelvi beállítás / Alkalmazás nyelve',
    languageSelectionSubtitle: 'Válassza ki a kívánt nyelvet a felhasználói felülethez (SK, CZ, HU, EN).',
    themeTitle: 'Alkalmazás megjelenési módja',
    lightMode: 'Világos mód (Light Mode)',
    lightModeDesc: 'Klasszikus, elegáns fehér megjelenés magas kontraszttal.',
    darkMode: 'Sötét mód (Dark Mode)',
    darkModeDesc: 'Sötétkék / antracit mód a szem kímélésére éjszaka.',
    resetData: 'Minden adat nullázása (Tiszta lap)',
    resetDataDesc: 'Törli az összes mentett tranzakciót, befektetést, kötelezettséget, vagyont és biztosítást a böngésző memóriájából.'
  },

  EN: {
    // Navigation
    navOverview: 'Overview',
    navBudgets: 'Budgets',
    navInvestments: 'Investments',
    navKids: 'Kids Savings',
    navAssets: 'Family Assets',
    navMortgages: 'Mortgages & Liabilities',
    navInsurance: 'Insurance',
    navReports: 'Annual Reports',
    navSettleUp: 'Settle Up / Expenses',
    navSettings: 'Settings',

    // Header
    greeting: 'HELLO',
    lastBankStatement: 'Last bank statement processed via Gemini AI 2 days ago (Tatra Banka)',
    uploadStatement: 'Upload Statement',
    manualTransaction: 'Add Transaction',
    language: 'Language',

    // Roles
    roleAdmin: 'Administrator',
    roleEditor: 'Write & Upload',
    roleViewer: 'Read Only',

    // Overview Stats
    netAssetValue: 'Net Asset Value',
    kidsInvestmentsTitle: 'Kids Investments & Savings',
    monthlyExpensesTitle: 'Monthly Expenses / Budget',
    monthlyOverviewFor: 'MONTHLY OVERVIEW FOR',
    financialSituationSubtitle: 'Display of financial situation, limits, and transactions for the selected month.',
    activeAssets: 'Active Assets',
    debts: 'Debts',
    budgetUsage: 'Budget Utilization',
    investmentGrowth12M: 'Investment Growth (12 months)',
    totalAssetGrowthSubtitle: 'Total value of assets in mutual funds and ETFs.',
    spendingCategoriesMonth: 'Spending Categories This Month',
    manageDetailedBudgets: 'Manage Detailed Budgets',
    cumulative: 'Cumulative',

    // Actions
    add: 'Add',
    addViaAi: 'Add via AI ✨',
    addManually: 'Add Manually',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',

    // Settings
    settingsTitle: 'System Settings',
    settingsSubtitle: 'Customize family profiles, financial categories, budget targets, language, and theme.',
    settingsTabUsers: 'Family Members',
    settingsTabCategories: 'Categories',
    settingsTabBudgets: 'Budgets',
    settingsTabReports: 'Annual Reports',
    settingsTabAppearance: 'Appearance & Language',
    settingsTabSync: 'Google Sheets Sync',

    // Appearance & Language settings
    languageSelectionTitle: 'Language Selection / App Translation',
    languageSelectionSubtitle: 'Choose your preferred language for the user interface (SK, CZ, HU, EN).',
    themeTitle: 'App Theme Mode',
    lightMode: 'Light Mode',
    lightModeDesc: 'Classic elegant white layout with high contrast.',
    darkMode: 'Dark Mode',
    darkModeDesc: 'Eye-friendly dark blue / slate theme for night viewing.',
    resetData: 'Reset All Data (Clean Slate)',
    resetDataDesc: 'Deletes all stored transactions, investments, liabilities, assets, insurance policies, and Settle Up actions from browser memory.'
  }
};
