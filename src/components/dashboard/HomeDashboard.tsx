import React from 'react';
import {
  BookOpen,
  FileCheck2,
  CheckCircle2,
  Clock,
  Award,
  Play,
  RotateCcw,
  PlusCircle,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { TestFolder, TestItem, TestAttempt, NavigationTab, ActiveExamState } from '../../types';

interface HomeDashboardProps {
  folders: TestFolder[];
  tests: TestItem[];
  attempts: TestAttempt[];
  activeExam: ActiveExamState | null;
  onNavigate: (tab: NavigationTab) => void;
  onStartTest: (test: TestItem, mode: 'exam' | 'practice') => void;
  onResumeActiveExam: () => void;
  onViewResult: (attempt: TestAttempt) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenZipModal: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  folders,
  tests,
  attempts,
  activeExam,
  onNavigate,
  onStartTest,
  onResumeActiveExam,
  onViewResult,
  onOpenFolder,
  onOpenZipModal
}) => {
  // Calculations
  const totalFolders = folders.length;
  const totalTests = tests.length;
  const attemptedTestIds = new Set(attempts.map(a => a.testId));
  const totalAttempted = attemptedTestIds.size;
  const pendingTests = Math.max(0, totalTests - totalAttempted);

  // Overall Performance
  const totalScores = attempts.reduce((acc, a) => acc + a.result.finalScore, 0);
  const totalMaxMarks = attempts.reduce((acc, a) => acc + a.result.maxMarks, 0);
  const overallPercentage = totalMaxMarks > 0 ? (totalScores / totalMaxMarks) * 100 : 0;

  const totalCorrect = attempts.reduce((acc, a) => acc + a.result.correctAnswers, 0);
  const totalAttemptedQuestions = attempts.reduce((acc, a) => acc + a.result.attemptedQuestions, 0);
  const overallAccuracy = totalAttemptedQuestions > 0 ? (totalCorrect / totalAttemptedQuestions) * 100 : 0;

  // Recently Attempted (latest 4)
  const recentAttempts = attempts.slice(0, 4);

  // Recently Added Tests (latest 4)
  const recentTests = [...tests].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);

  // Find root folders (Bihar Police, Railway, SSC, etc.)
  const rootFolders = folders.filter(f => f.parentId === null);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Active Exam Resumption Notification Banner */}
      {activeExam && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-base">
                Active Test in Progress ⏸️
              </h4>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                You have an ongoing test session with time remaining. Your answers and timer are securely saved.
              </p>
            </div>
          </div>
          <button
            onClick={onResumeActiveExam}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all shrink-0 flex items-center justify-center gap-2"
          >
            <Play size={16} />
            Resume Test
          </button>
        </div>
      )}

      {/* Hero Textbook Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-6 sm:p-8 md:p-10 shadow-xl">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 translate-y-16 w-60 h-60 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-blue-100 text-xs font-semibold mb-4 border border-white/20">
            <Sparkles size={14} className="text-amber-300" />
            <span>Digital Textbook & Smart Exam Engine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            AlphaWay Test Platform 📖
          </h1>

          <p className="text-blue-100 text-sm sm:text-base leading-relaxed mb-6 font-normal">
            Create unlimited tests from TXT files, organize them inside digital textbook folders, practice on a realistic CBT exam interface, and view detailed performance analytics.
          </p>

          {/* Hero Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('create')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-lg transition-all active:scale-95"
            >
              <PlusCircle size={18} />
              <span>Create Test (TXT Upload)</span>
            </button>

            <button
              onClick={() => onNavigate('books')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 border border-white/20 text-white font-semibold text-sm transition-all active:scale-95"
            >
              <BookOpen size={18} />
              <span>My Books (Digital Library)</span>
            </button>

            <button
              onClick={onOpenZipModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold text-sm transition-all active:scale-95"
              title="Download GitHub Actions APK ready ZIP"
            >
              <Smartphone size={17} />
              <span>GitHub APK ZIP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Books/Folders */}
        <div
          onClick={() => onNavigate('books')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Books / Folders
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderOpen size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalFolders}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {rootFolders.length} मुख्य श्रेणियां (Main Categories)
          </p>
        </div>

        {/* Total Saved Tests */}
        <div
          onClick={() => onNavigate('tests')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Saved Tests
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck2 size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalTests}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            स्थायी रूप से सुरक्षित (In IndexedDB)
          </p>
        </div>

        {/* Total Attempted Tests */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attempted Tests
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalAttempted}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {attempts.length} कुल प्रयास (Total Attempts)
          </p>
        </div>

        {/* Pending Tests */}
        <div
          onClick={() => onNavigate('tests')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Tests
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {pendingTests}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            हल करने हेतु शेष (Ready to Take)
          </p>
        </div>
      </div>

      {/* Digital Textbook Library Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Digital Textbook Library (डिजिटल लाइब्रेरी)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              पुस्तकों की तरह व्यवस्थित फोल्डर एवं अध्यायवार टेस्ट
            </p>
          </div>
          <button
            onClick={() => onNavigate('books')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <span>सभी देखें (View All)</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rootFolders.map((rf) => {
            const childFolders = folders.filter(f => f.parentId === rf.id);
            const childFolderIds = new Set([rf.id, ...childFolders.map(c => c.id)]);
            const folderTests = tests.filter(t => childFolderIds.has(t.folderId));

            return (
              <div
                key={rf.id}
                onClick={() => {
                  onNavigate('books');
                  onOpenFolder(rf.id);
                }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                    style={{ backgroundColor: rf.color || '#2563eb' }}
                  >
                    📖
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {folderTests.length} Tests
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {rf.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {childFolders.length > 0
                    ? `सब-फोल्डर्स: ${childFolders.map(c => c.name).join(', ')}`
                    : 'सीधे टेस्ट सामग्री'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>पुस्तक खोलें (Open Book)</span>
                  <ChevronRightIcon />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Recently Attempted & Recently Added Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recently Attempted Tests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award size={20} className="text-amber-500" />
              <span>हालिया प्रयास (Recently Attempted)</span>
            </h2>
            {attempts.length > 0 && (
              <button
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                पूरा इतिहास ({attempts.length})
              </button>
            )}
          </div>

          {recentAttempts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Clock size={20} />
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                अभी तक कोई टेस्ट नहीं दिया गया है।
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                नीचे दिए गए टेस्ट में से कोई भी टेस्ट शुरू करें!
              </p>
              <button
                onClick={() => onNavigate('tests')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                टेस्ट चुनें (Browse Tests)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((att) => (
                <div
                  key={att.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {att.testTitle}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{new Date(att.submittedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {att.result.accuracy.toFixed(1)}% Accuracy
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {att.result.finalScore.toFixed(2)} / {att.result.maxMarks}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => onViewResult(att)}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                      >
                        Result
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Added Tests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 size={20} className="text-blue-500" />
              <span>हाल में जोड़े गए टेस्ट (Recently Added)</span>
            </h2>
            <button
              onClick={() => onNavigate('tests')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              सभी टेस्ट देखें ({tests.length})
            </button>
          </div>

          <div className="space-y-3">
            {recentTests.map((t) => {
              const testAttempts = attempts.filter(a => a.testId === t.id);
              const hasAttempted = testAttempts.length > 0;

              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {t.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{t.questions.length} प्रश्न</span>
                      <span>•</span>
                      <span>{t.config.durationMinutes} मिनट</span>
                      <span>•</span>
                      <span>+{t.config.marksPerQuestion}/-{t.config.negativeMarking}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onStartTest(t, 'practice')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="अभ्यास मोड (Practice with instant explanations)"
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => onStartTest(t, 'exam')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                      title="परीक्षा मोड (Real timed competitive exam)"
                    >
                      <Play size={14} />
                      <span>Exam</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
