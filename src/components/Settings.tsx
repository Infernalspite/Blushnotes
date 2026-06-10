/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Key, Lock, Unlock, Eye, EyeOff, Save, Trash2, CheckCircle, ShieldAlert, Palette, Sparkles, Wind, Flower, Sliders, Activity, ShieldCheck, HardDrive, Info, Cpu, Brain, GitBranch, CloudCog } from 'lucide-react';
import { APIKeys, EncryptionConfig, SakuraConfig, LocalModelConfig } from '../types';
import { UI_THEMES } from '../constants/themes';
import { validatePasswordStrength } from '../utils/crypto';
import { checkStorageQuota } from '../utils/secureStorage';

// Provider metadata for rendering key input fields
const PROVIDER_INFO: { key: keyof APIKeys; label: string; placeholder: string; getKeyUrl: string; isFree: boolean }[] = [
  { key: 'gemini', label: 'Google Gemini', placeholder: 'AIza...', getKeyUrl: 'https://aistudio.google.com/apikey', isFree: true },
  { key: 'groq', label: 'Groq', placeholder: 'gsk_...', getKeyUrl: 'https://console.groq.com/keys', isFree: true },
  { key: 'cohere', label: 'Cohere', placeholder: 'co_...', getKeyUrl: 'https://dashboard.cohere.com/api-keys', isFree: true },
  { key: 'mistral', label: 'Mistral', placeholder: 'mist_...', getKeyUrl: 'https://console.mistral.ai/', isFree: true },
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-proj-...', getKeyUrl: 'https://platform.openai.com/api-keys', isFree: false },
  { key: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...', getKeyUrl: 'https://console.anthropic.com/', isFree: false },
];

interface SettingsProps {
  apiKeys: APIKeys;
  onSaveKeys: (keys: APIKeys) => void;
  encryptionConfig: EncryptionConfig;
  onSetMasterPassword: (password: string, hint: string) => Promise<void>;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => void;
  onClearAllData: () => void;
  currentThemeId: string;
  onSelectTheme: (id: string) => void;
  sakuraConfig: SakuraConfig;
  onUpdateSakuraConfig: (config: SakuraConfig) => void;
  autoLockMinutes: number;
  onSetAutoLockMinutes: (minutes: number) => void;
  localModelConfig: LocalModelConfig;
  onUpdateLocalModelConfig: (config: LocalModelConfig) => void;
}

export default function Settings({
  apiKeys,
  onSaveKeys,
  encryptionConfig,
  onSetMasterPassword,
  onUnlock,
  onLock,
  onClearAllData,
  currentThemeId,
  onSelectTheme,
  sakuraConfig,
  onUpdateSakuraConfig,
  autoLockMinutes,
  onSetAutoLockMinutes,
  localModelConfig,
  onUpdateLocalModelConfig
}: SettingsProps) {
  // Key state — initialize from props
  const [keyValues, setKeyValues] = useState<APIKeys>({ ...apiKeys });
  const [keyVisibility, setKeyVisibility] = useState<Record<keyof APIKeys, boolean>>({
    openai: false, anthropic: false, groq: false, gemini: false, cohere: false, mistral: false, ollama: true, llamacpp: true
  });

  // Notification states
  const [keysSaved, setKeysSaved] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Master password setup input
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Unlock state input
  const [unlockPassword, setUnlockPassword] = useState('');

  // Storage quota
  const [storageInfo, setStorageInfo] = useState<{ usedMB: number; quotaMB: number; percentUsed: number } | null>(null);

  useEffect(() => {
    checkStorageQuota().then(info => setStorageInfo(info));
  }, []);

  // Sync when parent apiKeys change
  useEffect(() => {
    setKeyValues({ ...apiKeys });
  }, [apiKeys]);

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKeys(keyValues);
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 3000);
  };

  const handleKeyChange = (providerKey: keyof APIKeys, value: string) => {
    setKeyValues(prev => ({ ...prev, [providerKey]: value }));
  };

  const toggleKeyVisibility = (providerKey: keyof APIKeys) => {
    setKeyVisibility(prev => ({ ...prev, [providerKey]: !prev[providerKey] }));
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      setSecurityStatus({ type: 'error', message: 'Password does not meet strength requirements.' });
      return;
    }
    setPasswordErrors([]);

    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    try {
      await onSetMasterPassword(newPassword, passwordHint);
      setSecurityStatus({ type: 'success', message: 'Master Password successfully active! Your encryption keys are stored in current memory.' });
      setNewPassword('');
      setConfirmPassword('');
      setPasswordHint('');
    } catch (err: any) {
      setSecurityStatus({ type: 'error', message: err.message || 'Failed to establish master password.' });
    }
  };

  const handleUnlockNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await onUnlock(unlockPassword);
      if (success) {
        setSecurityStatus({ type: 'success', message: 'Data successfully unlocked and decrypted in memory!' });
        setUnlockPassword('');
      } else {
        setSecurityStatus({ type: 'error', message: 'Incorrect passphrase. Please try again.' });
      }
    } catch (err: any) {
      setSecurityStatus({ type: 'error', message: err.message || 'Unlocking failed.' });
    }
  };

  const handleWipeData = () => {
    if (window.confirm('Are you absolutely sure? This will wipe your secure credentials, keys, and DELETE all saved local documents permanently.')) {
      onClearAllData();
      setKeyValues({ openai: '', anthropic: '', groq: '', gemini: '', cohere: '', mistral: '' });
      setNewPassword('');
      setConfirmPassword('');
      setUnlockPassword('');
      setPasswordHint('');
      setSecurityStatus({ type: 'success', message: 'All local data safely wiped.' });
    }
  };

  // Live password strength indicator
  const pwStrength = newPassword ? validatePasswordStrength(newPassword) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn" id="settings-view">
      {/* Data Privacy & Local Storage Info */}
      <div className="border border-green-200/50 bg-green-50/20 rounded-2xl p-6 shadow-xs">
        <h2 className="text-lg font-extrabold text-green-900 flex items-center gap-2 mb-2 font-sans">
          <ShieldCheck className="w-5 h-5 text-green-700" />
          Local-Only Data Privacy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-white/40 rounded-xl border border-green-100/50 space-y-2">
            <h4 className="text-xs font-extrabold text-green-900 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-green-700" /> What's Stored Locally
            </h4>
            <ul className="text-[11px] text-green-800 space-y-1 leading-relaxed font-sans">
              <li>• <strong>Notes & documents</strong> — localStorage (encrypted if you set a Master Password)</li>
              <li>• <strong>API keys</strong> — AES-GCM encrypted via a device key in IndexedDB</li>
              <li>• <strong>Theme & UI preferences</strong> — localStorage (unencrypted, non-sensitive)</li>
              <li>• <strong>Device encryption key</strong> — IndexedDB (non-extractable, never leaves browser)</li>
            </ul>
          </div>
          <div className="p-3 bg-white/40 rounded-xl border border-green-100/50 space-y-2">
            <h4 className="text-xs font-extrabold text-green-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-green-700" /> What's NOT Stored
            </h4>
            <ul className="text-[11px] text-green-800 space-y-1 leading-relaxed font-sans">
              <li>• <strong>No cloud sync</strong> — zero data is sent to any server for storage</li>
              <li>• <strong>No analytics or tracking</strong> — no telemetry of any kind</li>
              <li>• <strong>No cookies</strong> — only localStorage + IndexedDB</li>
              <li>• <strong>AI requests</strong> — sent directly to provider APIs, never logged by us</li>
            </ul>
            {storageInfo && (
              <div className="mt-2 pt-2 border-t border-green-100/50">
                <p className="text-[10px] text-green-700 font-mono">
                  Storage: {storageInfo.usedMB} MB / {storageInfo.quotaMB} MB ({storageInfo.percentUsed}% used)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-2 border-text-main bg-card-bg rounded-lg p-6 shadow-[6px_6px_0_var(--color-text-main)]">
        <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2 mb-2 font-sans">
          <Cpu className="w-5 h-5 text-accent" />
          Local Intelligence & Power Tools
        </h2>
        <p className="text-xs text-text-muted mb-6 font-sans leading-relaxed">
          Connect local models, opt into private note memories, and prepare encrypted sync/version-history workflows without moving plaintext notes to a cloud service.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-accent" /> Ollama Endpoint
            </label>
            <input
              value={localModelConfig.ollamaUrl}
              onChange={(event) => onUpdateLocalModelConfig({ ...localModelConfig, ollamaUrl: event.target.value })}
              className="w-full px-3 py-2 border-2 border-text-main rounded-lg text-sm bg-white/50 focus:outline-none focus:border-accent font-mono text-text-main"
              placeholder="http://localhost:11434"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-accent" /> llama.cpp Endpoint
            </label>
            <input
              value={localModelConfig.llamacppUrl}
              onChange={(event) => onUpdateLocalModelConfig({ ...localModelConfig, llamacppUrl: event.target.value })}
              className="w-full px-3 py-2 border-2 border-text-main rounded-lg text-sm bg-white/50 focus:outline-none focus:border-accent font-mono text-text-main"
              placeholder="http://localhost:8080"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {[
            { key: 'allowNoteMemories' as const, icon: Brain, title: 'Agent Memories', text: 'Let the agent reference unlocked local notes when answering.' },
            { key: 'encryptedSyncEnabled' as const, icon: CloudCog, title: 'Zero-Knowledge Sync', text: 'Reserve encrypted CouchDB/WebRTC sync mode for sealed notes.' },
            { key: 'gitHistoryEnabled' as const, icon: GitBranch, title: 'Git History', text: 'Track local note revisions for revertable AI and user edits.' }
          ].map(item => {
            const Icon = item.icon;
            const enabled = localModelConfig[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onUpdateLocalModelConfig({ ...localModelConfig, [item.key]: !enabled })}
                className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${enabled ? 'border-text-main bg-sidebar-bg shadow-[4px_4px_0_var(--color-text-main)]' : 'border-border bg-white/30 hover:border-text-main'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-text-main">
                    <Icon className="w-4 h-4 text-accent" /> {item.title}
                  </span>
                  <span className={`h-5 w-9 rounded-full border border-text-main transition-colors ${enabled ? 'bg-accent' : 'bg-white'}`}>
                    <span className={`block h-4 w-4 rounded-full bg-text-main transition-transform mt-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">{item.text}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Design Themes Selection Panel */}
      <div className="border border-border bg-card-bg rounded-2xl p-6 shadow-xs">
        <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2 mb-2 font-sans">
          <Palette className="w-5 h-5 text-accent" />
          Blossom Design Themes
        </h2>
        <p className="text-xs text-text-muted mb-6 font-sans leading-relaxed">
          Select from our hand-picked set of beautiful, high-contrast, pink-centered color palettes. Selecting a theme instantly updates the sidebar, editor workspace, background texture, and falling petal accents.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UI_THEMES.map(theme => {
            const isSelected = currentThemeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden h-full ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border/30 bg-sidebar-bg/20 hover:bg-sidebar-bg/40 hover:border-border/80'}`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 text-accent">
                    <CheckCircle className="w-4 h-4 text-accent fill-white" />
                  </div>
                )}
                <div className="pr-4">
                  <h3 className="text-xs font-extrabold text-text-main flex items-center gap-1.5">{theme.name}</h3>
                  <p className="text-[11px] text-text-muted/80 mt-1 leading-relaxed">{theme.description}</p>
                </div>
                
                <div className="flex gap-1.5 mt-4 pt-3 border-t border-border/10 w-full">
                  <div className="w-4 h-4 rounded-full border border-border/10 shadow-xs" style={{ backgroundColor: theme.colors.bgPrimary }} title="Background" />
                  <div className="w-4 h-4 rounded-full border border-border/10 shadow-xs" style={{ backgroundColor: theme.colors.sidebarBg }} title="Sidebar" />
                  <div className="w-4 h-4 rounded-full border border-border/10 shadow-xs" style={{ backgroundColor: theme.colors.accent }} title="Accent Colors" />
                  <div className="w-4 h-4 rounded-full border border-border/10 shadow-xs" style={{ backgroundColor: theme.colors.textMain }} title="Primary Typography" />
                  <div className="w-4 h-4 rounded-full border border-border/10 shadow-xs" style={{ backgroundColor: theme.colors.editorBg }} title="Canvas Workspace" />
                  <span className="text-[9px] font-mono text-text-muted/50 ml-auto self-center uppercase">HEX Details</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sakura Petals Animation Parameters */}
      <div className="border border-border bg-card-bg rounded-2xl p-6 shadow-xs">
        <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2 mb-2 font-sans">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          Sakura Blossom Kinetics
        </h2>
        <p className="text-xs text-text-muted mb-6 font-sans leading-relaxed">
          Unleash the spirit of spring with our dynamic falling cherry blossom sakura engine. Set petal volumes, draft intensities, flight shapes, and speeds to construct your perfect writing atmosphere.
        </p>

        <div className="space-y-5">
          {/* Main Toggle Switch */}
          <div className="flex items-center justify-between p-3.5 bg-sidebar-bg/25 border border-border/50 rounded-xl">
            <div>
              <span className="text-xs font-bold text-text-main block font-sans">Dynamic Falling Blossoms</span>
              <span className="text-[10px] text-text-muted/70 block mt-0.5 font-sans">Render interactive 60fps petals in the background workspace</span>
            </div>
            <button
              onClick={() => onUpdateSakuraConfig({ ...sakuraConfig, enabled: !sakuraConfig.enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${sakuraConfig.enabled ? 'bg-accent' : 'bg-border'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${sakuraConfig.enabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {sakuraConfig.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fadeIn">
              {/* Petal Volume */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-main flex items-center gap-1 font-sans">
                  <Flower className="w-3.5 h-3.5 text-accent" /> Petal Count
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-sidebar-bg/10 border border-border/30 rounded-xl text-[10px] font-bold text-text-muted font-sans">
                  {(['low', 'medium', 'high', 'storm'] as const).map(vol => (
                    <button
                      key={vol}
                      type="button"
                      onClick={() => onUpdateSakuraConfig({ ...sakuraConfig, count: vol })}
                      className={`py-1 rounded-lg transition-all capitalize cursor-pointer text-center ${sakuraConfig.count === vol ? 'bg-accent text-white shadow-2xs' : 'hover:text-text-main hover:bg-white/40'}`}
                    >
                      {vol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Falling Velocity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-main flex items-center gap-1 font-sans">
                  <Activity className="w-3.5 h-3.5 text-accent animate-pulse" /> Falling Speed
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-sidebar-bg/10 border border-border/30 rounded-xl text-[10px] font-bold text-text-muted font-sans">
                  {(['gentle', 'breeze', 'gust'] as const).map(speed => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => onUpdateSakuraConfig({ ...sakuraConfig, speed: speed })}
                      className={`py-1 rounded-lg transition-all capitalize cursor-pointer text-center ${sakuraConfig.speed === speed ? 'bg-accent text-white shadow-2xs' : 'hover:text-text-main hover:bg-white/40'}`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wind Vector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-main flex items-center gap-1 font-sans">
                  <Wind className="w-3.5 h-3.5 text-accent" /> Wind Direction
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-sidebar-bg/10 border border-border/30 rounded-xl text-[10px] font-bold text-text-muted font-sans">
                  {(['left', 'calm', 'right'] as const).map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onUpdateSakuraConfig({ ...sakuraConfig, wind: w })}
                      className={`py-1 rounded-lg transition-all capitalize cursor-pointer text-center ${sakuraConfig.wind === w ? 'bg-accent text-white shadow-2xs' : 'hover:text-text-main hover:bg-white/40'}`}
                    >
                      {w === 'left' ? 'Left ↙' : w === 'right' ? 'Right ↘' : 'Calm ⬇'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aesthetic Style */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-main flex items-center gap-1 font-sans">
                  <Sliders className="w-3.5 h-3.5 text-accent" /> Petal Design
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-sidebar-bg/10 border border-border/30 rounded-xl text-[10px] font-bold text-text-muted font-sans">
                  {(['classic', 'glow', 'outline', 'flower'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateSakuraConfig({ ...sakuraConfig, style: st })}
                      className={`py-1 rounded-lg transition-all capitalize cursor-pointer text-center ${sakuraConfig.style === st ? 'bg-accent text-white shadow-2xs' : 'hover:text-text-main hover:bg-white/40'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secure AI Credentials */}
      <div className="border border-border bg-card-bg rounded-2xl p-6 shadow-xs">
        <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2 mb-2 font-sans">
          <Key className="w-5 h-5 text-accent" />
          Secure AI Credentials
        </h2>
        <p className="text-xs text-text-muted mb-6 font-sans leading-relaxed">
          Your personal API keys are <strong>AES-GCM encrypted</strong> with a non-extractable device key stored in IndexedDB. Requests are securely forwarded through a lightweight proxy. All traffic remains confidential.
        </p>

        <form onSubmit={handleSaveKeys} className="space-y-5">
          {/* Free Tier Providers */}
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-accent uppercase tracking-wider flex items-center gap-1.5 font-sans mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Free Tier Providers
            </h3>
            <p className="text-[11px] text-text-muted/80 mb-4 font-sans leading-relaxed -mt-1">
              These providers offer generous free tiers — no credit card required.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROVIDER_INFO.filter(p => p.isFree).map(provider => (
                <div key={provider.key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-text-main block flex items-center gap-1.5">
                      {provider.label}
                      <span className="text-[9px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full font-bold">FREE</span>
                    </label>
                    <a href={provider.getKeyUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:text-text-main font-bold hover:underline">Get Key ↗</a>
                  </div>
                  <div className="relative">
                    <input
                      type={keyVisibility[provider.key] ? "text" : "password"}
                      value={keyValues[provider.key]}
                      onChange={(e) => handleKeyChange(provider.key, e.target.value)}
                      placeholder={provider.placeholder}
                      className="w-full pr-10 pl-3 py-2 border border-border rounded-xl text-sm bg-white/40 focus:outline-none focus:border-accent transition-all font-mono text-text-main placeholder-text-muted/20"
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(provider.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted/40 hover:text-text-main focus:outline-none cursor-pointer"
                    >
                      {keyVisibility[provider.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paid Tier Providers */}
          <div className="space-y-1 pt-2 border-t border-border/30">
            <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5 font-sans mb-3 mt-3">
              <Key className="w-3.5 h-3.5" />
              Premium Providers
            </h3>
            <p className="text-[11px] text-text-muted/80 mb-4 font-sans leading-relaxed -mt-1">
              These providers require a paid plan or credits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROVIDER_INFO.filter(p => !p.isFree).map(provider => (
                <div key={provider.key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-text-main block">{provider.label}</label>
                    <a href={provider.getKeyUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:text-text-main font-bold hover:underline">Get Key ↗</a>
                  </div>
                  <div className="relative">
                    <input
                      type={keyVisibility[provider.key] ? "text" : "password"}
                      value={keyValues[provider.key]}
                      onChange={(e) => handleKeyChange(provider.key, e.target.value)}
                      placeholder={provider.placeholder}
                      className="w-full pr-10 pl-3 py-2 border border-border rounded-xl text-sm bg-white/40 focus:outline-none focus:border-accent transition-all font-mono text-text-main placeholder-text-muted/20"
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(provider.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted/40 hover:text-text-main focus:outline-none cursor-pointer"
                    >
                      {keyVisibility[provider.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 items-center pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:opacity-90 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save All Keys
            </button>
            {keysSaved && (
              <span className="text-xs text-green-700 font-bold flex items-center gap-1 font-sans animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-green-600" /> Keys encrypted & saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Local Cryptographic Security */}
      <div className="border border-border bg-card-bg rounded-2xl p-6 shadow-xs">
        <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2 mb-2 font-sans">
          <Lock className="w-5 h-5 text-accent" />
          On-Device Data Encryption
        </h2>
        <p className="text-xs text-text-muted mb-6 font-sans leading-relaxed">
          Configure a local Master Password to encrypt selected documents directly in your browser. Encrypted files utilize <strong>AES-GCM (256-bit)</strong> derived using PBKDF2 with 600,000 iterations (OWASP 2024). No one (including developers) can view your locked files without the passphrase.
        </p>

        {securityStatus && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-bold font-sans ${securityStatus.type === 'success' ? 'bg-green-50/40 text-green-800 border border-green-200/50' : 'bg-red-50/40 text-red-800 border border-red-200/50'}`}>
            {securityStatus.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Master Password Setup / Creation */}
          {!encryptionConfig.hasMasterPassword ? (
            <form onSubmit={handleCreatePassword} className="space-y-4 border-r border-border/30 pr-0 md:pr-6">
              <span className="text-xs font-extrabold text-accent uppercase tracking-wider block font-sans">Initialize Encryption</span>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted block">Create Master Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors([]); }}
                  placeholder="Min 8 chars, uppercase, lowercase, number..."
                  className="w-full px-3 py-1.5 border border-border rounded-xl text-sm bg-white/40 focus:outline-none focus:border-accent font-sans text-text-main"
                />
                {/* Password strength indicator */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => {
                        const strength = pwStrength ? (pwStrength.isValid ? 4 : Math.max(0, 4 - pwStrength.errors.length)) : 0;
                        return (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              i <= strength
                                ? strength >= 4 ? 'bg-green-500' : strength >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                                : 'bg-border/50'
                            }`}
                          />
                        );
                      })}
                    </div>
                    {passwordErrors.length > 0 && (
                      <ul className="text-[10px] text-red-600 space-y-0.5 font-sans">
                        {passwordErrors.map((err, i) => <li key={i}>• {err}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted block">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify password..."
                  className="w-full px-3 py-1.5 border border-border rounded-xl text-sm bg-white/40 focus:outline-none focus:border-accent font-sans text-text-main"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted block">Optional Password Hint</label>
                <input
                  type="text"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  placeholder="e.g., 'My childhood cat's color'"
                  className="w-full px-3 py-1.5 border border-border rounded-xl text-sm bg-white/40 focus:outline-none focus:border-accent font-sans text-text-main"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-accent hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Create Encryption Keys
              </button>
            </form>
          ) : (
            <div className="space-y-4 border-r border-border/30 pr-0 md:pr-6">
              <span className="text-xs font-extrabold text-accent uppercase tracking-wider block font-sans">Active Encryption Status</span>
              <div className="flex items-center gap-2 p-3 bg-sidebar-bg/35 rounded-xl border border-border/50">
                {encryptionConfig.isUnlocked ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-green-800 font-sans">Unlocked (Decrypted Session Active)</span>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs font-bold text-accent font-sans">Locked (Documents Encrypted Safely)</span>
                  </>
                )}
              </div>
              <p className="text-xs text-text-muted/80 font-sans leading-relaxed">
                A local password has been generated. When locked, any encrypted document contents are kept strictly in hashed cipher text.
              </p>

              {/* Auto-Lock Timer Configuration */}
              <div className="space-y-1.5 p-3 bg-sidebar-bg/20 rounded-xl border border-border/40">
                <label className="text-xs font-bold text-text-main flex items-center gap-1.5 font-sans">
                  <Lock className="w-3 h-3 text-accent" /> Auto-Lock Timer
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-sidebar-bg/10 border border-border/30 rounded-xl text-[10px] font-bold text-text-muted font-sans">
                  {[5, 15, 30, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onSetAutoLockMinutes(mins)}
                      className={`py-1 rounded-lg transition-all cursor-pointer text-center ${autoLockMinutes === mins ? 'bg-accent text-white shadow-2xs' : 'hover:text-text-main hover:bg-white/40'}`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted/60 font-sans">Vault auto-locks after {autoLockMinutes} minutes of inactivity</p>
              </div>

              {encryptionConfig.isUnlocked ? (
                <button
                  onClick={onLock}
                  className="px-4 py-2 bg-text-main hover:opacity-90 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-accent" />
                  Lock Session
                </button>
              ) : (
                <div className="text-xs bg-sidebar-bg/20 p-2.5 rounded-xl border border-border/40 leading-relaxed font-sans text-text-main">
                  <strong>Password Hint:</strong> {encryptionConfig.hint || 'No hint configured.'}
                </div>
              )}
            </div>
          )}

          {/* Locked Notes Access & Control */}
          <div className="space-y-4">
            <span className="text-xs font-extrabold text-accent uppercase tracking-wider block font-sans">Session Controller</span>
            {encryptionConfig.hasMasterPassword && !encryptionConfig.isUnlocked ? (
              <form onSubmit={handleUnlockNotes} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted block">Unlock Password</label>
                  <input
                    type="password"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Enter Master Password..."
                    className="w-full px-3 py-1.5 border border-border rounded-xl text-sm bg-white/40 focus:outline-none focus:border-accent font-sans text-text-main"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-accent hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Documents
                </button>
              </form>
            ) : encryptionConfig.hasMasterPassword && encryptionConfig.isUnlocked ? (
              <div className="p-4 border border-green-200 bg-green-50/20 rounded-xl space-y-2">
                <p className="text-xs text-green-800 font-sans leading-relaxed">
                  🔓 <strong>Your local partition is unlocked.</strong> You can now view and edit your encrypted notes. Any notes created as "Encrypted" will show their plaintext contents.
                </p>
                <p className="text-[11px] text-text-muted font-sans font-medium lead-relaxed">
                  Locking your session immediately flushes derived keys from React status, encrypting documents perfectly.
                </p>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-xl text-center">
                <ShieldAlert className="w-8 h-8 text-accent/50 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-text-muted font-sans leading-relaxed">
                  Establish a Master Password to unlock custom encrypt/decrypt options for your documents.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dangerous Operations */}
      <div className="border border-red-200/50 bg-red-50/20 rounded-2xl p-6 shadow-xs">
        <h2 className="text-md font-extrabold text-red-800 flex items-center gap-2 mb-2 font-sans">
          <Trash2 className="w-4 h-4 text-red-600" />
          Wipe Local Storage
        </h2>
        <p className="text-xs text-red-800/80 mb-4 font-sans leading-relaxed">
          Permanently delete all API Keys, Master Password records, device encryption keys, and all local markdown documents stored inside this browser sandbox. This operation cannot be reversed.
        </p>
        <button
          onClick={handleWipeData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          Wipe All Local Storage
        </button>
      </div>
    </div>
  );
}
