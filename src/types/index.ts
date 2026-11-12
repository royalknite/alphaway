export interface Question {
  id: string;
  number: number;
  text: string;
  options: string[]; // Typically 4 options: A, B, C, D
  correctAnswerIndex: number; // 0 for A, 1 for B, 2 for C, 3 for D
  explanation: string;
  subject?: string;
  chapter?: string;
  // Bilingual support (Hindi & English)
  textHindi?: string;
  textEnglish?: string;
  optionsHindi?: string[];
  optionsEnglish?: string[];
  explanationHindi?: string;
  explanationEnglish?: string;
  figureType?: 'image' | 'mirror' | 'water' | 'dice' | 'triangles' | 'venn' | 'series' | 'completion' | 'embedded' | 'paper_cut' | 'table' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'data_interpretation' | 'math_formula';
  figureData?: any;
  imageUrl?: string;
  optionImages?: (string | null)[];
  optionFigures?: any[];
}

export interface TestConfig {
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarking: number; // e.g. 0.25, 0.33, 0.50, 0
  passingPercentage: number; // e.g. 40
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  mode: 'exam' | 'practice';
  allowReview: boolean;
  immediateExplanationInPractice?: boolean;
  instructions?: string;
  defaultQuestionLanguage?: 'hi' | 'en';
}

export interface TestFolder {
  id: string;
  name: string;
  parentId: string | null; // null for root folders
  createdAt: number;
  updatedAt: number;
  color?: string;
  description?: string;
}

export interface TestItem {
  id: string;
  folderId: string;
  title: string;
  description?: string;
  questions: Question[];
  config: TestConfig;
  createdAt: number;
  updatedAt: number;
  totalAttempts: number;
  bestScore?: number;
  latestScore?: number;
  lastAttemptAt?: number;
  originalTxt?: string;
}

export interface UserResponse {
  selectedOption: number | null; // 0, 1, 2, 3 or null
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
  visited: boolean;
}

export interface TestResult {
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unattemptedQuestions: number;
  positiveMarks: number;
  negativeMarks: number;
  finalScore: number;
  maxMarks: number;
  percentage: number;
  accuracy: number;
  isPassed: boolean;
  totalTimeSpentSeconds: number;
  averageTimePerQuestion: number;
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  folderId: string;
  folderName: string;
  attemptNumber: number;
  mode: 'exam' | 'practice';
  startedAt: number;
  submittedAt: number;
  durationSeconds: number;
  timeSpentSeconds: number;
  responses: Record<number, UserResponse>; // mapped by question index
  questionsSnapshot: Question[]; // Snapshot of questions as taken (taking into account any shuffle)
  result: TestResult;
}

export interface QuestionCollection {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  rawTxt: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'hi' | 'en'; // Global App UI Language
  questionLanguage: 'hi' | 'en'; // Question text preference (Hindi or English)
  defaultMode: 'exam' | 'practice';
  defaultDurationMinutes: number;
  defaultMarksPerQuestion: number;
  defaultNegativeMarking: number;
  soundEnabled: boolean;
  confirmBeforeSubmit: boolean;
  autoSaveIntervalSeconds: number;
  geminiApiKey?: string;
  openaiApiKey?: string;
  pdfAiProvider?: 'gemini' | 'openai';
}

export interface ActiveExamState {
  testId: string;
  attemptId: string;
  mode: 'exam' | 'practice';
  config: TestConfig;
  questions: Question[];
  responses: Record<number, UserResponse>;
  currentQuestionIndex: number;
  startedAt: number;
  remainingSeconds: number;
}

export type NavigationTab = 
  | 'home' 
  | 'books' 
  | 'tests' 
  | 'create' 
  | 'history' 
  | 'performance' 
  | 'question-bank' 
  | 'comparison' 
  | 'settings'
  | 'exam'
  | 'practice'
  | 'result'
  | 'analysis';
