import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  FileText,
  Play,
  RotateCcw,
  Copy,
  Trash2,
  FolderInput,
  Search,
  ArrowUpDown,
  Printer,
  History,
  MoreVertical,
  Plus,
  Edit2,
  HelpCircle,
  Clock,
  Award
} from 'lucide-react';
import { TestFolder, TestItem, TestAttempt } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { printQuestionPaper } from '../../utils/pdfExport';

interface DigitalBooksExplorerProps {
  folders: TestFolder[];
  tests: TestItem[];
  attempts: TestAttempt[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: string, deleteTests: boolean, targetFolderId?: string) => Promise<void>;
  onStartTest: (test: TestItem, mode: 'exam' | 'practice') => void;
  onDuplicateTest: (test: TestItem) => Promise<void>;
  onMoveTest: (testId: string, targetFolderId: string) => Promise<void>;
  onDeleteTest: (testId: string) => Promise<void>;
  onViewResult: (attempt: TestAttempt) => void;
  onViewHistoryForTest: (testId: string) => void;
  onCreateTestInFolder: (folderId: string) => void;
}

export const DigitalBooksExplorer: React.FC<DigitalBooksExplorerProps> = ({
  folders,
  tests,
  attempts,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onStartTest,
  onDuplicateTest,
  onMoveTest,
  onDeleteTest,
  onViewResult,
  onViewHistoryForTest,
  onCreateTestInFolder
}) => {
  // Local state for modals & search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alpha' | 'newest' | 'attempted' | 'count'>('alpha');

  // Folder Modals
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createAsSubfolder, setCreateAsSubfolder] = useState(false);

  const [renameFolderTarget, setRenameFolderTarget] = useState<TestFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<TestFolder | null>(null);
  const [deleteActionChoice, setDeleteActionChoice] = useState<'delete_tests' | 'move_tests'>('move_tests');
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('');

  // Test Actions
  const [moveTestTarget, setMoveTestTarget] = useState<TestItem | null>(null);
  const [selectedMoveFolderId, setSelectedMoveFolderId] = useState<string>('');
  const [deleteTestTarget, setDeleteTestTarget] = useState<TestItem | null>(null);

  // Compute Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Library (लाइब्रेरी)' }];
    if (!currentFolderId) return crumbs;

    const path: TestFolder[] = [];
    let curr: TestFolder | undefined = folders.find(f => f.id === currentFolderId);
    while (curr) {
      path.unshift(curr);
      curr = curr.parentId ? folders.find(f => f.id === curr!.parentId) : undefined;
    }

    path.forEach(f => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  }, [currentFolderId, folders]);

  // Current subfolders
  const currentSubfolders = useMemo(() => {
    let list = folders.filter(f => f.parentId === currentFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }

    // Sort
    if (sortBy === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [folders, currentFolderId, searchQuery, sortBy]);

  // Current tests in this folder
  const currentTests = useMemo(() => {
    let list = currentFolderId ? tests.filter(t => t.folderId === currentFolderId) : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }

    if (sortBy === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'attempted') {
      list.sort((a, b) => (b.lastAttemptAt || 0) - (a.lastAttemptAt || 0));
    }
    return list;
  }, [tests, currentFolderId, searchQuery, sortBy]);

  // Helper for folder stats
  const getFolderStats = (folderId: string) => {
    const subfolderIds = new Set<string>([folderId]);
    // find all descendant folders
    const queue = [folderId];
    while (queue.length > 0) {
      const parent = queue.shift()!;
      const children = folders.filter(f => f.parentId === parent);
      children.forEach(c => {
        subfolderIds.add(c.id);
        queue.push(c.id);
      });
    }

    const folderTests = tests.filter(t => subfolderIds.has(t.folderId));
    return {
      subfolderCount: folders.filter(f => f.parentId === folderId).length,
      testCount: folderTests.length
    };
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const parent = createAsSubfolder && currentFolderId ? currentFolderId : null;
    await onCreateFolder(newFolderName.trim(), parent);
    setNewFolderName('');
    setIsCreateFolderModalOpen(false);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFolderTarget || !renameFolderName.trim()) return;
    await onRenameFolder(renameFolderTarget.id, renameFolderName.trim());
    setRenameFolderTarget(null);
  };

  const handleDeleteFolderConfirm = async () => {
    if (!deleteFolderTarget) return;
    const deleteTests = deleteActionChoice === 'delete_tests';
    const targetFolder = deleteActionChoice === 'move_tests' ? moveTargetFolderId : undefined;
    await onDeleteFolder(deleteFolderTarget.id, deleteTests, targetFolder);
    setDeleteFolderTarget(null);
  };

  const handleMoveTestSubmit = async () => {
    if (!moveTestTarget || !selectedMoveFolderId) return;
    await onMoveTest(moveTestTarget.id, selectedMoveFolderId);
    setMoveTestTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="text-blue-600 dark:text-blue-400" size={26} />
              <span>Digital Textbook Library (माय बुक्स)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              अपनी अध्ययन सामग्री को पुस्तकों, विषयों और अध्यायों के अनुसार व्यवस्थित करें
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCreateAsSubfolder(!!currentFolderId);
                setIsCreateFolderModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all"
            >
              <FolderPlus size={16} />
              <span>{currentFolderId ? 'नया सब-फोल्डर' : 'नया मुख्य फोल्डर'}</span>
            </button>

            {currentFolderId && (
              <button
                onClick={() => onCreateTestInFolder(currentFolderId)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all"
              >
                <Plus size={16} />
                <span>यहाँ टेस्ट जोड़ें</span>
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb Navigation Trail */}
        <div className="flex items-center flex-wrap gap-1.5 pt-3 text-xs sm:text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                <button
                  onClick={() => onSelectFolder(crumb.id)}
                  disabled={isLast}
                  className={`font-semibold px-2 py-1 rounded-lg transition-colors ${
                    isLast
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="इस फोल्डर में खोजें (Search)..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <ArrowUpDown size={14} />
            <span>क्रम (Sort):</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-3 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="alpha">वर्णानुक्रम (A-Z)</option>
            <option value="newest">हाल में जोड़े गए (Newest)</option>
            <option value="attempted">हाल में हल किए गए (Recent Attempt)</option>
          </select>
        </div>
      </div>

      {/* Subfolders Grid */}
      {currentSubfolders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {currentFolderId ? 'Subfolders (सब-फोल्डर्स)' : 'Books / Categories (मुख्य पुस्तकें)'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentSubfolders.map((folder) => {
              const stats = getFolderStats(folder.id);
              return (
                <div
                  key={folder.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group"
                >
                  <div
                    onClick={() => onSelectFolder(folder.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs"
                        style={{ backgroundColor: folder.color || '#2563eb' }}
                      >
                        📁
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {stats.testCount} Tests
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {folder.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {stats.subfolderCount > 0 ? `${stats.subfolderCount} सब-फोल्डर्स • ` : ''}
                      {stats.testCount} सुरक्षित टेस्ट
                    </p>
                  </div>

                  {/* Folder card action tools */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => onSelectFolder(folder.id)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <span>खोलें (Open)</span>
                      <ChevronRight size={14} />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRenameFolderTarget(folder);
                          setRenameFolderName(folder.name);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="नाम बदलें (Rename Folder)"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteFolderTarget(folder);
                          const others = folders.filter(f => f.id !== folder.id);
                          setMoveTargetFolderId(others.length > 0 ? others[0].id : '');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="हटाएं (Delete Folder)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tests inside Current Folder */}
      {currentFolderId && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              <span>इस फोल्डर के टेस्ट (Tests in this Book) ({currentTests.length})</span>
            </h2>

            <button
              onClick={() => onCreateTestInFolder(currentFolderId)}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Plus size={14} />
              <span>नया टेस्ट अपलोड करें</span>
            </button>
          </div>

          {currentTests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center mx-auto mb-3">
                <FileText size={22} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                इस फोल्डर में अभी कोई टेस्ट नहीं है
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                अपनी TXT फ़ाइल से तुरंत इस फोल्डर में नया टेस्ट बनाएं।
              </p>
              <button
                onClick={() => onCreateTestInFolder(currentFolderId)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md"
              >
                + यहाँ TXT टेस्ट अपलोड करें
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTests.map((test) => {
                const testAttempts = attempts.filter(a => a.testId === test.id);
                const latestAttempt = testAttempts.length > 0 ? testAttempts[0] : null;

                return (
                  <div
                    key={test.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                          {test.questions.length} प्रश्न • {test.config.durationMinutes} मिनट
                        </span>

                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            +{test.config.marksPerQuestion}/-{test.config.negativeMarking} Neg
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                        {test.title}
                      </h3>
                      {test.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                          {test.description}
                        </p>
                      )}

                      {/* Attempt stats badge */}
                      <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">Attempts</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {testAttempts.length} बार दिया
                          </div>
                        </div>

                        {test.bestScore !== undefined && (
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase font-bold">Best Score</div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                              {test.bestScore.toFixed(2)} / {test.questions.length * test.config.marksPerQuestion}
                            </div>
                          </div>
                        )}

                        {test.latestScore !== undefined && (
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase font-bold">Latest Score</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400">
                              {test.latestScore.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onStartTest(test, 'practice')}
                          className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          अभ्यास (Practice)
                        </button>

                        <button
                          onClick={() => onStartTest(test, 'exam')}
                          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <Play size={14} />
                          <span>परीक्षा (Start Exam)</span>
                        </button>
                      </div>

                      {/* Secondary Actions */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          {latestAttempt && (
                            <button
                              onClick={() => onViewResult(latestAttempt)}
                              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                            >
                              अंतिम परिणाम
                            </button>
                          )}
                          {testAttempts.length > 1 && (
                            <>
                              <span className="text-slate-300">•</span>
                              <button
                                onClick={() => onViewHistoryForTest(test.id)}
                                className="text-slate-600 dark:text-slate-400 font-semibold hover:underline"
                              >
                                इतिहास ({testAttempts.length})
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => printQuestionPaper(test)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="प्रश्न पत्र प्रिंट / PDF डाउनलोड करें"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setMoveTestTarget(test);
                              const others = folders.filter(f => f.id !== test.folderId);
                              setSelectedMoveFolderId(others.length > 0 ? others[0].id : '');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="दूसरे फोल्डर में भेजें (Move to Folder)"
                          >
                            <FolderInput size={15} />
                          </button>
                          <button
                            onClick={() => onDuplicateTest(test)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="कॉपी बनाएं (Duplicate Test)"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTestTarget(test)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="हटाएं (Delete Test)"
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
        </div>
      )}

      {/* MODAL: Create Folder */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateFolderSubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-scale-in"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {createAsSubfolder ? 'नया सब-फोल्डर बनाएं (New Subfolder)' : 'नया मुख्य फोल्डर बनाएं (New Book Category)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              उदा: &quot;Bihar Police&quot;, &quot;Daroga&quot;, &quot;Chapter 01&quot;, &quot;Mock Tests&quot;
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                फोल्डर का नाम (Folder Name)
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="फोल्डर का नाम लिखें..."
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                बनाएं (Create)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Rename Folder */}
      {renameFolderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleRenameSubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-scale-in"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              फोल्डर का नाम बदलें (Rename Folder)
            </h3>
            <div className="space-y-3 mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                नया नाम (New Folder Name)
              </label>
              <input
                type="text"
                required
                autoFocus
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenameFolderTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                सेव करें
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Folder with Safe Option Choice */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              फोल्डर हटाएं: &quot;{deleteFolderTarget.name}&quot;
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              इस फोल्डर में मौजूद टेस्ट के साथ क्या करना चाहते हैं?
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name="delChoice"
                  checked={deleteActionChoice === 'move_tests'}
                  onChange={() => setDeleteActionChoice('move_tests')}
                  className="mt-1"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    सुरक्षित: टेस्ट को दूसरे फोल्डर में स्थानांतरित करें (Move tests elsewhere)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-1 block">
                    आपके बनाए गए टेस्ट और इतिहास सुरक्षित रहेंगे।
                  </span>
                </div>
              </label>

              {deleteActionChoice === 'move_tests' && (
                <div className="pl-6">
                  <select
                    value={moveTargetFolderId}
                    onChange={(e) => setMoveTargetFolderId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    {folders
                      .filter(f => f.id !== deleteFolderTarget.id)
                      .map(f => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <label className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 cursor-pointer">
                <input
                  type="radio"
                  name="delChoice"
                  checked={deleteActionChoice === 'delete_tests'}
                  onChange={() => setDeleteActionChoice('delete_tests')}
                  className="mt-1 text-rose-600"
                />
                <div className="text-xs">
                  <span className="font-bold text-rose-600 dark:text-rose-400 block">
                    इस फोल्डर के सभी टेस्ट भी मिटाएं (Delete all tests inside)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-1 block">
                    सावधानी: इस फोल्डर के टेस्ट हमेशा के लिए हट जाएंगे।
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteFolderTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                रद्द करें
              </button>
              <button
                onClick={handleDeleteFolderConfirm}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                हटाएं (Confirm Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Move Test to Another Folder */}
      {moveTestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              टेस्ट को स्थानांतरित करें (Move Test)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              &quot;{moveTestTarget.title}&quot; को किस फोल्डर में ले जाना चाहते हैं?
            </p>

            <select
              value={selectedMoveFolderId}
              onChange={(e) => setSelectedMoveFolderId(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 mb-6"
            >
              {folders
                .filter(f => f.id !== moveTestTarget.folderId)
                .map(f => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMoveTestTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                रद्द करें
              </button>
              <button
                onClick={handleMoveTestSubmit}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                स्थानांतरित करें (Move)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Test Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTestTarget}
        title="टेस्ट हटाएं (Delete Test)"
        message={`क्या आप वास्तव में "${deleteTestTarget?.title}" को हटाना चाहते हैं?\n(नोट: पिछला प्रयास इतिहास सुरक्षित रहेगा।)`}
        confirmLabel="हाँ, हटाएं"
        isDanger={true}
        onConfirm={async () => {
          if (deleteTestTarget) {
            await onDeleteTest(deleteTestTarget.id);
            setDeleteTestTarget(null);
          }
        }}
        onCancel={() => setDeleteTestTarget(null)}
      />
    </div>
  );
};
