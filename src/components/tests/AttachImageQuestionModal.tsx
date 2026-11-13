import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  Maximize2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppSettings, Question } from '../../types';
import { extractQuestionsFromImages, extractQuestionsFromPdf } from '../../utils/pdfExtractor';
import { QuestionFigure } from '../common/QuestionFigure';

interface AttachImageQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertQuestion: (question: Question) => void;
  onInsertMultipleQuestions?: (questions: Question[]) => void;
  nextQuestionNumber: number;
  settings?: AppSettings;
}

export const AttachImageQuestionModal: React.FC<AttachImageQuestionModalProps> = ({
  isOpen,
  onClose,
  onInsertQuestion,
  onInsertMultipleQuestions,
  nextQuestionNumber,
  settings
}) => {
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState<string>('');
  const [extractedFigureType, setExtractedFigureType] = useState<Question['figureType'] | undefined>(undefined);
  const [extractedFigureData, setExtractedFigureData] = useState<any>(undefined);
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [optionImages, setOptionImages] = useState<(string | null)[]>([null, null, null, null]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [subject, setSubject] = useState('Reasoning');
  const [isZoomed, setIsZoomed] = useState(false);

  const [autoExtractAi, setAutoExtractAi] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState('');
  const [extractError, setExtractError] = useState('');
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [multiExtracted, setMultiExtracted] = useState<Question[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const applyExtractedQuestion = (q: Question) => {
    setQuestionText(q.text || '');
    setQuestionImage(q.imageUrl || '');
    setExtractedFigureType(q.figureType);
    setExtractedFigureData(q.figureData);

    const paddedOpts = [0, 1, 2, 3].map((idx) => q.options?.[idx] || '');
    setOptions(paddedOpts);

    const paddedOptImgs = [0, 1, 2, 3].map((idx) => q.optionImages?.[idx] || null);
    setOptionImages(paddedOptImgs);

    setCorrectIndex(q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4 ? q.correctAnswerIndex : 0);
    setExplanation(q.explanation || '');
    if (q.subject) setSubject(q.subject);
  };

  const runAiExtraction = async (file: File) => {
    setIsExtracting(true);
    setExtractError('');
    setMultiExtracted([]);
    setExtractStatus('AI इमेज से प्रश्न, चित्र और विकल्प अलग कर रहा है...');

    const provider = settings?.pdfAiProvider || 'gemini';
    const userApiKey = provider === 'openai' ? settings?.openaiApiKey : settings?.geminiApiKey;

    try {
      const isPdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const result = isPdfFile
        ? await extractQuestionsFromPdf(file, {
            provider,
            userApiKey,
            onProgress: (msg) => setExtractStatus(msg)
          })
        : await extractQuestionsFromImages([file], {
            provider,
            userApiKey,
            onProgress: (msg) => setExtractStatus(msg)
          });

      if (!result.questions.length) {
        throw new Error('इस इमेज में कोई MCQ प्रश्न पहचाना नहीं जा सका। आप नीचे मैन्युअल रूप से भर सकते हैं।');
      }

      applyExtractedQuestion(result.questions[0]);
      if (result.questions.length > 1) {
        setMultiExtracted(result.questions);
        setExtractStatus(
          `✅ ${result.questions.length} प्रश्न अलग-अलग निकाले गए! पहला प्रश्न नीचे दिखाया गया है या आप सभी ${result.questions.length} प्रश्न एक साथ जोड़ सकते हैं।`
        );
      } else {
        const q0 = result.questions[0];
        const hasCroppedDiagram = Boolean(q0.imageUrl || q0.figureType === 'table');
        const hasOptionImgs = Boolean(q0.optionImages?.some(Boolean));
        setExtractStatus(
          `✅ प्रश्न व चारों विकल्प अलग-अलग हो गए${hasCroppedDiagram ? ' (प्रश्न का चित्र क्रॉप किया गया)' : ''}${hasOptionImgs ? ' (विकल्प चित्र क्रॉप किए गए)' : ''}${q0.correctAnswerIndex >= 0 ? ` — सही उत्तर Option ${String.fromCharCode(65 + q0.correctAnswerIndex)} पहचाना गया` : ''}।`
        );
      }
    } catch (err: any) {
      setExtractError(err?.message || 'AI इमेज स्कैन में त्रुटि हुई।');
      setExtractStatus('');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageFileChange = async (file: File) => {
    if (!file) return;
    setLastFile(file);
    setExtractError('');
    setExtractStatus('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setQuestionImage(result);
    };
    reader.readAsDataURL(file);

    if (autoExtractAi) {
      await runAiExtraction(file);
    }
  };

  const handleOptionImageChange = (index: number, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const updated = [...optionImages];
      updated[index] = result;
      setOptionImages(updated);
    };
    reader.readAsDataURL(file);
  };

  const removeOptionImage = (index: number) => {
    const updated = [...optionImages];
    updated[index] = null;
    setOptionImages(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExtractError('');

    if (!questionText.trim() && !questionImage && !extractedFigureType) {
      setExtractError('कृपया प्रश्न या प्रश्न का चित्र (Image) जोड़ें।');
      return;
    }

    const newQuestion: Question = {
      id: `img_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      number: nextQuestionNumber,
      text: questionText.trim() || 'नीचे दिए गए चित्र के अनुसार सही विकल्प चुनें:',
      options: options.map((opt, i) => opt.trim() || `Option ${String.fromCharCode(65 + i)}`),
      correctAnswerIndex: correctIndex,
      explanation: explanation.trim(),
      subject: subject || 'Reasoning',
      figureType: extractedFigureType,
      figureData: extractedFigureData,
      imageUrl: questionImage || undefined,
      optionImages: optionImages.some(Boolean) ? optionImages : undefined
    };

    onInsertQuestion(newQuestion);
  };

  const isPdf = questionImage.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>चित्र / स्क्रीनशॉट से प्रश्न जोड़ें</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  Question #{nextQuestionNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                स्क्रीनशॉट अपलोड करें — AI प्रश्न, चित्र, विकल्प व सही उत्तर (✓) अपने आप अलग कर देगा
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Auto-Extract Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-xs">
            <label className="flex items-center gap-2 font-bold text-violet-900 dark:text-violet-200 cursor-pointer">
              <input
                type="checkbox"
                checked={autoExtractAi}
                onChange={(e) => setAutoExtractAi(e.target.checked)}
                className="rounded text-violet-600 focus:ring-violet-500"
              />
              <Sparkles size={14} className="text-violet-600 dark:text-violet-400" />
              <span>इमेज अपलोड करते ही प्रश्न, चित्र और विकल्प AI से अलग करें</span>
            </label>

            {lastFile && !isExtracting && (
              <button
                type="button"
                onClick={() => runAiExtraction(lastFile)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
              >
                <Sparkles size={12} />
                <span>AI से दोबारा स्कैन करें</span>
              </button>
            )}
          </div>

          {/* 1. Image / Diagram Attachment Section */}
          <div className="p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ImageIcon size={16} className="text-purple-600 dark:text-purple-400" />
                <span>प्रश्न का स्क्रीनशॉट / चित्र (Question Screenshot or Diagram)</span>
              </label>

              {questionImage && (
                <button
                  type="button"
                  onClick={() => {
                    setQuestionImage('');
                    setExtractedFigureType(undefined);
                    setExtractedFigureData(undefined);
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 size={13} />
                  <span>चित्र हटाएं</span>
                </button>
              )}
            </div>

            {!questionImage && extractedFigureType !== 'table' ? (
              <div
                onClick={() => !isExtracting && fileInputRef.current?.click()}
                className="py-7 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  {isExtracting ? <RefreshCw size={22} className="animate-spin" /> : <Upload size={22} />}
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 text-center">
                  {isExtracting ? 'AI इमेज स्कैन कर रहा है...' : 'स्क्रीनशॉट या फोटो चुनें (Browse Image / PDF)'}
                </div>
                <div className="text-[11px] text-slate-400 text-center mt-1">
                  PNG, JPG, WEBP — पूरा प्रश्न स्क्रीनशॉट अपलोड करने पर चित्र व विकल्प अपने आप अलग हो जाएंगे
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={isExtracting}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFileChange(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 flex flex-col items-center justify-center group">
                {extractedFigureType === 'table' && extractedFigureData ? (
                  <QuestionFigure
                    question={{
                      id: 'preview',
                      number: nextQuestionNumber,
                      text: questionText,
                      options,
                      correctAnswerIndex: correctIndex,
                      explanation,
                      figureType: extractedFigureType,
                      figureData: extractedFigureData
                    }}
                  />
                ) : isPdf ? (
                  <div className="w-full h-48 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <object data={questionImage} type="application/pdf" className="w-full h-full rounded-lg" />
                  </div>
                ) : (
                  <img
                    src={questionImage}
                    alt="Question Figure Preview"
                    className="max-h-56 w-auto object-contain rounded-lg"
                  />
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {questionImage && !isPdf && (
                    <button
                      type="button"
                      onClick={() => setIsZoomed(true)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white shadow-xs"
                      title="बड़ा करके देखें (Zoom)"
                    >
                      <Maximize2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
                    title="दूसरी फोटो चुनें"
                  >
                    बदलें
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={isExtracting}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFileChange(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>
            )}

            {(isExtracting || extractStatus || extractError) && (
              <div
                className={`rounded-xl border p-3 text-xs space-y-2 ${
                  extractError
                    ? 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                }`}
              >
                {isExtracting && (
                  <div className="flex items-center gap-2 font-semibold">
                    <RefreshCw size={14} className="animate-spin shrink-0" />
                    <span>{extractStatus || 'AI प्रोसेस हो रहा है...'}</span>
                  </div>
                )}
                {!isExtracting && extractStatus && (
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{extractStatus}</span>
                  </div>
                )}
                {extractError && (
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{extractError}</span>
                  </div>
                )}
                {multiExtracted.length > 1 && onInsertMultipleQuestions && (
                  <button
                    type="button"
                    onClick={() => onInsertMultipleQuestions(multiExtracted)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                  >
                    सभी {multiExtracted.length} प्रश्न एक साथ टेस्ट में जोड़ें
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              प्रश्न का टेक्स्ट (Question Text):
            </label>
            <textarea
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="उदा: दी गई आकृति में त्रिभुजों की संख्या ज्ञात कीजिए..."
              className="w-full text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 3. Four Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                चार विकल्प (4 Options) — सही उत्तर चुनें:
              </label>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                सही उत्तर: <strong>Option {String.fromCharCode(65 + correctIndex)}</strong> ✅
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((opt, idx) => {
                const isCorrect = correctIndex === idx;
                const optImg = optionImages[idx];

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setCorrectIndex(idx)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isCorrect
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                        title="इसे सही उत्तर चिह्नित करें"
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[idx] = e.target.value;
                          setOptions(updated);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 text-xs font-semibold bg-transparent border-b border-slate-200 dark:border-slate-700 pb-0.5 focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                      />

                      <label
                        className="p-1 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                        title="विकल्प का चित्र जोड़ें"
                      >
                        <ImageIcon size={15} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleOptionImageChange(idx, f);
                          }}
                          className="hidden"
                        />
                      </label>

                      {optImg && (
                        <button
                          type="button"
                          onClick={() => removeOptionImage(idx)}
                          className="text-rose-500 hover:text-rose-700 p-0.5"
                          title="विकल्प चित्र हटाएं"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {optImg && (
                      <div className="relative mt-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <img
                          src={optImg}
                          alt={`Option ${String.fromCharCode(65 + idx)}`}
                          className="max-h-24 w-auto object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Explanation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              व्याख्या / हल (Explanation / Solution):
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Ex: व्याख्या या हल दर्ज करें..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* 5. Subject / Topic Category */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">विषय (Subject):</span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {['Reasoning', 'Mathematics', 'General Science', 'Mixed'].map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubject(sub)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    subject === sub
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            रद्द करें (Cancel)
          </button>

          <button
            type="button"
            disabled={isExtracting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Check size={16} />
            <span>इस प्रश्न को टेस्ट में जोड़ें (Add Question to Test)</span>
          </button>
        </div>
      </div>

      {/* Lightbox Zoom for Question Image */}
      {isZoomed && questionImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
            >
              <X size={24} />
            </button>
            <img
              src={questionImage}
              alt="Enlarged Diagram"
              className="max-h-[85vh] w-auto object-contain rounded-2xl bg-white p-2"
            />
          </div>
        </div>
      )}
    </div>
  );
};
