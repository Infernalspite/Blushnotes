/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Columns, Lock, Unlock, Trash2, Calendar, FileText, CheckCircle, Plus, X, Heart, Hash, Wand2, Minimize2, Expand } from 'lucide-react';
import { Note, EncryptionConfig } from '../types';
import { marked } from 'marked';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (updated: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  encryptionConfig: EncryptionConfig;
  onInlineAgentRequest?: (prompt: string) => void;
}

export default function Editor({
  note,
  onUpdateNote,
  onDeleteNote,
  encryptionConfig,
  onInlineAgentRequest
}: EditorProps) {
  // Modes: 'write', 'preview', 'split'
  const [viewMode, setViewMode] = useState<'write' | 'preview' | 'split'>('split');
  const [newTag, setNewTag] = useState('');
  const [autoSaved, setAutoSaved] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [encryptionPulse, setEncryptionPulse] = useState(false);

  // Parse Markdown to HTML
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (!note) {
      setHtmlContent('');
      return;
    }

    // Set markdown compiler settings
    try {
      const compiled = marked.parse(note.content || '', {
        gfm: true,
        breaks: true
      }) as string;
      setHtmlContent(compiled);
    } catch (e) {
      console.error(e);
      setHtmlContent(note.content || '');
    }
  }, [note?.content]);

  // Handle autosave visual
  const triggerAutoSaved = () => {
    setAutoSaved(true);
    const t = setTimeout(() => setAutoSaved(false), 1500);
    return () => clearTimeout(t);
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary/20 p-12 text-center animate-fadeIn" id="empty-editor">
        <div className="w-12 h-12 rounded-full bg-sidebar-bg flex items-center justify-center mb-4 text-accent">
          <Heart className="w-6 h-6 fill-accent text-accent animate-pulse" />
        </div>
        <h2 className="text-base font-bold text-text-main font-sans">No Note Selected</h2>
        <p className="text-xs text-text-muted/80 max-w-sm mt-1.5 font-sans leading-relaxed">
          Create an unencrypted or secure encrypted note from the sidebar, or select an existing one to begin journaling.
        </p>
      </div>
    );
  }

  const isLockedEncrypted = note.isEncrypted && !encryptionConfig.isUnlocked;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({ title: e.target.value });
    triggerAutoSaved();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNote({ content: e.target.value });
    triggerAutoSaved();
  };

  const handleTextSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setSelectedText(target.value.slice(target.selectionStart, target.selectionEnd).trim());
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase().replace(/#/g, '');
    if (tag && !note.tags.includes(tag)) {
      const updatedTags = [...note.tags, tag];
      onUpdateNote({ tags: updatedTags });
      setNewTag('');
      triggerAutoSaved();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = note.tags.filter(t => t !== tagToRemove);
    onUpdateNote({ tags: updatedTags });
    triggerAutoSaved();
  };

  const toggleEncryption = () => {
    if (!encryptionConfig.hasMasterPassword) {
      alert('Please set up a Master Password in Settings first.');
      return;
    }
    if (!encryptionConfig.isUnlocked) {
      alert('Please unlock your secure partition in Settings first.');
      return;
    }
    setEncryptionPulse(true);
    setTimeout(() => setEncryptionPulse(false), 1400);
    onUpdateNote({ isEncrypted: !note.isEncrypted });
    triggerAutoSaved();
  };

  const requestInlineAgent = (mode: 'rewrite' | 'summarize' | 'expand') => {
    if (!selectedText || !onInlineAgentRequest) return;
    onInlineAgentRequest(`${mode}: ${selectedText.slice(0, 160)}`);
  };

  // Word & Character count calculation
  const words = note.content ? note.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = note.content ? note.content.length : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-editor-bg relative animate-fadeIn" id="editor-workspace">
      {encryptionPulse && (
        <div className="absolute inset-x-6 top-20 z-20 rounded-lg border-2 border-text-main bg-[linear-gradient(110deg,#fff1f7,#f9a8d4,#fff7ed)] shadow-[5px_5px_0_var(--color-text-main)] px-4 py-3 flex items-center gap-3 animate-encryption-shift pointer-events-none">
          <Lock className="w-4 h-4 text-text-main animate-lock-pop" />
          <span className="text-xs font-extrabold text-text-main">
            {note.isEncrypted ? 'Returning this note to clear text mode...' : 'Sealing this note with local AES-GCM...'}
          </span>
        </div>
      )}
      {/* Editor Controls Bar */}
      <div className="p-4 border-b border-border bg-editor-bg/40 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* View Mode Switching Tab */}
          <div className="flex items-center bg-sidebar-bg/60 border border-border/50 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('write')}
              disabled={isLockedEncrypted}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${isLockedEncrypted ? 'opacity-30 cursor-not-allowed' : ''} ${viewMode === 'write' ? 'bg-editor-bg shadow-xs text-text-main' : 'text-text-muted hover:text-text-main'}`}
              title="Full Editor"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              disabled={isLockedEncrypted}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${isLockedEncrypted ? 'opacity-30 cursor-not-allowed' : ''} ${viewMode === 'preview' ? 'bg-editor-bg shadow-xs text-text-main' : 'text-text-muted hover:text-text-main'}`}
              title="Full Preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              disabled={isLockedEncrypted}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${isLockedEncrypted ? 'opacity-30 cursor-not-allowed' : ''} ${viewMode === 'split' ? 'bg-editor-bg shadow-xs text-text-main' : 'text-text-muted hover:text-text-main'}`}
              title="Split View"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>

          {/* Secure Cryptographic Lock Switcher */}
          {encryptionConfig.hasMasterPassword && (
            <button
              onClick={toggleEncryption}
               disabled={isLockedEncrypted}
              className={`px-3 py-1.5 rounded-lg border-2 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isLockedEncrypted ? 'bg-white/20 border-border/20 text-text-muted/40 cursor-not-allowed' : note.isEncrypted ? 'bg-green-50/70 border-text-main text-green-800 shadow-[3px_3px_0_var(--color-text-main)]' : 'bg-sidebar-bg border-text-main text-text-main hover:bg-white/70 shadow-[3px_3px_0_var(--color-text-main)]'}`}
              title={note.isEncrypted ? 'This document will be saved encrypted with AES-GCM' : 'Make this document encrypted'}
            >
              {note.isEncrypted ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-green-600" /> Secure Encryption On
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-accent" /> Encrypt Note
                </>
              )}
            </button>
          )}
        </div>

        {/* Action icons side */}
        <div className="flex items-center gap-3">
          {autoSaved && (
            <span className="text-[10px] text-text-muted/70 flex items-center gap-1 font-mono transition-opacity animate-pulse">
              <CheckCircle className="w-3 h-3 text-green-600" /> Saved
            </span>
          )}
          <button
            onClick={() => onDeleteNote(note.id)}
            className="p-2 text-text-muted hover:text-red-600 rounded-xl hover:bg-red-50/40 transition-colors cursor-pointer"
            title="Delete Document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Inputs Block */}
      {isLockedEncrypted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-bg-primary">
          <Lock className="w-12 h-12 text-accent mb-4 animate-pulse" />
          <h3 className="text-base font-bold text-text-main font-sans">This Document is Encrypted</h3>
          <p className="text-xs text-text-muted max-w-sm mt-1 leading-relaxed font-sans">
            Please navigate to the <strong>Settings & Security</strong> tab in the sidebar and insert your Master Password to unlock this document.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header metadata (Title & TagsInput) */}
          <div className="px-6 pt-5 pb-3 border-b border-border/30 space-y-3 bg-white/10">
            <input
              type="text"
              value={note.title}
              onChange={handleTitleChange}
              placeholder="Title your journal..."
              className="w-full text-lg font-bold text-text-main placeholder-text-muted/30 focus:outline-none focus:ring-0 font-sans border-none p-0 leading-tight bg-transparent"
            />

            {/* Tag List editor */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {note.tags && note.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 bg-sidebar-bg text-text-muted px-2.5 py-0.5 rounded-full text-xs font-semibold border border-border/50">
                  <Hash className="w-3 h-3 text-accent" />
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-accent hover:text-text-main focus:outline-none cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <form onSubmit={handleAddTag} className="inline-flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="pl-2.5 pr-6 py-0.5 border border-border bg-white/50 rounded-full text-xs focus:outline-none focus:border-accent w-24 font-sans text-text-main"
                  />
                  <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-accent hover:text-text-main cursor-pointer animate-pulse">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Interactive Workspace Split/Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* Split Panel Left: Editor */}
            {String(viewMode) !== 'preview' && (
              <div className={`flex-1 h-full relative ${String(viewMode) === 'split' ? 'border-r border-border/20' : ''}`}>
                {selectedText && (
                  <div className="absolute left-6 top-4 z-10 flex items-center gap-1.5 rounded-lg border-2 border-text-main bg-editor-bg p-1 shadow-[4px_4px_0_var(--color-text-main)] animate-fadeIn">
                    <button onClick={() => requestInlineAgent('rewrite')} className="inline-agent-button" title="Rewrite selection">
                      <Wand2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => requestInlineAgent('summarize')} className="inline-agent-button" title="Summarize selection">
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => requestInlineAgent('expand')} className="inline-agent-button" title="Expand selection">
                      <Expand className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <textarea
                  value={note.content}
                  onChange={handleContentChange}
                  onSelect={handleTextSelection}
                  placeholder="Insert your markdown text here..."
                  className="w-full h-full p-6 text-sm font-sans focus:outline-none resize-none bg-transparent text-text-main leading-relaxed placeholder-text-muted/30 border-none select-text"
                  spellCheck="false"
                />
              </div>
            )}

            {/* Split Panel Right: Compiled View */}
            {String(viewMode) !== 'write' && (
              <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent prose max-w-none text-text-main selection:bg-accent/20">
                {htmlContent ? (
                  <div 
                    className="markdown-preview text-sm leading-relaxed text-text-main space-y-4 font-sans"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                ) : (
                  <div className="italic text-text-muted/40 text-xs font-sans text-center py-12">
                    Markdown preview auto-renders here as you type...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sizing bottom status bar */}
          <div className="px-6 py-2 border-t border-border bg-sidebar-bg/20 flex justify-between items-center text-[10px] text-text-muted font-sans">
            <span className="flex items-center gap-1 font-medium">
              <FileText className="w-3 h-3 text-text-muted/40" /> {words} words • {chars} characters
            </span>
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-text-muted font-bold font-sans">
              <Calendar className="w-3 h-3 text-accent" /> Updated {new Date(note.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
