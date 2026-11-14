import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Award,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  X,
  Pause,
  Play,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { TestItem, Question, UserResponse, TestAttempt, TestResult, AppSettings } from '../../types';
import { soundManager } from '../../utils/audio';
import { getTranslation, Language } from '../../utils/translations';
import { getQuestionDisplay } from '../../utils/bilingualHelper';
import { QuestionFigure } from '../common/QuestionFigure';
import { MathText } from '../common/MathText';

interface PracticeInterfaceProps {
  test: TestItem;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onSubmitPracticeAttempt: (attempt: TestAttempt) => void;
  onExit: () => void;
}

export const PracticeInterface: React.FC<PracticeInterfaceProps> = ({
  test,
  settings,
  onUpdateSettings,
  onSubmitPracticeAttempt,
  onExit
}) => {
  const currentLang = (settings.language || 'en') as Language;
  const t = getTranslation(currentLang);

  const [questionLang, setQuestionLang] = useState<'en' | 'hi'>(() => {
    return test.config.defaultQuestionLanguage || settings.questionLanguage || 'en';
  });

  const [questions, setQuestions] = useState<Question[]>(test.questions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>({});
  const [showExplanationImmediately, setShowExplanationImmediately] = useState<boolean>(true);
  const [startTime] = useState<number>(Date.now());
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'unanswered'>('all');

  // PAUSE state
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const currentQ = questions[currentIndex];
  const selectedOption = userAnswers[currentIndex] ?? null;
  const isAnswered = selectedOption !== null;
  const isCorrect = isAnswered && selectedOption === currentQ.correctAnswerIndex;

  // Toggle Theme
  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: next });
  };

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    onUpdateSettings({ language: nextLang });
  };

  // Handle Option selection
  const handleOptionSelect = (optionIndex: number) => {
    if (isPaused) return;
    if (userAnswers[currentIndex] !== undefined) return; // locked once answered in practice

    const isRight = optionIndex === currentQ.correctAnswerIndex;
    if (isRight) {
      soundManager.playCorrect();
    } else {
      soundManager.playIncorrect();
    }

    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  // Next Question
  const handleNext = () => {
    if (isPaused) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Prev Question
  const handlePrev = () => {
    if (isPaused) return;
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Retry Incorrect Questions
  const handleRetryIncorrect = () => {
    if (isPaused) return;
    const incorrectIndices = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const ans = userAnswers[idx];
        return ans !== undefined && ans !== null && ans !== q.correctAnswerIndex;
      })
      .map(item => item.q);

    if (incorrectIndices.length === 0) {
      alert('कोई गलत प्रश्न नहीं है! (No incorrect questions to retry!)');
      return;
    }

    setQuestions(incorrectIndices);
    setCurrentIndex(0);
    setUserAnswers({});
    setFilterMode('incorrect');
  };

  // Retry Unanswered Questions
  const handleRetryUnanswered = () => {
    if (isPaused) return;
    const unansweredQuestions = questions.filter((_, idx) => userAnswers[idx] === undefined || userAnswers[idx] === null);

    if (unansweredQuestions.length === 0) {
      alert('सभी प्रश्न हल हो चुके हैं! (All questions have been answered!)');
      return;
    }

    setQuestions(unansweredQuestions);
    setCurrentIndex(0);
    setUserAnswers({});
    setFilterMode('unanswered');
  };

  // Reset & Practice All Again
  const handleRestartAll = () => {
    if (isPaused) return;
    setQuestions(test.questions);
    setCurrentIndex(0);
    setUserAnswers({});
    setFilterMode('all');
  };

  // Finish Practice and Save to History
  const handleFinishPractice = () => {
    const totalQuestions = questions.length;
    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    const responses: Record<number, UserResponse> = {};

    questions.forEach((q, idx) => {
      const ans = userAnswers[idx] ?? null;
      if (ans !== null) {
        attempted++;
        if (ans === q.correctAnswerIndex) correct++;
        else incorrect++;
      }

      responses[idx] = {
        selectedOption: ans,
        isMarkedForReview: false,
        timeSpentSeconds: 15,
        visited: true
      };
    });

    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const marksPerQ = test.config.marksPerQuestion;
    const finalScore = correct * marksPerQ;
    const maxMarks = totalQuestions * marksPerQ;

    const result: TestResult = {
      totalQuestions,
      attemptedQuestions: attempted,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      unattemptedQuestions: totalQuestions - attempted,
      positiveMarks: finalScore,
      negativeMarks: 0,
      finalScore,
      maxMarks,
      percentage: maxMarks > 0 ? (finalScore / maxMarks) * 100 : 0,
      accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
      isPassed: true,
      totalTimeSpentSeconds: timeSpent,
      averageTimePerQuestion: attempted > 0 ? Math.round(timeSpent / attempted) : 0
    };

    const attempt: TestAttempt = {
      id: `practice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      testId: test.id,
      testTitle: `${test.title} (Practice)`,
      folderId: test.folderId,
      folderName: 'Practice Book',
      attemptNumber: (test.totalAttempts || 0) + 1,
      mode: 'practice',
      startedAt: startTime,
      submittedAt: Date.now(),
      durationSeconds: timeSpent,
      timeSpentSeconds: timeSpent,
      responses,
      questionsSnapshot: questions,
      result
    };

    onSubmitPracticeAttempt(attempt);
  };

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 flex flex-col font-sans overflow-hidden transition-colors">
      {/* Practice Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-xs gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            PM
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                {test.title}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] uppercase shrink-0">
                Practice
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {t.practiceSub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Pause Button ⏸️ */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-xs ${
              isPaused
                ? 'bg-amber-500 border-amber-600 text-white animate-pulse'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={isPaused ? t.resumeTest : t.pauseTest}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isPaused ? t.resumeTest : t.pauseTest}</span>
          </button>

          {/* Question Language Dropdown (English / Hindi) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <Languages size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <label htmlFor="practice-q-lang" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap hidden sm:inline">
              View in:
            </label>
            <select
              id="practice-q-lang"
              value={questionLang}
              onChange={(e) => setQuestionLang(e.target.value as 'en' | 'hi')}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>

          {/* Dark / Light Mode Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
          </button>

          {/* Finish Button */}
          <button
            type="button"
            onClick={handleFinishPractice}
            className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs"
          >
            {t.finishPractice}
          </button>
        </div>
      </header>

      {/* Main Practice Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between relative">
        <div className={`max-w-3xl w-full mx-auto space-y-6 transition-all ${
          isPaused ? 'filter blur-sm pointer-events-none select-none' : ''
        }`}>
          {/* Progress Tracker with in-practice language dropdown */}
          <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
            <span>
              {t.question} <strong>{currentIndex + 1}</strong> {t.of} {questions.length}
            </span>

            {/* In-practice question language dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {t.viewQuestionIn}:
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

            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {t.answeredQuestions}: {answeredCount}
              </span>
              <span>•</span>
              <span>{questions.length - answeredCount} Remaining</span>
            </div>
          </div>

          {/* Question Text Card */}
          {(() => {
            const questionDisplay = getQuestionDisplay(currentQ, questionLang);
            return (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    <MathText>{questionDisplay.text}</MathText>
                  </div>
                </div>

                {/* Question Figure / Diagram */}
                <QuestionFigure question={currentQ} />

                {/* Options */}
                <div className="space-y-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedOption === optIdx;
                    const isRight = currentQ.correctAnswerIndex === optIdx;
                    const optText = questionDisplay.options[optIdx] ?? opt;

                    let style = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300';
                    if (isAnswered) {
                      if (isRight) {
                        style = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold';
                      } else if (isSelected && !isRight) {
                        style = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 font-bold';
                      }
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleOptionSelect(optIdx)}
                        className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${style}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isAnswered && isRight
                              ? 'bg-emerald-600 text-white'
                              : isAnswered && isSelected && !isRight
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>

                        <div className="flex-1 text-sm sm:text-base font-semibold pt-1">
                          <div><MathText>{optText}</MathText></div>
                          {currentQ.optionImages?.[optIdx] && (
                            <div className="mt-2 p-1 max-w-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              <img
                                src={currentQ.optionImages[optIdx]!}
                                alt={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className="max-h-36 w-auto object-contain rounded-lg"
                              />
                            </div>
                          )}
                        </div>

                        {isAnswered && isRight && (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs pt-1.5 shrink-0">
                            <Check size={16} />
                            <span>{t.correctAnswerLabel}</span>
                          </div>
                        )}

                        {isAnswered && isSelected && !isRight && (
                          <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs pt-1.5 shrink-0">
                            <X size={16} />
                            <span>{t.yourChoiceLabel}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {isAnswered && showExplanationImmediately && (
                  <div className="p-5 rounded-2xl bg-blue-50 dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 shadow-sm space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-sm">
                      <BookOpen size={16} className="text-blue-600" />
                      <span>{t.explanationTitle}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <MathText>{questionDisplay.explanation || 'No explanation available.'}</MathText>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Practice Bottom Controls */}
        <div className={`mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 max-w-3xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isPaused ? 'filter blur-sm pointer-events-none' : ''
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              <span>{t.previous}</span>
            </button>

            <button
              type="button"
              disabled={currentIndex === questions.length - 1}
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs"
            >
              <span>{t.saveAndNext}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Retry Actions Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRetryIncorrect}
              className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="केवल गलत हुए प्रश्नों को फिर से हल करें"
            >
              {t.retryIncorrect}
            </button>

            <button
              type="button"
              onClick={handleRestartAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw size={13} />
              <span>{t.restartAll}</span>
            </button>
          </div>
        </div>

        {/* Practice Pause Overlay Modal ⏸️ */}
        {isPaused && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                <Pause size={36} className="fill-amber-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {t.testPausedTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.testPausedDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2.5"
              >
                <Play size={20} className="fill-white" />
                <span>{t.resumeTest} (▶️ Resume)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
