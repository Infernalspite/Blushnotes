var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var rateLimitMap = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW_MS = 6e4;
var RATE_LIMIT_MAX_REQUESTS = 20;
function isRateLimited(ip) {
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
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);
var VALID_PROVIDERS = ["openai", "anthropic", "groq", "gemini", "cohere", "mistral"];
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "1mb" }));
  app.use(import_express.default.urlencoded({ extended: true }));
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.groq.com https://generativelanguage.googleapis.com https://api.cohere.com https://api.mistral.ai; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.post("/api/ai-chat", async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before trying again."
      });
    }
    const provider = req.headers["x-provider"];
    const apiKey = req.headers["x-api-key"];
    const { model, messages, temperature = 0.7 } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({
        error: "Missing required headers: x-provider or x-api-key"
      });
    }
    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}`
      });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Missing or invalid parameters: messages must be a non-empty array"
      });
    }
    for (const msg of messages) {
      if (typeof msg.role !== "string" || typeof msg.content !== "string") {
        return res.status(400).json({
          error: 'Each message must have a "role" and "content" of type string'
        });
      }
    }
    const parsedTemp = Number(temperature);
    if (isNaN(parsedTemp) || parsedTemp < 0 || parsedTemp > 2) {
      return res.status(400).json({
        error: "Temperature must be a number between 0 and 2"
      });
    }
    try {
      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages,
            temperature: parsedTemp
          })
        });
        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || "OpenAI API request failed"
          });
        }
        return res.json({
          content: data.choices?.[0]?.message?.content || "",
          model: data.model
        });
      }
      if (provider === "anthropic") {
        const systemMessage = messages.find((m) => m.role === "system")?.content || "";
        const userAndAssistantMessages = messages.filter((m) => m.role !== "system").map((m) => ({
          role: m.role,
          content: m.content
        }));
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: model || "claude-3-5-sonnet-20241022",
            messages: userAndAssistantMessages,
            system: systemMessage,
            max_tokens: 4e3,
            temperature: parsedTemp
          })
        });
        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || "Anthropic API request failed"
          });
        }
        return res.json({
          content: data.content?.[0]?.text || "",
          model: data.model
        });
      }
      if (provider === "groq") {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || "llama-3.3-70b-versatile",
            messages,
            temperature: parsedTemp
          })
        });
        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || "Groq API request failed"
          });
        }
        return res.json({
          content: data.choices?.[0]?.message?.content || "",
          model: data.model
        });
      }
      if (provider === "gemini") {
        const systemMsg = messages.find((m) => m.role === "system")?.content || "";
        const nonSystemMessages = messages.filter((m) => m.role !== "system");
        const geminiContents = nonSystemMessages.map((m) => ({
          parts: [{ text: m.content }],
          role: m.role === "assistant" ? "model" : "user"
        }));
        const geminiBody = {
          contents: geminiContents,
          generationConfig: {
            temperature: parsedTemp
          }
        };
        if (systemMsg) {
          geminiBody.systemInstruction = { parts: [{ text: systemMsg }] };
        }
        const geminiModel = model || "gemini-1.5-flash";
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(geminiBody)
          }
        );
        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || "Gemini API request failed"
          });
        }
        return res.json({
          content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
          model: geminiModel
        });
      }
      if (provider === "cohere") {
        const cohereMessages = messages.map((m) => ({
          role: m.role,
          content: m.content
        }));
        const response = await fetch("https://api.cohere.com/v2/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || "command-r-plus",
            messages: cohereMessages,
            temperature: parsedTemp
          })
        });
        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || "Cohere API request failed"
          });
        }
        return res.json({
          content: data.message?.content?.[0]?.text || "",
          model: model || "command-r-plus"
        });
      }
      if (provider === "mistral") {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || "mistral-large-latest",
            messages,
            temperature: parsedTemp
          })
        });
        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || "Mistral API request failed"
          });
        }
        return res.json({
          content: data.choices?.[0]?.message?.content || "",
          model: data.model
        });
      }
      return res.status(400).json({
        error: `Unsupported provider: ${provider}`
      });
    } catch (e) {
      console.error("Proxy Error:", {
        message: e.message,
        provider,
        model
        // apiKey is intentionally omitted / redacted
      });
      return res.status(500).json({
        error: e.message || "Server proxy experienced an internal error."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in Development mode");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Static serving mounted in Production mode");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
