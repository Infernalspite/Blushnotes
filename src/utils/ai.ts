/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, ChatMessage, LLMProvider } from '../types';

// Let's define the popular models for each provider
export const PROVIDER_MODELS: Record<LLMProvider, { name: string; id: string }[]> = {
  ollama: [
    { name: 'Ollama: Llama 3.1', id: 'llama3.1' },
    { name: 'Ollama: Mistral', id: 'mistral' },
    { name: 'Ollama: Phi 3', id: 'phi3' }
  ],
  llamacpp: [
    { name: 'llama.cpp: Local Server', id: 'local-model' }
  ],
  gemini: [
    { name: '✦ Gemini 2.0 Flash (Free)', id: 'gemini-2.0-flash' },
    { name: '✦ Gemini 2.0 Flash Lite (Free)', id: 'gemini-2.0-flash-lite' },
    { name: 'Gemini 1.5 Pro', id: 'gemini-1.5-pro' }
  ],
  groq: [
    { name: '✦ Llama 3.3 70B (Free)', id: 'llama-3.3-70b-versatile' },
    { name: '✦ Mixtral 8x7B (Free)', id: 'mixtral-8x7b-32768' },
    { name: '✦ Llama 3.1 8B (Free)', id: 'llama-3.1-8b-instant' }
  ],
  cohere: [
    { name: '✦ Command R (Free)', id: 'command-r' },
    { name: 'Command R+', id: 'command-r-plus' }
  ],
  mistral: [
    { name: '✦ Mistral Small (Free)', id: 'mistral-small-latest' },
    { name: '✦ Open Mistral Nemo (Free)', id: 'open-mistral-nemo' },
    { name: 'Mistral Large', id: 'mistral-large-latest' }
  ],
  openai: [
    { name: 'GPT-4.1 Mini', id: 'gpt-4.1-mini' },
    { name: 'GPT-4.1', id: 'gpt-4.1' },
    { name: 'GPT-4o Mini', id: 'gpt-4o-mini' },
    { name: 'GPT-4o', id: 'gpt-4o' },
    { name: 'GPT-4 Turbo', id: 'gpt-4-turbo' },
    { name: 'GPT-3.5 Turbo', id: 'gpt-3.5-turbo' },
    { name: 'o1 Mini', id: 'o1-mini' }
  ],
  anthropic: [
    { name: 'Claude 3.5 Sonnet', id: 'claude-3-5-sonnet-20241022' },
    { name: 'Claude 3.5 Haiku', id: 'claude-3-5-haiku-20241022' }
  ],
};

interface CallAIProxyParams {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  temperature?: number;
  localEndpoint?: string;
}

export async function askAIProxy({
  provider,
  apiKey,
  model,
  messages,
  temperature = 0.4,
  localEndpoint
}: CallAIProxyParams): Promise<string> {
  try {
    if (provider === 'ollama') {
      const response = await fetch(`${localEndpoint || 'http://localhost:11434'}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: { temperature }
        })
      });

      const data = await response.json() as any;
      if (!response.ok) throw new Error(data.error || 'Ollama request failed.');
      return data.message?.content || data.response || '';
    }

    if (provider === 'llamacpp') {
      const response = await fetch(`${localEndpoint || 'http://localhost:8080'}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature })
      });

      const data = await response.json() as any;
      if (!response.ok) throw new Error(data.error?.message || 'llama.cpp request failed.');
      return data.choices?.[0]?.message?.content || '';
    }

    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-provider': provider,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      })
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.error || `${provider} API request failed.`);
    }

    return data.content || '';
  } catch (err: any) {
    console.error('API Error:', err);
    throw new Error(err.message || 'Could not communicate with the AI model. Check your API key, local endpoint, and connection.');
  }
}

// Generate the chat payload
export function buildMessagesWithContext(
  messages: ChatMessage[],
  selectedNotes: Note[],
  memoryNotes: Note[] = []
): { role: 'user' | 'assistant' | 'system'; content: string }[] {
  // Construct context from notes
  let contextSection = '';
  if (selectedNotes.length > 0) {
    contextSection = "\n\n=== CHAT DOCUMENTS CONTEXT ===\n";
    selectedNotes.forEach((note, index) => {
      contextSection += `\n[Document ${index + 1}] Title: ${note.title}\n`;
      contextSection += `Content:\n${note.content}\n`;
      contextSection += `=== End of Document ${index + 1} ===\n`;
    });
    contextSection += "\nUse the above document context to answer the user's question. Be accurate, clear, and refer directly to information present in these documents. If the user's prompt is not about the documents, you can address it generally while keeping the documents in mind.";
  }

  if (memoryNotes.length > 0) {
    contextSection += "\n\n=== OPTIONAL LOCAL MEMORY CONTEXT ===\n";
    memoryNotes.slice(0, 12).forEach((note, index) => {
      contextSection += `\n[Memory ${index + 1}] ${note.title}\n`;
      contextSection += `${note.content.slice(0, 1200)}\n`;
    });
    contextSection += "\nUse memories only when they are relevant, and never imply they were synced or uploaded.";
  }

  const systemPrompt = `You are a helpful, professional AI Note-Taking companion.
You are helping the user manage and query their personal markdown notes and documents.
Your response must be styled in standard Markdown format (use bolding, headers, lists, codeblocks, etc.) for beautiful rendering.
Keep your answers elegant, concise, and beautifully structured.${contextSection}`;

  const requestMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

  // Start with the system prompt
  requestMessages.push({
    role: 'system',
    content: systemPrompt
  });

  // Map user and assistant messages
  messages.forEach(msg => {
    requestMessages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    });
  });

  return requestMessages;
}
