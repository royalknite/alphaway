import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Question } from '../types';
import { normalizeHindiText } from './hindiNormalizer';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface RenderedPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  aiImageBase64: string;
}

interface RawExtractedQuestion {
  number?: number;
  pageNumber?: number;
  subject?: string;
  text?: string;
  options?: string[];
  correctAnswerIndex?: number;
  explanation?: string;
  figureType?: string;
  figureBox?: number[];
  optionBoxes?: number[][];
  tableData?: {
    title?: string;
    headers?: string[];
    rows?: string[][];
    footer?: string;
  };
}

export interface PdfExtractionOptions {
  provider?: 'gemini' | 'openai';
  userApiKey?: string;
  onProgress?: (status: string) => void;
}

export interface PdfExtractionResult {
  questions: Question[];
  totalPages: number;
}

function isValidBox(box: unknown): box is [number, number, number, number] {
  if (!Array.isArray(box) || box.length !== 4) return false;
  const nums = box.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return false;
  const [ymin, xmin, ymax, xmax] = nums;
  return ymin >= 0 && xmin >= 0 && ymax <= 1000 && xmax <= 1000 && ymax - ymin >= 12 && xmax - xmin >= 12;
}

function cleanCroppedFigureCanvas(cropCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return cropCanvas;

  const w = cropCanvas.width;
  const h = cropCanvas.height;
  if (w < 20 || h < 20) return cropCanvas;

  const imgData = ctx.getImageData(0, 0, w, h).data;

  const analyzeRow = (y: number, threshold = 235) => {
    let nonWhite = 0;
    let colorful = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      if (r < threshold || g < threshold || b < threshold) {
        nonWhite++;
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        if (maxC - minC > 35) colorful++;
      }
    }
    return { nonWhite, colorful };
  };

  let topCut = 0;
  let bottomCut = h;

  // Guard 1: If stray clipped text/descenders touch the very top edge (y=0..3)
  // OR a thin dark grayscale text band sits in the top 20% followed by a clean blank horizontal gap,
  // slice cleanly inside that blank gap so the diagram has zero leaked text.
  const topScanLimit = Math.min(Math.floor(h * 0.24), 70);
  const topRows = Array.from({ length: topScanLimit }, (_, y) => analyzeRow(y, 222));
  const touchesTopEdge =
    topScanLimit > 4 && (topRows[0].nonWhite > 0 || topRows[1].nonWhite > 0 || topRows[2].nonWhite > 0);

  const findBlankGapAfterBand = (
    rows: Array<{ nonWhite: number; colorful: number }>,
    allowUncutThinGrayBand: boolean
  ): number | null => {
    let sawInk = false;
    let inkStart = -1;
    let totalColorful = 0;
    let totalInk = 0;
    let blankRun = 0;

    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      if (row.nonWhite > 0) {
        if (!sawInk) inkStart = y;
        sawInk = true;
        totalInk += row.nonWhite;
        totalColorful += row.colorful;
        blankRun = 0;
      } else if (sawInk) {
        blankRun++;
        if (blankRun >= 4) {
          const bandHeight = y - blankRun - inkStart + 1;
          const isDarkGrayBand = totalInk > 0 && totalColorful / totalInk < 0.15;
          const hasMainDiagramBelow = h - y >= h * 0.55;
          if (hasMainDiagramBelow && (touchesTopEdge || (allowUncutThinGrayBand && isDarkGrayBand && bandHeight <= 28))) {
            return y - 1;
          }
          return null;
        }
      }
    }
    return null;
  };

  const detectedTopCut = findBlankGapAfterBand(topRows, true);
  if (detectedTopCut !== null && detectedTopCut > 0 && detectedTopCut < h * 0.3) {
    topCut = detectedTopCut;
  }

  // Guard 2: Bottom edge stray clipped text guard
  const bottomScanLimit = Math.min(Math.floor(h * 0.18), 55);
  const bottomRows = Array.from({ length: bottomScanLimit }, (_, offset) => analyzeRow(h - 1 - offset, 222));
  const touchesBottomEdge =
    bottomScanLimit > 4 &&
    (bottomRows[0].nonWhite > 0 || bottomRows[1].nonWhite > 0 || bottomRows[2].nonWhite > 0);
  if (touchesBottomEdge) {
    let sawInk = false;
    let blankRun = 0;
    for (let offset = 0; offset < bottomRows.length; offset++) {
      if (bottomRows[offset].nonWhite > 0) {
        sawInk = true;
        blankRun = 0;
      } else if (sawInk) {
        blankRun++;
        if (blankRun >= 4 && h - offset >= h * 0.55) {
          bottomCut = h - offset;
          break;
        }
      }
    }
  }

  // Trim excess outer whitespace inside [topCut, bottomCut) and add neat uniform 8px margin
  let minY = topCut;
  while (minY < bottomCut - 1 && analyzeRow(minY).nonWhite === 0) minY++;
  let maxY = bottomCut - 1;
  while (maxY > minY && analyzeRow(maxY).nonWhite === 0) maxY--;

  let minX = w - 1;
  let maxX = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (imgData[idx] < 238 || imgData[idx + 1] < 238 || imgData[idx + 2] < 238) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return cropCanvas;

  const pad = 8;
  const trimmedW = maxX - minX + 1 + pad * 2;
  const trimmedH = maxY - minY + 1 + pad * 2;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = trimmedW;
  outCanvas.height = trimmedH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return cropCanvas;

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, trimmedW, trimmedH);
  outCtx.drawImage(cropCanvas, minX, minY, maxX - minX + 1, maxY - minY + 1, pad, pad, maxX - minX + 1, maxY - minY + 1);
  return outCanvas;
}

function cropBoxFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  box: unknown,
  paddingNorm = 2
): string | undefined {
  if (!isValidBox(box)) return undefined;

  const [rawYMin, rawXMin, rawYMax, rawXMax] = box.map(Number);
  const ymin = Math.max(0, rawYMin - paddingNorm);
  const xmin = Math.max(0, rawXMin - paddingNorm);
  const ymax = Math.min(1000, rawYMax + paddingNorm);
  const xmax = Math.min(1000, rawXMax + paddingNorm);

  const sx = Math.floor((xmin / 1000) * sourceCanvas.width);
  const sy = Math.floor((ymin / 1000) * sourceCanvas.height);
  const sw = Math.max(1, Math.ceil(((xmax - xmin) / 1000) * sourceCanvas.width));
  const sh = Math.max(1, Math.ceil(((ymax - ymin) / 1000) * sourceCanvas.height));

  if (sw < 10 || sh < 10) return undefined;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = sw;
  cropCanvas.height = sh;
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const cleanedCanvas = cleanCroppedFigureCanvas(cropCanvas);
  try {
    return cleanedCanvas.toDataURL('image/png');
  } finally {
    if (cleanedCanvas !== cropCanvas) {
      cleanedCanvas.width = 0;
      cleanedCanvas.height = 0;
    }
    cropCanvas.width = 0;
    cropCanvas.height = 0;
  }
}

function createCompactAiImage(sourceCanvas: HTMLCanvasElement): string {
  const maxAiDim = 1280;
  const srcMax = Math.max(sourceCanvas.width, sourceCanvas.height) || maxAiDim;
  if (srcMax <= maxAiDim) {
    return sourceCanvas.toDataURL('image/jpeg', 0.82);
  }

  const ratio = maxAiDim / srcMax;
  const w = Math.max(1, Math.round(sourceCanvas.width * ratio));
  const h = Math.max(1, Math.round(sourceCanvas.height * ratio));
  const aiCanvas = document.createElement('canvas');
  aiCanvas.width = w;
  aiCanvas.height = h;
  const ctx = aiCanvas.getContext('2d');
  if (!ctx) {
    return sourceCanvas.toDataURL('image/jpeg', 0.8);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  try {
    return aiCanvas.toDataURL('image/jpeg', 0.82);
  } finally {
    aiCanvas.width = 0;
    aiCanvas.height = 0;
  }
}

function mapFigureType(rawType?: string): Question['figureType'] | undefined {
  switch (rawType) {
    case 'table':
      return 'table';
    case 'bar_chart':
      return 'bar_chart';
    case 'pie_chart':
      return 'pie_chart';
    case 'line_chart':
      return 'line_chart';
    case 'data_interpretation':
      return 'data_interpretation';
    case 'math_formula':
      return 'math_formula';
    case 'image':
    case 'geometry':
    case 'reasoning_figure':
      return 'image';
    default:
      return undefined;
  }
}

async function renderPdfPages(
  file: File,
  onProgress?: (status: string) => void
): Promise<RenderedPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  if (totalPages === 0) {
    throw new Error('PDF में कोई पेज नहीं मिला।');
  }

  const renderedPages: RenderedPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(`PDF के पेज रेंडर हो रहे हैं (${pageNum}/${totalPages})...`);
    const page = await pdfDoc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const maxDimension = Math.max(baseViewport.width, baseViewport.height) || 1000;
    const scale = Math.min(2.0, Math.max(1.4, 1800 / maxDimension));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(`पेज ${pageNum} रेंडर करने के लिए Canvas context नहीं मिला।`);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      background: '#ffffff'
    }).promise;

    const aiImageBase64 = createCompactAiImage(canvas);
    renderedPages.push({
      pageNumber: pageNum,
      canvas,
      aiImageBase64
    });
  }

  return renderedPages;
}

