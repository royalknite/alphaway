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

const EXTRACTION_PROMPT = `TASK: EXACT VERBATIM MCQ EXTRACTION FROM PDF PAGE OR EXAM SCREENSHOT (NOT QUESTION GENERATION).
Inspect every attached page/screenshot image carefully from top to bottom. Every image is preceded by a marker like "=== PAGE N ===".
Extract EVERY visible multiple-choice question (MCQ) on these images in exact top-to-bottom source order.

STRICT EXTRACTION RULES:
1. EXACT TEXT & CLEANUP:
   - Copy ONLY questions visibly present in the image. Never invent, replace, paraphrase, translate, or skip questions.
   - Preserve exact numbers, units, percentages, ratios, fractions, equations, and symbols.
   - Ignore top mobile/exam UI chrome & watermarks: question timer (e.g. "1sec"), mark badges ("+1.0 -0.0"), warning/bookmark icons, page headers, website logos/watermarks, ads, footers, or Telegram links.
   - Strip option numbering prefixes ("1.", "2.", "3.", "4.", "A)", "B)", "C)", "D)") from extracted option strings so options contain clean choice text only.
   - CRITICAL: NEVER include the options inside the question "text" field, and NEVER include the question text inside "options". Keep question text and options strictly separated!

2. CLEAN HINDI DEVANAGARI UNICODE:
   - Write natural, properly joined Devanagari Hindi words with all matras (ि, ी, ु, ू, े, ै, ो, ौ, ं, ँ, ्) attached cleanly to their consonants.
   - Preserve exact spaces BETWEEN separate Hindi words (e.g. write "आकृति सन्निहित है" and "अनुमति है", NOT "आकृतिसन्निहित" or "अनुमतिहै") and NEVER split a single Hindi word with extra spaces (write "निम्नलिखित" NOT "नि म्नलि खि त", "त्रिभुजों" NOT "त्रि भु जों").

3. DETECT CORRECT ANSWER ACCURATELY (0-BASED INDEX: 0, 1, 2, 3, OR -1 IF UNMARKED):
   - GREEN TICK MARK (✅, ✔) OR GREEN HIGHLIGHTED OPTION BOX -> that option index is correctAnswerIndex!
   - IMPORTANT: Mobile exam screenshots often show a RED highlighted card / RED cross (❌) / RED retry icon (↺) for the user's wrong attempt. COMPLETELY IGNORE RED! Only GREEN (✓ / green box) or YELLOW highlight indicates the true correct answer.
   - Look for explicit answer keys like "Ans: B" or "उत्तर: C" if present.
   - If NO answer indicator is visible, set correctAnswerIndex to -1. NEVER guess.

4. DETECT TABLES (BOX / ROW / COLUMN - MEAN, MEDIAN, MODE, FREQUENCY DISTRIBUTION):
   - When a question includes a tabular box/row/column grid:
     * Set "figureType": "table"
     * Populate "tableData": { "title": "...", "headers": ["col1", "col2", ...], "rows": [["r1c1", "r1c2", ...], ...], "footer": "..." }.
     * Also provide "figureBox": [ymin, xmin, ymax, xmax] enclosing the table.

5. ISOLATE QUESTION DIAGRAM (figureBox) WITH ZERO TEXT LEAKAGE:
   - When a question has ANY visual diagram/figure — e.g. embedded figure, counting triangles, dice/cube net, mirror/water image prompt, bar/pie/line chart, composite DI, geometry figure, visual math formula, or photo:
     * Set appropriate "figureType" ("bar_chart", "pie_chart", "line_chart", "data_interpretation", "math_formula", "geometry", "reasoning_figure", or "image").
     * Provide "figureBox": [ymin, xmin, ymax, xmax] (integers 0 to 1000 relative to the image of "pageNumber").
     * CRITICAL ZERO-TEXT RULE FOR figureBox:
       - Start ymin STRICTLY BELOW the last line of the printed question text above the diagram (leave a tiny clean white margin above the top edge of the diagram — NEVER touch or clip any Hindi matras, parentheses, or descenders from the question text above!).
       - End ymax STRICTLY ABOVE any option boxes/numbers ("1.", "2.", "A)") below the diagram.
       - Include ONLY the diagram/chart itself (and axis labels/legend/A,B,C,D labels if inside the figure).
   - If a question has NO diagram/table/chart (text-only question), set "figureType": "none" and omit "figureBox".
   - SHARED DI CHARTS: If multiple questions on the same page share one DI chart/table above them, attach the same "figureType" and "figureBox" (and "tableData" if a table) to each dependent question.

6. VISUAL OPTION IMAGES (optionBoxes):
   - When options 1/2/3/4 (or A/B/C/D) themselves contain visual images, mirror/water reflections, shapes, dice, or rotated figures (like non-verbal reasoning options):
     * Set "optionBoxes" as an array of 4 [ymin, xmin, ymax, xmax] boxes in exact option order [0, 1, 2, 3] on "pageNumber".
     * TIGHT CROP: Each box in "optionBoxes" must tightly enclose ONLY the graphic/figure inside that option — EXCLUDE the option number ("1.", "2.", "3.", "4.") on the left and EXCLUDE UI icons (expand arrows ↗↙, green ✓, red ✕, red ↺) on the right!
     * Set "options" to ["Option A", "Option B", "Option C", "Option D"] (or clean short label if text accompanies the option graphic).
   - If options are normal text/numbers (e.g. "12", "11", "10", "14" or "केवल C"), set "optionBoxes" to [].

7. OUTPUT:
   - Return valid JSON matching the schema. Keep "pageNumber" accurate to the "=== PAGE N ===" marker.`;

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
