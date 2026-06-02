/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Chat from './components/Chat';
import Settings from './components/Settings';
import { Note, APIKeys, EncryptionConfig, SakuraConfig } from './types';
import { UI_THEMES, DEFAULT_THEME_ID, DEFAULT_SAKURA_CONFIG } from './constants/themes';
import SakuraCanvas from './components/SakuraCanvas';
import { encryptText, decryptText } from './utils/crypto';
import { loadNotes, saveNotes, loadSakuraConfig, saveSakuraConfig, loadThemeId, saveThemeId, loadStoredApiKeys, persistApiKeys, clearAppData, loadCryptoVerificationPayload, saveCryptoVerificationPayload, loadCryptoHint, saveCryptoHint } from './utils/persistence';
import { Heart, Activity, CheckCircle, Flame, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


// Initial Onboarding Notes for users
const INITIAL_NOTES: Note[] = [
  {
    id: 'welcome-pink',
    title: '🌸 Welcome to BlushNotes!',
    content: `# Welcome to BlushNotes!

BlushNotes is a clean, modern, distraction-free markdown note-taking workspace designed with supreme privacy and on-device machine intelligence.

## 🌟 Key Pillars
1. **Zero Operational Surcharges**: By bringing your own API Keys (from OpenAI, Anthropic, or Groq), BlushNotes functions entirely serverless on your behalf.
2. **True Cryptographic Privacy (AES-GCM)**: Setup a **Master Password** to lock and lock your journals instantly. Content encrypts locally with PBKDF2 derived keys directly inside the client sandbox.
3. **Conversational File Intelligence**: Connect one or several files as direct contexts for our **AI Companion** tab. Compare drafts, extract tasks, or query historical notes effortlessly.

---

### 📝 Try out Markdown Features
- Use headers (# for h1, ## for h2, etc.)
- Use bolding like **this** or italic like *this*.
- Format neat todo list elements:
  - [x] Create first BlushNote!
  - [ ] Initialize secure local Master Password.
  - [ ] Plug in personal AI credentials to start chat.

Enjoy BlushNotes! ♥`,
    isEncrypted: false,
    tags: ['onboarding', 'guide'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'write' | 'chat' | 'settings'>('write');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Theme support & Sakura configurations
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    return loadThemeId() || DEFAULT_THEME_ID;
  });

  const [sakuraConfig, setSakuraConfig] = useState<SakuraConfig>(() => {
    return loadSakuraConfig() || DEFAULT_SAKURA_CONFIG;
  });

  // Transient memory-only password for session decryption
  const [sessionPassword, setSessionPassword] = useState<string>('');

  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(5);

  // Local storage keys
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    openai: '',
    anthropic: '',
    groq: '',
    gemini: '',
    cohere: '',
    mistral: ''
  });

  // Encryption status
  const [encryptionConfig, setEncryptionConfig] = useState<EncryptionConfig>({
    hasMasterPassword: false,
    isUnlocked: false,
    sessionKey: null,
    hint: ''
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize dynamic theme classes on document root element
  useEffect(() => {
    const activeTheme = UI_THEMES.find(t => t.id === currentThemeId) || UI_THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--color-bg-primary', activeTheme.colors.bgPrimary);
    root.style.setProperty('--color-sidebar-bg', activeTheme.colors.sidebarBg);
    root.style.setProperty('--color-accent', activeTheme.colors.accent);
    root.style.setProperty('--color-text-main', activeTheme.colors.textMain);
    root.style.setProperty('--color-text-muted', activeTheme.colors.textMuted);
    root.style.setProperty('--color-border', activeTheme.colors.border);
    root.style.setProperty('--color-card-bg', activeTheme.colors.cardBg);
    root.style.setProperty('--color-editor-bg', activeTheme.colors.editorBg);

    saveThemeId(currentThemeId);
  }, [currentThemeId]);

  const handleUpdateSakuraConfig = (newConfig: SakuraConfig) => {
    setSakuraConfig(newConfig);
    saveSakuraConfig(newConfig);
  };

  // Load initial settings and documents on mounting
  useEffect(() => {
    (async () => {
      const storedKeys = await loadStoredApiKeys();
      setApiKeys(storedKeys);

      const cryptVerification = loadCryptoVerificationPayload();
      const storedHint = loadCryptoHint();
      setEncryptionConfig(prev => ({
        ...prev,
        hasMasterPassword: !!cryptVerification,
        hint: storedHint,
        isUnlocked: false
      }));

      const savedNotes = loadNotes();
      if (savedNotes && savedNotes.length > 0) {
        setNotes(savedNotes);
        setSelectedNoteId(savedNotes[0].id);
      } else {
        setNotes(INITIAL_NOTES);
        setSelectedNoteId(INITIAL_NOTES[0].id);
        saveNotes(INITIAL_NOTES);
      }

      const savedTheme = loadThemeId();
      if (savedTheme) setCurrentThemeId(savedTheme);

      const savedSakura = loadSakuraConfig();
      if (savedSakura) setSakuraConfig(savedSakura);
    })();
  }, []);

  // Show status toasts
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist API keys to secure local storage
  const handleSaveKeys = (keys: APIKeys) => {
    persistApiKeys(keys)
      .then(() => {
        setApiKeys(keys);
        showToast('Secure credentials updated successfully!');
      })
      .catch((error) => {
        console.error('Failed to save API keys:', error);
        showToast('Failed to save API keys. Please try again.');
      });
  };

  // Configure cryptographic Master Password
  const handleSetMasterPassword = async (password: string, hint: string) => {
    try {
      // Create a test validation string to verify correct password queries
      const testString = "VALID";
      const { ciphertext, salt, iv } = await encryptText(testString, password);

      const verificationPayload = JSON.stringify({ ciphertext, salt, iv });
      saveCryptoVerificationPayload(verificationPayload);
      saveCryptoHint(hint);

      setSessionPassword(password);
      setEncryptionConfig({
        hasMasterPassword: true,
        isUnlocked: true,
        sessionKey: null,
        hint
      });

      showToast('Encryption parameters safely established!');
    } catch {
      throw new Error('Could not establish secure encryption.');
    }
  };

  // Unlock existing encrypted notes using password PBKDF2
  const handleUnlock = async (password: string): Promise<boolean> => {
    const cryptVerification = loadCryptoVerificationPayload();
    if (!cryptVerification) return false;

    try {
      const { ciphertext, salt, iv } = JSON.parse(cryptVerification);
      const decrypted = await decryptText(ciphertext, password, salt, iv);

      if (decrypted === 'VALID') {
        setSessionPassword(password);

        // Decrypt all notes that are encrypted into plaintext state in-memory
        const updatedNotes = await Promise.all(notes.map(async (note) => {
          if (note.isEncrypted && note.encryptedContent && note.salt && note.iv) {
            try {
              const plain = await decryptText(note.encryptedContent, password, note.salt, note.iv);
              return { ...note, content: plain };
            } catch (err) {
              console.error(`Could not decrypt note: ${note.id}`, err);
              // keep as is, can be decrypted once correct key is set
            }
          }
          return note;
        }));

        setNotes(updatedNotes);
        setEncryptionConfig(prev => ({
          ...prev,
          isUnlocked: true
        }));
        showToast('Document vault successfully unlocked!');
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Safely lock the active decrypted notes, flushing the derived keys the session state
  const handleLock = () => {
    setSessionPassword('');
    
    // Clear in-memory plaintext content of encrypted notes to safely protect documents
    const lockedNotes = notes.map(note => {
      if (note.isEncrypted) {
        return { ...note, content: '' }; // remove plain content from running state
      }
      return note;
    });

    setNotes(lockedNotes);
    setEncryptionConfig(prev => ({
      ...prev,
      isUnlocked: false
    }));
    showToast('Vault secured. Local files locked.');
  };

  // Create a new note cleanly
  const handleCreateNote = (isEncrypted: boolean) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: isEncrypted ? '🔐 Protected Note' : 'Untitled Document',
      content: isEncrypted ? '# Protected Note\nType your private logs...' : '# New Note\nType your markdown here...',
      isEncrypted,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newNotesList = [newNote, ...notes];
    setNotes(newNotesList);
    setSelectedNoteId(newNote.id);
    setActiveTab('write');

    // If encrypted, immediately queue it to save encrypted state
    saveNotesToLocalStorage(newNotesList);
  };

  // Perform note update
  const handleUpdateNote = async (updatedFields: Partial<Note>, noteId?: string) => {
    const targetNoteId = noteId || selectedNoteId;
    if (!targetNoteId) return;

    const updatedList = await Promise.all(notes.map(async (note) => {
      if (note.id === targetNoteId) {
        const merged = {
          ...note,
          ...updatedFields,
          updatedAt: new Date().toISOString()
        };

        // If the note is marked encrypted, we must perform client-side encryption of current content
        if (merged.isEncrypted && sessionPassword) {
          try {
            const { ciphertext, salt, iv } = await encryptText(merged.content, sessionPassword);
            merged.encryptedContent = ciphertext;
            merged.salt = salt;
            merged.iv = iv;
          } catch (e) {
            console.error('Core encryption hook missed:', e);
          }
        } else if (!merged.isEncrypted) {
          // Clean up legacy keys
          delete merged.encryptedContent;
          delete merged.salt;
          delete merged.iv;
        }

        return merged;
      }
      return note;
    }));

    setNotes(updatedList);
    saveNotesToLocalStorage(updatedList);
  };

  const handleApplyAITextToNote = async (noteId: string, content: string) => {
    await handleUpdateNote({ content }, noteId);
    showToast('AI response applied to the current document.');
  };

  // Delete note from local database
  const handleDeleteNote = (id: string) => {
    const filtered = notes.filter(n => n.id !== id);
    setNotes(filtered);
    saveNotesToLocalStorage(filtered);

    if (selectedNoteId === id) {
      setSelectedNoteId(filtered.length > 0 ? filtered[0].id : null);
    }
    showToast('Document deleted.');
  };

  // AI chat output saver handler
  const handleSaveNewNoteFromAI = (title: string, content: string) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      isEncrypted: false,
      tags: ['ai-reply'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [newNote, ...notes];
    setNotes(updatedList);
    setSelectedNoteId(newNote.id);
    setActiveTab('write');
    saveNotesToLocalStorage(updatedList);
    showToast('AI response imported as new custom note!');
  };

  // Save changes to client persistence
  const saveNotesToLocalStorage = (listToSave: Note[]) => {
    // For local storage, if notes are encrypted, we blank out the original `content` property for security.
    // That way, if a raw inspect is made of local storage, raw text of sealed notes is nowhere to be found!
    const sanitized = listToSave.map(n => {
      if (n.isEncrypted) {
        return {
          ...n,
          content: '' // Clean plain content field from persisting file for military-grade protection
        };
      }
      return n;
    });

    saveNotes(sanitized);
  };

  // Wipe databases completely
  const handleClearAllData = () => {
    clearAppData().catch((error) => console.error('Failed to clear app data:', error));

    setNotes(INITIAL_NOTES);
    setSelectedNoteId(INITIAL_NOTES[0].id);
    setApiKeys({ openai: '', anthropic: '', groq: '', gemini: '', cohere: '', mistral: '' });
    setEncryptionConfig({
      hasMasterPassword: false,
      isUnlocked: false,
      sessionKey: null,
      hint: ''
    });
    setSessionPassword('');
    setActiveTab('write');
    showToast('Application space completely randomized & cleaned!');
  };

  const activeNote = notes.find(n => n.id === selectedNoteId) || null;

  return (
    <div className="w-full h-screen flex bg-bg-primary overflow-hidden relative selection:bg-pink-100" id="app-viewport">
      {/* Background Sakura particle engine - runs behind everything */}
      <SakuraCanvas themeId={currentThemeId} config={sakuraConfig} />

      {/* Dynamic Status Notifications Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 z-50 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 shadow-xl text-xs font-semibold flex items-center gap-2 font-sans"
          >
            <Activity className="w-4 h-4 text-pink-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Sidebar controls */}
      <Sidebar
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onCreateNote={handleCreateNote}
        encryptionConfig={encryptionConfig}
        activeTab={activeTab === 'settings' ? 'write' : activeTab}
        setActiveTab={(tab) => {
          if (tab === 'write') setActiveTab('write');
          if (tab === 'chat') setActiveTab('chat');
        }}
        onSwitchToSettings={() => setActiveTab('settings')}
      />

      {/* Primary Workspace viewport */}
      <div className="flex-1 h-full flex flex-col bg-editor-bg/90 backdrop-blur-sm z-10">
        {activeTab === 'write' && (
          <Editor
            note={activeNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            encryptionConfig={encryptionConfig}
          />
        )}

        {activeTab === 'chat' && (
          <Chat
            notes={notes}
            apiKeys={apiKeys}
            onSaveNewNoteFromAI={handleSaveNewNoteFromAI}
            onUpdateActiveNoteFromAI={handleApplyAITextToNote}
            activeNoteId={selectedNoteId}
          />
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 bg-bg-primary/40">
            <Settings
              apiKeys={apiKeys}
              onSaveKeys={handleSaveKeys}
              encryptionConfig={encryptionConfig}
              onSetMasterPassword={handleSetMasterPassword}
              onUnlock={handleUnlock}
              onLock={handleLock}
              onClearAllData={handleClearAllData}
              currentThemeId={currentThemeId}
              onSelectTheme={setCurrentThemeId}
              sakuraConfig={sakuraConfig}
              onUpdateSakuraConfig={handleUpdateSakuraConfig}
              autoLockMinutes={autoLockMinutes}
              onSetAutoLockMinutes={setAutoLockMinutes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
