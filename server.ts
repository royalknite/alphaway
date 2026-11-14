import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { EXTRACTION_PROMPT, parseExtractedModelJson } from './src/utils/extractionPrompt.ts';

interface PageInput {
  pageNumber: number;
  imageBase64: string;
  mimeType?: string;
}

interface ExtractRequestBody {
  pages?: PageInput[];
  provider?: 'gemini' | 'openai';
  userApiKey?: string;
}

const boxSchema = {
  type: Type.ARRAY,
  items: { type: Type.INTEGER },
  description: 'Normalized [ymin, xmin, ymax, xmax] coordinates (0 to 1000) on pageNumber.'
};

const extractResponseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.INTEGER },
          pageNumber: { type: Type.INTEGER },
          subject: { type: Type.STRING },
          text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          correctAnswerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          figureType: {
            type: Type.STRING,
            enum: [
              'none',
              'image',
              'table',
              'bar_chart',
              'pie_chart',
              'line_chart',
              'data_interpretation',
              'math_formula',
              'geometry',
              'reasoning_figure'
            ]
          },
          figureBox: boxSchema,
          optionBoxes: {
            type: Type.ARRAY,
            items: boxSchema
          },
          tableData: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              headers: { type: Type.ARRAY, items: { type: Type.STRING } },
              rows: {
                type: Type.ARRAY,
                items: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              footer: { type: Type.STRING }
            }
          }
        },
        required: ['number', 'pageNumber', 'text', 'options', 'correctAnswerIndex', 'figureType']
      }
    }
  },
  required: ['questions']
};



function extractCleanError(error: any): { statusCode: number; message: string; retryable: boolean; isDailyQuota: boolean } {
  let statusCode =
    typeof error?.status === 'number' && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
  let message = String(error?.message || 'PDF extraction के दौरान सर्वर त्रुटि हुई।');

  try {
    if (message.trim().startsWith('{')) {
      const parsed = JSON.parse(message);
      const inner = parsed?.error || parsed;
      if (typeof inner?.code === 'number') statusCode = inner.code;
      if (typeof inner?.message === 'string' && inner.message.trim()) {
        message = inner.message.trim();
      }
    }
  } catch {
    // keep raw string
  }

  const isDailyQuota =
    /free_tier_requests|GenerateRequestsPerDay|limit:\s*20|quota exceeded/i.test(message);

  const retryable =
    !isDailyQuota &&
    (statusCode === 429 ||
      statusCode === 500 ||
      statusCode === 502 ||
      statusCode === 503 ||
      statusCode === 504 ||
      /high demand|unavailable|overloaded|resource_exhausted|timeout|econnreset/i.test(message));

  // Never emit 502/503/504 directly to the proxy because nginx intercepts them with warmup.html
  const safeStatus =
    statusCode === 502 || statusCode === 503 || statusCode === 504
      ? 429
      : statusCode;

  return { statusCode: safeStatus, message, retryable, isDailyQuota };
}

async function extractWithGemini(
  pages: PageInput[],
  apiKey: string,
  modelsToTry: string[]
) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  for (const page of pages) {
    const cleanBase64 = page.imageBase64.includes(',')
      ? page.imageBase64.split(',')[1]
      : page.imageBase64;
    parts.push({ text: `=== PAGE ${page.pageNumber} ===` });
    parts.push({
      inlineData: {
        mimeType: page.mimeType || 'image/jpeg',
        data: cleanBase64
      }
    });
  }
  parts.push({ text: EXTRACTION_PROMPT });

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const config: Record<string, any> = {
          responseMimeType: 'application/json',
          responseSchema: extractResponseSchema
        };
        if (modelName === 'gemini-4-hydrogen') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config
        });

        const rawText = response.text || '';
        if (!rawText.trim()) {
          throw new Error('AI से खाली जवाब मिला। कृपया दोबारा प्रयास करें।');
        }
        return parseExtractedModelJson(rawText);
      } catch (err: any) {
        lastError = err;
        const info = extractCleanError(err);

        // If this model hit quota, 404, or high demand, fail over immediately to the next model
        if (info.isDailyQuota || info.statusCode === 429 || info.statusCode === 404) {
          console.warn(`[PDF Extract] Model ${modelName} failed (${info.statusCode}), trying next fallback if any...`);
          break;
        }
        if (!info.retryable || attempt === maxAttempts) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }

  throw lastError;
}

