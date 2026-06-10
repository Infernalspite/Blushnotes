/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, Tag, Lock, Unlock, FileText, Hash, Calendar, Command, MessageSquareText } from 'lucide-react';
import { Note, EncryptionConfig } from '../types';

interface SidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (isEncrypted: boolean) => void;
  encryptionConfig: EncryptionConfig;
  activeTab: 'write' | 'chat' | 'settings';
  setActiveTab: (tab: 'write' | 'chat' | 'settings') => void;
  onSwitchToSettings?: () => void;
}

export default function Sidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  encryptionConfig,
  activeTab,
  setActiveTab,
  onSwitchToSettings
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(notes.flatMap(note => note.tags || []))
  ).filter(Boolean);

  // Filter notes based on search & selected tag
  const filteredNotes = notes.filter(note => {
    // If encrypted and locked, some metadata (like tags and decrypted contents) might be unavailable or we decide how to handle them.
    // For extreme security, if locked, we only search by title (unless title itself is encrypted, but here we can encrypt the body and keep a custom placeholder or encrypt the title too).
    // Let's check matches:
    const matchesSearch =
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(search.toLowerCase()));

    const matchesTag = !selectedTag || note.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-80 h-full border-r border-border flex flex-col bg-sidebar-bg" id="sidebar-container">
      {/* App Branding Header */}
      <div className="p-5 border-b border-border/50 bg-white/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-xs text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-text-main tracking-tight block text-sm">BlushNotes</span>
            <span className="text-[9px] text-text-muted font-mono tracking-wider font-semibold uppercase">Local & Secure</span>
          </div>
        </div>

        {/* Global Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-white/40 border border-border/50 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'write' ? 'bg-editor-bg shadow-xs font-bold text-text-main' : 'text-text-muted hover:text-text-main'}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'chat' ? 'bg-editor-bg shadow-xs font-bold text-text-main' : 'text-text-muted hover:text-text-main'}`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Security Banner indicator */}
      {encryptionConfig.hasMasterPassword && (
        <div className={`px-4 py-2 border-b text-xs flex items-center justify-between font-sans ${encryptionConfig.isUnlocked ? 'bg-white/50 border-border/40 text-text-main' : 'bg-accent/10 border-border/40 text-text-muted'}`}>
          <div className="flex items-center gap-1.5 font-medium">
            {encryptionConfig.isUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-accent" /> Encryption Vault Open
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-accent" /> Encryption Vault Locked
              </>
            )}
          </div>
          <button
            onClick={() => onSwitchToSettings ? onSwitchToSettings() : setActiveTab('settings')}
            className="text-[10px] underline font-bold text-text-main hover:text-accent cursor-pointer"
          >
            Manage
          </button>
        </div>
      )}

      {/* Note Creation Block */}
      <div className="p-4 border-b border-border/50 flex items-center gap-2">
        <button
          onClick={() => onCreateNote(false)}
          className="flex-1 py-2 px-3 bg-accent hover:opacity-90 text-white rounded-lg text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer border-2 border-text-main shadow-[3px_3px_0_var(--color-text-main)]"
        >
          <Plus className="w-3.5 h-3.5" /> Clear Note
        </button>
        
        {encryptionConfig.hasMasterPassword && (
          <button
            onClick={() => onCreateNote(true)}
            disabled={!encryptionConfig.isUnlocked}
            className={`py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all flex items-center gap-1.5 cursor-pointer border-2 border-text-main shadow-[3px_3px_0_var(--color-text-main)] ${encryptionConfig.isUnlocked ? 'bg-text-main text-white hover:opacity-90' : 'bg-white/40 text-text-muted/40 cursor-not-allowed'}`}
            title={encryptionConfig.isUnlocked ? 'Create encrypted note' : 'Vault must be unlocked first'}
          >
            <Lock className="w-3.5 h-3.5" /> Secure
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-border/30 bg-white/10">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes or content..."
            className="w-full pl-8 pr-3 py-1.5 border border-border/60 rounded-xl text-xs focus:outline-none focus:border-accent bg-white/60 font-sans text-text-main"
          />
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Dynamic Tag Filters */}
      {allTags.length > 0 && (
        <div className="px-4 py-2 border-b border-border/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none select-none bg-white/10">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${!selectedTag ? 'bg-accent text-white' : 'bg-white/40 text-text-muted hover:bg-white/60'}`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-0.5 cursor-pointer ${selectedTag === tag ? 'bg-accent text-white' : 'bg-white/40 text-text-muted hover:bg-white/60'}`}
            >
              <Hash className="w-2.5 h-2.5 text-text-muted" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredNotes.length === 0 ? (
          <div className="py-12 text-center text-text-muted/60 text-xs font-sans">
            No documents found.
          </div>
        ) : (
          filteredNotes.map(note => {
            const isSelected = note.id === selectedNoteId;

            // If encrypted & locked, contents are completely invisible
            const isLockedEncrypted = note.isEncrypted && !encryptionConfig.isUnlocked;
            const displayTitle = isLockedEncrypted ? 'Encrypted Note' : (note.title || 'Untitled Note');
            
            // Clean content snippet
            const displaySnippet = isLockedEncrypted 
              ? '••••••••••••••••••••' 
              : (note.content ? note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '') : 'No additional content');

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`p-3 rounded-xl transition-all cursor-pointer border text-left group relative ${isSelected ? 'bg-editor-bg border-border shadow-xs' : 'bg-editor-bg/40 border-border/20 hover:border-border hover:bg-editor-bg/60'}`}
              >
                {/* Locking status overlay indicator */}
                <div className="flex justify-between items-start mb-1 gap-1">
                  <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-text-main' : 'text-text-muted'} ${isLockedEncrypted ? 'italic text-text-muted/60' : ''}`}>
                    {displayTitle}
                  </h3>
                  
                  {note.isEncrypted ? (
                    <div>
                      {encryptionConfig.isUnlocked ? (
                        <Unlock className="w-3 h-3 text-green-600" title="Encrypted & Unlocked" />
                      ) : (
                        <Lock className="w-3 h-3 text-accent animate-pulse" title="Encrypted & Locked" />
                      )}
                    </div>
                  ) : (
                    <FileText className="w-3 h-3 text-text-muted/50 group-hover:text-accent transition-colors" />
                  )}
                </div>

                <p className="text-[11px] text-text-muted/75 line-clamp-1 mb-2 font-sans font-normal leading-relaxed">
                  {displaySnippet}
                </p>

                <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-text-muted/60">
                  <span className="flex items-center gap-0.5 font-light">
                    <Calendar className="w-2.5 h-2.5 text-text-muted/30" />
                    {formatDate(note.updatedAt)}
                  </span>

                  {!isLockedEncrypted && note.tags && note.tags.length > 0 && (
                    <div className="flex gap-0.5 overflow-hidden max-w-[120px]">
                      {note.tags.slice(0, 2).map((tg, idx) => (
                        <span key={idx} className="bg-editor-bg/60 text-text-main px-1 py-0.2 rounded-md font-sans font-medium text-[8px] border border-border/20">
                          #{tg}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="text-text-muted/50 px-0.5 text-[8px] font-sans font-normal">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Navigation footer */}
      <div className="p-4 border-t border-border/30 bg-white/20 flex items-center justify-between text-xs text-text-muted font-sans font-medium">
        <button
          onClick={() => onSwitchToSettings ? onSwitchToSettings() : setActiveTab('settings')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${activeTab === 'settings' ? 'text-text-main font-bold' : 'hover:text-accent'}`}
        >
          <Tag className="w-4 h-4 text-accent" /> Settings & Security
        </button>
        <span className="text-[10px] text-text-muted/60 font-bold flex items-center gap-1">
          <Command className="w-3 h-3" /> K
        </span>
      </div>
    </div>
  );
}
