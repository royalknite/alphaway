import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Trash2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Download,
  Calendar,
  Clock,
  Award
} from 'lucide-react';
import { TestAttempt, NavigationTab } from '../../types';
import { exportAttemptsToCsv } from '../../utils/pdfExport';
import { ConfirmModal } from '../common/ConfirmModal';

interface TestHistoryViewProps {
  attempts: TestAttempt[];
  onViewResult: (attempt: TestAttempt) => void;
  onOpenAnalysis: (attempt: TestAttempt) => void;
  onCompareAttempts: (testId: string) => void;
  onDeleteAttempt: (attemptId: string) => Promise<void>;
}

export const TestHistoryView: React.FC<TestHistoryViewProps> = ({
  attempts,
  onViewResult,
  onOpenAnalysis,
  onCompareAttempts,
  onDeleteAttempt
}) => {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'exam' | 'practice'>('all');
  const [deleteTarget, setDeleteTarget] = useState<TestAttempt | null>(null);

  // Filtered attempts
  const filteredAttempts = useMemo(() => {
    return attempts.filter(att => {
      if (modeFilter !== 'all' && att.mode !== modeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = att.testTitle.toLowerCase().includes(q);
        const matchesFolder = att.folderName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesFolder) return false;
      }
      return true;
    });
  }, [attempts, modeFilter, search]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="text-blue-600 dark:text-blue-400" size={26} />
            <span>Permanent Test History </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Each Attempt Is Saved Separately. Compare, Review Explanations, or Export CSV
          </p>
        </div>

        {attempts.length > 0 && (
          <button
            onClick={() => exportAttemptsToCsv(attempts)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 shadow-xs transition-all self-start sm:self-auto"
          >
            <Download size={16} />
            <span>Export CSV Report</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Test or Subject..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setModeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              modeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            All ({attempts.length})
          </button>
          <button
            onClick={() => setModeFilter('exam')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              modeFilter === 'exam'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Exam Mode
          </button>
          <button
            onClick={() => setModeFilter('practice')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              modeFilter === 'practice'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Practice Mode
          </button>
        </div>
      </div>

      {/* Attempts List */}
      {filteredAttempts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
        No Attempt History Found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttempts.map((att) => (
            <div
              key={att.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Attempt #{att.attemptNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date(att.submittedAt).toLocaleDateString()} {new Date(att.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {att.mode.toUpperCase()}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                  {att.testTitle}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>Right: <strong className="text-emerald-600">{att.result.correctAnswers}</strong></span>
                  <span>Wrong: <strong className="text-rose-600">{att.result.incorrectAnswers}</strong></span>
                  <span>Accuracy: <strong className="text-blue-600">{att.result.accuracy.toFixed(1)}%</strong></span>
                  <span>Time: {formatSeconds(att.result.totalTimeSpentSeconds)}</span>
                </div>
              </div>

              {/* Score and Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="text-left md:text-right">
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {att.result.finalScore.toFixed(2)} <span className="text-xs text-slate-400">/ {att.result.maxMarks}</span>
                  </div>
                  <span
                    className={`text-[11px] font-extrabold ${
                      att.result.isPassed ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {att.result.isPassed ? 'PASSED ' : 'FAILED'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewResult(att)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    Result
                  </button>

                  <button
                    onClick={() => onOpenAnalysis(att)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                    title="Detailed Analysis"
                  >
                    Analysis
                  </button>

                  <button
                    onClick={() => onCompareAttempts(att.testId)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    title="Compare this test's attempts"
                  >
                    <TrendingUp size={16} />
                  </button>

                  <button
                    onClick={() => setDeleteTarget(att)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete Attempt Record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="पDelete Attempt"
        message="क्या आप इस परीक्षा प्रयास रिकॉर्ड को हटाना चाहते हैं?"
        confirmLabel="हाँ, हटाएं"
        isDanger={true}
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteAttempt(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
