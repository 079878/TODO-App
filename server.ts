import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GoogleGenAI,
  type Content,
  type GenerateContentResponse,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ALLOWED_MODELS = {
  general: 'gemini-4-hydrogen',
  fast: 'gemini-3.1-flash-lite',
} as const;

type ChatMode = keyof typeof ALLOWED_MODELS;

interface IncomingHistoryItem {
  role: 'user' | 'model';
  text: string;
}

interface ChatRequestBody {
  message?: string;
  history?: IncomingHistoryItem[];
  mode?: ChatMode;
  systemInstruction?: string;
  plannerContext?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSanitizedHistory(raw: IncomingHistoryItem[] | undefined): Content[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (item) =>
      item &&
      (item.role === 'user' || item.role === 'model') &&
      typeof item.text === 'string' &&
      item.text.trim().length > 0
  );

  // History must start with a 'user' turn and alternate user/model
  const firstUserIdx = valid.findIndex((item) => item.role === 'user');
  if (firstUserIdx === -1) return [];

  const sliced = valid.slice(firstUserIdx);
  const alternating: Content[] = [];
  for (const item of sliced) {
    const prev = alternating[alternating.length - 1];
    if (prev && prev.role === item.role) {
      // Merge consecutive turns of the same role to preserve strict alternation
      const prevText = prev.parts?.[0]?.text ?? '';
      prev.parts = [{ text: `${prevText}\n\n${item.text.trim()}` }];
    } else {
      alternating.push({
        role: item.role,
        parts: [{ text: item.text.trim() }],
      });
    }
  }

  // Ensure the last history item is 'model' if present, since a new user message follows
  if (
    alternating.length > 0 &&
    alternating[alternating.length - 1].role === 'user'
  ) {
    alternating.pop();
  }

  return alternating;
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage =
    err instanceof Error ? err.message : 'Unexpected Gemini API error.';
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('permission_denied') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('403')
  ) {
    return {
      status: 403,
      message:
        'Gemini API key is missing or invalid. Please check your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return {
      status: 429,
      message:
        'Rate limit or quota reached for this model. Try switching to Fast mode or check your quota in Settings > Secrets.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message:
        'The requested Gemini model was not found or is unavailable for this key.',
    };
  }
  return {
    status: 500,
    message: rawMessage,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/chat', async (req: Request, res: Response) => {
    const body = (req.body || {}) as ChatRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const mode: ChatMode = body.mode === 'fast' ? 'fast' : 'general';
    const model = ALLOWED_MODELS[mode];
    const history = buildSanitizedHistory(body.history);

    const roleInstruction =
      typeof body.systemInstruction === 'string' &&
      body.systemInstruction.trim().length > 0
        ? body.systemInstruction.trim()
        : 'You are Dayflow Assistant, a calm, concise daily planning partner who helps structure priorities and time blocks clearly.';

    const contextBlock =
      typeof body.plannerContext === 'string' &&
      body.plannerContext.trim().length > 0
        ? `\n\nActive Dayflow Workspace Snapshot:\n${body.plannerContext.trim()}`
        : '';

    const fullSystemInstruction = `${roleInstruction}\nKeep responses structured, practical, and concise.${contextBlock}`;

    try {
      const chat = ai.chats.create({
        model,
        history,
        config: {
          systemInstruction: fullSystemInstruction,
        },
      });

      const streamResponse = await chat.sendMessageStream({
        message,
      });

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      for await (const chunk of streamResponse) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done', model })}\n\n`);
      res.end();
    } catch (err) {
      const mapped = mapGeminiError(err);
      if (!res.headersSent) {
        res.status(mapped.status).json({ error: mapped.message });
      } else {
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: mapped.message })}\n\n`
        );
        res.end();
      }
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dayflow server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Dayflow server:', err);
  process.exit(1);
});