async function diagnoseConnectionError(originalError: unknown): Promise<Error> {
  const rawMsg = originalError instanceof Error ? originalError.message : String(originalError);
  try {
    const probe = await fetch('/api/health', {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual'
    });
    if (probe.type === 'opaqueredirect' || probe.status === 302 || probe.status === 401 || probe.status === 403) {
      return new Error(
        'आपका प्रीव्यू सेशन समाप्त (Expire) हो गया है। कृपया पेज को Reload/Refresh करें और फिर PDF अपलोड करें।'
      );
    }
    const contentType = probe.headers.get('content-type') || '';
    if (!probe.ok || !contentType.includes('application/json')) {
      return new Error(
        'बैकएंड PDF सर्वर उपलब्ध नहीं है (यदि आप ऑफ़लाइन या Android APK चला रहे हैं तो PDF AI सर्वर कनेक्शन आवश्यक है)।'
      );
    }
    return new Error(
      `PDF प्रोसेसिंग के दौरान कनेक्शन टूट गया (${rawMsg})। कृपया पेज Reload करके दोबारा प्रयास करें।`
    );
  } catch {
    return new Error(
      `सर्वर से संपर्क नहीं हो पाया (${rawMsg})। कृपया पेज Reload करें और इंटरनेट कनेक्शन जाँचें।`
    );
  }
}

async function callExtractApi(
  page: RenderedPage,
  provider: 'gemini' | 'openai',
  userApiKey?: string,
  onProgress?: (status: string) => void
): Promise<RawExtractedQuestion[]> {
  const maxAttempts = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          userApiKey: userApiKey?.trim() || undefined,
          pages: [
            {
              pageNumber: page.pageNumber,
              imageBase64: page.aiImageBase64,
              mimeType: 'image/jpeg'
            }
          ]
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (response.status === 404 || response.status === 200) {
          throw new Error(
            'PDF Extraction API (/api/pdf/extract) उपलब्ध नहीं मिला। कृपया पेज को Reload करें।'
          );
        }
        throw new Error(`सर्वर से अमान्य जवाब मिला (HTTP ${response.status})। कृपया दोबारा प्रयास करें।`);
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(payload?.error || `PDF extraction error (${response.status})`) as Error & {
          status?: number;
        };
        err.status = response.status;
        if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
          lastError = err;
          onProgress?.(`पेज ${page.pageNumber} पर AI व्यस्त है, पुनः प्रयास (${attempt}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, attempt * 1500));
          continue;
        }
        throw err;
      }

      return Array.isArray(payload?.questions) ? payload.questions : [];
    } catch (err: any) {
      lastError = err;
      const isNetworkErr =
        err instanceof TypeError ||
        /failed to fetch|networkerror|load failed|network request failed/i.test(String(err?.message || ''));

      if (isNetworkErr) {
        if (attempt < maxAttempts) {
          onProgress?.(`पेज ${page.pageNumber} पुनः कनेक्ट हो रहा है (${attempt}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, attempt * 1200));
          continue;
        }
        throw await diagnoseConnectionError(err);
      }
      throw err;
    }
  }

  throw lastError || new Error('PDF extraction असफल रहा।');
}