async function extractWithOpenAI(pages: PageInput[], apiKey: string) {
  const contentParts: any[] = [
    {
      type: 'text',
      text: `${EXTRACTION_PROMPT}\n\nReturn strictly valid JSON: {"questions":[{"number":1,"pageNumber":1,"subject":"","text":"","options":["","","",""],"correctAnswerIndex":-1,"explanation":"","figureType":"none|image|table|bar_chart|pie_chart|line_chart|data_interpretation|math_formula|geometry|reasoning_figure","figureBox":[0,0,0,0],"optionBoxes":[],"tableData":{"title":"","headers":[],"rows":[],"footer":""}}]}`
    }
  ];

  for (const page of pages) {
    const cleanBase64 = page.imageBase64.includes(',')
      ? page.imageBase64.split(',')[1]
      : page.imageBase64;
    const mime = page.mimeType || 'image/jpeg';
    contentParts.push({ type: 'text', text: `=== PAGE ${page.pageNumber} ===` });
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: `data:${mime};base64,${cleanBase64}`,
        detail: 'high'
      }
    });
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: contentParts }],
      response_format: { type: 'json_object' },
      max_tokens: 12000,
      temperature: 0.1
    })
  });

  const payload: any = await resp.json();
  if (!resp.ok) {
    throw new Error(payload?.error?.message || `OpenAI API error (${resp.status})`);
  }

  const rawText = payload?.choices?.[0]?.message?.content || '';
  if (!rawText.trim()) {
    throw new Error('OpenAI से खाली जवाब मिला।');
  }
  return parseExtractedModelJson(rawText);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim())
    });
  });

  app.post('/api/pdf/extract', async (req, res) => {
    try {
      const body = (req.body || {}) as ExtractRequestBody;
      const pages = Array.isArray(body.pages) ? body.pages : [];
      if (pages.length === 0) {
        return res.status(400).json({ error: 'PDF के पेज प्राप्त नहीं हुए।' });
      }

      const provider = body.provider === 'openai' ? 'openai' : 'gemini';

      if (provider === 'openai') {
        const openaiKey = (body.userApiKey || '').trim() || (process.env.OPENAI_API_KEY || '').trim();
        if (!openaiKey) {
          return res.status(400).json({
            error: 'OpenAI API Key उपलब्ध नहीं है। Settings में OpenAI API Key जोड़ें या Gemini चुनें।'
          });
        }
        const data = await extractWithOpenAI(pages, openaiKey);
        return res.json(data);
      }

      const cleanUserKey = (body.userApiKey || '').trim().replace(/^["']|["']$/g, '');
      const cleanServerKey = (process.env.GEMINI_API_KEY || '').trim();

      const candidates: Array<{ key: string; models: string[] }> = [];
      if (cleanUserKey) {
        candidates.push({
          key: cleanUserKey,
          models: ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-4-hydrogen']
        });
      }
      if (cleanServerKey && cleanServerKey !== cleanUserKey) {
        candidates.push({
          key: cleanServerKey,
          models: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']
        });
      }

      if (candidates.length === 0) {
        return res.status(400).json({
          error: 'Gemini API Key कॉन्फ़िगर नहीं है। AI Studio के Settings > Secrets में GEMINI_API_KEY सेट करें।'
        });
      }

      let lastErr: any = null;
      for (const candidate of candidates) {
        try {
          const data = await extractWithGemini(pages, candidate.key, candidate.models);
          return res.json(data);
        } catch (err: any) {
          lastErr = err;
          console.warn('[PDF Extract] Key candidate failed, checking fallback if available:', extractCleanError(err).message);
        }
      }
      throw lastErr;
    } catch (error: any) {
      console.error('[PDF Extract Error]:', error);
      const { statusCode, message, isDailyQuota } = extractCleanError(error);
      return res.status(statusCode).json({
        error: message,
        quotaExhausted: isDailyQuota || statusCode === 429
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlphaWay server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
