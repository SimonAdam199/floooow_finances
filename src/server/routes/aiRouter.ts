import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { getGeminiClient, generateContentWithRetry, handleGeminiError } from "../services/geminiService";

export const aiRouter = Router();

// Parse bank statement (text or image)
aiRouter.post("/parse-bank-statement", async (req: Request, res: Response) => {
  try {
    const { statementText, fileBase64, fileMimeType } = req.body;

    if (
      (!statementText || typeof statementText !== "string" || statementText.trim() === "") &&
      (!fileBase64 || !fileMimeType)
    ) {
      res.status(400).json({ error: "Nie sú poskytnuté žiadne údaje na analýzu (ani text, ani obrázok)." });
      return;
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    if (fileBase64 && fileMimeType) {
      contents.push({
        inlineData: {
          data: fileBase64,
          mimeType: fileMimeType
        }
      });
    }

    if (statementText && statementText.trim() !== "") {
      contents.push({
        text: `Here is the bank statement text to parse:\n\n${statementText}`
      });
    } else if (fileBase64 && fileMimeType) {
      contents.push({
        text: `Parse all transactions visible in the uploaded image, receipt, or bank statement document.`
      });
    }

    const systemInstruction = `You are a professional bank statement parser. 
Your task is to extract all transactions from the provided bank statement text or image and categorize them using the exact categories and subcategories defined below:

- 'PRÍJMY' (subcategories: 'Výplata 1_BVK', 'Výplata 2_BVK', 'Nemocenská dávka', 'AV PROJEKT s.r.o.', 'Úrad práce', 'Anszi - tankovanie', 'Iné príjmy')
- 'BÝVANIE' (subcategories: 'Splátka úveru', 'Poistenie RD', 'Plyn', 'Elektrina', 'Voda', 'Odvoz odpadu', 'Upratovanie', 'Zabezpečenie - Jablotron', 'Dane', 'Zariadenie domu', 'Údržba, záhrada')
- 'DOPRAVA A MOBILITA' (subcategories: 'Palivo VV', 'Palivo ÁV', 'Verejná doprava', 'Leasing', 'Údržba', 'Poistenie - Tesla', 'Poistenie - Mazda', 'Parkovné')
- 'DETI' (subcategories: 'Oblečenie a obuv', 'Školné, škôlka', 'Školské potreby', 'Krúžky šport, hudba', 'Darčeky', 'Vreckové')
- 'ZDRAVIE A STAROSTLIVOSŤ' (subcategories: 'Liek, suplementy', 'Návšteva lekára', 'Životné poistenie VV,NV', 'Životné poistenie ÁV', 'Preventívne prehliadky', 'Fyzioterapia, pomôcky', 'Terápia', 'Cestovné poistenie')
- 'VOĽNÝ ČAS A ODDÝCH, DOMÁCE ZVIERATÁ' (subcategories: 'Domáce zvieratá', 'Dovolenky, víkendy', 'Reštaurácie', 'Kultúra, vstupné', 'Hobby a šport', 'VV - Költőpénz', 'ÁV - Költőpénz')
- 'PREDPLATNÉ' (subcategories: 'Denník N', 'Netflix', 'Spotify', 'Youtube premium', 'Tesla conect', 'iCloud+', 'O2 - VV', 'Oura membership')
- 'SPORENIE' (subcategories: 'Sporenie - dôchodok', 'Fumby', 'Nina - sporenie', 'Sporenie na Porsche', 'Sporenie 365', 'Sporenie - rezerva')
- 'CHARITA' (subcategories: 'Liga proti rakovine', 'Sloboda zvierat')
- 'POTRAVINY' (subcategories: 'Potraviny', 'Gym beam', 'Pekáreň', 'Farmove-bio zelenina a ovocie, mäso, zelovoc', 'Káva', 'Mesiarstvo', 'Med')
- 'DROGÉRIA, OBLEČENIE' (subcategories: 'Drogéria', 'Čistiace prostriedky', 'Veri oblečenie', 'Ádám oblečenie')
- 'OSTATNÉ NEPRAVIDELNÉ VÝDAVKY' (subcategories: 'Dane, poplatky', 'Dary_Darčeky', 'Nečakané opravy', 'Poplatky za služby', 'Predmety, domáce potreby')

Return a JSON array of parsed transactions matching the requested schema. If the transaction has a minus sign or represents an expense, make sure the amount is NEGATIVE (e.g., -64.20). If the transaction is incoming/salary, make sure the amount is POSITIVE (e.g., 2450.00). Ensure the date is formatted as YYYY-MM-DD.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: { parts: contents },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "Transaction date in format YYYY-MM-DD" },
              description: { type: Type.STRING, description: "Clean merchant/recipient name or payment description" },
              amount: { type: Type.NUMBER, description: "The amount of transaction (negative number for expenses, positive for deposits)" },
              category: { type: Type.STRING, description: "The classified category name" },
              subcategory: { type: Type.STRING, description: "The classified subcategory name" },
              currency: { type: Type.STRING, description: "The currency code, e.g. EUR" }
            },
            required: ["date", "description", "amount", "category", "subcategory"]
          }
        }
      }
    });

    const parsedText = response.text;
    if (!parsedText) {
      throw new Error("Empty response received from Gemini");
    }

    const transactions = JSON.parse(parsedText.trim());
    res.json({ success: true, transactions });
  } catch (error: any) {
    console.error("Error parsing statement:", error);
    const friendlyMessage = handleGeminiError(error, "Nepodarilo sa spracovať bankový výpis cez AI. Skontrolujte súbor alebo skúste znova neskôr.");
    res.status(500).json({ error: friendlyMessage });
  }
});

// Parse mortgage agreement
aiRouter.post("/parse-mortgage-agreement", async (req: Request, res: Response) => {
  try {
    const { fileBase64, fileMimeType, contractText } = req.body;

    const ai = getGeminiClient();
    const contents: any[] = [];

    if (fileBase64 && fileMimeType) {
      contents.push({
        inlineData: {
          data: fileBase64,
          mimeType: fileMimeType
        }
      });
    }

    if (contractText && contractText.trim() !== "") {
      contents.push({
        text: `Text of the mortgage agreement or copy-pasted contract text:\n\n${contractText}`
      });
    }

    if (contents.length === 0) {
      res.status(400).json({ error: "No mortgage agreement file or text provided" });
      return;
    }

    const prompt = `You are an expert financial contract analyzer. Analyze the provided mortgage agreement (zmluva o hypotekárnom úvere / hypotéka) and extract the key terms.
Extract these exact fields:
1. 'bank' (e.g. Slovenská sporiteľňa, Tatra banka, VÚB, ČSOB, mBank, UniCredit, Prima Banka, etc.)
2. 'name' (a friendly label for this mortgage, e.g., 'Hypotéka byt', 'Hypotéka dom')
3. 'totalAmount' (the initial loan amount granted in EUR, as a number)
4. 'remainingAmount' (current remaining loan amount in EUR, as a number)
5. 'interestRate' (annual interest rate in percentage, e.g. 4.25, as a number)
6. 'monthlyPayment' (monthly installment in EUR, as a number)
7. 'maturityDate' (final maturity date in format YYYY-MM-DD)`;

    contents.push({ text: prompt });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bank: { type: Type.STRING },
            name: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            remainingAmount: { type: Type.NUMBER },
            interestRate: { type: Type.NUMBER },
            monthlyPayment: { type: Type.NUMBER },
            maturityDate: { type: Type.STRING }
          },
          required: ["bank", "name", "totalAmount", "remainingAmount", "interestRate", "monthlyPayment", "maturityDate"]
        }
      }
    });

    const parsedText = response.text;
    if (!parsedText) {
      throw new Error("Empty response received from Gemini");
    }

    const mortgageData = JSON.parse(parsedText.trim());
    res.json({ success: true, mortgage: mortgageData });
  } catch (error: any) {
    console.error("Error parsing mortgage agreement:", error);
    const friendlyMessage = handleGeminiError(error, "Nepodarilo sa analyzovať zmluvu o hypotéke cez AI. Skontrolujte súbor alebo skúste znova neskôr.");
    res.status(500).json({ error: friendlyMessage });
  }
});

// Generate financial report
aiRouter.post("/generate-financial-report", async (req: Request, res: Response) => {
  try {
    const { stats } = req.body;

    if (!stats) {
      res.status(400).json({ error: "Missing financial statistics" });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `Si elitný slovenský privátny bankár, majetkový poradca a finančný analytik s 20-ročnou praxou. 
Tvojou úlohou je vypracovať vysoko profesionálnu, povzbudivú, no analyticky prísnu Výročnú finančnú správu pre klienta na základe poskytnutých agregovaných čísel.

Použi štruktúru s nasledujúcimi nadpismi (používaj markdown '###' pre sekcie a '##' pre hlavný nadpis):

## VÝROČNÁ SPRÁVA O STAVE OSOBNÝCH FINANCIÍ

### CElKOVÉ ZHODNOTENIE FINANČNÉHO ZDRAVIA
### VYHODNOTENIE ROZPOČTOV A KATEGÓRIÍ
### ZHODNOTENIE INVESTÍCIÍ A SPORANIA PRE DETI
### ANALÝZA HYPOTÉKY A FINANČNÝCH ZÁVÄZKOV
### AKČNÝ PLÁN V 3 KROKOCH pre rok 2026/2027

Píš kultivovaným, spisovným, jasným a povzbudivým slovenským jazykom. Buď stručný, úderný a vyhni sa vágnej omáčke.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: `Tu sú finančné štatistiky klienta:
- Ročný príjem (v prepočte): ${stats.totalIncome * 12} EUR
- Ročné výdavky (v prepočte): ${stats.totalExpense * 12} EUR
- Mesačný prebytok: ${stats.netSavings} EUR
- Miera úspor: ${stats.savingsRate?.toFixed ? stats.savingsRate.toFixed(1) : stats.savingsRate}%
- Celková výška investícií: ${stats.totalInvestmentsVal} EUR
- Mesačný vklad do investícií: ${stats.totalInvestmentsMonthly} EUR (z toho časť smeruje pre deti)
- Celkový dlh (Hypotéka + Záväzky): ${stats.totalDebt} EUR
- Počet sledovaných investičných účtov: ${stats.numberOfInvestments} (vrátane detských sporení)
- Počet úverov a lízingov: ${stats.numberOfMortgages + stats.numberOfLiabilities}
`,
      config: {
        systemInstruction,
      }
    });

    const report = response.text;
    res.json({ success: true, report });
  } catch (error: any) {
    console.error("Error generating report:", error);
    const friendlyMessage = handleGeminiError(error, "Nepodarilo sa vygenerovať výročnú finančnú správu cez AI. Skúste znova neskôr.");
    res.status(500).json({ error: friendlyMessage });
  }
});

