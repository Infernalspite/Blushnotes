/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Note {
  id: string;
  title: string;
  content: string; // Plaintext content when decrypted
  encryptedContent?: string; // Hex or Base64 encoded encrypted string
  salt?: string; // Hex encoding of the crypto salt
  iv?: string; // Hex encoding of the initialization vector
  isEncrypted: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'gemini' | 'cohere' | 'mistral' | 'ollama' | 'llamacpp';

export interface APIKeys {
  openai: string;
  anthropic: string;
  groq: string;
  gemini: string;
  cohere: string;
  mistral: string;
  ollama: string;
  llamacpp: string;
}

export interface LocalModelConfig {
  ollamaUrl: string;
  llamacppUrl: string;
  allowNoteMemories: boolean;
  encryptedSyncEnabled: boolean;
  gitHistoryEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  noteIds: string[]; // Associated notes for context
  messages: ChatMessage[];
  provider: LLMProvider;
  model: string;
  createdAt: string;
}

export interface EncryptionConfig {
  hasMasterPassword: boolean;
  isUnlocked: boolean;
  // Master key generated in-memory after entering passphrase
  sessionKey: CryptoKey | null;
  // A hint to remind the user about their passphrase
  hint: string;
}

export interface UITheme {
  id: string;
  name: string;
  description: string;
  colors: {
    bgPrimary: string;
    sidebarBg: string;
    accent: string;
    textMain: string;
    textMuted: string;
    border: string;
    cardBg: string;
    editorBg: string;
  };
}

export interface SakuraConfig {
  enabled: boolean;
  count: 'low' | 'medium' | 'high' | 'storm';
  speed: 'gentle' | 'breeze' | 'gust';
  wind: 'calm' | 'left' | 'right';
  style: 'classic' | 'glow' | 'outline' | 'flower';
}

