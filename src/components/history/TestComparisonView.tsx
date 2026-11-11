import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  TrendingUp,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { TestAttempt, TestItem } from '../../types';

interface TestComparisonViewProps {
  tests: TestItem[];
  attempts: TestAttempt[];
  selectedTestId?: string;
  onSelectTest: (testId: string) => void;
  onViewResult: (attempt: TestAttempt) => void;
}

export const TestComparisonView: React.FC<TestComparisonViewProps> = ({
  tests,
  attempts,
  selectedTestId,
  onSelectTest,
  onViewResult
}) => {
  // Find tests that have at least 1 attempt (ideally 2+)
  const attemptedTests = useMemo(() => {
    const testIdsWithAttempts = new Set(attempts.map(a => a.testId));
    return tests.filter(t => testIdsWithAttempts.has(t.id));
  }, [tests, attempts]);

  const currentTestId = selectedTestId || (attemptedTests.length > 0 ? attemptedTests[0].id : '');

  // Get all attempts for current test sorted by submission time (ascending)
  const currentTestAttempts = useMemo(() => {
    if (!currentTestId) return [];
    return attempts
      .filter(a => a.testId === currentTestId)
      .sort((a, b) => a.submittedAt - b.submittedAt);
  }, [attempts, currentTestId]);

  // Derive First, Latest, Best
  const comparison = useMemo(() => {
    if (currentTestAttempts.length === 0) return null;

    const first = currentTestAttempts[0];
    const latest = currentTestAttempts[currentTestAttempts.length - 1];
    const best = [...currentTestAttempts].sort((a, b) => b.result.finalScore - a.result.finalScore)[0];

    // Deltas between First and Latest
    const scoreDiff = latest.result.finalScore - first.result.finalScore;
    const accuracyDiff = latest.result.accuracy - first.result.accuracy;
    const correctDiff = latest.result.correctAnswers - first.result.correctAnswers;
    const timeDiffSeconds = latest.result.totalTimeSpentSeconds - first.result.totalTimeSpentSeconds;

    const improvementPercentage =
      first.result.finalScore !== 0
        ? ((latest.result.finalScore - first.result.finalScore) / Math.abs(first.result.finalScore)) * 100
        : latest.result.finalScore > 0
        ? 100
        : 0;

    return {
      first,
      latest,
      best,
      totalAttempts: currentTestAttempts.length,
      scoreDiff,
      accuracyDiff,
      correctDiff,
      timeDiffSeconds,
      improvementPercentage
    };
  }, [currentTestAttempts]);

  if (attemptedTests.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <GitCompare size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          तुलना हेतु कोई डेटा नहीं है
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          प्रयासों की तुलना करने के लिए किसी भी टेस्ट को एक से अधिक बार हल करें।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Top Header & Test Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="text-indigo-600 dark:text-indigo-400" size={26} />
            <span>Test Attempt Comparison (प्रयास तुलना डैशबोर्ड)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            प्रथम प्रयास (First), नवीनतम प्रयास (Latest) और सर्वश्रेष्ठ प्रयास (Best) की तुलना।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">टेस्ट चुनें:</span>
          <select
            value={currentTestId}
            onChange={(e) => onSelectTest(e.target.value)}
            className="text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 font-bold text-slate-900 dark:text-white focus:outline-none"
          >
            {attemptedTests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {comparison && (
        <div className="space-y-6">
          {/* Top Progress Improvement Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                कुल {comparison.totalAttempts} प्रयास दर्ज किए गए
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-1">
                {comparison.scoreDiff >= 0
                  ? `+${comparison.scoreDiff.toFixed(2)} अंक का सुधार (Improvement)!`
                  : `${comparison.scoreDiff.toFixed(2)} अंक का अंतर`}
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                सटीकता में अंतर: {comparison.accuracyDiff >= 0 ? '+' : ''}{comparison.accuracyDiff.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center shrink-0">
              <span className="text-[11px] font-bold uppercase text-white/80 block">
                Improvement Rate
              </span>
              <span className="text-2xl sm:text-3xl font-black">
                {comparison.improvementPercentage >= 0 ? '+' : ''}{comparison.improvementPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Three Column Comparison Cards: First vs Latest vs Best */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* First Attempt */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  पहला प्रयास (First Attempt)
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(comparison.first.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400">प्राप्तांक (Score)</div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {comparison.first.result.finalScore.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Accuracy</span>
                    <span className="font-extrabold text-blue-600">
                      {comparison.first.result.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Time</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-300">
                      {Math.floor(comparison.first.result.totalTimeSpentSeconds / 60)}m
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onViewResult(comparison.first)}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                परिणाम देखें
              </button>
            </div>

            {/* Latest Attempt */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-blue-500 dark:border-blue-600 shadow-md space-y-4 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  नवीनतम (Latest Attempt)
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(comparison.latest.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400">प्राप्तांक (Score)</div>
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {comparison.latest.result.finalScore.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Accuracy</span>
                    <span className="font-extrabold text-blue-600">
                      {comparison.latest.result.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Time</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-300">
                      {Math.floor(comparison.latest.result.totalTimeSpentSeconds / 60)}m
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onViewResult(comparison.latest)}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                परिणाम देखें
              </button>
            </div>

            {/* Best Attempt */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Award size={13} />
                  <span>सर्वश्रेष्ठ (Best Attempt)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Attempt #{comparison.best.attemptNumber}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400">सर्वोत्तम स्कोर (Best)</div>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {comparison.best.result.finalScore.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Accuracy</span>
                    <span className="font-extrabold text-emerald-600">
                      {comparison.best.result.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Time</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-300">
                      {Math.floor(comparison.best.result.totalTimeSpentSeconds / 60)}m
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onViewResult(comparison.best)}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                परिणाम देखें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
