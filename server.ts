import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Routing API
  app.post("/api/route-ai", async (req, res) => {
    const { prompt, model, provider, config } = req.body;
    const forgeKey = req.headers["x-forge-key"];

    if (forgeKey) {
      console.log(`Programmatic access detected via key: ${forgeKey}`);
      // In a real production app, you would verify this key against your database here.
    }

    try {
      if (provider === "gemini") {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const result = await ai.models.generateContent({
          model: model || "gemini-3-flash-preview",
          contents: prompt
        });
        return res.json({ response: result.text, provider: "gemini" });
      }

      if (provider === "openai") {
        if (!process.env.OPENAI_API_KEY) {
          return res.status(401).json({ error: "OpenAI API Key not configured" });
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: model || "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        });
        return res.json({ response: completion.choices[0].message.content, provider: "openai" });
      }

      if (provider === "anthropic") {
        if (!process.env.ANTHROPIC_API_KEY) {
          return res.status(401).json({ error: "Anthropic API Key not configured" });
        }
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await anthropic.messages.create({
          model: model || "claude-3-5-sonnet-20240620",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        // @ts-ignore
        return res.json({ response: msg.content[0].text, provider: "anthropic" });
      }

      res.status(400).json({ error: "Unsupported provider" });
    } catch (error: any) {
      console.error("AI Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
