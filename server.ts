import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

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

const EXTRACTION_PROMPT = `TASK: EXACT VERBATIM PDF MCQ EXTRACTION (NOT QUESTION GENERATION).
Inspect every attached page image carefully from top to bottom. Every page image is preceded by a marker like "=== PAGE N ===".
Extract EVERY visible multiple-choice question (MCQ) on these pages in exact top-to-bottom source order.

STRICT EXTRACTION RULES:
1. EXACT TEXT & SYMBOLS:
   - Copy ONLY questions visibly present on the pages. Never invent, replace, paraphrase, translate, or skip questions.
   - Preserve exact numbers, units, percentages, ratios, fractions, equations, symbols, and A/B/C/D options.
   - Preserve exact question numbering as printed (even if numbers repeat across different sections or pages, e.g. Q.49, Q.50 appearing in two sections).
   - Exclude page headers, website/app watermarks, dates, ads, footers, "Attempted %", or Telegram links.

2. CLEAN HINDI DEVANAGARI UNICODE:
   - Write natural, properly joined Devanagari Hindi words with all matras (ि, ी, ु, ू, े, ै, ो, ौ, ं, ँ, ्) attached cleanly to their consonants.
   - NEVER split Hindi words or matras with extra spaces (write "निम्नलिखित" NOT "नि म्नलि खि त", "ज्ञात कीजिए" NOT "ज्ञा त की जि ए", "अनुपात" NOT "अनुपानुपात", "पुस्तक" NOT "पुस् पुतक").
   - NEVER duplicate syllables.

3. DETECT CORRECT ANSWER ACCURATELY (0-BASED INDEX: A=0, B=1, C=2, D=3, OR -1 IF UNMARKED):
   - Look closely for a GREEN TICK MARK (✅, ✔, green checkmark icon) next to an option -> that option index is correctAnswerIndex. Ignore RED CROSS (❌) marks!
   - Look closely for a YELLOW HIGHLIGHT / shaded colored option box -> that highlighted option index is correctAnswerIndex.
   - Look for explicit answer keys like "Ans: B" or "उत्तर: C" attached to the question.
   - If NO answer indicator is visible for a question, set correctAnswerIndex to -1. NEVER guess.

4. DETECT TABLES (BOX / ROW / COLUMN - MEAN, MEDIAN, MODE, FREQUENCY DISTRIBUTION):
   - When a question includes a tabular box/row/column grid (such as वर्ग अंतराल / बारंबारता / Mean / Median / Mode / Data Table):
     * Set "figureType": "table"
     * Populate "tableData": { "title": "...", "headers": ["col1", "col2", ...], "rows": [["r1c1", "r1c2", ...], ...], "footer": "..." } with exact cell values.
     * Also provide "figureBox": [ymin, xmin, ymax, xmax] enclosing the table as backup.

5. DETECT ALL FIGURES, CHARTS, DIAGRAMS, IMAGES & VISUAL FORMULAS:
   - When a question has ANY visual figure — including:
     * Bar Chart / Multi-Bar Chart ("bar_chart")
     * Pie Chart ("pie_chart")
     * Line Graph ("line_chart")
     * Composite Data Interpretation e.g. Pie + Line/Table ("data_interpretation")
     * Complex Fraction / Surd / Algebraic Expression Formula Box ("math_formula")
     * Geometry figure ("geometry")
     * Reasoning diagram / Mirror / Water / Dice / Paper Cut / Venn / Series / Counting Triangles ("reasoning_figure")
     * General photo or embedded illustration ("image")
   - Provide "figureType" matching the visual type AND "figureBox": [ymin, xmin, ymax, xmax] (integers 0 to 1000 normalized to the image of "pageNumber").
   - IMPORTANT FOR figureBox: The box must completely enclose the entire figure, chart, axis labels, numeric values on bars/slices/points, legend, and figure title — with slight breathing room so nothing is clipped, while excluding unrelated question text/options below it.
   - SHARED DI / PASSAGE CHARTS: If 2 or more questions on the same page refer to ONE shared chart/graph/pie/table shown above them (e.g. "निर्देश (Q.49-52): निम्नलिखित ग्राफ/पाई-चार्ट का अध्ययन करें..."), attach the SAME "figureType" and "figureBox" (and "tableData" if a table) to EACH of those dependent questions so every question displays the chart/table when taken in the test!

6. VISUAL OPTION IMAGES (optionBoxes):
   - ONLY if the options A, B, C, D themselves are pictures/diagrams/shapes (instead of plain text/numbers), set "optionBoxes" as an array of 4 [ymin, xmin, ymax, xmax] boxes in order [A, B, C, D] on "pageNumber".
   - If options are normal text/numbers, leave "optionBoxes" as [].

7. OUTPUT:
   - Return valid JSON matching the schema. Keep "pageNumber" accurate to the "=== PAGE N ===" label above the image where the question appears.`;

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

function parseModelJson(raw: string): { questions: any[] } {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return {
    questions: Array.isArray(parsed?.questions) ? parsed.questions : []
  };
}

function extractCleanError(error: any): { statusCode: number; message: string; retryable: boolean } {
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

  const retryable =
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    /high demand|unavailable|overloaded|resource_exhausted|timeout|econnreset/i.test(message);

  // Never emit 502/503/504 directly to the proxy because nginx intercepts them with warmup.html
  const safeStatus =
    statusCode === 502 || statusCode === 503 || statusCode === 504
      ? 429
      : statusCode;

  return { statusCode: safeStatus, message, retryable };
}

async function extractWithGemini(pages: PageInput[], apiKey: string) {
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

  const maxAttempts = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: extractResponseSchema
        }
      });

      const rawText = response.text || '';
      if (!rawText.trim()) {
        throw new Error('AI से खाली जवाब मिला। कृपया दोबारा प्रयास करें।');
      }
      return parseModelJson(rawText);
    } catch (err: any) {
      lastError = err;
      const info = extractCleanError(err);
      if (!info.retryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
  return parseModelJson(rawText);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

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

      const geminiKey = (process.env.GEMINI_API_KEY || '').trim() || (body.userApiKey || '').trim();
      if (!geminiKey) {
        return res.status(400).json({
          error: 'Gemini API Key कॉन्फ़िगर नहीं है। AI Studio के Settings > Secrets में GEMINI_API_KEY सेट करें।'
        });
      }

      const data = await extractWithGemini(pages, geminiKey);
      return res.json(data);
    } catch (error: any) {
      console.error('[PDF Extract Error]:', error);
      const { statusCode, message } = extractCleanError(error);
      return res.status(statusCode).json({ error: message });
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
