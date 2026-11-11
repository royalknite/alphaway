import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ArrowLeft,
  Filter,
  Check,
  X,
  Printer,
  Bookmark
} from 'lucide-react';
import { TestAttempt } from '../../types';
import { printResultReport } from '../../utils/pdfExport';
import { getQuestionDisplay } from '../../utils/bilingualHelper';
import { QuestionFigure } from '../common/QuestionFigure';

interface AnswerAnalysisViewProps {
  attempt: TestAttempt;
  onBackToResult: () => void;
}

export const AnswerAnalysisView: React.FC<AnswerAnalysisViewProps> = ({
  attempt,
  onBackToResult
}) => {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted' | 'review'>('all');
  const [search, setSearch] = useState('');
  const [questionLang, setQuestionLang] = useState<'en' | 'hi'>('en');

  const questions = attempt.questionsSnapshot;

  // Filter questions
  const filteredIndices = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const resp = attempt.responses[idx];
        const selected = resp ? resp.selectedOption : null;
        const isAttempted = selected !== null;
        const isCorrect = isAttempted && selected === q.correctAnswerIndex;
        const isReview = resp ? resp.isMarkedForReview : false;

        if (filter === 'correct' && !isCorrect) return false;
        if (filter === 'incorrect' && (!isAttempted || isCorrect)) return false;
        if (filter === 'unattempted' && isAttempted) return false;
        if (filter === 'review' && !isReview) return false;

        if (search.trim()) {
          const matchText = q.text.toLowerCase().includes(search.toLowerCase());
          const matchExp = (q.explanation || '').toLowerCase().includes(search.toLowerCase());
          if (!matchText && !matchExp) return false;
        }

        return true;
      });
  }, [questions, attempt.responses, filter, search]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToResult}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="स्कोरकार्ड पर वापस जाएं"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              विस्तृत उत्तर विश्लेषण (Question Analysis)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {attempt.testTitle} • Attempt #{attempt.attemptNumber}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Question Language Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              View in:
            </span>
            <select
              value={questionLang}
              onChange={(e) => setQuestionLang(e.target.value as 'en' | 'hi')}
              className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>

          <button
            onClick={() => printResultReport(attempt)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            <Printer size={15} />
            <span>Save / Print PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            सभी ({questions.length})
          </button>
          <button
            onClick={() => setFilter('correct')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filter === 'correct'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            सही ({attempt.result.correctAnswers})
          </button>
          <button
            onClick={() => setFilter('incorrect')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filter === 'incorrect'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            गलत ({attempt.result.incorrectAnswers})
          </button>
          <button
            onClick={() => setFilter('unattempted')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filter === 'unattempted'
                ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            छूटे हुए ({attempt.result.unattemptedQuestions})
          </button>
        </div>

        {/* Quick Question Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="प्रश्न या व्याख्या में खोजें..."
          className="w-full sm:w-64 px-3.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Questions Breakdown List */}
      <div className="space-y-6">
        {filteredIndices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center text-slate-400 border border-slate-200 dark:border-slate-800">
            इस फ़िल्टर में कोई प्रश्न नहीं मिला।
          </div>
        ) : (
          filteredIndices.map(({ q, idx }) => {
            const resp = attempt.responses[idx];
            const selected = resp ? resp.selectedOption : null;
            const isAttempted = selected !== null;
            const isCorrect = isAttempted && selected === q.correctAnswerIndex;
            const isReview = resp ? resp.isMarkedForReview : false;
            const timeSpent = resp ? resp.timeSpentSeconds : 0;

            return (
              <div
                key={q.id || idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                {/* Question Header & Status Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-xs">
                      प्रश्न (Q) {idx + 1}
                    </span>

                    {isReview && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                        <Bookmark size={13} />
                        <span>समीक्षा चिह्नित था</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <Clock size={13} />
                      <span>{timeSpent}s</span>
                    </span>

                    {/* Status Badge */}
                    {!isAttempted ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
                        अनुत्तरित (Unattempted)
                      </span>
                    ) : isCorrect ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                        <Check size={14} />
                        <span>सही उत्तर (+Marks)</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs">
                        <X size={14} />
                        <span>गलत उत्तर (-Neg)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                {(() => {
                  const display = getQuestionDisplay(q, questionLang);
                  return (
                    <>
                      <div className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                        {display.text}
                      </div>

                      {/* Question Figure / Diagram */}
                      <QuestionFigure question={q} />

                      {/* Options List with Highlighting */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {q.options.map((opt, optIdx) => {
                          const isRight = q.correctAnswerIndex === optIdx;
                          const isUserPick = selected === optIdx;
                          const optText = display.options[optIdx] ?? opt;

                          let cardClass = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                          if (isRight) {
                            cardClass = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500';
                          } else if (isUserPick && !isRight) {
                            cardClass = 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-950 dark:text-rose-100 font-bold ring-1 ring-rose-500';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${cardClass}`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isRight
                                    ? 'bg-emerald-600 text-white'
                                    : isUserPick
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </div>

                              <div className="flex-1 text-xs sm:text-sm pt-1">
                                <div>{optText}</div>
                                {q.optionImages?.[optIdx] && (
                                  <div className="mt-2 p-1 max-w-xs bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                    <img
                                      src={q.optionImages[optIdx]!}
                                      alt={`Option ${String.fromCharCode(65 + optIdx)}`}
                                      className="max-h-32 w-auto object-contain rounded"
                                    />
                                  </div>
                                )}
                              </div>

                              {isRight && (
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs pt-1 shrink-0">
                                  <Check size={14} />
                                  <span>{questionLang === 'en' ? 'Correct' : 'सही'}</span>
                                </div>
                              )}

                              {isUserPick && !isRight && (
                                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs pt-1 shrink-0">
                                  <X size={14} />
                                  <span>{questionLang === 'en' ? 'Your Choice' : 'आपका चयन'}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Box */}
                      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border-l-4 border-blue-600 text-xs sm:text-sm space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                          <BookOpen size={15} />
                          <span>{questionLang === 'en' ? 'Explanation:' : 'व्याख्या / Explanation:'}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {display.explanation || q.explanation || (questionLang === 'en' ? 'No explanation available.' : 'इस प्रश्न के लिए कोई अतिरिक्त व्याख्या उपलब्ध नहीं है।')}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      <div className="pt-4 text-center">
        <button
          onClick={onBackToResult}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
        >
          परिणाम स्कोरकार्ड पर वापस जाएं
        </button>
      </div>
    </div>
  );
};