// Analyze monthly budget
aiRouter.post("/analyze-monthly-budget", async (req: Request, res: Response) => {
  try {
    const { month, transactions, budgets } = req.body;

    if (!month || !transactions || !budgets) {
      res.status(400).json({ error: "Chýbajú povinné údaje: mesiac, transakcie alebo rozpočty." });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `Si elitný slovenský rodinný finančný kouč a analytik s 15-ročnou praxou.
Tvojou úlohou je vypracovať rýchlu, vysoko profesionálnu, povzbudivú, no konštruktívne prísnu mesačnú analýzu rozpočtu a výdavkov za zvolený mesiac s konkrétnymi odporúčaniami.

Píš kultivovaným, spisovným, jasným a povzbudivým slovenským jazykom. Použi emoji na spestrenie a prehľadnosť.

## 💡 AI ANALÝZA ROZPOČTU ZA ${month}

### 📊 Celkové zhodnotenie mesiaca
### ⚠️ Analýza kategórií & Rozpočtové limity
### 🎯 Odporúčania & Akčné kroky pre ďalší mesiac`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: `Tu sú údaje o rozpočte a výdavkoch za mesiac ${month}:
- Vybraný mesiac: ${month}
- Celkové rozpočtované limity: ${budgets.reduce((sum: number, b: any) => sum + b.limit, 0)} EUR
- Nastavené rozpočty podľa kategórií:
${budgets.map((b: any) => `  * ${b.category}: Limit ${b.limit} EUR`).join("\n")}

- Reálne transakcie zaznamenané v tomto mesiaci:
${transactions.map((t: any) => `  * Dátum: ${t.date}, Popis: ${t.description}, Suma: ${t.amount} EUR, Kategória: ${t.category}${t.subcategory ? ` (${t.subcategory})` : ''}`).join("\n")}
`,
      config: {
        systemInstruction,
      }
    });

    const analysis = response.text;
    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error("Error generating monthly budget analysis:", error);
    const friendlyMessage = handleGeminiError(error, "Nepodarilo sa vygenerovať AI analýzu rozpočtu. Skúste znova neskôr.");
    res.status(500).json({ error: friendlyMessage });
  }
});

