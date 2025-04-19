/**
 * Data Models and Schema for Storage and Session Management
 * Defines the structure for storing article content, quizzes, questions, user responses, and preferences.
 */

/**
 * Article Data - Basic information about a detected article
 */
export interface ArticleData {
  url: string;
  title: string;
  detectedAt: string;
}

/**
 * Article Content - Extracted content from an article
 */
export interface ArticleContent {
  title: string;
  byline: string;
  excerpt: string;
  content: string;
  wordCount: number;
  readTime: number;
  extractedAt: string;
}

/**
 * Quiz Question Structure
 */
export interface QuizQuestion {
  id: number;
  type: 'multiple_choice' | 'open_ended' | 'true_false' | 'fill_in_blank';
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

/**
 * Quiz Structure
 */
export interface Quiz {
  id: string;
  tabId?: number;
  url: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestion[];
  metadata: {
    articleWordCount?: number;
    articleReadTime?: number;
    quizType?: string;
    [key: string]: any;
  };
}

/**
 * User Response Structure
 */
export interface UserResponse {
  quizId: string;
  questionId: number;
  response: string;
  submittedAt: string;
  evaluationId?: string;
}

/**
 * Evaluation Result Structure
 */
export interface Evaluation {
  id: string;
  quizId: string;
  questionId: number;
  userResponse: string;
  score: number;
  feedback: string;
  correctness: 'correct' | 'partially_correct' | 'incorrect';
  timestamp: number;
  followUpQuestions?: {
    questions: string[];
    answerPoints: string[];
  };
}

/**
 * Session Data Structure
 */
export interface QuizSession {
  id: string;
  quizId: string;
  tabId?: number;
  startedAt: string;
  lastActiveAt: string;
  currentQuestionIndex: number;
  completedQuestions: number[];
  responses: UserResponse[];
  status: 'active' | 'paused' | 'completed' | 'abandoned';
}

/**
 * User Preferences Structure
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  questionsPerQuiz: number;
  saveHistory: boolean;
  voice: {
    enabled: boolean;
    autoSubmit: boolean;
    language?: string;
  };
  notifications: {
    quizComplete: boolean;
    reminderEnabled: boolean;
    reminderInterval?: number;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
  };
}

/**
 * Storage Schema - Top-level structure of the storage
 */
export interface StorageSchema {
  // Initialization flag
  quizzerInitialized: boolean;
  
  // Article data indexed by tab ID
  articleData: {
    [tabId: string]: ArticleData;
  };
  
  // Article content indexed by tab ID
  articleContent: {
    [tabId: string]: ArticleContent;
  };
  
  // Quizzes collection
  quizzes: Quiz[];
  
  // Active quiz sessions indexed by session ID
  sessions: {
    [sessionId: string]: QuizSession;
  };
  
  // Current active session for each tab
  activeSessionByTab: {
    [tabId: string]: string; // Maps tab ID to session ID
  };
  
  // Evaluations indexed by quiz ID
  evaluations: {
    [quizId: string]: Evaluation[];
  };
  
  // User responses indexed by quiz ID
  responses: {
    [quizId: string]: UserResponse[];
  };
  
  // User preferences
  settings: UserPreferences;
  
  // Storage metadata for version tracking and migrations
  meta: {
    version: string;
    lastMigration?: string;
    storageUsage?: {
      totalBytes: number;
      lastChecked: string;
    };
  };
}

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  questionsPerQuiz: 3,
  saveHistory: true,
  voice: {
    enabled: true,
    autoSubmit: false
  },
  notifications: {
    quizComplete: true,
    reminderEnabled: false
  },
  accessibility: {
    fontSize: 'medium',
    highContrast: false
  }
};

/**
 * Default storage schema structure
 */
export const DEFAULT_STORAGE: Partial<StorageSchema> = {
  quizzerInitialized: true,
  quizzes: [],
  articleData: {},
  articleContent: {},
  sessions: {},
  evaluations: {},
  responses: {},
  settings: DEFAULT_PREFERENCES,
  meta: {
    version: '1.0.0'
  }
};

/**
 * Storage keys for different data types
 */
export const STORAGE_KEYS = {
  INITIALIZED: 'quizzerInitialized',
  QUIZZES: 'quizzes',
  ARTICLE_DATA_PREFIX: 'articleData.',
  ARTICLE_CONTENT_PREFIX: 'articleContent.',
  SESSION_PREFIX: 'session.',
  ACTIVE_SESSION_PREFIX: 'activeSession.',
  EVALUATION_PREFIX: 'evaluations.',
  RESPONSE_PREFIX: 'responses.',
  SETTINGS: 'settings',
  META: 'meta'
};

/**
 * Generate a unique ID with a given prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 