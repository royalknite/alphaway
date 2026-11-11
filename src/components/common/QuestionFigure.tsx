import React, { useState } from 'react';
import { Maximize2, X, Eye } from 'lucide-react';
import { Question } from '../../types';

interface QuestionFigureProps {
  question: Question;
  className?: string;
}

export const QuestionFigure: React.FC<QuestionFigureProps> = ({ question, className = '' }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // 1. If explicit Image or PDF is present
  if (question.imageUrl) {
    const isPdf = question.imageUrl.startsWith('data:application/pdf') || question.imageUrl.endsWith('.pdf');

    return (
      <div className={`my-4 flex flex-col items-center ${className}`}>
        <div className="relative group max-w-lg w-full bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center">
          {isPdf ? (
            <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden">
              <object
                data={question.imageUrl}
                type="application/pdf"
                className="w-full h-full rounded-xl"
              >
                <p className="text-xs text-slate-500 p-4 text-center">
                  PDF संलग्न है (PDF Document Attached).
                </p>
              </object>
            </div>
          ) : (
            <img
              src={question.imageUrl}
              alt="Question Diagram"
              className="max-h-72 w-auto object-contain rounded-xl transition-transform group-hover:scale-[1.01]"
            />
          )}

          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors shadow-sm cursor-pointer"
            title="Enlarge Figure"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Zoom Lightbox Modal */}
        {isZoomed && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setIsZoomed(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
              >
                <X size={24} />
              </button>
              {isPdf ? (
                <div className="w-full h-[80vh] bg-white rounded-2xl overflow-hidden p-2">
                  <object data={question.imageUrl} type="application/pdf" className="w-full h-full rounded-xl" />
                </div>
              ) : (
                <img
                  src={question.imageUrl}
                  alt="Enlarged Diagram"
                  className="max-h-[85vh] w-auto object-contain rounded-2xl bg-white p-2"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. If Figure Type is specified (Non-Verbal Reasoning Vector SVG Generators)
  if (!question.figureType) {
    return null;
  }

  const { figureType, figureData = {} } = question;

  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs max-w-xl w-full flex flex-col items-center justify-center">
        {/* FIGURE TYPE: COUNTING TRIANGLES */}
        {figureType === 'triangles' && (
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 240 180" className="w-56 sm:w-64 h-auto drop-shadow-sm">
              {/* Outer Triangle */}
              <polygon
                points="120,20 20,160 220,160"
                className="fill-blue-50/70 dark:fill-blue-950/40 stroke-blue-600 dark:stroke-blue-400 stroke-[2.5]"
              />
              {/* Vertical dividing lines from apex (120, 20) to base */}
              <line x1="120" y1="20" x2="70" y2="160" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />
              <line x1="120" y1="20" x2="120" y2="160" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />
              <line x1="120" y1="20" x2="170" y2="160" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />
              {/* Horizontal line if grid */}
              {figureData?.hasHorizontalLine && (
                <line x1="70" y1="90" x2="170" y2="90" className="stroke-indigo-600 dark:stroke-indigo-400 stroke-2 stroke-dasharray-2" />
              )}
              {/* Numbering markers */}
              <text x="50" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">1</text>
              <text x="95" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">2</text>
              <text x="140" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">3</text>
              <text x="185" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">4</text>
            </svg>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
              प्रश्न आकृति: त्रिभुजों की संख्या ज्ञात करें (Find total triangles)
            </span>
          </div>
        )}

        {/* FIGURE TYPE: MIRROR IMAGE */}
        {figureType === 'mirror' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Source word/symbol */}
              <div className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-widest bg-slate-50 dark:bg-slate-800">
                {figureData?.text || 'WHITE'}
              </div>

              {/* Mirror line M-N with hatch marks */}
              <div className="flex flex-col items-center h-16 justify-center">
                <span className="text-[10px] font-bold text-slate-400">M</span>
                <div className="w-1 h-12 bg-rose-500 rounded-full relative my-0.5">
                  <div className="absolute left-1.5 top-1 bottom-1 w-2 flex flex-col justify-between">
                    <span className="block w-2 h-0.5 bg-rose-400 rotate-45" />
                    <span className="block w-2 h-0.5 bg-rose-400 rotate-45" />
                    <span className="block w-2 h-0.5 bg-rose-400 rotate-45" />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">N</span>
              </div>

              {/* Target placeholder box */}
              <div className="w-20 h-12 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center font-bold text-blue-500 text-lg bg-blue-50/50 dark:bg-blue-950/20">
                ?
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
              दर्पण प्रतिबिम्ब रेखा MN पर स्थित है (Mirror placed on MN)
            </span>
          </div>
        )}

        {/* FIGURE TYPE: WATER IMAGE */}
        {figureType === 'water' && (
          <div className="flex flex-col items-center space-y-2">
            <div className="px-6 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl font-mono font-extrabold text-2xl text-slate-900 dark:text-white tracking-widest bg-white dark:bg-slate-900 shadow-xs">
              {figureData?.text || 'BRIDGE'}
            </div>
            {/* Water wavy reflection boundary */}
            <div className="w-48 h-2 flex items-center justify-center gap-1 overflow-hidden">
              <div className="w-full h-1 bg-gradient-to-r from-blue-300 via-cyan-400 to-blue-300 rounded-full animate-pulse" />
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              जल प्रतिबिम्ब (Water Reflection)
            </span>
          </div>
        )}

        {/* FIGURE TYPE: DICE & CUBE */}
        {figureType === 'dice' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-6 sm:gap-8">
              {/* Dice Position 1 */}
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 100 110" className="w-20 sm:w-24 h-auto">
                  {/* Top face */}
                  <polygon points="50,10 85,30 50,50 15,30" className="fill-blue-100 dark:fill-blue-900 stroke-blue-700 stroke-2" />
                  <text x="50" y="35" textAnchor="middle" className="font-extrabold text-base fill-blue-900 dark:fill-blue-100">
                    {figureData?.dice1?.top ?? '3'}
                  </text>
                  {/* Left face */}
                  <polygon points="15,30 50,50 50,90 15,70" className="fill-blue-200 dark:fill-blue-800 stroke-blue-700 stroke-2" />
                  <text x="32" y="66" textAnchor="middle" className="font-extrabold text-base fill-blue-900 dark:fill-blue-100">
                    {figureData?.dice1?.left ?? '1'}
                  </text>
                  {/* Right face */}
                  <polygon points="50,50 85,30 85,70 50,90" className="fill-blue-300 dark:fill-blue-700 stroke-blue-700 stroke-2" />
                  <text x="68" y="66" textAnchor="middle" className="font-extrabold text-base fill-blue-900 dark:fill-blue-100">
                    {figureData?.dice1?.right ?? '2'}
                  </text>
                </svg>
                <span className="text-[10px] font-bold text-slate-500 mt-1">स्थिति I (Pos 1)</span>
              </div>

              {/* Dice Position 2 */}
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 100 110" className="w-20 sm:w-24 h-auto">
                  {/* Top face */}
                  <polygon points="50,10 85,30 50,50 15,30" className="fill-indigo-100 dark:fill-indigo-900 stroke-indigo-700 stroke-2" />
                  <text x="50" y="35" textAnchor="middle" className="font-extrabold text-base fill-indigo-900 dark:fill-indigo-100">
                    {figureData?.dice2?.top ?? '3'}
                  </text>
                  {/* Left face */}
                  <polygon points="15,30 50,50 50,90 15,70" className="fill-indigo-200 dark:fill-indigo-800 stroke-indigo-700 stroke-2" />
                  <text x="32" y="66" textAnchor="middle" className="font-extrabold text-base fill-indigo-900 dark:fill-indigo-100">
                    {figureData?.dice2?.left ?? '5'}
                  </text>
                  {/* Right face */}
                  <polygon points="50,50 85,30 85,70 50,90" className="fill-indigo-300 dark:fill-indigo-700 stroke-indigo-700 stroke-2" />
                  <text x="68" y="66" textAnchor="middle" className="font-extrabold text-base fill-indigo-900 dark:fill-indigo-100">
                    {figureData?.dice2?.right ?? '6'}
                  </text>
                </svg>
                <span className="text-[10px] font-bold text-slate-500 mt-1">स्थिति II (Pos 2)</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
              एक पासे की दो भिन्न स्थितियां (Two positions of a standard dice)
            </span>
          </div>
        )}

        {/* FIGURE TYPE: LOGICAL VENN DIAGRAM */}
        {figureType === 'venn' && (
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 140" className="w-48 sm:w-56 h-auto">
              <circle cx="80" cy="65" r="40" className="fill-rose-300/30 stroke-rose-500 stroke-2" />
              <circle cx="120" cy="65" r="40" className="fill-blue-300/30 stroke-blue-500 stroke-2" />
              <circle cx="100" cy="95" r="35" className="fill-emerald-300/30 stroke-emerald-500 stroke-2" />
            </svg>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
              <span>{figureData?.labels?.[0] || 'लेखक (Authors)'}</span>
              <span>•</span>
              <span>{figureData?.labels?.[1] || 'शिक्षक (Teachers)'}</span>
              <span>•</span>
              <span>{figureData?.labels?.[2] || 'पुरुष (Men)'}</span>
            </div>
          </div>
        )}

        {/* FIGURE TYPE: FIGURE SERIES (PATTERN SEQUENCE) */}
        {figureType === 'series' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-full">
              {/* Problem figure 1 */}
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full rotate-0 transition-transform" />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              {/* Problem figure 2 */}
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full rotate-45 transition-transform" />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              {/* Problem figure 3 */}
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full rotate-90 transition-transform" />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              {/* Problem figure 4 Question Mark */}
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center font-extrabold text-blue-600 text-lg">
                ?
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
              प्रश्न श्रृंखला में अगली आकृति ज्ञात करें (Find next pattern)
            </span>
          </div>
        )}

        {/* FIGURE TYPE: PAPER FOLDING & CUTTING */}
        {figureType === 'paper_cut' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-400 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 relative">
                Square
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-400 rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-blue-100/60 dark:bg-blue-900/40" style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }} />
                <span className="absolute bottom-1 left-1 text-[8px] font-bold text-blue-600">Folded</span>
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-400 rounded-lg relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-rose-500 border border-black" />
                <span className="absolute bottom-0 text-[8px] font-bold text-rose-600">Punch</span>
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center font-bold text-blue-600">
                ?
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
              कागज़ मोड़ने व छेद करने के बाद खुली आकृति (Unfolded pattern)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface OptionFigureProps {
  optionIndex: number;
  image?: string | null;
  figure?: any;
}

export const OptionFigure: React.FC<OptionFigureProps> = ({ optionIndex, image, figure }) => {
  if (image) {
    return (
      <div className="my-1.5 max-w-[120px]">
        <img
          src={image}
          alt={`Option ${String.fromCharCode(65 + optionIndex)} diagram`}
          className="h-16 w-auto object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1"
        />
      </div>
    );
  }

  if (figure) {
    // If option has SVG representation (e.g. rotated arrow or mirror text)
    if (figure.type === 'mirror_text') {
      return (
        <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold tracking-widest scale-x-[-1]">
          {figure.text}
        </div>
      );
    }
    if (figure.type === 'rotation_deg') {
      return (
        <div className="w-10 h-10 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800">
          <div
            className="w-1 h-6 bg-blue-600 rounded-full"
            style={{ transform: `rotate(${figure.deg}deg)` }}
          />
        </div>
      );
    }
  }

  return null;
};