// Interactive budget chat
aiRouter.post("/budget-chat", async (req: Request, res: Response) => {
  try {
    const { message, history, month, transactions, budgets } = req.body;

    if (!message) {
      res.status(400).json({ error: "Chýba správa pre AI." });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `Si elitný slovenský rodinný finančný kouč a analytik s 15-ročnou praxou.
Tvojou úlohou je odpovedať na otázky klienta týkajúce sa jeho rodinného rozpočtu, výdavkov, úspor a investícií za zvolený mesiac ${month}.

Píš kultivovaným, spisovným, jasným, no povzbudivým slovenským jazykom. Buď vecný, presný a konštruktívny.

Tu sú údaje o rozpočte a výdavkoch za mesiac ${month}:
- Celkové rozpočtované limity: ${budgets ? budgets.reduce((sum: number, b: any) => sum + b.limit, 0) : 0} EUR
- Nastavené rozpočty podľa kategórií:
${budgets ? budgets.map((b: any) => `  * ${b.category}: Limit ${b.limit} EUR`).join("\n") : 'Žiadne nastavené limity'}

- Reálne transakcie zaznamenané v tomto mesiaci:
${transactions ? transactions.map((t: any) => `  * Dátum: ${t.date}, Popis: ${t.description}, Suma: ${t.amount} EUR, Kategória: ${t.category}${t.subcategory ? ` (${t.subcategory})` : ''}`).join("\n") : 'Žiadne reálne transakcie'}`;

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
      }
    });

    const reply = response.text;
    res.json({ success: true, reply });
  } catch (error: any) {
    console.error("Error in budget chat:", error);
    const friendlyMessage = handleGeminiError(error, "Nepodarilo sa získať odpoveď od AI. Skúste znova neskôr.");
    res.status(500).json({ error: friendlyMessage });
  }
});

