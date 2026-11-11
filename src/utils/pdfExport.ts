import { TestItem, TestAttempt, Question } from '../types';

export function printQuestionPaper(test: TestItem) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print/export PDF.');
    return;
  }

  const questionsHtml = test.questions.map((q, idx) => `
    <div class="question-card">
      <div class="question-header">
        <span class="q-badge">प्रश्न / Question ${idx + 1}</span>
        <span class="q-marks">[${test.config.marksPerQuestion} Marks | -${test.config.negativeMarking} Neg]</span>
      </div>
      <div class="q-text">${escapeHtml(q.text)}</div>
      <div class="options-grid">
        ${q.options.map((opt, optIdx) => `
          <div class="option-item">
            <span class="opt-label">${String.fromCharCode(65 + optIdx)}</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(test.title)} - Question Paper</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;
          color: #1e293b;
          background: #fff;
          margin: 0;
          padding: 20px;
          line-height: 1.5;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brand-logo {
          font-size: 22px;
          font-weight: 800;
          color: #1d4ed8;
          letter-spacing: -0.5px;
        }
        .brand-sub {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .test-meta {
          text-align: right;
          font-size: 12px;
          color: #475569;
        }
        .test-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .instruction-box {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12px;
          color: #475569;
          margin-bottom: 20px;
        }
        .question-card {
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid #e2e8f0;
          page-break-inside: avoid;
        }
        .question-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .q-badge {
          font-size: 11px;
          font-weight: 700;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .q-marks {
          font-size: 11px;
          color: #64748b;
        }
        .q-text {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 10px;
        }
        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .option-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 13px;
        }
        .opt-label {
          font-weight: 700;
          color: #2563eb;
          width: 18px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-logo">📖 AlphaWay Test Platform</div>
          <div class="brand-sub">Digital Textbook & Examination System</div>
        </div>
        <div class="test-meta">
          <div><strong>Total Questions:</strong> ${test.questions.length}</div>
          <div><strong>Time:</strong> ${test.config.durationMinutes} Minutes</div>
          <div><strong>Max Marks:</strong> ${test.questions.length * test.config.marksPerQuestion}</div>
        </div>
      </div>
      <div class="test-title">${escapeHtml(test.title)}</div>
      ${test.config.instructions ? `<div class="instruction-box"><strong>Instructions:</strong> ${escapeHtml(test.config.instructions)}</div>` : ''}
      <div class="questions-container">
        ${questionsHtml}
      </div>
      <div class="footer">
        Generated via AlphaWay Test Platform • For Student Self-Evaluation • www.alphaway.edu
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function printResultReport(attempt: TestAttempt) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print/export PDF.');
    return;
  }

  const { result } = attempt;

  const questionsHtml = attempt.questionsSnapshot.map((q, idx) => {
    const userResp = attempt.responses[idx];
    const selected = userResp ? userResp.selectedOption : null;
    const isCorrect = selected === q.correctAnswerIndex;
    const isAttempted = selected !== null;

    let statusBadge = '<span style="color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Unattempted</span>';
    if (isAttempted) {
      if (isCorrect) {
        statusBadge = '<span style="color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Correct (+1)</span>';
      } else {
        statusBadge = '<span style="color: #dc2626; background: #fef2f2; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Incorrect</span>';
      }
    }

    return `
      <div class="question-row">
        <div class="q-header">
          <strong>Q${idx + 1}.</strong> ${escapeHtml(q.text)}
          <span style="float: right;">${statusBadge}</span>
        </div>
        <div class="options-list">
          ${q.options.map((opt, optIdx) => {
            const isUserPick = selected === optIdx;
            const isRight = q.correctAnswerIndex === optIdx;
            let optStyle = 'background: #f8fafc; border: 1px solid #e2e8f0;';
            if (isRight) {
              optStyle = 'background: #ecfdf5; border: 1.5px solid #10b981; font-weight: 600; color: #065f46;';
            } else if (isUserPick && !isRight) {
              optStyle = 'background: #fef2f2; border: 1.5px solid #ef4444; color: #991b1b;';
            }
            return `
              <div class="opt-card" style="${optStyle}">
                <span><strong>${String.fromCharCode(65 + optIdx)}.</strong> ${escapeHtml(opt)}</span>
                ${isRight ? ' <span style="color: #059669; font-weight: bold; margin-left: auto;">✔ Correct Answer</span>' : ''}
                ${isUserPick && !isRight ? ' <span style="color: #dc2626; font-weight: bold; margin-left: auto;">✖ Your Choice</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        ${q.explanation ? `
          <div class="explanation-box">
            <strong>व्याख्या / Explanation:</strong> ${escapeHtml(q.explanation)}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(attempt.testTitle)} - Examination Result Scorecard</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 20px;
          line-height: 1.5;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brand-logo { font-size: 20px; font-weight: 800; color: #1d4ed8; }
        .scorecard-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .score-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 10px;
        }
        .score-stat {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
        }
        .stat-val { font-size: 20px; font-weight: 800; color: #0f172a; }
        .stat-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; }
        .question-row {
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid #e2e8f0;
          page-break-inside: avoid;
        }
        .q-header { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        .options-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .opt-card {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          align-items: center;
        }
        .explanation-box {
          margin-top: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border-left: 3px solid #3b82f6;
          font-size: 12px;
          color: #334155;
          border-radius: 0 4px 4px 0;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-logo">📖 AlphaWay Test Platform</div>
          <div style="font-size: 11px; color: #64748b;">Official Performance Scorecard</div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #475569;">
          <div><strong>Date:</strong> ${new Date(attempt.submittedAt).toLocaleDateString()}</div>
          <div><strong>Folder:</strong> ${escapeHtml(attempt.folderName)}</div>
        </div>
      </div>
      
      <div class="scorecard-banner">
        <h2 style="margin: 0 0 6px 0; font-size: 18px; color: #1e3a8a;">${escapeHtml(attempt.testTitle)}</h2>
        <div style="font-size: 13px; color: #3b82f6; font-weight: 600;">
          Attempt #${attempt.attemptNumber} • Status: <span style="color: ${result.isPassed ? '#059669' : '#dc2626'}">${result.isPassed ? 'PASSED (उत्तीर्ण)' : 'FAILED (अनुत्तीर्ण)'}</span>
        </div>
        <div class="score-grid">
          <div class="score-stat">
            <div class="stat-val" style="color: #2563eb;">${result.finalScore.toFixed(2)} / ${result.maxMarks}</div>
            <div class="stat-lbl">Final Score</div>
          </div>
          <div class="score-stat">
            <div class="stat-val" style="color: #059669;">${result.accuracy.toFixed(1)}%</div>
            <div class="stat-lbl">Accuracy</div>
          </div>
          <div class="score-stat">
            <div class="stat-val">${result.correctAnswers} / ${result.totalQuestions}</div>
            <div class="stat-lbl">Correct Answers</div>
          </div>
          <div class="score-stat">
            <div class="stat-val">${Math.floor(result.totalTimeSpentSeconds / 60)}m ${result.totalTimeSpentSeconds % 60}s</div>
            <div class="stat-lbl">Time Taken</div>
          </div>
        </div>
      </div>

      <h3 style="font-size: 15px; color: #0f172a; margin-bottom: 12px;">Detailed Question-Wise Analysis</h3>
      <div>
        ${questionsHtml}
      </div>

      <div class="footer">
        Generated via AlphaWay Test Platform • Continuous Self Assessment System
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportAttemptsToCsv(attempts: TestAttempt[]) {
  const headers = [
    'Attempt ID',
    'Test Name',
    'Folder',
    'Attempt Number',
    'Mode',
    'Date & Time',
    'Total Questions',
    'Attempted',
    'Correct',
    'Incorrect',
    'Final Score',
    'Max Marks',
    'Percentage',
    'Accuracy',
    'Passed',
    'Time Spent (Sec)'
  ];

  const rows = attempts.map(a => [
    a.id,
    `"${a.testTitle.replace(/"/g, '""')}"`,
    `"${a.folderName.replace(/"/g, '""')}"`,
    a.attemptNumber,
    a.mode,
    new Date(a.submittedAt).toLocaleString(),
    a.result.totalQuestions,
    a.result.attemptedQuestions,
    a.result.correctAnswers,
    a.result.incorrectAnswers,
    a.result.finalScore.toFixed(2),
    a.result.maxMarks,
    a.result.percentage.toFixed(2),
    a.result.accuracy.toFixed(2),
    a.result.isPassed ? 'YES' : 'NO',
    a.result.totalTimeSpentSeconds
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AlphaWay_Test_History_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
