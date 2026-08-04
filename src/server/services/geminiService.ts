import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export async function generateContentWithRetry(
  ai: any,
  params: {
    model: string;
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = [params.model, "gemini-3.1-flash-lite"];
  let lastError: any = null;
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const currentModel = modelsToTry[Math.min(attempt - 1, modelsToTry.length - 1)] || "gemini-3.5-flash";
    try {
      console.log(`Gemini API call: Model ${currentModel}, Attempt ${attempt}/${maxAttempts}...`);
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      const isRetryable = 
        errorMessage.includes("503") || 
        errorMessage.includes("429") || 
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("temporary");

      console.error(`Gemini API Error on attempt ${attempt} using ${currentModel}:`, errorMessage);

      if (attempt < maxAttempts) {
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        console.log(`Waiting ${Math.round(delay)}ms before retry ${attempt + 1}/${maxAttempts}...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export function handleGeminiError(error: any, defaultMessage: string): string {
  const msg = error?.message || String(error);
  if (
    msg.includes("503") || 
    msg.includes("UNAVAILABLE") || 
    msg.includes("high demand") || 
    msg.includes("temporary") ||
    msg.includes("busy")
  ) {
    return "Služba Gemini AI je momentálne preťažená vysokým dopytom. Prosím, skúste to znova o pár sekúnd, alebo zadajte údaje manuálne.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return "Bol dosiahnutý limit požiadaviek pre AI (Rate Limit). Prosím, chvíľu počkajte a skúste to znova.";
  }
  if (msg.includes("API key not valid") || msg.includes("API_KEY")) {
    return "Neplatný kľúč GEMINI_API_KEY. Prosím, skontrolujte nastavenie kľúčov v prostredí.";
  }
  return defaultMessage;
}
