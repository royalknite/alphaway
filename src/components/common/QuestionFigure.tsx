import React, { useState } from 'react';
import { Maximize2, X, Table as TableIcon, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
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

  // 2. If Figure Type is specified
  if (!question.figureType) {
    return null;
  }

  const { figureType, figureData = {} } = question;

  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs max-w-2xl w-full flex flex-col items-center justify-center">

        {/* -------------------- STATISTICAL TABLE (BOX / ROW / COLUMN) -------------------- */}
        {figureType === 'table' && (
          <div className="w-full flex flex-col items-center">
            {figureData.title && (
              <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-800 dark:text-slate-100 font-hindi">
                <TableIcon size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{figureData.title}</span>
              </div>
            )}
            <div className="w-full overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-center text-sm border-collapse">
                {figureData.headers && (
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                      {figureData.headers.map((h: string, i: number) => (
                        <th key={i} className="px-4 py-2.5 font-hindi border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {(figureData.rows || []).map((row: string[], rowIdx: number) => (
                    <tr
                      key={rowIdx}
                      className={`border-b last:border-b-0 border-slate-200 dark:border-slate-800 transition-colors ${
                        rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-850/50'
                      }`}
                    >
                      {row.map((cell: string, cellIdx: number) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-2 font-hindi text-slate-700 dark:text-slate-300 border-r last:border-r-0 border-slate-200 dark:border-slate-800 font-medium"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {figureData.footer && (
                  <tfoot>
                    <tr className="bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold border-t border-slate-300 dark:border-slate-700">
                      <td colSpan={figureData.headers?.length || 2} className="px-4 py-2 font-hindi text-xs sm:text-sm">
                        {figureData.footer}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* -------------------- BAR CHART / MULTI-BAR CHART -------------------- */}
        {figureType === 'bar_chart' && (
          <div className="w-full flex flex-col items-center">
            {figureData.title && (
              <div className="flex items-center gap-2 mb-2 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 font-hindi text-center">
                <BarChart3 size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{figureData.title}</span>
              </div>
            )}
            {figureData.yLabel && (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                Y-अक्ष: {figureData.yLabel}
              </div>
            )}

            {/* SVG Responsive Bar Chart */}
            {(() => {
              const categories: string[] = figureData.categories || [];
              const series: Array<{ name: string; values: number[]; color?: string }> =
                figureData.series || [
                  { name: figureData.title || 'Data', values: figureData.values || [], color: '#3b82f6' }
                ];

              const allValues = series.flatMap(s => s.values);
              const maxVal = Math.max(...allValues, 10);
              const chartHeight = 180;
              const chartWidth = Math.max(320, categories.length * (series.length > 1 ? 55 : 45) + 60);
              const leftPadding = 45;
              const bottomPadding = 30;
              const topPadding = 20;
              const plotWidth = chartWidth - leftPadding - 20;
              const plotHeight = chartHeight - topPadding - bottomPadding;

              const step = plotWidth / (categories.length || 1);
              const groupWidth = step * 0.75;
              const barWidth = groupWidth / series.length;

              const defaultColors = ['#0284c7', '#f97316', '#10b981', '#8b5cf6', '#e11d48'];

              return (
                <div className="w-full overflow-x-auto flex flex-col items-center">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full max-w-lg h-auto"
                    style={{ minWidth: `${Math.min(chartWidth, 420)}px` }}
                  >
                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = topPadding + plotHeight * (1 - pct);
                      const val = Math.round(maxVal * pct);
                      return (
                        <g key={i}>
                          <line
                            x1={leftPadding}
                            y1={y}
                            x2={chartWidth - 10}
                            y2={y}
                            className="stroke-slate-200 dark:stroke-slate-700/60 stroke-1 stroke-dasharray-2"
                          />
                          <text
                            x={leftPadding - 6}
                            y={y + 3}
                            textAnchor="end"
                            className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars for each category */}
                    {categories.map((cat, catIdx) => {
                      const groupX = leftPadding + catIdx * step + (step - groupWidth) / 2;

                      return (
                        <g key={catIdx}>
                          {series.map((s, sIdx) => {
                            const val = s.values[catIdx] ?? 0;
                            const barH = (val / maxVal) * plotHeight;
                            const barX = groupX + sIdx * barWidth;
                            const barY = topPadding + plotHeight - barH;
                            const color = s.color || defaultColors[sIdx % defaultColors.length];

                            return (
                              <g key={sIdx}>
                                <rect
                                  x={barX}
                                  y={barY}
                                  width={Math.max(barWidth - 2, 4)}
                                  height={Math.max(barH, 0)}
                                  rx={3}
                                  fill={color}
                                  className="transition-all hover:opacity-85"
                                />
                                <text
                                  x={barX + (barWidth - 2) / 2}
                                  y={barY - 3}
                                  textAnchor="middle"
                                  className="fill-slate-700 dark:fill-slate-200 text-[9px] font-bold font-mono"
                                >
                                  {val}
                                </text>
                              </g>
                            );
                          })}

                          {/* Category X-Axis Label */}
                          <text
                            x={groupX + groupWidth / 2}
                            y={chartHeight - 8}
                            textAnchor="middle"
                            className="fill-slate-600 dark:fill-slate-300 text-[10px] font-bold font-hindi"
                          >
                            {cat}
                          </text>
                        </g>
                      );
                    })}

                    {/* Baseline */}
                    <line
                      x1={leftPadding}
                      y1={topPadding + plotHeight}
                      x2={chartWidth - 10}
                      y2={topPadding + plotHeight}
                      className="stroke-slate-400 dark:stroke-slate-600 stroke-1"
                    />
                  </svg>

                  {/* Legend if multiple series */}
                  {series.length > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                      {series.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 font-hindi">
                          <span
                            className="w-3.5 h-3.5 rounded-sm shrink-0"
                            style={{ backgroundColor: s.color || defaultColors[idx % defaultColors.length] }}
                          />
                          <span>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {figureData.note && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center font-hindi">
                      {figureData.note}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* -------------------- PIE CHART -------------------- */}
        {figureType === 'pie_chart' && (
          <div className="w-full flex flex-col items-center">
            {figureData.title && (
              <div className="flex items-center gap-2 mb-1 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 font-hindi text-center">
                <PieChartIcon size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{figureData.title}</span>
              </div>
            )}
            {figureData.subtitle && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 font-hindi">
                {figureData.subtitle}
              </span>
            )}

            {(() => {
              const slices: Array<{ label: string; percentage: number; color?: string }> =
                figureData.slices || [];
              const defaultPalette = ['#3b82f6', '#ef4444', '#84cc16', '#a855f7', '#06b6d4', '#f59e0b'];

              let cumulativeAngle = 0;
              const radius = 68;
              const cx = 85;
              const cy = 85;

              return (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 my-1">
                  <svg viewBox="0 0 170 170" className="w-40 sm:w-44 h-auto drop-shadow-xs">
                    {slices.map((slice, i) => {
                      const angle = (slice.percentage / 100) * 360;
                      const startAngle = cumulativeAngle;
                      const endAngle = cumulativeAngle + angle;
                      cumulativeAngle = endAngle;

                      const startRad = (startAngle - 90) * (Math.PI / 180);
                      const endRad = (endAngle - 90) * (Math.PI / 180);

                      const x1 = cx + radius * Math.cos(startRad);
                      const y1 = cy + radius * Math.sin(startRad);
                      const x2 = cx + radius * Math.cos(endRad);
                      const y2 = cy + radius * Math.sin(endRad);

                      const largeArc = angle > 180 ? 1 : 0;
                      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                      const midRad = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
                      const textX = cx + (radius * 0.65) * Math.cos(midRad);
                      const textY = cy + (radius * 0.65) * Math.sin(midRad);

                      const color = slice.color || defaultPalette[i % defaultPalette.length];

                      return (
                        <g key={i}>
                          <path
                            d={pathData}
                            fill={color}
                            className="stroke-white dark:stroke-slate-900 stroke-1.5 transition-transform hover:opacity-90 cursor-default"
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="fill-white font-extrabold text-[10px] drop-shadow-sm font-mono pointer-events-none"
                          >
                            {slice.percentage}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Slices Legend */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {slices.map((slice, i) => {
                      const color = slice.color || defaultPalette[i % defaultPalette.length];
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-bold text-slate-700 dark:text-slate-300 font-hindi">
                            {slice.label}: <span className="font-mono text-slate-900 dark:text-white font-extrabold">{slice.percentage}%</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* -------------------- DATA INTERPRETATION (PIE + LINE COMPOSITE) -------------------- */}
        {figureType === 'data_interpretation' && (
          <div className="w-full flex flex-col items-center space-y-3">
            {figureData.title && (
              <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 font-hindi text-center">
                📊 {figureData.title}
              </div>
            )}
            {figureData.total && (
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold font-hindi">
                {figureData.total}
              </span>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {/* Part 1: Pie Chart */}
              {figureData.pie && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-hindi mb-2">
                    {figureData.pie.title || 'कुल अभ्यर्थी (%)'}
                  </span>
                  {(() => {
                    const slices: Array<{ label: string; percentage: number; color?: string }> =
                      figureData.pie.slices || [];
                    const defaultPalette = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];
                    let cumulativeAngle = 0;
                    const radius = 55;
                    const cx = 65;
                    const cy = 65;

                    return (
                      <div className="flex flex-col items-center">
                        <svg viewBox="0 0 130 130" className="w-32 h-32">
                          {slices.map((slice, i) => {
                            const angle = (slice.percentage / 100) * 360;
                            const startAngle = cumulativeAngle;
                            const endAngle = cumulativeAngle + angle;
                            cumulativeAngle = endAngle;

                            const startRad = (startAngle - 90) * (Math.PI / 180);
                            const endRad = (endAngle - 90) * (Math.PI / 180);

                            const x1 = cx + radius * Math.cos(startRad);
                            const y1 = cy + radius * Math.sin(startRad);
                            const x2 = cx + radius * Math.cos(endRad);
                            const y2 = cy + radius * Math.sin(endRad);

                            const largeArc = angle > 180 ? 1 : 0;
                            const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                            const midRad = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
                            const textX = cx + (radius * 0.62) * Math.cos(midRad);
                            const textY = cy + (radius * 0.62) * Math.sin(midRad);
                            const color = slice.color || defaultPalette[i % defaultPalette.length];

                            return (
                              <g key={i}>
                                <path d={pathData} fill={color} className="stroke-white dark:stroke-slate-900 stroke-1" />
                                <text
                                  x={textX}
                                  y={textY}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  className="fill-white font-extrabold text-[8px] font-mono pointer-events-none"
                                >
                                  {slice.label} {slice.percentage}%
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[10px]">
                          {slices.map((s, i) => (
                            <span key={i} className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || defaultPalette[i % defaultPalette.length] }} />
                              {s.label}: {s.percentage}%
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Part 2: Line Graph */}
              {figureData.line && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-hindi mb-2">
                    {figureData.line.title || 'बालकों और बालिकाओं का अनुपात'}
                  </span>
                  {(() => {
                    const points: Array<{ x: string; y: number }> = figureData.line.points || [];
                    const maxY = 2.5;
                    const w = 180;
                    const h = 110;
                    const padL = 30;
                    const padB = 22;
                    const padT = 15;
                    const padR = 15;
                    const plotW = w - padL - padR;
                    const plotH = h - padT - padB;
                    const stepX = points.length > 1 ? plotW / (points.length - 1) : plotW;

                    const coords = points.map((p, idx) => ({
                      xPos: padL + idx * stepX,
                      yPos: padT + plotH * (1 - p.y / maxY),
                      val: p.y,
                      label: p.x
                    }));

                    const polylinePoints = coords.map(c => `${c.xPos},${c.yPos}`).join(' ');

                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-44 h-auto">
                        {/* Grid */}
                        {[0, 0.5, 1, 1.5, 2, 2.5].map((yVal, i) => {
                          const yP = padT + plotH * (1 - yVal / maxY);
                          return (
                            <g key={i}>
                              <line x1={padL} y1={yP} x2={w - padR} y2={yP} className="stroke-slate-200 dark:stroke-slate-800 stroke-1" />
                              <text x={padL - 4} y={yP + 3} textAnchor="end" className="text-[7px] font-mono fill-slate-400">
                                {yVal}
                              </text>
                            </g>
                          );
                        })}

                        {/* Line */}
                        <polyline points={polylinePoints} fill="none" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />

                        {/* Dots and Labels */}
                        {coords.map((c, i) => (
                          <g key={i}>
                            <circle cx={c.xPos} cy={c.yPos} r={3} className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900 stroke-1" />
                            <text x={c.xPos} y={c.yPos - 4} textAnchor="middle" className="text-[7px] font-bold font-mono fill-slate-800 dark:fill-slate-200">
                              {c.val}
                            </text>
                            <text x={c.xPos} y={h - 6} textAnchor="middle" className="text-[8px] font-bold fill-slate-600 dark:fill-slate-300">
                              {c.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- LINE CHART -------------------- */}
        {figureType === 'line_chart' && (
          <div className="w-full flex flex-col items-center">
            {figureData.title && (
              <div className="flex items-center gap-2 mb-2 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 font-hindi text-center">
                <span>📈 {figureData.title}</span>
              </div>
            )}
            {(() => {
              const points: Array<{ x: string; y: number }> = figureData.points || [];
              const maxY = Math.max(...points.map(p => Number(p.y) || 0), 5);
              const w = 320;
              const h = 170;
              const padL = 42;
              const padB = 28;
              const padT = 18;
              const padR = 18;
              const plotW = w - padL - padR;
              const plotH = h - padT - padB;
              const stepX = points.length > 1 ? plotW / (points.length - 1) : plotW;
              const coords = points.map((p, idx) => ({
                xPos: padL + idx * stepX,
                yPos: padT + plotH * (1 - (Number(p.y) || 0) / maxY),
                val: p.y,
                label: p.x
              }));
              const polylinePoints = coords.map(c => `${c.xPos},${c.yPos}`).join(' ');

              return (
                <div className="w-full overflow-x-auto flex flex-col items-center">
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md h-auto">
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const yP = padT + plotH * (1 - pct);
                      const labelVal = Number((maxY * pct).toFixed(1));
                      return (
                        <g key={i}>
                          <line x1={padL} y1={yP} x2={w - padR} y2={yP} className="stroke-slate-200 dark:stroke-slate-700 stroke-1" />
                          <text x={padL - 6} y={yP + 3} textAnchor="end" className="text-[9px] font-mono fill-slate-400">
                            {labelVal}
                          </text>
                        </g>
                      );
                    })}
                    {coords.length > 1 && (
                      <polyline points={polylinePoints} fill="none" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />
                    )}
                    {coords.map((c, i) => (
                      <g key={i}>
                        <circle cx={c.xPos} cy={c.yPos} r={4} className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900 stroke-1" />
                        <text x={c.xPos} y={c.yPos - 7} textAnchor="middle" className="text-[9px] font-bold font-mono fill-slate-800 dark:fill-slate-200">
                          {c.val}
                        </text>
                        <text x={c.xPos} y={h - 8} textAnchor="middle" className="text-[9px] font-bold fill-slate-600 dark:fill-slate-300 font-hindi">
                          {c.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              );
            })()}
          </div>
        )}

        {/* -------------------- MATHEMATICAL FORMULA -------------------- */}
        {figureType === 'math_formula' && (
          <div className="flex flex-col items-center py-2 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {figureData.label && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-hindi mb-2">
                {figureData.label}
              </span>
            )}
            <div className="flex items-center gap-2 font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              <div className="flex flex-col items-center">
                <span className="px-2 py-0.5 border-b-2 border-slate-700 dark:border-slate-300">
                  {figureData.numerator || '(18² − 14²) × √225'}
                </span>
                <span className="px-2 py-0.5">
                  {figureData.denominator || '(10² − 6²)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- REASONING: COUNTING TRIANGLES -------------------- */}
        {figureType === 'triangles' && (
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 240 180" className="w-56 sm:w-64 h-auto drop-shadow-sm">
              <polygon
                points="120,20 20,160 220,160"
                className="fill-blue-50/70 dark:fill-blue-950/40 stroke-blue-600 dark:stroke-blue-400 stroke-[2.5]"
              />
              <line x1="120" y1="20" x2="70" y2="160" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />
              <line x1="120" y1="20" x2="120" y2="160" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />
              <line x1="120" y1="20" x2="170" y2="160" className="stroke-blue-600 dark:stroke-blue-400 stroke-2" />
              {figureData?.hasHorizontalLine && (
                <line x1="70" y1="90" x2="170" y2="90" className="stroke-indigo-600 dark:stroke-indigo-400 stroke-2 stroke-dasharray-2" />
              )}
              <text x="50" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">1</text>
              <text x="95" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">2</text>
              <text x="140" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">3</text>
              <text x="185" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold text-xs">4</text>
            </svg>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 font-hindi">
              प्रश्न आकृति: त्रिभुजों की संख्या ज्ञात करें (Find total triangles)
            </span>
          </div>
        )}

        {/* -------------------- REASONING: MIRROR IMAGE -------------------- */}
        {figureType === 'mirror' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-widest bg-slate-50 dark:bg-slate-800">
                {figureData?.text || 'WHITE'}
              </div>
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
              <div className="w-20 h-12 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center font-bold text-blue-500 text-lg bg-blue-50/50 dark:bg-blue-950/20">
                ?
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 font-hindi">
              दर्पण प्रतिबिम्ब रेखा MN पर स्थित है (Mirror placed on MN)
            </span>
          </div>
        )}

        {/* -------------------- REASONING: WATER IMAGE -------------------- */}
        {figureType === 'water' && (
          <div className="flex flex-col items-center space-y-2">
            <div className="px-6 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl font-mono font-extrabold text-2xl text-slate-900 dark:text-white tracking-widest bg-white dark:bg-slate-900 shadow-xs">
              {figureData?.text || 'BRIDGE'}
            </div>
            <div className="w-48 h-2 flex items-center justify-center gap-1 overflow-hidden">
              <div className="w-full h-1 bg-gradient-to-r from-blue-300 via-cyan-400 to-blue-300 rounded-full animate-pulse" />
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 font-hindi">
              जल प्रतिबिम्ब (Water Reflection)
            </span>
          </div>
        )}

        {/* -------------------- REASONING: DICE & CUBE -------------------- */}
        {figureType === 'dice' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 100 110" className="w-20 sm:w-24 h-auto">
                  <polygon points="50,10 85,30 50,50 15,30" className="fill-blue-100 dark:fill-blue-900 stroke-blue-700 stroke-2" />
                  <text x="50" y="35" textAnchor="middle" className="font-extrabold text-base fill-blue-900 dark:fill-blue-100">
                    {figureData?.dice1?.top ?? '3'}
                  </text>
                  <polygon points="15,30 50,50 50,90 15,70" className="fill-blue-200 dark:fill-blue-800 stroke-blue-700 stroke-2" />
                  <text x="32" y="66" textAnchor="middle" className="font-extrabold text-base fill-blue-900 dark:fill-blue-100">
                    {figureData?.dice1?.left ?? '1'}
                  </text>
                  <polygon points="50,50 85,30 85,70 50,90" className="fill-blue-300 dark:fill-blue-700 stroke-blue-700 stroke-2" />
                  <text x="68" y="66" textAnchor="middle" className="font-extrabold text-base fill-blue-900 dark:fill-blue-100">
                    {figureData?.dice1?.right ?? '2'}
                  </text>
                </svg>
                <span className="text-[10px] font-bold text-slate-500 mt-1 font-hindi">स्थिति I</span>
              </div>
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 100 110" className="w-20 sm:w-24 h-auto">
                  <polygon points="50,10 85,30 50,50 15,30" className="fill-indigo-100 dark:fill-indigo-900 stroke-indigo-700 stroke-2" />
                  <text x="50" y="35" textAnchor="middle" className="font-extrabold text-base fill-indigo-900 dark:fill-indigo-100">
                    {figureData?.dice2?.top ?? '3'}
                  </text>
                  <polygon points="15,30 50,50 50,90 15,70" className="fill-indigo-200 dark:fill-indigo-800 stroke-indigo-700 stroke-2" />
                  <text x="32" y="66" textAnchor="middle" className="font-extrabold text-base fill-indigo-900 dark:fill-indigo-100">
                    {figureData?.dice2?.left ?? '5'}
                  </text>
                  <polygon points="50,50 85,30 85,70 50,90" className="fill-indigo-300 dark:fill-indigo-700 stroke-indigo-700 stroke-2" />
                  <text x="68" y="66" textAnchor="middle" className="font-extrabold text-base fill-indigo-900 dark:fill-indigo-100">
                    {figureData?.dice2?.right ?? '6'}
                  </text>
                </svg>
                <span className="text-[10px] font-bold text-slate-500 mt-1 font-hindi">स्थिति II</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 font-hindi">
              एक पासे की दो भिन्न स्थितियां
            </span>
          </div>
        )}

        {/* -------------------- REASONING: VENN DIAGRAM -------------------- */}
        {figureType === 'venn' && (
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 140" className="w-48 sm:w-56 h-auto">
              <circle cx="80" cy="65" r="40" className="fill-rose-300/30 stroke-rose-500 stroke-2" />
              <circle cx="120" cy="65" r="40" className="fill-blue-300/30 stroke-blue-500 stroke-2" />
              <circle cx="100" cy="95" r="35" className="fill-emerald-300/30 stroke-emerald-500 stroke-2" />
            </svg>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 font-hindi">
              <span>{figureData?.labels?.[0] || 'लेखक'}</span>
              <span>•</span>
              <span>{figureData?.labels?.[1] || 'शिक्षक'}</span>
              <span>•</span>
              <span>{figureData?.labels?.[2] || 'पुरुष'}</span>
            </div>
          </div>
        )}

        {/* -------------------- REASONING: SERIES -------------------- */}
        {figureType === 'series' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-full">
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full rotate-0 transition-transform" />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full rotate-45 transition-transform" />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full rotate-90 transition-transform" />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center font-extrabold text-blue-600 text-lg">
                ?
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 font-hindi">
              प्रश्न श्रृंखला में अगली आकृति ज्ञात करें
            </span>
          </div>
        )}

        {/* -------------------- REASONING: PAPER CUTTING -------------------- */}
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
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 font-hindi">
              कागज़ मोड़ने व छेद करने के बाद खुली आकृति
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