function cleanOptionPrefix(text: string): string {
  return text.replace(/^(?:[A-Da-d]|[1-4])[\.)\]:\-]\s+/, '').trim();
}

function postProcessQuestions(
  rawQuestions: RawExtractedQuestion[],
  pageCanvasMap: Map<number, HTMLCanvasElement>,
  fallbackPageNumber: number
): Question[] {
  const timestamp = Date.now();
  const questions: Question[] = [];

  rawQuestions.forEach((raw, idx) => {
    const text = normalizeHindiText(String(raw.text || '')).trim();
    const rawOptions = Array.isArray(raw.options) ? raw.options : [];
    const options = rawOptions
      .map((opt) => cleanOptionPrefix(normalizeHindiText(String(opt ?? '')).trim()))
      .filter((opt, optIdx) => opt.length > 0 || optIdx < 4);

    if (!text && options.length < 2) return;
    if (options.length < 2) return;

    const pageNum =
      Number.isInteger(raw.pageNumber) && pageCanvasMap.has(Number(raw.pageNumber))
        ? Number(raw.pageNumber)
        : fallbackPageNumber;
    const canvas = pageCanvasMap.get(pageNum);

    const explanation = normalizeHindiText(String(raw.explanation || '')).trim();
    const subject = normalizeHindiText(String(raw.subject || '')).trim() || undefined;
    const correctAnswerIndex =
      typeof raw.correctAnswerIndex === 'number' &&
      Number.isInteger(raw.correctAnswerIndex) &&
      raw.correctAnswerIndex >= 0 &&
      raw.correctAnswerIndex < options.length
        ? raw.correctAnswerIndex
        : -1;

    let figureType = mapFigureType(raw.figureType);
    let figureData: any = undefined;
    let imageUrl: string | undefined = undefined;

    // 1. Handle structured box/row/column tables (Mean, Median, Mode, Frequency Distribution)
    if (
      figureType === 'table' &&
      raw.tableData &&
      Array.isArray(raw.tableData.rows) &&
      raw.tableData.rows.length > 0
    ) {
      figureData = {
        title: raw.tableData.title ? normalizeHindiText(String(raw.tableData.title)).trim() : undefined,
        headers: Array.isArray(raw.tableData.headers)
          ? raw.tableData.headers.map((h) => normalizeHindiText(String(h)).trim())
          : undefined,
        rows: raw.tableData.rows.map((row) =>
          Array.isArray(row) ? row.map((cell) => normalizeHindiText(String(cell)).trim()) : []
        ),
        footer: raw.tableData.footer ? normalizeHindiText(String(raw.tableData.footer)).trim() : undefined
      };
    } else if (raw.figureType && raw.figureType !== 'none' && canvas) {
      // 2. Crop exact visual figure / chart / diagram / math formula / fallback table directly from crisp PDF page
      const isChart =
        raw.figureType === 'bar_chart' ||
        raw.figureType === 'pie_chart' ||
        raw.figureType === 'line_chart' ||
        raw.figureType === 'data_interpretation';
      const cropped = cropBoxFromCanvas(canvas, raw.figureBox, isChart ? 6 : 2);
      if (cropped) {
        imageUrl = cropped;
      } else if (figureType !== 'table') {
        figureType = undefined;
      }
    }

    // 3. Fallback auto-table detection if inline pipe table survived in text
    if (!figureType && !imageUrl && (text.includes('|') || text.includes('बारंबारता'))) {
      const lines = text.split('\n');
      const tableLines = lines.filter((l) => l.includes('|'));
      if (tableLines.length >= 2) {
        const parsedRows = tableLines
          .map((l) => l.split('|').map((c) => c.trim()).filter(Boolean))
          .filter((r) => r.length >= 2);
        if (parsedRows.length >= 2) {
          figureType = 'table';
          figureData = {
            headers: parsedRows[0],
            rows: parsedRows.slice(1)
          };
        }
      }
    }

    // 4. Crop visual option images if options themselves are figures/diagrams
    let optionImages: (string | null)[] | undefined = undefined;
    if (canvas && Array.isArray(raw.optionBoxes) && raw.optionBoxes.length >= 2) {
      const croppedOpts = options.map((_, optIdx) => {
        const box = raw.optionBoxes?.[optIdx];
        return cropBoxFromCanvas(canvas, box, 2) || null;
      });
      if (croppedOpts.some((img) => Boolean(img))) {
        optionImages = croppedOpts;
      }
    }

    questions.push({
      id: `pdf_${timestamp}_${pageNum}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      number:
        Number.isFinite(Number(raw.number)) && Number(raw.number) > 0
          ? Number(raw.number)
          : questions.length + 1,
      text: text || `Question ${questions.length + 1}`,
      options,
      correctAnswerIndex,
      explanation,
      subject,
      figureType,
      figureData,
      imageUrl,
      optionImages
    });
  });

  return questions;
}

export async function extractQuestionsFromPdf(
  file: File,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  const provider = options.provider === 'openai' ? 'openai' : 'gemini';
  const renderedPages = await renderPdfPages(file, options.onProgress);
  const pageCanvasMap = new Map<number, HTMLCanvasElement>(
    renderedPages.map((p) => [p.pageNumber, p.canvas])
  );

  const allQuestions: Question[] = [];
  const totalPages = renderedPages.length;

  try {
    for (let i = 0; i < totalPages; i++) {
      const page = renderedPages[i];
      options.onProgress?.(
        `AI से पेज ${page.pageNumber} / ${totalPages} के प्रश्न निकाले जा रहे हैं... (${allQuestions.length} प्रश्न मिले)`
      );

      const rawQuestions = await callExtractApi(
        page,
        provider,
        options.userApiKey,
        options.onProgress
      );

      const processed = postProcessQuestions(rawQuestions, pageCanvasMap, page.pageNumber);
      allQuestions.push(...processed);
    }
  } finally {
    for (const page of renderedPages) {
      page.canvas.width = 0;
      page.canvas.height = 0;
    }
  }

  return {
    questions: allQuestions,
    totalPages
  };
}

async function renderImageFiles(
  files: File[],
  onProgress?: (status: string) => void
): Promise<RenderedPage[]> {
  const renderedPages: RenderedPage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(`इमेज लोड हो रही है (${i + 1}/${files.length}): ${file.name}`);

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`इमेज "${file.name}" पढ़ी नहीं जा सकी।`));
        image.src = objectUrl;
      });

      const srcW = img.naturalWidth || img.width || 1000;
      const srcH = img.naturalHeight || img.height || 1000;
      const maxDim = Math.max(srcW, srcH);
      const scale = maxDim > 1800 ? 1800 / maxDim : 1;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(srcW * scale));
      canvas.height = Math.max(1, Math.round(srcH * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context उपलब्ध नहीं है।');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const aiImageBase64 = createCompactAiImage(canvas);
      renderedPages.push({
        pageNumber: i + 1,
        canvas,
        aiImageBase64
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  return renderedPages;
}

export async function extractQuestionsFromImages(
  files: File[],
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  if (!files.length) {
    throw new Error('कृपया कम से कम एक इमेज या स्क्रीनशॉट चुनें।');
  }

  const provider = options.provider === 'openai' ? 'openai' : 'gemini';
  const renderedPages = await renderImageFiles(files, options.onProgress);
  const pageCanvasMap = new Map<number, HTMLCanvasElement>(
    renderedPages.map((p) => [p.pageNumber, p.canvas])
  );

  const allQuestions: Question[] = [];
  const totalPages = renderedPages.length;

  try {
    for (let i = 0; i < totalPages; i++) {
      const page = renderedPages[i];
      options.onProgress?.(
        `AI से इमेज ${page.pageNumber} / ${totalPages} के प्रश्न व विकल्प अलग किए जा रहे हैं... (${allQuestions.length} प्रश्न मिले)`
      );

      const rawQuestions = await callExtractApi(
        page,
        provider,
        options.userApiKey,
        options.onProgress
      );

      const processed = postProcessQuestions(rawQuestions, pageCanvasMap, page.pageNumber);
      allQuestions.push(...processed);
    }
  } finally {
    for (const page of renderedPages) {
      page.canvas.width = 0;
      page.canvas.height = 0;
    }
  }

  return {
    questions: allQuestions,
    totalPages
  };
}
