/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Secure Storage Utility
 * Uses IndexedDB for a device-local AES-GCM encryption key,
 * and provides encrypted get/set wrappers for localStorage data.
 * This ensures API keys and sensitive settings are never stored in plaintext.
 */

import { encryptWithKey, decryptWithKey } from './crypto';

const DB_NAME = 'blushnotes_secure';
const DB_VERSION = 1;
const KEY_STORE_NAME = 'device_keys';
const DEVICE_KEY_ID = 'device_encryption_key';

// Open (or create) the IndexedDB database
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generate a new AES-GCM 256-bit key and store it in IndexedDB
async function generateAndStoreDeviceKey(): Promise<CryptoKey> {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // NOT extractable — cannot be exported from the browser
    ['encrypt', 'decrypt']
  );

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = tx.objectStore(KEY_STORE_NAME);
    store.put({ id: DEVICE_KEY_ID, key });

    tx.oncomplete = () => {
      db.close();
      resolve(key);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// Retrieve the device encryption key from IndexedDB, or generate one
async function getDeviceKey(): Promise<CryptoKey> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readonly');
    const store = tx.objectStore(KEY_STORE_NAME);
    const request = store.get(DEVICE_KEY_ID);

    request.onsuccess = async () => {
      db.close();
      if (request.result?.key) {
        resolve(request.result.key);
      } else {
        // First time — generate and store a new device key
        try {
          const newKey = await generateAndStoreDeviceKey();
          resolve(newKey);
        } catch (err) {
          reject(err);
        }
      }
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Securely store a value in localStorage, encrypted with the device key.
 * The value is AES-GCM encrypted; only this browser/device can decrypt it.
 */
export async function secureSet(storageKey: string, value: string): Promise<void> {
  try {
    const deviceKey = await getDeviceKey();
    const { ciphertext, iv } = await encryptWithKey(value, deviceKey);
    const envelope = JSON.stringify({ c: ciphertext, v: iv, _v: 2 });
    localStorage.setItem(storageKey, envelope);
  } catch (error) {
    console.error('SecureStorage: Failed to encrypt and store value:', error);
    throw new Error('Could not securely store data. Web Crypto or IndexedDB may be unavailable.');
  }
}

/**
 * Securely retrieve a value from localStorage, decrypting with the device key.
 * Returns null if the key doesn't exist or decryption fails.
 */
export async function secureGet(storageKey: string): Promise<string | null> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    // Try to parse as encrypted envelope
    const parsed = JSON.parse(raw);
    if (parsed._v === 2 && parsed.c && parsed.v) {
      const deviceKey = await getDeviceKey();
      return await decryptWithKey(parsed.c, parsed.v, deviceKey);
    }

    // Legacy fallback: if it's not in the new encrypted format, return raw
    // This allows migration from old base64-encoded values
    return raw;
  } catch (error) {
    // If decryption fails (e.g. different device key), return null
    console.warn('SecureStorage: Failed to decrypt value for key:', storageKey);
    return null;
  }
}

/**
 * Remove a single secure value from localStorage
 */
export function secureRemove(storageKey: string): void {
  localStorage.removeItem(storageKey);
}

/**
 * Purge ALL BlushNotes data from both localStorage and IndexedDB.
 * This is a complete, irreversible wipe of all local application data.
 */
export async function purgeAll(storageKeys: string[]): Promise<void> {
  // Clear all specified localStorage keys
  for (const key of storageKeys) {
    localStorage.removeItem(key);
  }

  // Delete the IndexedDB database entirely (destroys the device key)
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve(); // Resolve anyway if blocked
  });
}

/**
 * Check approximate storage usage and remaining quota.
 * Returns percentUsed (0-100) or null if the API is unavailable.
 */
export async function checkStorageQuota(): Promise<{ usedMB: number; quotaMB: number; percentUsed: number } | null> {
  if (!navigator.storage?.estimate) return null;

  try {
    const estimate = await navigator.storage.estimate();
    const usedMB = (estimate.usage || 0) / (1024 * 1024);
    const quotaMB = (estimate.quota || 0) / (1024 * 1024);
    const percentUsed = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;

    return {
      usedMB: Math.round(usedMB * 100) / 100,
      quotaMB: Math.round(quotaMB * 100) / 100,
      percentUsed: Math.round(percentUsed * 100) / 100
    };
  } catch {
    return null;
  }
}
