import { APIKeys, Note, SakuraConfig } from '../types';
import { secureGet, secureSet, secureRemove, purgeAll, checkStorageQuota } from './secureStorage';
import { decodeBase64 } from './crypto';

const STORAGE_KEYS = {
  notes: 'blushnotes_documents',
  apiKeys: 'blushnotes_apikeys',
  cryptoVerify: 'blushnotes_crypto_verify',
  cryptoHint: 'blushnotes_crypto_hint',
  themeId: 'blushnotes_theme_id',
  sakuraConfig: 'blushnotes_sakura_config'
};

const emptyApiKeys: APIKeys = {
  openai: '',
  anthropic: '',
  groq: '',
  gemini: '',
  cohere: '',
  mistral: ''
};

export function loadThemeId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.themeId);
}

export function saveThemeId(themeId: string): void {
  localStorage.setItem(STORAGE_KEYS.themeId, themeId);
}

export function loadSakuraConfig(): SakuraConfig | null {
  const raw = localStorage.getItem(STORAGE_KEYS.sakuraConfig);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SakuraConfig;
  } catch {
    return null;
  }
}

export function saveSakuraConfig(config: SakuraConfig): void {
  localStorage.setItem(STORAGE_KEYS.sakuraConfig, JSON.stringify(config));
}

export function loadNotes(): Note[] | null {
  const raw = localStorage.getItem(STORAGE_KEYS.notes);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Note[];
  } catch {
    return null;
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
}

export async function loadStoredApiKeys(): Promise<APIKeys> {
  try {
    const encrypted = await secureGet(STORAGE_KEYS.apiKeys);
    if (encrypted) {
      return JSON.parse(encrypted) as APIKeys;
    }

    const legacy = localStorage.getItem(STORAGE_KEYS.apiKeys);
    if (!legacy) return emptyApiKeys;

    const parsed = JSON.parse(legacy) as APIKeys;
    const migrated = {
      openai: decodeBase64(parsed.openai || ''),
      anthropic: decodeBase64(parsed.anthropic || ''),
      groq: decodeBase64(parsed.groq || ''),
      gemini: decodeBase64(parsed.gemini || ''),
      cohere: decodeBase64(parsed.cohere || ''),
      mistral: decodeBase64(parsed.mistral || '')
    };

    await persistApiKeys(migrated);
    localStorage.removeItem(STORAGE_KEYS.apiKeys);
    return migrated;
  } catch (error) {
    console.warn('Failed to load stored API keys:', error);
    return emptyApiKeys;
  }
}

export async function persistApiKeys(keys: APIKeys): Promise<void> {
  await secureSet(STORAGE_KEYS.apiKeys, JSON.stringify(keys));
}

export async function clearStoredApiKeys(): Promise<void> {
  secureRemove(STORAGE_KEYS.apiKeys);
}

export function loadCryptoVerificationPayload(): string | null {
  return localStorage.getItem(STORAGE_KEYS.cryptoVerify);
}

export function saveCryptoVerificationPayload(payload: string): void {
  localStorage.setItem(STORAGE_KEYS.cryptoVerify, payload);
}

export function removeCryptoVerificationPayload(): void {
  localStorage.removeItem(STORAGE_KEYS.cryptoVerify);
}

export function loadCryptoHint(): string {
  return localStorage.getItem(STORAGE_KEYS.cryptoHint) || '';
}

export function saveCryptoHint(hint: string): void {
  localStorage.setItem(STORAGE_KEYS.cryptoHint, hint);
}

export function removeCryptoHint(): void {
  localStorage.removeItem(STORAGE_KEYS.cryptoHint);
}

export async function clearAppData(): Promise<void> {
  const keysToRemove = Object.values(STORAGE_KEYS);
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  await purgeAll(keysToRemove);
}

export { checkStorageQuota };
