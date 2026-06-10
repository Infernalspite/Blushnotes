/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// --- Rate Limiter ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// Periodically clean up stale entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

// --- Valid Providers ---
const VALID_PROVIDERS = ['openai', 'anthropic', 'groq', 'gemini', 'cohere', 'mistral'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers with size limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // --- Security Headers Middleware ---
  app.use((_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' http://localhost:* http://127.0.0.1:* https://api.openai.com https://api.anthropic.com https://api.groq.com https://generativelanguage.googleapis.com https://api.cohere.com https://api.mistral.ai; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "frame-ancestors 'none'"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // AI API Proxy endpoint
  app.post('/api/ai-chat', async (req, res) => {
    // --- Rate Limiting ---
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.'
      });
    }

    const provider = req.headers['x-provider'] as string;
    const apiKey = req.headers['x-api-key'] as string;
    const { model, messages, temperature = 0.7 } = req.body;

    // --- Input Validation ---
    if (!provider || !apiKey) {
      return res.status(400).json({
        error: 'Missing required headers: x-provider or x-api-key'
      });
    }

    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      return res.status(400).json({
        error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid parameters: messages must be a non-empty array'
      });
    }

    for (const msg of messages) {
      if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
        return res.status(400).json({
          error: 'Each message must have a "role" and "content" of type string'
        });
      }
    }

    const parsedTemp = Number(temperature);
    if (isNaN(parsedTemp) || parsedTemp < 0 || parsedTemp > 2) {
      return res.status(400).json({
        error: 'Temperature must be a number between 0 and 2'
      });
    }

    try {
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages,
            temperature: parsedTemp
          })
        });

        const data = await response.json() as any;
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'OpenAI API request failed'
          });
        }
        return res.json({
          content: data.choices?.[0]?.message?.content || '',
          model: data.model
        });
      }

      if (provider === 'anthropic') {
        // Map messages roles if needed. Anthropic system messages should be in the 'system' property, not messages.
        // We will separate the first system message if it exists.
        const systemMessage = messages.find((m: any) => m.role === 'system')?.content || '';
        const userAndAssistantMessages = messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
          role: m.role,
          content: m.content
        }));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model || 'claude-3-5-sonnet-20241022',
            messages: userAndAssistantMessages,
            system: systemMessage,
            max_tokens: 4000,
            temperature: parsedTemp
          })
        });

        const data = await response.json() as any;
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Anthropic API request failed'
          });
        }
        return res.json({
          content: data.content?.[0]?.text || '',
          model: data.model
        });
      }

      if (provider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            messages,
            temperature: parsedTemp
          })
        });

        const data = await response.json() as any;
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Groq API request failed'
          });
        }
        return res.json({
          content: data.choices?.[0]?.message?.content || '',
          model: data.model
        });
      }

      if (provider === 'gemini') {
        const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
        const nonSystemMessages = messages.filter((m: any) => m.role !== 'system');

        const geminiContents = nonSystemMessages.map((m: any) => ({
          parts: [{ text: m.content }],
          role: m.role === 'assistant' ? 'model' : 'user'
        }));

        const geminiBody: any = {
          contents: geminiContents,
          generationConfig: {
            temperature: parsedTemp
          }
        };

        if (systemMsg) {
          geminiBody.systemInstruction = { parts: [{ text: systemMsg }] };
        }

        const geminiModel = model || 'gemini-1.5-flash';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(geminiBody)
          }
        );

        const data = await response.json() as any;
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Gemini API request failed'
          });
        }
        return res.json({
          content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          model: geminiModel
        });
      }

      if (provider === 'cohere') {
        const cohereMessages = messages.map((m: any) => ({
          role: m.role,
          content: m.content
        }));

        const response = await fetch('https://api.cohere.com/v2/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'command-r-plus',
            messages: cohereMessages,
            temperature: parsedTemp
          })
        });

        const data = await response.json() as any;
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Cohere API request failed'
          });
        }
        return res.json({
          content: data.message?.content?.[0]?.text || '',
          model: model || 'command-r-plus'
        });
      }

      if (provider === 'mistral') {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'mistral-large-latest',
            messages,
            temperature: parsedTemp
          })
        });

        const data = await response.json() as any;
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Mistral API request failed'
          });
        }
        return res.json({
          content: data.choices?.[0]?.message?.content || '',
          model: data.model
        });
      }

      return res.status(400).json({
        error: `Unsupported provider: ${provider}`
      });

    } catch (e: any) {
      // Sanitize error logging — never log API keys
      console.error('Proxy Error:', {
        message: e.message,
        provider,
        model,
        // apiKey is intentionally omitted / redacted
      });
      return res.status(500).json({
        error: e.message || 'Server proxy experienced an internal error.'
      });
    }
  });

  // Serve Vite in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in Development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static serving mounted in Production mode');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
