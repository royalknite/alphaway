import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Share2,
  FileText,
  BarChart2,
  BookOpen,
  Check,
  X
} from 'lucide-react';
import { TestAttempt, NavigationTab } from '../../types';
import { printResultReport, printQuestionPaper } from '../../utils/pdfExport';

interface ResultViewProps {
  attempt: TestAttempt;
  onNavigate: (tab: NavigationTab) => void;
  onOpenAnalysis: (attempt: TestAttempt) => void;
  onReattempt: (testId: string) => void;
  onCompareAttempts: (testId: string) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  attempt,
  onNavigate,
  onOpenAnalysis,
  onReattempt,
  onCompareAttempts
}) => {
  const { result } = attempt;

  // Fire celebratory confetti if passed
  useEffect(() => {
    if (result.isPassed) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [result.isPassed]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* 1. Scorecard Hero Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-xl relative overflow-hidden ${
          result.isPassed
            ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-blue-800'
            : 'bg-gradient-to-br from-slate-800 via-slate-900 to-rose-900'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              {result.isPassed ? '🎉 परीक्षा उत्तीर्ण (PASSED)' : '⚠️ सुधार की आवश्यकता (NEEDS IMPROVEMENT)'}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {attempt.testTitle}
            </h1>
            <p className="text-xs sm:text-sm text-white/80">
              प्रयास सं. #{attempt.attemptNumber} • {new Date(attempt.submittedAt).toLocaleString()}
            </p>
          </div>

          {/* Big Score Display */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center shrink-0 min-w-[200px]">
            <div className="text-xs uppercase font-extrabold text-white/80 tracking-wider">
              अंतिम प्राप्तांक (Score)
            </div>
            <div className="text-4xl sm:text-5xl font-black my-1 text-white">
              {result.finalScore.toFixed(2)}
            </div>
            <div className="text-xs text-white/90 font-semibold">
              पूर्णांक: {result.maxMarks} • {result.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Performance Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Accuracy */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Accuracy (सटीकता)</span>
            <Award size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {result.accuracy.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            हल किए प्रश्नों में से
          </p>
        </div>

        {/* Correct Answers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Correct (सही)</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {result.correctAnswers} / {result.totalQuestions}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            +{result.positiveMarks.toFixed(2)} अंक मिले
          </p>
        </div>

        {/* Incorrect Answers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Incorrect (गलत)</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {result.incorrectAnswers}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
            -{result.negativeMarks.toFixed(2)} ऋणात्मक अंक
          </p>
        </div>

        {/* Time Taken */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Time Taken (समय)</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatSeconds(result.totalTimeSpentSeconds)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            औसत: {result.averageTimePerQuestion}s प्रति प्रश्न
          </p>
        </div>
      </div>

      {/* 3. Detailed Marks Calculation Breakdown Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>विस्तृत अंक गणना (Accurate Mark Breakdown)</span>
          <span className="text-xs font-mono font-bold text-slate-500">
            Formula: Positive − Negative = Final
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">धनात्मक अंक (Positive Marks)</div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {result.correctAnswers} × Marks = +{result.positiveMarks.toFixed(2)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">ऋणात्मक कटौती (Negative Marks)</div>
            <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {result.incorrectAnswers} × Neg = -{result.negativeMarks.toFixed(2)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
            <div className="text-xs text-blue-700 dark:text-blue-300 font-bold">अंतिम कुल अंक (Final Marks)</div>
            <div className="text-lg font-extrabold text-blue-700 dark:text-blue-300 mt-1">
              {result.finalScore.toFixed(2)} / {result.maxMarks}
            </div>
          </div>
        </div>

        {/* Visual Bar Breakdown */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex justify-between">
            <span>प्रश्नों का विभाजन (Questions Breakdown):</span>
            <span>
              सही: {result.correctAnswers} • गलत: {result.incorrectAnswers} • छूटे: {result.unattemptedQuestions}
            </span>
          </div>

          <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
            <div
              style={{ width: `${(result.correctAnswers / result.totalQuestions) * 100}%` }}
              className="bg-emerald-500 h-full"
              title={`Correct: ${result.correctAnswers}`}
            />
            <div
              style={{ width: `${(result.incorrectAnswers / result.totalQuestions) * 100}%` }}
              className="bg-rose-500 h-full"
              title={`Incorrect: ${result.incorrectAnswers}`}
            />
            <div
              style={{ width: `${(result.unattemptedQuestions / result.totalQuestions) * 100}%` }}
              className="bg-slate-400 h-full"
              title={`Unattempted: ${result.unattemptedQuestions}`}
            />
          </div>
        </div>
      </div>

      {/* 4. Action Buttons Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onOpenAnalysis(attempt)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <BookOpen size={18} />
            <span>विस्तृत उत्तर व्याख्या (Question Analysis)</span>
          </button>

          <button
            onClick={() => onReattempt(attempt.testId)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">दोबारा टेस्ट दें (Reattempt)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => printResultReport(attempt)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="स्कोरकार्ड प्रिंट या PDF सेव करें"
          >
            <Printer size={15} />
            <span>Scorecard PDF</span>
          </button>

          <button
            onClick={() => onCompareAttempts(attempt.testId)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100"
          >
            <TrendingUp size={15} />
            <span>तुलना करें (Compare)</span>
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            होम (Home)
          </button>
        </div>
      </div>
    </div>
  );
};
