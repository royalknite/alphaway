import React, { useState, useEffect, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import {
  TestFolder,
  TestItem,
  TestAttempt,
  QuestionCollection,
  AppSettings,
  ActiveExamState,
  NavigationTab
} from './types';
import { db, DEFAULT_SETTINGS } from './services/storage';
import { soundManager } from './utils/audio';

// Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { DigitalBooksExplorer } from './components/books/DigitalBooksExplorer';
import { AllTestsView } from './components/tests/AllTestsView';
import { CreateTestView } from './components/tests/CreateTestView';
import { ExamInterface } from './components/exam/ExamInterface';
import { PracticeInterface } from './components/exam/PracticeInterface';
import { ResultView } from './components/exam/ResultView';
import { AnswerAnalysisView } from './components/exam/AnswerAnalysisView';
import { PerformanceAnalyticsView } from './components/analytics/PerformanceAnalyticsView';
import { TestHistoryView } from './components/history/TestHistoryView';
import { TestComparisonView } from './components/history/TestComparisonView';
import { QuestionBankView } from './components/bank/QuestionBankView';
import { SettingsView } from './components/settings/SettingsView';
import { AndroidExportModal } from './components/android/AndroidExportModal';
import { BottomNav } from './components/common/BottomNav';
import { ConfirmModal } from './components/common/ConfirmModal';

export function App() {
  // Database states
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeExam, setActiveExam] = useState<ActiveExamState | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Active / Selected contextual entities
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [preselectedFolderForNewTest, setPreselectedFolderForNewTest] = useState<string | undefined>(undefined);
  const [currentActiveTest, setCurrentActiveTest] = useState<TestItem | null>(null);
  const [selectedAttemptForResult, setSelectedAttemptForResult] = useState<TestAttempt | null>(null);
  const [selectedTestIdForComparison, setSelectedTestIdForComparison] = useState<string | undefined>(undefined);

  // Unified navigation history for Android hardware Back and browser Back.
  // Each entry stores the exact screen context so nested folders and tests
  // return to the screen the user came from.
  const skipNextNavigationEntry = useRef(false);
  const hasMountedNavigation = useRef(false);
  const navigationDepth = useRef(0);
  const currentNavigationRef = useRef({
    tab: currentTab,
    folderId: selectedFolderId,
    testId: currentActiveTest?.id ?? null
  });
  currentNavigationRef.current = {
    tab: currentTab,
    folderId: selectedFolderId,
    testId: currentActiveTest?.id ?? null
  };

  const makeNavigationState = useCallback((depth: number) => ({
    alphaWayNavigation: true,
    depth,
    tab: currentNavigationRef.current.tab,
    folderId: currentNavigationRef.current.folderId,
    testId: currentNavigationRef.current.testId
  }), []);

  useEffect(() => {
    // Seed the WebView history so the first Back press is handled in-app.
    if (!window.history.state?.alphaWayNavigation) {
      navigationDepth.current = 0;
      window.history.replaceState(makeNavigationState(0), '', window.location.href);
    }

    const handleBrowserBack = (event: PopStateEvent) => {
      const state = event.state;

      // Reaching the page underneath the app means the user is at the root.
      if (!state?.alphaWayNavigation) {
        setShowExitConfirm(true);
        window.history.pushState(makeNavigationState(0), '', window.location.href);
        navigationDepth.current = 0;
        return;
      }

      navigationDepth.current = Math.max(0, Number(state.depth) || 0);
      skipNextNavigationEntry.current = true;
      if (state.tab) setCurrentTab(state.tab as NavigationTab);
      if (state.folderId === null || typeof state.folderId === 'string') {
        setSelectedFolderId(state.folderId);
      }
      if (state.testId) {
        const matchingTest = tests.find(test => test.id === state.testId);
        if (matchingTest) setCurrentActiveTest(matchingTest);
      } else {
        setCurrentActiveTest(null);
      }
      setIsMobileMenuOpen(false);
      setIsZipModalOpen(false);
      setShowExitConfirm(false);
    };

    window.addEventListener('popstate', handleBrowserBack);

    // Capacitor's native Android Back button does not reliably emit popstate
    // by itself, so route it through the same WebView history.
    let removeNativeListener: (() => void) | undefined;
    CapacitorApp.addListener('backButton', () => {
      if (showExitConfirm) {
        setShowExitConfirm(false);
        return;
      }
      if (navigationDepth.current > 0) {
        window.history.back();
      } else {
        setShowExitConfirm(true);
      }
    }).then(listener => {
      removeNativeListener = () => listener.remove();
    }).catch(error => {
      console.warn('Native back-button listener unavailable:', error);
    });

    return () => {
      window.removeEventListener('popstate', handleBrowserBack);
      removeNativeListener?.();
    };
  }, [makeNavigationState, tests, showExitConfirm]);

  useEffect(() => {
    if (!hasMountedNavigation.current) {
      hasMountedNavigation.current = true;
      return;
    }
    if (skipNextNavigationEntry.current) {
      skipNextNavigationEntry.current = false;
      return;
    }

    const nextDepth = navigationDepth.current + 1;
    navigationDepth.current = nextDepth;
    window.history.pushState(makeNavigationState(nextDepth), '', window.location.href);
  }, [currentTab, selectedFolderId, currentActiveTest?.id, makeNavigationState]);

  // Initial Data Load
  const loadAllData = useCallback(async () => {
    try {
      await db.seedDefaultDataIfNeeded();

      const [loadedFolders, loadedTests, loadedAttempts, loadedCollections, loadedSettings, activeState] =
        await Promise.all([
          db.getFolders(),
          db.getTests(),
          db.getAttempts(),
          db.getCollections(),
          db.getSettings(),
          db.getActiveExamState()
        ]);

      setFolders(loadedFolders);
      setTests(loadedTests);
      setAttempts(loadedAttempts);
      setCollections(loadedCollections);
      setSettings(loadedSettings);
      setActiveExam(activeState);

      soundManager.setEnabled(loadedSettings.soundEnabled);
    } catch (err) {
      console.error('Failed to load database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Sync Theme with HTML class
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Settings update
  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await db.saveSettings(updated);
    if (partial.soundEnabled !== undefined) {
      soundManager.setEnabled(partial.soundEnabled);
    }
  };

  // ---------------- Folder Operations ----------------
  const handleCreateFolder = async (name: string, parentId: string | null) => {
    const newFolder: TestFolder = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: parentId ? '#3b82f6' : '#2563eb'
    };
    await db.saveFolder(newFolder);
    setFolders(await db.getFolders());
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;
    const updated = { ...target, name: newName, updatedAt: Date.now() };
    await db.saveFolder(updated);
    setFolders(await db.getFolders());
  };

  const handleDeleteFolder = async (folderId: string, deleteTests: boolean, targetFolderId?: string) => {
    // Collect all subfolder IDs
    const toDeleteIds = new Set<string>([folderId]);
    const queue = [folderId];
    while (queue.length > 0) {
      const p = queue.shift()!;
      const children = folders.filter(f => f.parentId === p);
      children.forEach(c => {
        toDeleteIds.add(c.id);
        queue.push(c.id);
      });
    }

    // Handle tests inside
    const affectedTests = tests.filter(t => toDeleteIds.has(t.folderId));
    if (deleteTests) {
      for (const t of affectedTests) {
        await db.deleteTest(t.id);
      }
    } else if (targetFolderId) {
      for (const t of affectedTests) {
        await db.saveTest({ ...t, folderId: targetFolderId, updatedAt: Date.now() });
      }
    }

    // Delete folders
    for (const id of Array.from(toDeleteIds)) {
      await db.deleteFolder(id);
    }

    setFolders(await db.getFolders());
    setTests(await db.getTests());
    if (selectedFolderId && toDeleteIds.has(selectedFolderId)) {
      setSelectedFolderId(null);
    }
  };

  // ---------------- Test Operations ----------------
  const handleSaveTest = async (newTest: TestItem, rawTxt: string) => {
    await db.saveTest(newTest);

    // Also register collection in Question Bank
    const newCollection: QuestionCollection = {
      id: `col_${newTest.id}`,
      name: `${newTest.title} (Question Collection)`,
      questions: newTest.questions,
      rawTxt,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.saveCollection(newCollection);

    setTests(await db.getTests());
    setCollections(await db.getCollections());
    setSelectedFolderId(newTest.folderId);
    setCurrentTab('books');
  };

  const handleDuplicateTest = async (test: TestItem) => {
    const duplicate: TestItem = {
      ...test,
      id: `test_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${test.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalAttempts: 0,
      bestScore: undefined,
      latestScore: undefined,
      lastAttemptAt: undefined
    };
    await db.saveTest(duplicate);
    setTests(await db.getTests());
  };

  const handleMoveTest = async (testId: string, targetFolderId: string) => {
    const t = tests.find(item => item.id === testId);
    if (!t) return;
    const updated = { ...t, folderId: targetFolderId, updatedAt: Date.now() };
    await db.saveTest(updated);
    setTests(await db.getTests());
  };

  const handleDeleteTest = async (testId: string) => {
    await db.deleteTest(testId);
    setTests(await db.getTests());
  };

  // ---------------- Exam Execution & Submission ----------------
  const handleStartTest = (test: TestItem, mode: 'exam' | 'practice') => {
    setCurrentActiveTest(test);
    if (mode === 'exam') {
      setCurrentTab('exam');
    } else {
      setCurrentTab('practice');
    }
  };

  const handleResumeActiveExam = () => {
    if (!activeExam) return;
    const t = tests.find(item => item.id === activeExam.testId);
    if (t) {
      setCurrentActiveTest(t);
      if (activeExam.mode === 'exam') {
        setCurrentTab('exam');
      } else {
        setCurrentTab('practice');
      }
    }
  };

  const handleAutosaveState = useCallback(async (state: {
    testId: string;
    remainingSeconds: number;
    responses: Record<number, any>;
    currentQuestionIndex: number;
  }) => {
    if (!currentActiveTest) return;
    const examState: ActiveExamState = {
      testId: state.testId,
      attemptId: `temp_${state.testId}`,
      mode: 'exam',
      config: currentActiveTest.config,
      questions: currentActiveTest.questions,
      responses: state.responses,
      currentQuestionIndex: state.currentQuestionIndex,
      startedAt: Date.now() - (currentActiveTest.config.durationMinutes * 60 - state.remainingSeconds) * 1000,
      remainingSeconds: state.remainingSeconds
    };
    await db.saveActiveExamState(examState);
  }, [currentActiveTest]);

  const handleSubmitExamAttempt = async (attempt: TestAttempt) => {
    // Associate folder name
    const folder = folders.find(f => f.id === attempt.folderId);
    if (folder) attempt.folderName = folder.name;

    await db.saveAttempt(attempt);
    await db.saveActiveExamState(null); // Clear active exam cache
    setActiveExam(null);

    setAttempts(await db.getAttempts());
    setTests(await db.getTests()); // refresh updated stats

    setSelectedAttemptForResult(attempt);
    setCurrentTab('result');
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    await db.deleteAttempt(attemptId);
    setAttempts(await db.getAttempts());
    setTests(await db.getTests());
  };

  // Question Collections update
  const handleUpdateCollection = async (collection: QuestionCollection) => {
    await db.saveCollection(collection);
    setCollections(await db.getCollections());
  };

  const handleDeleteCollection = async (id: string) => {
    await db.deleteCollection(id);
    setCollections(await db.getCollections());
  };

  const handleCreateTestFromCollection = (collection: QuestionCollection, folderId: string) => {
    setPreselectedFolderForNewTest(folderId);
    setCurrentTab('create');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-xl animate-bounce">
          📖
        </div>
        <div className="font-extrabold text-xl text-slate-800 dark:text-slate-200">
          AlphaWay Test Platform
        </div>
        <p className="text-xs text-slate-400">डिजिटल टेक्स्टबुक एवं डेटाबेस लोड हो रहा है...</p>
      </div>
    );
  }

  // If in fullscreen exam or practice mode, render interface directly without default layout chrome
  if (currentTab === 'exam' && currentActiveTest) {
    return (
      <ExamInterface
        test={currentActiveTest}
        initialQuestions={activeExam?.testId === currentActiveTest.id ? activeExam.questions : undefined}
        initialResponses={activeExam?.testId === currentActiveTest.id ? activeExam.responses : undefined}
        initialRemainingSeconds={activeExam?.testId === currentActiveTest.id ? activeExam.remainingSeconds : undefined}
        initialQuestionIndex={activeExam?.testId === currentActiveTest.id ? activeExam.currentQuestionIndex : 0}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onSubmitExam={handleSubmitExamAttempt}
        onExitWithoutSubmit={() => { setCurrentActiveTest(null); setCurrentTab('home'); }}
        onAutosaveState={handleAutosaveState}
      />
    );
  }

  if (currentTab === 'practice' && currentActiveTest) {
    return (
      <PracticeInterface
        test={currentActiveTest}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onSubmitPracticeAttempt={handleSubmitExamAttempt}
        onExit={() => { setCurrentActiveTest(null); setCurrentTab('home'); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 1. Header */}
      <Header
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenZipModal={() => setIsZipModalOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        searchQuery={globalSearchQuery}
        setSearchQuery={setGlobalSearchQuery}
        totalTests={tests.length}
        totalFolders={folders.length}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* 2. Left Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
          testCount={tests.length}
          folderCount={folders.length}
          language={settings.language}
        />

        {/* 3. Main Center Content Container */}
        <main className="flex-1 md:pl-68 p-4 sm:p-6 lg:p-8 min-w-0 pb-28 md:pb-8">
          {/* TAB: Home Dashboard */}
          {currentTab === 'home' && (
            <HomeDashboard
              folders={folders}
              tests={tests}
              attempts={attempts}
              activeExam={activeExam}
              onNavigate={setCurrentTab}
              onStartTest={handleStartTest}
              onResumeActiveExam={handleResumeActiveExam}
              onViewResult={(att) => {
                setSelectedAttemptForResult(att);
                setCurrentTab('result');
              }}
              onOpenFolder={(fId) => {
                setSelectedFolderId(fId);
                setCurrentTab('books');
              }}
              onOpenZipModal={() => setIsZipModalOpen(true)}
            />
          )}

          {/* TAB: Digital Books Explorer */}
          {currentTab === 'books' && (
            <DigitalBooksExplorer
              folders={folders}
              tests={tests}
              attempts={attempts}
              currentFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onStartTest={handleStartTest}
              onDuplicateTest={handleDuplicateTest}
              onMoveTest={handleMoveTest}
              onDeleteTest={handleDeleteTest}
              onViewResult={(att) => {
                setSelectedAttemptForResult(att);
                setCurrentTab('result');
              }}
              onViewHistoryForTest={(tId) => {
                setSelectedTestIdForComparison(tId);
                setCurrentTab('comparison');
              }}
              onCreateTestInFolder={(fId) => {
                setPreselectedFolderForNewTest(fId);
                setCurrentTab('create');
              }}
            />
          )}

          {/* TAB: All Tests View */}
          {currentTab === 'tests' && (
            <AllTestsView
              tests={tests}
              folders={folders}
              attempts={attempts}
              onStartTest={handleStartTest}
              onNavigateToCreate={() => setCurrentTab('create')}
              onDuplicateTest={handleDuplicateTest}
              onDeleteTest={handleDeleteTest}
              onMoveTest={handleMoveTest}
              onViewResult={(att) => {
                setSelectedAttemptForResult(att);
                setCurrentTab('result');
              }}
            />
          )}

          {/* TAB: Create Test (TXT Upload & Configuration) */}
          {currentTab === 'create' && (
            <CreateTestView
              folders={folders}
              preselectedFolderId={preselectedFolderForNewTest}
              onSaveTest={handleSaveTest}
              onCancel={() => setCurrentTab('home')}
            />
          )}

          {/* TAB: Result Scorecard */}
          {currentTab === 'result' && selectedAttemptForResult && (
            <ResultView
              attempt={selectedAttemptForResult}
              onNavigate={setCurrentTab}
              onOpenAnalysis={(att) => {
                setSelectedAttemptForResult(att);
                setCurrentTab('analysis');
              }}
              onReattempt={(testId) => {
                const t = tests.find(item => item.id === testId);
                if (t) handleStartTest(t, 'exam');
              }}
              onCompareAttempts={(testId) => {
                setSelectedTestIdForComparison(testId);
                setCurrentTab('comparison');
              }}
            />
          )}

          {/* TAB: Detailed Question Analysis */}
          {currentTab === 'analysis' && selectedAttemptForResult && (
            <AnswerAnalysisView
              attempt={selectedAttemptForResult}
              onBackToResult={() => setCurrentTab('result')}
            />
          )}

          {/* TAB: Performance Analytics */}
          {currentTab === 'performance' && (
            <PerformanceAnalyticsView
              attempts={attempts}
              tests={tests}
            />
          )}

          {/* TAB: Permanent Test History */}
          {currentTab === 'history' && (
            <TestHistoryView
              attempts={attempts}
              onViewResult={(att) => {
                setSelectedAttemptForResult(att);
                setCurrentTab('result');
              }}
              onOpenAnalysis={(att) => {
                setSelectedAttemptForResult(att);
                setCurrentTab('analysis');
              }}
              onCompareAttempts={(testId) => {
                setSelectedTestIdForComparison(testId);
                setCurrentTab('comparison');
              }}
              onDeleteAttempt={handleDeleteAttempt}
            />
          )}

          {/* TAB: Test Comparison Dashboard */}
          {currentTab === 'comparison' && (
            <TestComparisonView
              tests={tests}
              attempts={attempts}
              selectedTestId={selectedTestIdForComparison}
              onSelectTest={setSelectedTestIdForComparison}
              onViewResult={(att) => {
                setSelectedAttemptForResult(att);
                setCurrentTab('result');
              }}
            />
          )}

          {/* TAB: Question Bank */}
          {currentTab === 'question-bank' && (
            <QuestionBankView
              collections={collections}
              folders={folders}
              onUpdateCollection={handleUpdateCollection}
              onDeleteCollection={handleDeleteCollection}
              onCreateTestFromCollection={handleCreateTestFromCollection}
            />
          )}

          {/* TAB: Settings & Backup */}
          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenZipModal={() => setIsZipModalOpen(true)}
              onDatabaseRestored={loadAllData}
            />
          )}
        </main>
      </div>

      {/* 4. Bottom Mobile Navigation Bar (Home left, Create center, Settings right) */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={setCurrentTab}
      />

      <ConfirmModal
        isOpen={showExitConfirm}
        title="ऐप से बाहर निकलें?"
        message="आप Home स्क्रीन पर हैं। क्या आप AlphaWay बंद करना चाहते हैं?"
        confirmLabel="हाँ, बाहर निकलें"
        cancelLabel="यहीं रहें"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          CapacitorApp.exitApp().catch(() => {
            // Browser preview cannot close the native application.
          });
        }}
      />

      {/* 5. Android APK & GitHub Actions Modal */}
      <AndroidExportModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
      />
    </div>
  );
}
export default App;
