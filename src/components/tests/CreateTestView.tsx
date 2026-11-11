import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Settings,
  Sparkles,
  Save,
  HelpCircle,
  Eye,
  Check,
  Folder,
  FileUp,
  RefreshCw,
  Clock,
  Shuffle,
  Image as ImageIcon,
  Trash2,
  X
} from 'lucide-react';
import { TestFolder, TestItem, TestConfig, Question } from '../../types';
import {
  parseQuestionsFromTxt,
  SAMPLE_TEST_TXT_TIME_AND_WORK,
  SAMPLE_TEST_TXT_BIHAR_DAROGA,
  SAMPLE_TEST_TXT_RAILWAY,
  SAMPLE_TEST_TXT_SSC_CGL,
  SAMPLE_TEST_TXT_NON_VERBAL_REASONING
} from '../../utils/txtParser';
import { QuestionFigure } from '../common/QuestionFigure';
import { AttachImageQuestionModal } from './AttachImageQuestionModal';

interface CreateTestViewProps {
  folders: TestFolder[];
  preselectedFolderId?: string;
  onSaveTest: (test: TestItem, rawTxt: string) => Promise<void>;
  onCancel: () => void;
}

export const CreateTestView: React.FC<CreateTestViewProps> = ({
  folders,
  preselectedFolderId,
  onSaveTest,
  onCancel
}) => {
  // Step 1: Input TXT & Parse
  const [txtContent, setTxtContent] = useState<string>(SAMPLE_TEST_TXT_BIHAR_DAROGA);
  const [parsedData, setParsedData] = useState(() => parseQuestionsFromTxt(SAMPLE_TEST_TXT_BIHAR_DAROGA));
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');

  // Test Configurations
  const [testTitle, setTestTitle] = useState('बिहार दरोगा - नवीन अभ्यास टेस्ट');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    preselectedFolderId || (folders.length > 0 ? folders[0].id : '')
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(20);
  const [marksPerQuestion, setMarksPerQuestion] = useState<number>(2);
  const [negativeMarkingType, setNegativeMarkingType] = useState<string>('0.50');
  const [customNegativeMarking, setCustomNegativeMarking] = useState<number>(0.25);
  const [passingPercentage, setPassingPercentage] = useState<number>(40);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);
  const [testMode, setTestMode] = useState<'exam' | 'practice'>('exam');
  const [allowReview, setAllowReview] = useState<boolean>(true);
  const [defaultQuestionLanguage, setDefaultQuestionLanguage] = useState<'en' | 'hi'>('en');
  const [instructions, setInstructions] = useState<string>(
    'Read all questions carefully. Correct answers carry full marks and incorrect answers incur negative marking.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFigureBuilder, setShowFigureBuilder] = useState(false);

  const handleAddFigureQuestion = (newQuestion: Question) => {
    const updatedQuestions = [...parsedData.questions, newQuestion];
    setParsedData({
      ...parsedData,
      questions: updatedQuestions,
      totalParsed: updatedQuestions.length
    });

    // Also append representation to raw txt
    let snippet = `\n\nप्रश्न ${updatedQuestions.length}. ${newQuestion.text}`;
    if (newQuestion.figureType) {
      snippet += `\n[figure: ${newQuestion.figureType} ${JSON.stringify(newQuestion.figureData || {})}]`;
    } else if (newQuestion.imageUrl) {
      snippet += `\n[img: ${newQuestion.imageUrl}]`;
    }
    newQuestion.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const tick = idx === newQuestion.correctAnswerIndex ? ' ✅' : '';
      snippet += `\n${letter}) ${opt}${tick}`;
    });
    if (newQuestion.explanation) {
      snippet += `\nEx: ${newQuestion.explanation}`;
    }
    setTxtContent((prev) => prev.trim() + snippet);
    setActiveTab('preview');
  };

  // File Upload Handler (Desktop & Mobile Android)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setTxtContent(text);
        const result = parseQuestionsFromTxt(text);
        setParsedData(result);
        // Smart cleaned title from filename (e.g. Time_Work__1048d927.txt -> Time Work Mock Test)
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/__[\w]+/g, '')
          .replace(/_/g, ' ')
          .trim();
        setTestTitle(cleanName ? `${cleanName} Mock Test` : 'Time & Work Mock Test');
        if (result.questions.length > 0) {
          setDurationMinutes(Math.max(10, result.questions.length));
        }
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleTxtChange = (newTxt: string) => {
    setTxtContent(newTxt);
    const result = parseQuestionsFromTxt(newTxt);
    setParsedData(result);
  };

  const handleLoadSample = (sample: string, title: string) => {
    setTxtContent(sample);
    const result = parseQuestionsFromTxt(sample);
    setParsedData(result);
    setTestTitle(title);
    if (result.questions.length > 0) {
      setDurationMinutes(Math.max(10, result.questions.length));
    }
  };

  // In-place question editor
  const handleUpdateQuestion = (index: number, updated: Question) => {
    const copy = [...parsedData.questions];
    copy[index] = updated;
    setParsedData({
      ...parsedData,
      questions: copy
    });
  };

  const effectiveNegativeMarking =
    negativeMarkingType === 'custom'
      ? customNegativeMarking
      : parseFloat(negativeMarkingType);

  const handleSave = async () => {
    if (parsedData.questions.length === 0) {
      alert('कृपया कम से कम एक वैध प्रश्न जोड़ें। (Please add at least 1 valid question)');
      return;
    }
    const folderToUse = selectedFolderId || (folders.length > 0 ? folders[0].id : '');
    if (!folderToUse) {
      alert('कृपया टेस्ट सुरक्षित करने के लिए एक बुक फोल्डर चुनें। (Please select a folder)');
      return;
    }

    setIsSubmitting(true);
    try {
      const config: TestConfig = {
        durationMinutes,
        marksPerQuestion,
        negativeMarking: effectiveNegativeMarking,
        passingPercentage,
        shuffleQuestions,
        shuffleOptions,
        mode: testMode,
        allowReview,
        instructions,
        defaultQuestionLanguage
      };

      const newTest: TestItem = {
        id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        folderId: folderToUse,
        title: testTitle.trim() || 'Time & Work Mock Test',
        questions: parsedData.questions,
        config,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalAttempts: 0,
        originalTxt: txtContent
      };

      await onSaveTest(newTest, txtContent);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <FileUp className="text-blue-600 dark:text-blue-400" size={26} />
          <span>Create Test – TXT Import & Configuration</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          TXT फ़ाइल से तुरंत MCQ प्रश्न आयात करें, पूर्वावलोकन करें और परीक्षा सेटिंग्स कॉन्फ़िगर करें।
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Columns: TXT Input & Extracted Questions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Top Toolbar: File upload + presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm cursor-pointer transition-colors shadow-sm shrink-0">
                <Upload size={16} />
                <span>Upload TXT (फ़ाइल चुनें)</span>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Add Question with Image / PDF Button */}
              <button
                type="button"
                onClick={() => setShowFigureBuilder(true)}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                title="Reasoning या Math के चित्र/फोटो वाला प्रश्न टेस्ट में जोड़ें"
              >
                <ImageIcon size={14} className="text-amber-300" />
                <span>📷 फोटो/चित्र प्रश्न जोड़ें (Add Image Question)</span>
              </button>

              {/* Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
                <span className="text-slate-400 font-medium shrink-0">नमूना:</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_TEST_TXT_NON_VERBAL_REASONING, 'Non-Verbal Reasoning (चित्रात्मक तर्कशक्ति - 10 प्रश्न)')}
                  className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 hover:bg-purple-200 whitespace-nowrap font-bold flex items-center gap-1"
                >
                  <Sparkles size={11} className="text-purple-600 dark:text-purple-400" />
                  चित्र प्रश्न (Non-Verbal) ⭐
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_TEST_TXT_TIME_AND_WORK, 'समय और कार्य टेस्ट (Time & Work Mock Test)')}
                  className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 hover:bg-blue-200 whitespace-nowrap font-bold"
                >
                  Time & Work (20 प्रश्न) ⭐
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_TEST_TXT_BIHAR_DAROGA, 'Bihar Daroga Mock Test')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 whitespace-nowrap font-medium"
                >
                  दरोगा
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_TEST_TXT_RAILWAY, 'Railway Group D Science Mock')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 whitespace-nowrap font-medium"
                >
                  रेलवे
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_TEST_TXT_SSC_CGL, 'SSC CGL General Awareness')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 whitespace-nowrap font-medium"
                >
                  SSC
                </button>
              </div>
            </div>

            {/* Parsing Stats Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {parsedData.totalParsed} प्रश्न निकाले गए (Questions Extracted)
                </span>
              </div>

              {parsedData.errors.length > 0 && (
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                  <AlertCircle size={15} />
                  <span>{parsedData.errors.length} चेतावनियां</span>
                </div>
              )}

              {/* View Toggle */}
              <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg font-semibold text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Preview ({parsedData.totalParsed})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'editor'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Raw TXT
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {parsedData.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs space-y-1">
                <div className="font-bold text-rose-700 dark:text-rose-300">
                  प्रारूप संबंधी समस्याएं (Formatting Issues Detected):
                </div>
                {parsedData.errors.slice(0, 3).map((err, i) => (
                  <div key={i} className="text-rose-600 dark:text-rose-400">
                    • लाइन {err.line}: {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 1: Live Question Preview with In-Place Edit */}
            {activeTab === 'preview' && (
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                {parsedData.questions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    कोई प्रश्न नहीं मिला। कृपया ऊपर TXT फ़ाइल अपलोड करें या टेक्स्ट लिखें।
                  </div>
                ) : (
                  parsedData.questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            प्रश्न {qIdx + 1}
                          </span>
                          {q.figureType && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
                              चित्र: {q.figureType}
                            </span>
                          )}
                          {q.imageUrl && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                              छवि (Image)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400">
                            सही उत्तर: Option {String.fromCharCode(65 + q.correctAnswerIndex)} ✅
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = parsedData.questions.filter((_, idx) => idx !== qIdx);
                              setParsedData({ ...parsedData, questions: copy, totalParsed: copy.length });
                            }}
                            className="text-slate-400 hover:text-rose-500 text-xs px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="प्रश्न हटाएं"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <textarea
                        rows={2}
                        value={q.text}
                        onChange={(e) =>
                          handleUpdateQuestion(qIdx, { ...q, text: e.target.value })
                        }
                        className="w-full text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      {/* Image / Diagram Attachment Bar for this Question */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                        {q.imageUrl ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                              <CheckCircle2 size={13} />
                              चित्र संलग्न है (Image Attached)
                            </span>
                            <label className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-semibold text-[11px]">
                              बदलें (Change)
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    const r = new FileReader();
                                    r.onload = (ev) => handleUpdateQuestion(qIdx, { ...q, imageUrl: ev.target?.result as string });
                                    r.readAsDataURL(f);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuestion(qIdx, { ...q, imageUrl: undefined })}
                              className="text-rose-500 hover:underline text-[11px] font-semibold flex items-center gap-0.5"
                            >
                              <Trash2 size={12} />
                              हटाएं
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold text-xs cursor-pointer hover:bg-purple-100 transition-colors">
                            <ImageIcon size={13} />
                            <span>📷 इस प्रश्न में फोटो/स्क्रीनशॉट जोड़ें (Attach Image)</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const r = new FileReader();
                                  r.onload = (ev) => handleUpdateQuestion(qIdx, { ...q, imageUrl: ev.target?.result as string });
                                  r.readAsDataURL(f);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                        <span className="text-[11px] text-slate-400">
                          (Math, Reasoning या Diagram प्रश्न)
                        </span>
                      </div>

                      {/* Question Figure / Diagram if exists */}
                      <QuestionFigure question={q} />

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswerIndex === optIdx;
                          const optImg = q.optionImages?.[optIdx];

                          return (
                            <div
                              key={optIdx}
                              className={`flex flex-col p-2 rounded-lg border text-xs transition-colors ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateQuestion(qIdx, { ...q, correctAnswerIndex: optIdx })
                                  }
                                  className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                  }`}
                                  title="इसे सही उत्तर चिह्नित करें"
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </button>

                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...q.options];
                                    newOpts[optIdx] = e.target.value;
                                    handleUpdateQuestion(qIdx, { ...q, options: newOpts });
                                  }}
                                  className="flex-1 bg-transparent border-none text-xs font-medium focus:outline-none"
                                />

                                {/* Option Image Trigger */}
                                <label
                                  className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                                  title="विकल्प का चित्र जोड़ें"
                                >
                                  <ImageIcon size={13} />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        const r = new FileReader();
                                        r.onload = (ev) => {
                                          const optImgs = [...(q.optionImages || [null, null, null, null])];
                                          optImgs[optIdx] = ev.target?.result as string;
                                          handleUpdateQuestion(qIdx, { ...q, optionImages: optImgs });
                                        };
                                        r.readAsDataURL(f);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>

                                {optImg && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const optImgs = [...(q.optionImages || [null, null, null, null])];
                                      optImgs[optIdx] = null;
                                      handleUpdateQuestion(qIdx, { ...q, optionImages: optImgs });
                                    }}
                                    className="text-rose-500 hover:text-rose-700 p-0.5"
                                    title="विकल्प चित्र हटाएं"
                                  >
                                    <X size={12} />
                                  </button>
                                )}

                                {isCorrect && (
                                  <Check size={14} className="text-emerald-600 shrink-0" />
                                )}
                              </div>

                              {/* Option Image Thumbnail if present */}
                              {optImg && (
                                <div className="mt-1.5 p-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                  <img
                                    src={optImg}
                                    alt={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    className="max-h-20 w-auto object-contain rounded"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          व्याख्या / Explanation:
                        </label>
                        <input
                          type="text"
                          value={q.explanation}
                          onChange={(e) =>
                            handleUpdateQuestion(qIdx, { ...q, explanation: e.target.value })
                          }
                          placeholder="Ex: व्याख्या दर्ज करें..."
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: Raw TXT Code Editor */}
            {activeTab === 'editor' && (
              <div className="space-y-2">
                <textarea
                  rows={16}
                  value={txtContent}
                  onChange={(e) => handleTxtChange(e.target.value)}
                  className="w-full font-mono text-xs sm:text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="यहाँ TXT फ़ाइल का प्रारूप चिपकाएं..."
                />
                <p className="text-[11px] text-slate-400">
                  फॉर्मेट: <code>प्रश्न 1. ... A) ... B) ✅ ... Ex: ...</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Test Configuration Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Settings size={18} className="text-blue-500" />
              <span>Test Configuration (परीक्षा सेटिंग्स)</span>
            </h2>

            {/* Test Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                टेस्ट का शीर्षक (Test Title) *
              </label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="उदा: Bihar Police Daroga Mock Test 01"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Target Book Folder */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                बुक फोल्डर चुनें (Select Book Folder) *
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration & Marks Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  अवधि (Duration Min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  अंक प्रति प्रश्न (Marks/Q)
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={marksPerQuestion}
                  onChange={(e) => setMarksPerQuestion(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Negative Marking */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ऋणात्मक अंक (Negative Marking)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={negativeMarkingType}
                  onChange={(e) => setNegativeMarkingType(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none"
                >
                  <option value="0">कोई नहीं (No Negative)</option>
                  <option value="0.25">0.25 (1/4th Marks)</option>
                  <option value="0.33">0.33 (1/3rd Marks)</option>
                  <option value="0.50">0.50 (1/2 Marks)</option>
                  <option value="custom">कस्टम मान (Custom)</option>
                </select>

                {negativeMarkingType === 'custom' && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="मान दर्ज करें"
                    value={customNegativeMarking}
                    onChange={(e) => setCustomNegativeMarking(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                )}
              </div>
            </div>

            {/* Passing Marks % */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>उत्तीर्ण प्रतिशत (Passing Marks %)</span>
                <span className="text-blue-600 dark:text-blue-400">{passingPercentage}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                step={5}
                value={passingPercentage}
                onChange={(e) => setPassingPercentage(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Test Mode Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                डिफ़ॉल्ट मोड (Default Mode)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTestMode('exam')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    testMode === 'exam'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  परीक्षा मोड (Exam)
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode('practice')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    testMode === 'practice'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  अभ्यास मोड (Practice)
                </button>
              </div>
            </div>

            {/* Question Language Preference */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Default Question Language (प्रश्नों की भाषा)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDefaultQuestionLanguage('en')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    defaultQuestionLanguage === 'en'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultQuestionLanguage('hi')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    defaultQuestionLanguage === 'hi'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            </div>

            {/* Shuffling and Review Checkboxes */}
            <div className="space-y-2 pt-2 text-xs">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>प्रश्नों का क्रम यादृच्छिक करें (Shuffle Questions)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>विकल्पों का क्रम यादृच्छिक करें (Shuffle Options)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowReview}
                  onChange={(e) => setAllowReview(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>समीक्षा सुविधा सक्षम रखें (Enable Question Review)</span>
              </label>
            </div>

            {/* Summary & Save Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 text-xs flex justify-between">
                <span>कुल प्रश्न: <strong>{parsedData.questions.length}</strong></span>
                <span>पूर्णांक: <strong>{parsedData.questions.length * marksPerQuestion} Marks</strong></span>
                <span>समय: <strong>{durationMinutes} Min</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  रद्द करें
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || parsedData.questions.length === 0}
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
                >
                  <Save size={16} />
                  <span>{isSubmitting ? 'सुरक्षित हो रहा है...' : 'टेस्ट सेव करें (Save Test)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attach Image / PDF Diagram Question Modal */}
      {showFigureBuilder && (
        <AttachImageQuestionModal
          isOpen={showFigureBuilder}
          onClose={() => setShowFigureBuilder(false)}
          onInsertQuestion={(newQ: Question) => {
            handleAddFigureQuestion(newQ);
            setShowFigureBuilder(false);
          }}
          nextQuestionNumber={parsedData.questions.length + 1}
        />
      )}
    </div>
  );
};
