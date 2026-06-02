/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Check, AlertCircle, Sparkles, Plus, Key, RefreshCw, FileCode, CheckSquare, Square, CornerDownLeft } from 'lucide-react';
import { Note, ChatMessage, LLMProvider, APIKeys } from '../types';
import { PROVIDER_MODELS, askAIProxy, buildMessagesWithContext } from '../utils/ai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatProps {
  notes: Note[];
  apiKeys: APIKeys;
  onSaveNewNoteFromAI: (title: string, content: string) => void;
  onUpdateActiveNoteFromAI: (noteId: string, content: string) => void;
  activeNoteId: string | null;
}

export default function Chat({
  notes,
  apiKeys,
  onSaveNewNoteFromAI,
  onUpdateActiveNoteFromAI,
  activeNoteId
}: ChatProps) {
  const [provider, setProvider] = useState<LLMProvider>('openai');
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  
  // Note selection for Context
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isNoteSelectorOpen, setIsNoteSelectorOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select active note as context on load
  useEffect(() => {
    if (activeNoteId && notes.some(n => n.id === activeNoteId)) {
      setSelectedNoteIds(prev => prev.includes(activeNoteId) ? prev : [...prev, activeNoteId]);
    }
  }, [activeNoteId]);

  // Sync selected model with provider updates
  useEffect(() => {
    const models = PROVIDER_MODELS[provider];
    if (models && models.length > 0) {
      setSelectedModel(models[0].id);
    }
  }, [provider]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const activeKey = apiKeys[provider];

  const handleToggleNoteContext = (noteId: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId) 
        : [...prev, noteId]
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    if (!activeKey) {
      setErrorStatus(`Please configure an active API key for ${provider.toUpperCase()} under Settings.`);
      return;
    }

    setErrorStatus(null);
    const userText = inputMessage.trim();
    setInputMessage('');

    // Append user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Gather selected notes context (ensure they are decrypted and available to chat)
      const selectedNotes = notes.filter(n => selectedNoteIds.includes(n.id) && n.content);

      // Build system prompt with note content
      const apiPayloadMessages = buildMessagesWithContext(updatedMessages, selectedNotes);

      // Call Express server proxy
      const replyContent = await askAIProxy({
        provider,
        apiKey: activeKey,
        model: selectedModel,
        messages: apiPayloadMessages
      });

      // Append assistant reply
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: replyContent,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorStatus(err.message || 'API query failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyResponseToActiveNote = (text: string) => {
    if (!activeNoteId) return;
    onUpdateActiveNoteFromAI(activeNoteId, text);
  };

  const clearChat = () => {
    setMessages([]);
    setErrorStatus(null);
  };

  const handleCreateDocumentFromResponse = (text: string) => {
    const title = `AI Summary - ${new Date().toLocaleDateString()}`;
    onSaveNewNoteFromAI(title, text);
  };

  // Compile markdown response elegantly
  const renderResponseMarkdown = (text: string) => {
    try {
      const html = marked.parse(text);
      return { __html: DOMPurify.sanitize(typeof html === 'string' ? html : String(html)) };
    } catch {
      return { __html: DOMPurify.sanitize(text) };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-editor-bg relative font-sans animate-fadeIn" id="ai-chat-interface">
      {/* Parameter selections bar */}
      <div className="p-4 border-b border-border bg-editor-bg/40 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* AI Providers */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-text-muted font-sans font-semibold uppercase tracking-wider">AI Host</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
              className="px-2 py-1.5 border border-border text-text-main bg-editor-bg/60 rounded-xl focus:outline-none focus:border-accent font-sans"
            >
                  <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="gemini">Gemini</option>
              <option value="cohere">Cohere</option>
              <option value="mistral">Mistral</option>
            </select>
          </div>

          {/* AI Models */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-text-muted font-sans font-semibold uppercase tracking-wider">Choose Model</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-2 py-1.5 border border-border text-text-main bg-editor-bg/60 rounded-xl focus:outline-none focus:border-accent font-sans"
            >
              {PROVIDER_MODELS[provider].map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Connected notes controller count button */}
          <div className="flex flex-col gap-0.5 relative">
            <span className="text-[10px] text-text-muted font-sans font-semibold uppercase tracking-wider">Document Scope</span>
            <button
              onClick={() => setIsNoteSelectorOpen(!isNoteSelectorOpen)}
              className={`px-3 py-1.5 border rounded-xl font-sans font-semibold transition-all cursor-pointer text-left flex items-center gap-1 ${selectedNoteIds.length > 0 ? 'bg-accent border-accent text-white hover:opacity-90' : 'bg-editor-bg/60 border-border text-text-main hover:bg-sidebar-bg/40'}`}
            >
              <span>{selectedNoteIds.length} {selectedNoteIds.length === 1 ? 'file' : 'files'}</span>
            </button>
          </div>
        </div>

        {/* Clear chat command */}
        <button
          onClick={clearChat}
          className="text-xs font-semibold text-text-muted hover:text-text-main py-1.5 px-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-sidebar-bg/40 transition-colors cursor-pointer"
        >
          Clear Chat
        </button>
      </div>

      {/* Expandable note selection panel */}
      {isNoteSelectorOpen && (
        <div className="absolute top-[68px] left-4 right-4 z-20 border border-border bg-editor-bg rounded-2xl shadow-lg p-4 max-h-[250px] overflow-y-auto animate-fadeIn grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="col-span-full pb-2 border-b border-border/30 flex items-center justify-between">
            <span className="text-xs font-extrabold text-text-main">Choose context files for AI prompt query:</span>
            <button
              onClick={() => setIsNoteSelectorOpen(false)}
              className="text-accent hover:text-text-main text-xs font-bold cursor-pointer font-sans"
            >
              Done
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-text-muted/60 text-xs col-span-full text-center py-4">No documents available.</p>
          ) : (
            notes.map(note => {
              const isSelected = selectedNoteIds.includes(note.id);
              return (
                <div
                  key={note.id}
                  onClick={() => handleToggleNoteContext(note.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${isSelected ? 'bg-sidebar-bg/40 border-border hover:bg-sidebar-bg/60' : 'bg-editor-bg border-border/20 hover:border-border/60'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="truncate font-semibold text-text-main">{note.title || 'Untitled Note'}</span>
                  </div>
                  <div>
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-accent fill-white" />
                    ) : (
                      <Square className="w-4 h-4 text-border" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Messages feed viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-bg-primary/10 select-text selection:bg-accent/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-text-main text-sm">Query Your Local Documents</h3>
              <p className="text-xs text-text-muted leading-relaxed mt-1.5">
                Pick documents from your sidebar collections and secure an active key under settings to query, summarize, or extract items securely on device.
              </p>
            </div>
            {selectedNoteIds.length > 0 && (
              <div className="bg-sidebar-bg text-text-main px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5 font-bold border border-border/40 animate-fadeIn">
                <FileCode className="w-3.5 h-3.5 text-accent" /> Context Scope: {selectedNoteIds.length} connected files
              </div>
            )}
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start animate-fadeIn'}`}
            >
              {/* Sender Indicator */}
              <span className="text-[10px] font-bold text-text-muted/60 mb-1 font-sans">
                {msg.role === 'user' ? 'You' : 'Companion'}
              </span>

              {/* Message bubble */}
              <div
                className={`p-4 rounded-2xl text-xs space-y-1 block leading-relaxed ${msg.role === 'user' ? 'bg-accent text-white shadow-xs rounded-tr-none' : 'bg-editor-bg border border-border/50 text-text-main rounded-tl-none font-sans'}`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                ) : (
                  <div 
                    className="prose prose-sm max-w-none prose-pink text-text-main space-y-2 markdown-response"
                    dangerouslySetInnerHTML={renderResponseMarkdown(msg.content)}
                  />
                )}
              </div>

              {/* Helper Quick Controls for replies */}
              {msg.role === 'assistant' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCreateDocumentFromResponse(msg.content)}
                    className="text-[10px] font-bold text-accent hover:text-text-main flex items-center gap-1 cursor-pointer transition-colors"
                    title="Make research summary output its own custom local markdown file"
                  >
                    <Plus className="w-3 h-3" /> Save response as local Note
                  </button>
                  {activeNoteId && (
                    <button
                      onClick={() => handleApplyResponseToActiveNote(msg.content)}
                      className="text-[10px] font-bold text-text-main hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
                      title="Apply this AI response directly to the currently selected note"
                    >
                      <Check className="w-3 h-3" /> Apply to current note
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Streaming API Loader indicator */}
        {isLoading && (
          <div className="flex flex-col max-w-[85%] mr-auto items-start animate-pulse">
            <span className="text-[10px] font-semibold text-text-muted/60 mb-1 font-sans">Companion</span>
            <div className="p-3 bg-editor-bg rounded-2xl rounded-tl-none border border-border/50 flex items-center gap-2 shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
              <span className="text-xs text-text-muted font-bold font-sans">Consulting your files...</span>
            </div>
          </div>
        )}

        {/* Error indicators */}
        {errorStatus && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2 max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{errorStatus}</p>
              <p className="text-[10px] text-red-500">Configure key keys under Settings and check server connection.</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar bottom */}
      <div className="p-4 border-t border-border bg-editor-bg/40">
        {!activeKey ? (
          <div className="p-3 bg-red-50/40 rounded-xl border border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-2">
              <Key className="w-4 h-4 text-accent" />
              No secure personal API key saved for {provider.toUpperCase()}
            </span>
            <span className="text-[10px] text-text-muted/60 font-semibold font-sans">Insert Key in Settings Tab</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Chat with ${selectedNoteIds.length} select document(s)...`}
              className="w-full pl-4 pr-12 py-2.5 border border-border bg-editor-bg/70 rounded-xl text-xs focus:outline-none focus:border-accent text-text-main placeholder-text-muted/40 font-sans"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className={`absolute right-1.5 p-1.5 rounded-lg transition-all ${
                inputMessage.trim() && !isLoading
                  ? 'bg-accent text-white cursor-pointer hover:opacity-90'
                  : 'bg-white/20 text-text-muted/30 cursor-not-allowed border border-border/10'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
