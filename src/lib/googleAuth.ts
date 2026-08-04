import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request standard profile, email, sheets, and drive scopes
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

// Persist access token in sessionStorage across tab reloads
let cachedAccessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('google_access_token') : null;
let isSigningIn = false;
let authSuccessCallback: ((user: User, token: string) => void) | null = null;
let authFailureCallback: (() => void) | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) authSuccessCallback = onAuthSuccess;
  if (onAuthFailure) authFailureCallback = onAuthFailure;

  // Check if returning from signInWithRedirect
  getRedirectResult(auth).then((result) => {
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        sessionStorage.setItem('google_access_token', cachedAccessToken);
        if (authSuccessCallback) {
          authSuccessCallback(result.user, cachedAccessToken);
        }
      }
    }
  }).catch((err) => {
    console.error("Redirect auth error:", err);
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || sessionStorage.getItem('google_access_token') || '';
      cachedAccessToken = token;
      if (token && onAuthSuccess) {
        onAuthSuccess(user, token);
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('google_access_token');
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    
    // Check if inside iframe
    const isInIframe = window.self !== window.top;
    let result;

    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupError: any) {
      console.warn('signInWithPopup failed:', popupError);
      
      // If popup was blocked or iframe restriction, try redirect if not in iframe
      if (!isInIframe && (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/popup-closed-by-user')) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      
      throw popupError;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || '';

    cachedAccessToken = token;
    if (token) {
      sessionStorage.setItem('google_access_token', token);
    }
    
    // Trigger success callback so React state updates immediately
    if (authSuccessCallback) {
      authSuccessCallback(result.user, token);
    }

    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (authFailureCallback) {
      authFailureCallback();
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || sessionStorage.getItem('google_access_token');
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  sessionStorage.removeItem('google_access_token');
};

/**
 * Formats spreadsheet range correctly. Google Sheets API requires sheet names containing
 * special characters, spaces, or starting with numbers to be wrapped in single quotes.
 * To be safe, we wrap the sheet name in single quotes if it's not already.
 */
export function formatRangeForSheetsApi(range: string): string {
  const trimmed = range.trim();
  if (!trimmed) return 'A1:Z100';

  // If it already has single quotes, keep it as is
  if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
    return trimmed;
  }

  // Check if it has an exclamation mark
  const exclaimIndex = trimmed.indexOf('!');
  if (exclaimIndex !== -1) {
    const sheetPart = trimmed.substring(0, exclaimIndex).trim();
    const cellPart = trimmed.substring(exclaimIndex + 1).trim();
    
    if (sheetPart) {
      // Escape inner single quotes if any exist
      const escapedSheet = sheetPart.replace(/'/g, "''");
      return `'${escapedSheet}'!${cellPart}`;
    }
  } else {
    // If no exclamation mark, check if it's just a coordinate (like A1:Z100) or a sheet name.
    // If it has non-coordinate characters, wrap it as a sheet name.
    const isCoordinateRange = /^[A-Za-z]+[0-9]*(:[A-Za-z]+[0-9]*)?$/.test(trimmed);
    if (!isCoordinateRange) {
      return `'${trimmed.replace(/'/g, "''")}'`;
    }
  }

  return trimmed;
}

/**
 * Fetch spreadsheet details using Sheets API
 */
export async function fetchSpreadsheetData(accessToken: string, spreadsheetId: string, range: string = 'A1:Z100') {
  if (!accessToken || !accessToken.trim()) {
    throw new Error('Chýba prihlásenie cez Google. Kliknite na "Prihlásiť sa cez Google" pre opätovnú autorizáciu.');
  }
  const formattedRange = formatRangeForSheetsApi(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(formattedRange)}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403 || errorData?.error?.message?.includes('unregistered callers')) {
      throw new Error('Platnosť Google prihlásenia vypršala. Kliknite na "Prihlásiť sa cez Google" pre opätovnú autorizáciu.');
    }
    throw new Error(errorData?.error?.message || `Nepodarilo sa stiahnuť dáta z tabuľky (Status ${res.status})`);
  }
  
  return await res.json();
}

/**
 * Fetch list of sheet names (tabs) inside a spreadsheet using Sheets API metadata
 */
export async function fetchSpreadsheetSheets(accessToken: string, spreadsheetId: string): Promise<string[]> {
  if (!accessToken || !accessToken.trim()) {
    throw new Error('Chýba prihlásenie cez Google. Kliknite na "Prihlásiť sa cez Google" pre opätovnú autorizáciu.');
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403 || errorData?.error?.message?.includes('unregistered callers')) {
      throw new Error('Platnosť Google prihlásenia vypršala. Kliknite na "Prihlásiť sa cez Google" pre opätovnú autorizáciu.');
    }
    throw new Error(errorData?.error?.message || `Nepodarilo sa načítať štruktúru tabuľky (Status ${res.status})`);
  }

  const data = await res.json();
  return (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);
}

/**
 * Fetch spreadsheet files from Google Drive using Drive API v3
 */
export async function fetchUserSpreadsheets(accessToken: string) {
  if (!accessToken || !accessToken.trim()) {
    return [];
  }
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet'");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime%20desc&pageSize=40`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403 || errorData?.error?.message?.includes('unregistered callers')) {
      throw new Error('Vyžaduje sa opätovné prihlásenie cez Google pre prístup k súborom na Disku.');
    }
    throw new Error(errorData?.error?.message || `Nepodarilo sa načítať tabuľky z Google Disku (Status ${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a brand new Google Spreadsheet with custom sheet tabs
 */
export async function createSpreadsheet(
  accessToken: string,
  title: string,
  sheetTitles: string[] = ['Transakcie', 'Rozpočty', 'Investície', 'Záväzky']
) {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const sheets = sheetTitles.map((t) => ({
    properties: {
      title: t
    }
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      },
      sheets: sheets
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Nepodarilo sa vytvoriť novú tabuľku (Status ${res.status})`);
  }

  return await res.json();
}

/**
 * Batch update values in multiple ranges of a spreadsheet
 */
export async function batchUpdateSpreadsheetValues(
  accessToken: string,
  spreadsheetId: string,
  data: { range: string; values: string[][] }[]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: data.map((item) => ({
        range: formatRangeForSheetsApi(item.range),
        values: item.values
      }))
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Nepodarilo sa uložiť údaje do tabuľky (Status ${res.status})`);
  }

  return await res.json();
}

/**
 * Add a new sheet tab to an existing spreadsheet
 */
export async function createSheetTab(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetTitle
            }
          }
        }
      ]
    })
  });

  // If the sheet already exists, it will return an error, which we can ignore safely
  return res.ok;
}

