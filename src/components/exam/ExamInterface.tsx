import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Menu,
  X,
  Send,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Pause,
  Play,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { TestItem, UserResponse, TestResult, TestAttempt, Question, AppSettings } from '../../types';
import { soundManager } from '../../utils/audio';
import { getTranslation, Language } from '../../utils/translations';
import { getQuestionDisplay, getQuestionDisplayAsync } from '../../utils/bilingualHelper';
import { QuestionFigure } from '../common/QuestionFigure';
import { MathText } from '../common/MathText';

interface ExamInterfaceProps {
  test: TestItem;
  initialQuestions?: Question[];
  initialResponses?: Record<number, UserResponse>;
  initialRemainingSeconds?: number;
  initialQuestionIndex?: number;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onSubmitExam: (attempt: TestAttempt) => void;
  onExitWithoutSubmit: () => void;
  onAutosaveState: (state: {
    testId: string;
    remainingSeconds: number;
    responses: Record<number, UserResponse>;
    currentQuestionIndex: number;
  }) => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  test,
  initialQuestions,
  initialResponses,
  initialRemainingSeconds,
  initialQuestionIndex = 0,
  settings,
  onUpdateSettings,
  onSubmitExam,
  onExitWithoutSubmit,
  onAutosaveState
}) => {
  const currentLang = (settings.language || 'en') as Language;
  const t = getTranslation(currentLang);

  // Question language preference ('en' | 'hi')
  const [questionLang, setQuestionLang] = useState<'en' | 'hi'>(() => {
    return test.config.defaultQuestionLanguage || settings.questionLanguage || 'en';
  });

  // Questions snapshot (shuffle if configured)
  const questions = useMemo(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    let list = [...test.questions];
    if (test.config.shuffleQuestions) {
      list = list.sort(() => Math.random() - 0.5);
    }
    return list;
  }, [test, initialQuestions]);

  const totalQuestions = questions.length;
  const [currentIndex, setCurrentIndex] = useState<number>(initialQuestionIndex);

  // User responses dictionary
  const [responses, setResponses] = useState<Record<number, UserResponse>>(() => {
    if (initialResponses) return initialResponses;
    const initial: Record<number, UserResponse> = {};
    for (let i = 0; i < totalQuestions; i++) {
      initial[i] = {
        selectedOption: null,
        isMarkedForReview: false,
        timeSpentSeconds: 0,
        visited: i === 0 // mark first question as visited
      };
    }
    return initial;
  });

  // Countdown Timer
  const totalDurationSeconds = test.config.durationMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    initialRemainingSeconds !== undefined ? initialRemainingSeconds : totalDurationSeconds
  );

  // PAUSE state
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Time tracker for current question
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);

  // Mark current question as visited
  useEffect(() => {
    if (isPaused) return;
    setResponses(prev => {
      const curr = prev[currentIndex] || {
        selectedOption: null,
        isMarkedForReview: false,
        timeSpentSeconds: 0,
        visited: true
      };
      if (!curr.visited) {
        return {
          ...prev,
          [currentIndex]: { ...curr, visited: true }
        };
      }
      return prev;
    });
    questionStartTimeRef.current = Date.now();
  }, [currentIndex, isPaused]);

  // Main countdown timer (pauses when isPaused is true!)
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      if (isPaused) return; // Do not decrement when paused

      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleAutoSubmit('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPaused]);

  // Autosave periodically and on response changes
  useEffect(() => {
    onAutosaveState({
      testId: test.id,
      remainingSeconds,
      responses,
      currentQuestionIndex: currentIndex
    });
  }, [remainingSeconds, responses, currentIndex, test.id, onAutosaveState]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'परीक्षा चल रही है! क्या आप वास्तव में बाहर निकलना चाहते हैं?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Helper to commit time spent on current question when leaving it
  const commitQuestionTime = (fromIndex: number) => {
    if (isPaused) return;
    const elapsed = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
    setResponses(prev => {
      const curr = prev[fromIndex];
      if (!curr) return prev;
      return {
        ...prev,
        [fromIndex]: {
          ...curr,
          timeSpentSeconds: (curr.timeSpentSeconds || 0) + elapsed
        }
      };
    });
    questionStartTimeRef.current = Date.now();
  };

  // Pause test handler
  const handleTogglePause = () => {
    if (!isPaused) {
      commitQuestionTime(currentIndex);
      setIsPaused(true);
    } else {
      questionStartTimeRef.current = Date.now();
      setIsPaused(false);
    }
  };

  // Option select
  const handleSelectOption = (optionIndex: number) => {
    if (isPaused) return;
    soundManager.playClick();
    setResponses(prev => {
      const curr = prev[currentIndex];
      return {
        ...prev,
        [currentIndex]: {
          ...curr,
          selectedOption: optionIndex,
          visited: true
        }
      };
    });
  };

  // Clear Response
  const handleClearResponse = () => {
    if (isPaused) return;
    setResponses(prev => {
      const curr = prev[currentIndex];
      return {
        ...prev,
        [currentIndex]: {
          ...curr,
          selectedOption: null
        }
      };
    });
  };

  // Mark for review & next
  const handleMarkForReviewAndNext = () => {
    if (isPaused) return;
    commitQuestionTime(currentIndex);
    setResponses(prev => {
      const curr = prev[currentIndex];
      return {
        ...prev,
        [currentIndex]: {
          ...curr,
          isMarkedForReview: !curr.isMarkedForReview,
          visited: true
        }
      };
    });
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Save & Next
  const handleSaveAndNext = () => {
    if (isPaused) return;
    commitQuestionTime(currentIndex);
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Previous
  const handlePrevious = () => {
    if (isPaused) return;
    commitQuestionTime(currentIndex);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Jump directly to a question
  const handleJumpToQuestion = (idx: number) => {
    if (isPaused) return;
    commitQuestionTime(currentIndex);
    setCurrentIndex(idx);
    setIsPaletteDrawerOpen(false);
  };

  // Theme toggle
  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: next });
  };

  // Language toggle
  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    onUpdateSettings({ language: nextLang });
  };

  // Palette Status Logic
  const getQuestionStatus = (idx: number): 'answered' | 'not_answered' | 'review' | 'answered_review' | 'not_visited' => {
    const r = responses[idx];
    if (!r || !r.visited) return 'not_visited';
    const hasAnswer = r.selectedOption !== null;
    const isReview = r.isMarkedForReview;

    if (hasAnswer && isReview) return 'answered_review';
    if (isReview) return 'review';
    if (hasAnswer) return 'answered';
    return 'not_answered';
  };

  // Summary counts for palette & submission
  const summaryCounts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let markedForReview = 0;
    let answeredAndMarked = 0;
    let notVisited = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const status = getQuestionStatus(i);
      if (status === 'answered') answered++;
      else if (status === 'not_answered') notAnswered++;
      else if (status === 'review') markedForReview++;
      else if (status === 'answered_review') answeredAndMarked++;
      else if (status === 'not_visited') notVisited++;
    }

    return {
      answered,
      notAnswered,
      markedForReview,
      answeredAndMarked,
      notVisited,
      totalAnswered: answered + answeredAndMarked
    };
  }, [responses, totalQuestions]);

  // Submit test and compute results
  const handleFinalSubmit = () => {
    commitQuestionTime(currentIndex);
    soundManager.playSubmitSuccess();

    // Marks calculation
    const marksPerQ = test.config.marksPerQuestion;
    const negPerQ = test.config.negativeMarking;

    let correctCount = 0;
    let incorrectCount = 0;
    let attemptedCount = 0;
    let totalTimeSpent = totalDurationSeconds - remainingSeconds;

    questions.forEach((q, idx) => {
      const resp = responses[idx];
      if (resp && resp.selectedOption !== null) {
        attemptedCount++;
        if (resp.selectedOption === q.correctAnswerIndex) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    const unattemptedCount = totalQuestions - attemptedCount;
    const positiveMarks = correctCount * marksPerQ;
    const negativeMarks = incorrectCount * negPerQ;
    const finalScore = positiveMarks - negativeMarks;
    const maxMarks = totalQuestions * marksPerQ;
    const percentage = maxMarks > 0 ? (finalScore / maxMarks) * 100 : 0;
    const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
    const isPassed = percentage >= test.config.passingPercentage;

    const result: TestResult = {
      totalQuestions,
      attemptedQuestions: attemptedCount,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unattemptedQuestions: unattemptedCount,
      positiveMarks,
      negativeMarks,
      finalScore,
      maxMarks,
      percentage,
      accuracy,
      isPassed,
      totalTimeSpentSeconds: totalTimeSpent,
      averageTimePerQuestion: attemptedCount > 0 ? Math.round(totalTimeSpent / attemptedCount) : 0
    };

    const attempt: TestAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      testId: test.id,
      testTitle: test.title,
      folderId: test.folderId,
      folderName: 'Library',
      attemptNumber: (test.totalAttempts || 0) + 1,
      mode: 'exam',
      startedAt: Date.now() - totalTimeSpent * 1000,
      submittedAt: Date.now(),
      durationSeconds: totalDurationSeconds,
      timeSpentSeconds: totalTimeSpent,
      responses,
      questionsSnapshot: questions,
      result
    };

    onSubmitExam(attempt);
  };

  const handleAutoSubmit = (reason: string) => {
    alert('समय समाप्त हो गया है! आपकी परीक्षा स्वतः सबमिट की जा रही है। (Time is up! Submitting your test.)');
    handleFinalSubmit();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const currentResp = responses[currentIndex] || {
    selectedOption: null,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
    visited: true
  };

  // Get localized question presentation. Saved bilingual text is instant;
  // otherwise translate the question, every option and explanation asynchronously.
  const [questionDisplay, setQuestionDisplay] = useState(() =>
    currentQ ? getQuestionDisplay(currentQ, questionLang) : { text: '', options: [], explanation: '' }
  );
  const [isTranslatingQuestion, setIsTranslatingQuestion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!currentQ) {
      setQuestionDisplay({ text: '', options: [], explanation: '' });
      return;
    }
    setQuestionDisplay(getQuestionDisplay(currentQ, questionLang));
    setIsTranslatingQuestion(true);
    getQuestionDisplayAsync(currentQ, questionLang).then(display => {
      if (!cancelled) setQuestionDisplay(display);
    }).finally(() => {
      if (!cancelled) setIsTranslatingQuestion(false);
    });
    return () => { cancelled = true; };
  }, [currentQ, questionLang]);

  const isLowTime = remainingSeconds <= 300; // under 5 minutes

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 flex flex-col font-sans select-none overflow-hidden transition-colors">
      {/* 1. TOP EXAM HEADER */}
      <header className="relative z-50 min-h-16 h-auto bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between shadow-xs shrink-0 gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5 min-w-0 w-full md:w-auto">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            AW
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
              {test.title}
            </h1>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="truncate">{t.sectionTitle}</span>
              <span className="hidden sm:inline">• +{test.config.marksPerQuestion} / -{test.config.negativeMarking}</span>
            </div>
          </div>
        </div>

        {/* Center / Right: Pause Button + Countdown Timer + Question Language + Theme + Submit */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full md:w-auto min-w-0">
          {/* PAUSE BUTTON ⏸️ */}
          <button
            type="button"
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-xs ${
              isPaused
                ? 'bg-amber-500 border-amber-600 text-white animate-pulse'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={isPaused ? t.resumeTest : t.pauseTest}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
            <span>{isPaused ? t.resumeTest : t.pauseTest}</span>
          </button>

          {/* Countdown Timer Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-extrabold text-xs sm:text-sm border shadow-xs transition-colors ${
              isLowTime
                ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400 animate-pulse'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300'
            }`}
          >
            <Clock size={16} className={isLowTime ? 'animate-spin' : ''} />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Question Language Dropdown (English / Hindi) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <Languages size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <label htmlFor="header-q-lang" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap hidden sm:inline">
              View in:
            </label>
            <select
              id="header-q-lang"
              value={questionLang}
              onChange={(e) => setQuestionLang(e.target.value as 'en' | 'hi')}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>

          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light theme"
          >
            {settings.theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
          </button>

          {/* Fullscreen toggle button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden md:flex p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Question Palette Drawer Toggle (Mobile) */}
          <button
            type="button"
            onClick={() => setIsPaletteDrawerOpen(!isPaletteDrawerOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            aria-label="Toggle Question Palette"
          >
            <Menu size={18} />
          </button>

          {/* Submit Test Button */}
          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Send size={14} />
            <span className="hidden xs:inline">{t.submitTest}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN EXAM BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT / CENTER: Question Card & Answering Area */}
        <main className={`flex-1 flex flex-col justify-between overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-all ${
          isPaused ? 'filter blur-sm pointer-events-none select-none' : ''
        }`}>
          <div className="max-w-4xl w-full mx-auto space-y-6">
            {/* Question Top Info Bar */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-extrabold text-xs tracking-wide">
                  {t.question} {currentIndex + 1} {t.of} {totalQuestions}
                </span>

                {currentResp.isMarkedForReview && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs">
                    <Bookmark size={13} />
                    <span>{t.underReview}</span>
                  </span>
                )}
              </div>

              {/* In-exam question language selector (English / Hindi) & Marks info */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-xs">
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

                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:block">
                  {t.marksLabel}: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{test.config.marksPerQuestion}</span> | {t.negativeLabel}: <span className="text-rose-600 dark:text-rose-400 font-bold">-{test.config.negativeMarking}</span>
                </div>
              </div>
            </div>

            {/* Question Text */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                <MathText>{questionDisplay.text}</MathText>
              </div>
              {isTranslatingQuestion && (
                <div className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400" role="status">
                  {questionLang === 'en' ? 'Translating question and options…' : 'प्रश्न और विकल्पों का अनुवाद हो रहा है…'}
                </div>
              )}
            </div>

            {/* Question Figure / Diagram (Non-Verbal / Vector / Image) */}
            <QuestionFigure question={currentQ} />

            {/* Options List */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                {t.selectOption}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = currentResp.selectedOption === optIdx;
                  const optText = questionDisplay.options[optIdx] ?? opt;
                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Option letter bubble */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>

                      {/* Option text & optional diagram */}
                      <div className="flex-1 text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 pt-1">
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

                      {/* Radio Checkbox indicator */}
                      <div className="pt-1.5">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. BOTTOM ACTION NAVIGATION TOOLBAR */}
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={handlePrevious}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={16} />
                <span>{t.previous}</span>
              </button>

              <button
                type="button"
                disabled={currentResp.selectedOption === null}
                onClick={handleClearResponse}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-colors"
              >
                {t.clearResponse}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold text-xs sm:text-sm transition-all"
              >
                <Bookmark size={15} />
                <span>{t.markForReviewAndNext}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95"
              >
                <span>{t.saveAndNext}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </main>

        {/* Mobile backdrop keeps the palette drawer separate from the question controls. */}
        {isPaletteDrawerOpen && (
          <button
            type="button"
            aria-label="Close question palette"
            onClick={() => setIsPaletteDrawerOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          />
        )}

        {/* RIGHT: QUESTION PALETTE */}
        <aside
          className={`fixed lg:static top-32 lg:top-auto bottom-0 right-0 z-40 w-80 max-w-[90vw] h-auto bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
            isPaletteDrawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          } ${isPaused ? 'filter blur-sm pointer-events-none' : ''}`}
        >
          <div className="overflow-y-auto space-y-5">
            {/* Palette Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                {t.questionPalette}
              </h3>
              <button
                type="button"
                onClick={() => setIsPaletteDrawerOpen(false)}
                className="lg:hidden text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* 5-State Color Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {summaryCounts.answered}
                </span>
                <span>{t.answered}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {summaryCounts.notAnswered}
                </span>
                <span>{t.notAnswered}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {summaryCounts.markedForReview}
                </span>
                <span>{t.markedReview}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="relative w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {summaryCounts.answeredAndMarked}
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
                </span>
                <span>{t.ansAndReview}</span>
              </div>

              <div className="flex items-center gap-2 col-span-2">
                <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                  {summaryCounts.notVisited}
                </span>
                <span>{t.notVisited}</span>
              </div>
            </div>

            {/* Numbered Questions Grid */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                {t.chooseQuestion}
              </div>

              <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
                {questions.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  const isCurrent = idx === currentIndex;

                  let badgeBg = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
                  if (status === 'answered') {
                    badgeBg = 'bg-emerald-600 text-white font-bold';
                  } else if (status === 'not_answered') {
                    badgeBg = 'bg-rose-600 text-white font-bold';
                  } else if (status === 'review') {
                    badgeBg = 'bg-purple-600 text-white font-bold';
                  } else if (status === 'answered_review') {
                    badgeBg = 'bg-purple-600 text-white font-bold ring-2 ring-emerald-400';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleJumpToQuestion(idx)}
                      className={`h-9 rounded-xl flex items-center justify-center text-xs transition-all relative ${badgeBg} ${
                        isCurrent
                          ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10'
                          : 'hover:opacity-80'
                      }`}
                    >
                      {idx + 1}
                      {status === 'answered_review' && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Palette Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
            >
              {t.submitTest}
            </button>

            <button
              type="button"
              onClick={onExitWithoutSubmit}
              className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {t.exitWithoutSubmit}
            </button>
          </div>
        </aside>

        {/* 4. PAUSE OVERLAY MODAL ⏸️ */}
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

              {/* Paused Statistics Badge */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">{t.timeRemaining}</div>
                  <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatTime(remainingSeconds)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">{t.answeredCount}</div>
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {summaryCounts.totalAnswered} / {totalQuestions}
                  </div>
                </div>
              </div>

              {/* Big Resume Button ▶️ */}
              <button
                type="button"
                onClick={handleTogglePause}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2.5"
              >
                <Play size={20} className="fill-white" />
                <span>{t.resumeTest} (▶️ Resume)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. SUBMIT CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl animate-scale-in">
            <div className="text-center space-y-2 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {t.confirmSubmitTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t.confirmSubmitDesc}
              </p>
            </div>

            {/* Submission Stats Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {summaryCounts.totalAnswered}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                  {t.answeredCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                  {totalQuestions - summaryCounts.totalAnswered}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                  {t.remainingCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                  {summaryCounts.markedForReview + summaryCounts.answeredAndMarked}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                  {t.markedReview}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                  {formatTime(remainingSeconds)}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                  {t.timeRemaining}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t.keepAnswering}
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all"
              >
                {t.confirmFinish}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