// Parse investment details
aiRouter.post("/parse-investment", async (req: Request, res: Response) => {
  try {
    const { promptText, fileBase64, fileMimeType } = req.body;

    if (!promptText && (!fileBase64 || !fileMimeType)) {
      res.status(400).json({ error: "Zadajte textový popis investície alebo priložte snímku/výpis." });
      return;
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    if (fileBase64 && fileMimeType) {
      contents.push({
        inlineData: {
          data: fileBase64,
          mimeType: fileMimeType
        }
      });
    }

    if (promptText && promptText.trim() !== "") {
      contents.push({
        text: `User prompt or raw investment description:\n\n${promptText}`
      });
    }

    const systemInstruction = `You are a professional financial AI assistant for the Slovak personal finance app 'floooow'.
Your goal is to parse investment details from natural language text, email confirmations, or uploaded screenshots/documents from platforms such as Portu, Finax, Interactive Brokers (IBKR), Fumbi, Trading 212, XTB, Coinbase, Tatrabanka, SLSP, etc.

Extract these exact fields:
- 'name': Clear, descriptive investment name
- 'platform': Investment platform name
- 'initialValue': Initial deposit in EUR (number)
- 'currentValue': Current portfolio value in EUR (number)
- 'monthlyContribution': Monthly recurring contribution in EUR (number)
- 'type': 'personal' or 'kids'
- 'owner': Owner label
- 'summaryNote': A short friendly sentence in Slovak confirming what was extracted.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: { parts: contents },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            platform: { type: Type.STRING },
            initialValue: { type: Type.NUMBER },
            currentValue: { type: Type.NUMBER },
            monthlyContribution: { type: Type.NUMBER },
            type: { type: Type.STRING },
            owner: { type: Type.STRING },
            summaryNote: { type: Type.STRING }
          },
          required: ["name", "platform", "initialValue", "currentValue", "monthlyContribution", "type", "owner", "summaryNote"]
        }
      }
    });

    const parsedText = response.text;
    if (!parsedText) {
      throw new Error("Empty response received from Gemini");
    }

    const investmentData = JSON.parse(parsedText.trim());
    res.json({ success: true, investment: investmentData });
  } catch (error: any) {
    console.error("Error parsing investment:", error);
    const friendlyMessage = handleGeminiError(error, "Nepodarilo sa vytvoriť investíciu pomocou AI. Skúste zadať podrobnejší popis.");
    res.status(500).json({ error: friendlyMessage });
  }
});
