import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  HelpCircle,
  Eye,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Check,
  Maximize2
} from 'lucide-react';
import { Question } from '../../types';

interface AttachImageQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertQuestion: (question: Question) => void;
  nextQuestionNumber: number;
}

export const AttachImageQuestionModal: React.FC<AttachImageQuestionModalProps> = ({
  isOpen,
  onClose,
  onInsertQuestion,
  nextQuestionNumber
}) => {
  const [questionText, setQuestionText] = useState('दी गई आकृति का ध्यानपूर्वक अध्ययन कर सही विकल्प चुनें:');
  const [questionImage, setQuestionImage] = useState<string>('');
  const [options, setOptions] = useState<string[]>(['विकल्प A', 'विकल्प B', 'विकल्प C', 'विकल्प D']);
  const [optionImages, setOptionImages] = useState<(string | null)[]>([null, null, null, null]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [subject, setSubject] = useState('Reasoning');
  const [isZoomed, setIsZoomed] = useState(false);
  const [previewOptionZoom, setPreviewOptionZoom] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Question Image Upload (File / Drag & Drop / PDF)
  const handleImageFileChange = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setQuestionImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Handle Option Image Upload
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

  // Remove option image
  const removeOptionImage = (index: number) => {
    const updated = [...optionImages];
    updated[index] = null;
    setOptionImages(updated);
  };

  // Submit and Insert into Test
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim() && !questionImage) {
      alert('कृपया प्रश्न या प्रश्न का चित्र (Image) जोड़ें।');
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
                <span>चित्र / फोटो वाला प्रश्न जोड़ें</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  Question #{nextQuestionNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reasoning, Math या GS के किसी भी प्रश्न का फोटो/स्क्रीनशॉट या PDF अपलोड करें
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
          {/* 1. Image / Diagram Attachment Section */}
          <div className="p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ImageIcon size={16} className="text-purple-600 dark:text-purple-400" />
                <span>प्रश्न का चित्र / फोटो / स्क्रीनशॉट (Question Diagram)</span>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">(अनिवार्य / आवश्यक)</span>
              </label>

              {questionImage && (
                <button
                  type="button"
                  onClick={() => setQuestionImage('')}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 size={13} />
                  <span>फोटो हटाएं (Remove)</span>
                </button>
              )}
            </div>

            {!questionImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-8 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload size={22} />
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 text-center">
                  फोटो या स्क्रीनशॉट चुनें (Browse Image / PDF)
                </div>
                <div className="text-[11px] text-slate-400 text-center mt-1">
                  PNG, JPG, WEBP, GIF या PDF स्क्रीनशॉट (मोबाइल गैलरी या डेस्कटॉप से)
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFileChange(f);
                  }}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 flex flex-col items-center justify-center group">
                {isPdf ? (
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
                  <button
                    type="button"
                    onClick={() => setIsZoomed(true)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white shadow-xs"
                    title="बड़ा करके देखें (Zoom)"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    type="button"
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
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFileChange(f);
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* 2. Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              प्रश्न का शीर्षक / निर्देश (Question Text):
            </label>
            <textarea
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="उदा: दी गई आकृति में लुप्त संख्या ज्ञात करें..."
              className="w-full text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 3. Four Options (with Optional Option Images & Radio for Correct Ans) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                चार विकल्प (4 Options) - सही उत्तर पर टिक लगाएं:
              </label>
              <span className="text-[11px] text-slate-400">
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
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        className="flex-1 text-xs font-semibold bg-transparent border-b border-slate-200 dark:border-slate-700 pb-0.5 focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                      />

                      {/* Option Image Upload Trigger */}
                      <label
                        className="p-1 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                        title="विकल्प का चित्र जोड़ें (Attach diagram for this option)"
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

                    {/* Option Image Thumbnail if attached */}
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
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">विषय (Subject):</span>
            <div className="flex items-center gap-1.5 text-xs">
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
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Check size={16} />
            <span>इस प्रश्न को टेस्ट में जोड़ें (Add Question to Test)</span>
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
