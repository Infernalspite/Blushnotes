/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// OWASP 2024 recommended minimum for PBKDF2-SHA256
const PBKDF2_ITERATIONS = 600_000;

// Helper to convert Uint8Array into Hex String
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert Hex String back to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  const array = new Uint8Array(pairs.length);
  for (let i = 0; i < pairs.length; i++) {
    array[i] = parseInt(pairs[i], 16);
  }
  return array;
}

// Password strength validation result
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

// Validate password strength — minimum 8 chars, uppercase, lowercase, digit
export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Constant-time string comparison to prevent timing attacks
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a full comparison to keep timing consistent
    let result = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      result |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Derive a 256-bit AES-GCM CryptoKey using PBKDF2 from a master password (passphrase)
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);

  // Import the raw password password bytes as a key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive an AES-GCM 256-bit key from PBKDF2
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // key is not exportable
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext using a master password
export async function encryptText(text: string, password: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
  try {
    const enc = new TextEncoder();
    const plainBytes = enc.encode(text);

    // Generate random salt and initialization vector (IV)
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Derive CryptoKey
    const cryptoKey = await deriveKey(password, salt);

    // Encrypt
    const encryptedBytes = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      plainBytes
    );

    return {
      ciphertext: bufferToHex(encryptedBytes),
      salt: bufferToHex(salt),
      iv: bufferToHex(iv)
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption process failed. Please ensure Web Crypto is supported.');
  }
}

// Decrypt ciphertext using master password, salt, and IV
export async function decryptText(ciphertext: string, password: string, saltHex: string, ivHex: string): Promise<string> {
  try {
    const salt = hexToBuffer(saltHex);
    const iv = hexToBuffer(ivHex);
    const encryptedBytes = hexToBuffer(ciphertext).buffer;

    // Derive the identical CryptoKey
    const cryptoKey = await deriveKey(password, salt);

    // Decrypt
    const decryptedBytes = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      encryptedBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBytes);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. Please verify that your password is correct.');
  }
}

// Encrypt data with a raw CryptoKey (used for secure storage with device keys)
export async function encryptWithKey(text: string, cryptoKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const plainBytes = enc.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBytes = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plainBytes
  );

  return {
    ciphertext: bufferToHex(encryptedBytes),
    iv: bufferToHex(iv)
  };
}

// Decrypt data with a raw CryptoKey (used for secure storage with device keys)
export async function decryptWithKey(ciphertext: string, iv: string, cryptoKey: CryptoKey): Promise<string> {
  const ivBuffer = hexToBuffer(iv);
  const encryptedBytes = hexToBuffer(ciphertext).buffer;

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    cryptoKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBytes);
}

// Obfuscate standard text with a fallback simple cipher if no password is set,
// or use simple base64 to store non-encrypted notes in localized structure properly.
export function encodeBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch {
    return str;
  }
}

export function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(atob(str).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch {
    return str;
  }
}
