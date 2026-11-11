import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Target,
  Clock,
  PieChart,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { TestAttempt, TestItem } from '../../types';

interface PerformanceAnalyticsViewProps {
  attempts: TestAttempt[];
  tests: TestItem[];
}

export const PerformanceAnalyticsView: React.FC<PerformanceAnalyticsViewProps> = ({
  attempts,
  tests
}) => {
  // Aggregate Metrics
  const totalAttempts = attempts.length;

  const totalScoreEarned = attempts.reduce((acc, a) => acc + a.result.finalScore, 0);
  const totalMaxMarks = attempts.reduce((acc, a) => acc + a.result.maxMarks, 0);
  const avgMarks = totalAttempts > 0 ? totalScoreEarned / totalAttempts : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.result.finalScore)) : 0;

  const totalCorrect = attempts.reduce((acc, a) => acc + a.result.correctAnswers, 0);
  const totalIncorrect = attempts.reduce((acc, a) => acc + a.result.incorrectAnswers, 0);
  const totalUnattempted = attempts.reduce((acc, a) => acc + a.result.unattemptedQuestions, 0);
  const totalQuestionsTaken = attempts.reduce((acc, a) => acc + a.result.totalQuestions, 0);

  const avgAccuracy =
    totalCorrect + totalIncorrect > 0
      ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100
      : 0;

  const totalStudySeconds = attempts.reduce((acc, a) => acc + a.result.totalTimeSpentSeconds, 0);
  const totalHours = (totalStudySeconds / 3600).toFixed(1);

  // Subject / Topic breakdown
  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();

    attempts.forEach(a => {
      a.questionsSnapshot.forEach((q, idx) => {
        const sub = q.subject || 'सामान्य (General)';
        const curr = map.get(sub) || { correct: 0, total: 0 };
        const resp = a.responses[idx];
        const isRight = resp && resp.selectedOption === q.correctAnswerIndex;
        map.set(sub, {
          correct: curr.correct + (isRight ? 1 : 0),
          total: curr.total + 1
        });
      });
    });

    return Array.from(map.entries()).map(([subject, stats]) => ({
      subject,
      correct: stats.correct,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    }));
  }, [attempts]);

  // Score progression across latest 8 attempts
  const recentProgression = useMemo(() => {
    return [...attempts]
      .reverse()
      .slice(-8)
      .map((a, i) => ({
        index: i + 1,
        title: a.testTitle.length > 15 ? a.testTitle.slice(0, 15) + '...' : a.testTitle,
        score: Math.max(0, a.result.finalScore),
        max: a.result.maxMarks,
        percentage: a.result.percentage
      }));
  }, [attempts]);

  if (totalAttempts === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <BarChart3 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          विश्लेषण के लिए डेटा उपलब्ध नहीं है
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          प्रगति और सटीकता देखने के लिए कृपया पहले कम से कम एक टेस्ट हल करें।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-blue-600 dark:text-blue-400" size={26} />
          <span>Performance Analytics (प्रदर्शन विश्लेषण)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          आपके सभी टेस्ट प्रयासों, सटीकता, अध्ययन समय और विषयवार दक्षता का विस्तृत विश्लेषण।
        </p>
      </div>

      {/* 5 Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Total Attempts
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalAttempts}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">कुल टेस्ट दिए गए</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Average Score
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {avgMarks.toFixed(1)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">औसत प्राप्तांक</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Best Score
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {bestScore.toFixed(1)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">सर्वश्रेष्ठ स्कोर</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Average Accuracy
          </span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {avgAccuracy.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">सटीकता प्रतिशत</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Study Time
          </span>
          <div className="text-2xl font-black text-amber-500">
            {totalHours} hrs
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{Math.round(totalStudySeconds / 60)} मिनट</p>
        </div>
      </div>

      {/* Charts Row 1: Score Improvement Graph & Question Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Score Improvement Progression SVG Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              <span>Score Progression (प्रयासवार प्रगति ग्राफ)</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">Recent attempts</span>
          </h3>

          <div className="h-64 w-full flex items-end gap-3 sm:gap-4 pt-8 pb-4 px-2 border-b border-slate-100 dark:border-slate-800">
            {recentProgression.map((item, idx) => {
              const heightPercent = Math.max(12, Math.min(100, item.percentage));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.percentage.toFixed(0)}%
                  </span>

                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[42px] rounded-t-xl bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 transition-all shadow-xs relative"
                  >
                    <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-extrabold text-white">
                      {item.score}
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[60px]" title={item.title}>
                    #{item.index}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            विगत प्रयासों में आपके प्रतिशत और अंक में क्रमिक सुधार प्रदर्शित है।
          </p>
        </div>

        {/* Question Outcome Distribution (Pie / Bar representation) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart size={18} className="text-emerald-500" />
            <span>Questions Accuracy Breakdown</span>
          </h3>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Correct (सही उत्तर)</span>
                </span>
                <span className="text-slate-900 dark:text-white font-extrabold">
                  {totalCorrect} ({((totalCorrect / totalQuestionsTaken) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(totalCorrect / totalQuestionsTaken) * 100}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <XCircle size={14} />
                  <span>Incorrect (गलत उत्तर)</span>
                </span>
                <span className="text-slate-900 dark:text-white font-extrabold">
                  {totalIncorrect} ({((totalIncorrect / totalQuestionsTaken) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(totalIncorrect / totalQuestionsTaken) * 100}%` }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  <span>Unattempted (छूटे हुए)</span>
                </span>
                <span className="text-slate-900 dark:text-white font-extrabold">
                  {totalUnattempted} ({((totalUnattempted / totalQuestionsTaken) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(totalUnattempted / totalQuestionsTaken) * 100}%` }}
                  className="h-full bg-slate-400 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <strong>सुझाव (Pro Tip):</strong> निगेटिव मार्किंग वाले टेस्ट में जिन प्रश्नों में 50% से कम विश्वास हो, उन्हें छोड़ना आपके अंतिम स्कोर को बेहतर बना सकता है।
          </div>
        </div>
      </div>

      {/* Row 2: Subject-Wise Proficiency Analysis */}
      {subjectBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            विषयवार दक्षता विश्लेषण (Subject & Chapter Mastery)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectBreakdown.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2"
              >
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-900 dark:text-white truncate max-w-[180px]">
                    {item.subject}
                  </span>
                  <span
                    className={`font-black ${
                      item.percentage >= 60
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : item.percentage >= 40
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className={`h-full rounded-full ${
                      item.percentage >= 60
                        ? 'bg-emerald-500'
                        : item.percentage >= 40
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>

                <div className="text-[11px] text-slate-400">
                  {item.correct} सही / कुल {item.total} प्रश्न
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
