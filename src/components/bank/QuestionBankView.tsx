import React, { useState } from 'react';
import {
  Database,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileCheck2,
  Copy,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Check,
  FolderPlus
} from 'lucide-react';
import { QuestionCollection, Question, TestItem, TestFolder } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { QuestionFigure } from '../common/QuestionFigure';

interface QuestionBankViewProps {
  collections: QuestionCollection[];
  folders: TestFolder[];
  onUpdateCollection: (collection: QuestionCollection) => Promise<void>;
  onDeleteCollection: (collectionId: string) => Promise<void>;
  onCreateTestFromCollection: (collection: QuestionCollection, folderId: string) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  collections,
  folders,
  onUpdateCollection,
  onDeleteCollection,
  onCreateTestFromCollection
}) => {
  const [selectedColId, setSelectedColId] = useState<string>(
    collections.length > 0 ? collections[0].id : ''
  );
  const [search, setSearch] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<{ q: Question; index: number } | null>(null);
  const [deleteTargetCol, setDeleteTargetCol] = useState<QuestionCollection | null>(null);
  const [deleteQuestionIndex, setDeleteQuestionIndex] = useState<number | null>(null);

  const currentCol = collections.find(c => c.id === selectedColId) || (collections.length > 0 ? collections[0] : null);

  // Filtered questions
  const filteredQuestions = currentCol
    ? currentCol.questions.filter(q => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
          q.text.toLowerCase().includes(s) ||
          q.options.some(opt => opt.toLowerCase().includes(s)) ||
          (q.explanation && q.explanation.toLowerCase().includes(s))
        );
      })
    : [];

  // Save edited question
  const handleSaveEditedQuestion = async () => {
    if (!currentCol || !editingQuestion) return;
    const updatedQuestions = [...currentCol.questions];
    updatedQuestions[editingQuestion.index] = editingQuestion.q;
    const updatedCollection = {
      ...currentCol,
      questions: updatedQuestions,
      updatedAt: Date.now()
    };
    await onUpdateCollection(updatedCollection);
    setEditingQuestion(null);
  };

  // Delete individual question
  const handleDeleteQuestionConfirm = async () => {
    if (!currentCol || deleteQuestionIndex === null) return;
    const updatedQuestions = currentCol.questions.filter((_, idx) => idx !== deleteQuestionIndex);
    const updatedCollection = {
      ...currentCol,
      questions: updatedQuestions,
      updatedAt: Date.now()
    };
    await onUpdateCollection(updatedCollection);
    setDeleteQuestionIndex(null);
  };

  if (collections.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <Database size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          प्रश्न बैंक खाली है (Question Bank Empty)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          जब आप &quot;Create Test&quot; से TXT फ़ाइल अपलोड करते हैं, तो वह स्वतः प्रश्न बैंक में स्थायी रूप से सुरक्षित हो जाती है।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="text-blue-600 dark:text-blue-400" size={26} />
            <span>Question Bank & Collections (प्रश्न बैंक)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            अपलोड किए गए सभी प्रश्न संकलन, संपादन और नए टेस्ट बनाने की स्वतंत्र सुविधा।
          </p>
        </div>

        {currentCol && (
          <button
            onClick={() => {
              const fId = folders.length > 0 ? folders[0].id : '';
              onCreateTestFromCollection(currentCol, fId);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md self-start sm:self-auto"
          >
            <FileCheck2 size={16} />
            <span>इस संकलन से नया टेस्ट बनाएं</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 4 Cols: Collections List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Collections (संकलन सूची)
          </div>

          <div className="space-y-2">
            {collections.map((col) => {
              const isSelected = col.id === selectedColId;
              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm truncate">{col.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {col.questions.length} प्रश्न • {new Date(col.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetCol(col);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="संकलन हटाएं"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 8 Cols: Questions in selected Collection */}
        <div className="lg:col-span-8 space-y-4">
          {currentCol && (
            <>
              {/* Search Bar inside Collection */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="इस संकलन में प्रश्न खोजें..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {filteredQuestions.length} प्रश्न
                </span>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-xs">
                        Q{idx + 1}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingQuestion({ q: { ...q }, index: idx })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                          title="प्रश्न संपादित करें (Edit Question)"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteQuestionIndex(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                          title="प्रश्न हटाएं (Delete Question)"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed font-hindi">
                      {q.text}
                    </div>

                    <QuestionFigure question={q} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-100 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1 font-hindi">{opt}</span>
                            {isCorrect && <Check size={14} className="text-emerald-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-blue-600">व्याख्या:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              प्रश्न संपादित करें (Edit Question)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                प्रश्न का विवरण (Question Text)
              </label>
              <textarea
                rows={3}
                value={editingQuestion.q.text}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    q: { ...editingQuestion.q, text: e.target.value }
                  })
                }
                className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                विकल्प और सही उत्तर चुनें:
              </label>
              {editingQuestion.q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingQuestion({
                        ...editingQuestion,
                        q: { ...editingQuestion.q, correctAnswerIndex: optIdx }
                      })
                    }
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      editingQuestion.q.correctAnswerIndex === optIdx
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </button>

                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...editingQuestion.q.options];
                      newOpts[optIdx] = e.target.value;
                      setEditingQuestion({
                        ...editingQuestion,
                        q: { ...editingQuestion.q, options: newOpts }
                      })
                    }}
                    className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                व्याख्या (Explanation)
              </label>
              <textarea
                rows={2}
                value={editingQuestion.q.explanation}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    q: { ...editingQuestion.q, explanation: e.target.value }
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-xl"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveEditedQuestion}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                अपडेट करें (Save Changes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Collection Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetCol}
        title="संकलन हटाएं (Delete Collection)"
        message={`क्या आप "${deleteTargetCol?.name}" को हटाना चाहते हैं?`}
        confirmLabel="हाँ, हटाएं"
        isDanger={true}
        onConfirm={async () => {
          if (deleteTargetCol) {
            await onDeleteCollection(deleteTargetCol.id);
            setDeleteTargetCol(null);
          }
        }}
        onCancel={() => setDeleteTargetCol(null)}
      />

      {/* Delete Question Modal */}
      <ConfirmModal
        isOpen={deleteQuestionIndex !== null}
        title="प्रश्न हटाएं (Delete Question)"
        message="क्या आप इस प्रश्न को संकलन से हटाना चाहते हैं?"
        confirmLabel="हाँ, हटाएं"
        isDanger={true}
        onConfirm={handleDeleteQuestionConfirm}
        onCancel={() => setDeleteQuestionIndex(null)}
      />
    </div>
  );
};
