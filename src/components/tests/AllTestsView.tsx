import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  Play,
  RotateCcw,
  Clock,
  Printer,
  Copy,
  FolderInput,
  Trash2,
  Award,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { TestItem, TestFolder, TestAttempt } from '../../types';
import { printQuestionPaper } from '../../utils/pdfExport';
import { ConfirmModal } from '../common/ConfirmModal';

interface AllTestsViewProps {
  tests: TestItem[];
  folders: TestFolder[];
  attempts: TestAttempt[];
  onStartTest: (test: TestItem, mode: 'exam' | 'practice') => void;
  onNavigateToCreate: () => void;
  onDuplicateTest: (test: TestItem) => Promise<void>;
  onDeleteTest: (testId: string) => Promise<void>;
  onMoveTest: (testId: string, folderId: string) => Promise<void>;
  onViewResult: (attempt: TestAttempt) => void;
}

export const AllTestsView: React.FC<AllTestsViewProps> = ({
  tests,
  folders,
  attempts,
  onStartTest,
  onNavigateToCreate,
  onDuplicateTest,
  onDeleteTest,
  onMoveTest,
  onViewResult
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'attempted' | 'unattempted' | 'passed'>('all');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<TestItem | null>(null);

  // Folder name mapping
  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach(f => map.set(f.id, f.name));
    return map;
  }, [folders]);

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = test.title.toLowerCase().includes(q);
        const folderName = folderMap.get(test.folderId) || '';
        const matchesFolder = folderName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesFolder) return false;
      }

      // Folder filter
      if (selectedFolderFilter !== 'all' && test.folderId !== selectedFolderFilter) {
        return false;
      }

      // Status filter
      const testAttempts = attempts.filter(a => a.testId === test.id);
      const isAttempted = testAttempts.length > 0;
      const isPassed = testAttempts.some(a => a.result.isPassed);

      if (filterMode === 'attempted' && !isAttempted) return false;
      if (filterMode === 'unattempted' && isAttempted) return false;
      if (filterMode === 'passed' && !isPassed) return false;

      return true;
    });
  }, [tests, search, selectedFolderFilter, filterMode, attempts, folderMap]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="text-blue-600 dark:text-blue-400" size={26} />
            <span>All Tests Library (सभी टेस्ट)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            कुल {tests.length} टेस्ट उपलब्ध हैं। परीक्षा या अभ्यास मोड में हल करें।
          </p>
        </div>

        <button
          onClick={onNavigateToCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <PlusCircle size={16} />
          <span>नया टेस्ट बनाएं (Create via TXT)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="शीर्षक या विषय से खोजें..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              सभी ({tests.length})
            </button>
            <button
              onClick={() => setFilterMode('unattempted')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'unattempted'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              शेष (Pending)
            </button>
            <button
              onClick={() => setFilterMode('attempted')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'attempted'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              प्रयास किए गए
            </button>
          </div>

          {/* Folder Selector */}
          <select
            value={selectedFolderFilter}
            onChange={(e) => setSelectedFolderFilter(e.target.value)}
            className="text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="all">सभी फोल्डर (All Books)</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileCheck2 size={24} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            कोई टेस्ट नहीं मिला (No Tests Found)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            सर्च फ़िल्टर बदलें या अपनी TXT फ़ाइल से नया टेस्ट अपलोड करें।
          </p>
          <button
            onClick={onNavigateToCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm"
          >
            नया टेस्ट अपलोड करें
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((test) => {
            const testAttempts = attempts.filter(a => a.testId === test.id);
            const latestAttempt = testAttempts.length > 0 ? testAttempts[0] : null;
            const folderName = folderMap.get(test.folderId) || 'Unassigned';

            return (
              <div
                key={test.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Folder Tag & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px] truncate">
                      📁 {folderName}
                    </span>

                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {test.questions.length} प्रश्न
                    </span>
                  </div>

                  {test.id === 'test_time_speed_distance_q20' && (
                    <div className="mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-300 dark:bg-amber-400 text-slate-950 font-black text-[10px] shadow-2xs">
                        <span>🟡 PDF Extracted (Yellow Highlight = Answer)</span>
                      </span>
                    </div>
                  )}

                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 line-clamp-2">
                    {test.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 my-2">
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      <span>{test.config.durationMinutes} मिनट</span>
                    </span>
                    <span>•</span>
                    <span>+{test.config.marksPerQuestion}/-{test.config.negativeMarking} Neg</span>
                  </div>

                  {/* Attempts stats */}
                  <div className="my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">प्रयास</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {testAttempts.length > 0 ? `${testAttempts.length} बार` : 'Unattempted'}
                      </span>
                    </div>

                    {test.bestScore !== undefined && (
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Best Score</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {test.bestScore.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onStartTest(test, 'practice')}
                      className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      अभ्यास (Practice)
                    </button>
                    <button
                      onClick={() => onStartTest(test, 'exam')}
                      className="py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Play size={14} />
                      <span>परीक्षा (Exam)</span>
                    </button>
                  </div>

                  {/* Utilities */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    {latestAttempt ? (
                      <button
                        onClick={() => onViewResult(latestAttempt)}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        परिणाम देखें
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">अभी प्रारंभ करें</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => printQuestionPaper(test)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                        title="Question Paper Print / PDF"
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        onClick={() => onDuplicateTest(test)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                        title="Duplicate Test"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(test)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title="Delete Test"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Test Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="टेस्ट हटाएं (Delete Test)"
        message={`क्या आप "${deleteTarget?.title}" को हटाना चाहते हैं?`}
        confirmLabel="हाँ, हटाएं"
        isDanger={true}
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteTest(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
