import { Question, TestConfig, TestResult, UserResponse } from '../types';

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Normalizes a raw answer index (number, numeric string, or A-D letter)
 * into a validated 0-based index, or -1 if invalid/unmarked.
 */
export function normalizeOptionIndex(rawValue: unknown, optionsLength: number): number {
  if (!Number.isInteger(optionsLength) || optionsLength <= 0) return -1;

  if (typeof rawValue === 'number') {
    if (Number.isInteger(rawValue) && rawValue >= 0 && rawValue < optionsLength) {
      return rawValue;
    }
    return -1;
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) return -1;

    if (/^-?\d+$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 10);
      return parsed >= 0 && parsed < optionsLength ? parsed : -1;
    }

    const upper = trimmed.toUpperCase();
    const letterMatch = upper.match(/^\(?([A-Z])\)?$/);
    if (letterMatch) {
      const idx = letterMatch[1].charCodeAt(0) - 65;
      return idx >= 0 && idx < optionsLength ? idx : -1;
    }
  }

  return -1;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Prepares a question list for an exam or practice session, honoring
 * shuffleQuestions and shuffleOptions while keeping correctAnswerIndex,
 * bilingual options, and optionImages aligned.
 */
export function prepareQuestionsForSession(
  rawQuestions: Question[],
  config: Pick<TestConfig, 'shuffleQuestions' | 'shuffleOptions'>
): Question[] {
  const normalized = rawQuestions.map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? [...q.options] : [],
    correctAnswerIndex: normalizeOptionIndex(q.correctAnswerIndex, Array.isArray(q.options) ? q.options.length : 0)
  }));

  const questionOrdered = config.shuffleQuestions ? shuffleArray(normalized) : normalized;

  if (!config.shuffleOptions) {
    return questionOrdered;
  }

  return questionOrdered.map((q) => {
    const len = q.options.length;
    if (len < 2) return q;

    const permutation = shuffleArray(Array.from({ length: len }, (_, idx) => idx));
    const newOptions = permutation.map((oldIdx) => q.options[oldIdx]);

    const remapOptionalArray = <T>(arr?: T[]): T[] | undefined => {
      if (!Array.isArray(arr) || arr.length !== len) return arr;
      return permutation.map((oldIdx) => arr[oldIdx]);
    };

    const newCorrectIndex =
      q.correctAnswerIndex >= 0 && q.correctAnswerIndex < len
        ? permutation.indexOf(q.correctAnswerIndex)
        : -1;

    return {
      ...q,
      options: newOptions,
      correctAnswerIndex: newCorrectIndex,
      optionsHindi: remapOptionalArray(q.optionsHindi),
      optionsEnglish: remapOptionalArray(q.optionsEnglish),
      optionImages: remapOptionalArray(q.optionImages),
      optionFigures: remapOptionalArray(q.optionFigures)
    };
  });
}

/**
 * Computes deterministic, floating-point-safe exam/practice scores from a
 * question snapshot and response dictionary.
 */
export function calculateTestResult(
  questions: Question[],
  responses: Record<number, UserResponse>,
  config: Pick<TestConfig, 'marksPerQuestion' | 'negativeMarking' | 'passingPercentage'>,
  totalTimeSpentSeconds: number
): TestResult {
  const totalQuestions = questions.length;
  const rawMarks = Number(config?.marksPerQuestion);
  const marksPerQ = Number.isFinite(rawMarks) && rawMarks > 0 ? rawMarks : 1;

  const rawNeg = Number(config?.negativeMarking);
  const negPerQ = Number.isFinite(rawNeg) && rawNeg >= 0 ? rawNeg : 0;

  const rawPass = Number(config?.passingPercentage);
  const passingPct = Number.isFinite(rawPass) ? rawPass : 40;

  let correctCount = 0;
  let incorrectCount = 0;
  let attemptedCount = 0;

  questions.forEach((q, idx) => {
    const resp = responses[idx];
    const optCount = Array.isArray(q.options) ? q.options.length : 0;

    if (!resp || resp.selectedOption === null || resp.selectedOption === undefined) {
      return;
    }

    const selectedIdx = normalizeOptionIndex(resp.selectedOption, optCount);
    if (selectedIdx < 0) {
      return;
    }

    attemptedCount++;
    const correctIdx = normalizeOptionIndex(q.correctAnswerIndex, optCount);
    if (correctIdx >= 0 && selectedIdx === correctIdx) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  const unattemptedCount = Math.max(0, totalQuestions - attemptedCount);
  const positiveMarks = round2(correctCount * marksPerQ);
  const negativeMarks = round2(incorrectCount * negPerQ);
  const finalScore = round2(positiveMarks - negativeMarks);
  const maxMarks = round2(totalQuestions * marksPerQ);
  const percentage = maxMarks > 0 ? round2((finalScore / maxMarks) * 100) : 0;
  const accuracy = attemptedCount > 0 ? round2((correctCount / attemptedCount) * 100) : 0;
  const isPassed = maxMarks > 0 ? percentage >= passingPct : false;

  const safeTime = Math.max(0, Math.round(Number(totalTimeSpentSeconds) || 0));
  const averageTimePerQuestion = attemptedCount > 0 ? Math.round(safeTime / attemptedCount) : 0;

  return {
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
    totalTimeSpentSeconds: safeTime,
    averageTimePerQuestion
  };
}
