/**
 * Quiz Storage System
 * Handles saving, retrieving, and managing quizzes in local browser storage
 */

import { Quiz, QuizQuestion } from './parser';

/**
 * Key used for storing quizzes in browser storage
 */
const QUIZZES_STORAGE_KEY = 'quizzer.quizzes';

/**
 * Maximum number of quizzes to keep in storage
 */
const MAX_STORED_QUIZZES = 50;

/**
 * Quiz storage item with additional metadata
 */
export interface StoredQuiz {
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
 * Options for saving quizzes
 */
export interface SaveQuizOptions {
  tabId?: number;
  url: string;
  title: string;
  metadata?: {
    articleWordCount?: number;
    articleReadTime?: number;
    quizType?: string;
    [key: string]: any;
  };
}

/**
 * Save a generated quiz to local storage
 */
export async function saveQuiz(quiz: Quiz, options: SaveQuizOptions): Promise<StoredQuiz> {
  // Create a storage object with metadata
  const storedQuiz: StoredQuiz = {
    id: generateQuizId(),
    tabId: options.tabId,
    url: options.url,
    title: options.title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: quiz.questions,
    metadata: {
      ...quiz.metadata,
      ...options.metadata
    }
  };
  
  try {
    // Get existing quizzes
    const storedQuizzes = await getStoredQuizzes();
    
    // Add new quiz
    storedQuizzes.unshift(storedQuiz);
    
    // Enforce maximum storage limit
    const trimmedQuizzes = storedQuizzes.slice(0, MAX_STORED_QUIZZES);
    
    // Save back to storage
    await chrome.storage.local.set({
      [QUIZZES_STORAGE_KEY]: trimmedQuizzes
    });
    
    return storedQuiz;
  } catch (error) {
    console.error('Error saving quiz:', error);
    throw new Error('Failed to save quiz to storage');
  }
}

/**
 * Get all stored quizzes
 */
export async function getStoredQuizzes(): Promise<StoredQuiz[]> {
  try {
    const result = await chrome.storage.local.get(QUIZZES_STORAGE_KEY);
    const quizzes = result[QUIZZES_STORAGE_KEY] || [];
    
    return Array.isArray(quizzes) ? quizzes : [];
  } catch (error) {
    console.error('Error getting stored quizzes:', error);
    return [];
  }
}

/**
 * Get a specific quiz by ID
 */
export async function getQuizById(id: string): Promise<StoredQuiz | null> {
  try {
    const quizzes = await getStoredQuizzes();
    return quizzes.find(quiz => quiz.id === id) || null;
  } catch (error) {
    console.error('Error getting quiz by ID:', error);
    return null;
  }
}

/**
 * Get the most recent quiz for a URL
 */
export async function getQuizByUrl(url: string): Promise<StoredQuiz | null> {
  try {
    const quizzes = await getStoredQuizzes();
    return quizzes.find(quiz => quiz.url === url) || null;
  } catch (error) {
    console.error('Error getting quiz by URL:', error);
    return null;
  }
}

/**
 * Get the most recent quiz for a tab
 */
export async function getQuizByTabId(tabId: number): Promise<StoredQuiz | null> {
  try {
    const quizzes = await getStoredQuizzes();
    return quizzes.find(quiz => quiz.tabId === tabId) || null;
  } catch (error) {
    console.error('Error getting quiz by tab ID:', error);
    return null;
  }
}

/**
 * Update an existing quiz
 */
export async function updateQuiz(id: string, updates: Partial<StoredQuiz>): Promise<StoredQuiz | null> {
  try {
    const quizzes = await getStoredQuizzes();
    const quizIndex = quizzes.findIndex(quiz => quiz.id === id);
    
    if (quizIndex === -1) {
      return null;
    }
    
    // Update quiz
    quizzes[quizIndex] = {
      ...quizzes[quizIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to storage
    await chrome.storage.local.set({
      [QUIZZES_STORAGE_KEY]: quizzes
    });
    
    return quizzes[quizIndex];
  } catch (error) {
    console.error('Error updating quiz:', error);
    return null;
  }
}

/**
 * Delete a quiz by ID
 */
export async function deleteQuiz(id: string): Promise<boolean> {
  try {
    const quizzes = await getStoredQuizzes();
    const filteredQuizzes = quizzes.filter(quiz => quiz.id !== id);
    
    // If no quiz was removed, return false
    if (filteredQuizzes.length === quizzes.length) {
      return false;
    }
    
    // Save back to storage
    await chrome.storage.local.set({
      [QUIZZES_STORAGE_KEY]: filteredQuizzes
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return false;
  }
}

/**
 * Delete all quizzes
 */
export async function clearQuizzes(): Promise<boolean> {
  try {
    await chrome.storage.local.set({
      [QUIZZES_STORAGE_KEY]: []
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing quizzes:', error);
    return false;
  }
}

/**
 * Delete old quizzes beyond the retention limit
 */
export async function pruneQuizzes(maxQuizzes: number = MAX_STORED_QUIZZES): Promise<number> {
  try {
    const quizzes = await getStoredQuizzes();
    
    if (quizzes.length <= maxQuizzes) {
      return 0;
    }
    
    // Sort by createdAt and keep only the most recent ones
    const sortedQuizzes = quizzes
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, maxQuizzes);
    
    const removedCount = quizzes.length - sortedQuizzes.length;
    
    // Save back to storage
    await chrome.storage.local.set({
      [QUIZZES_STORAGE_KEY]: sortedQuizzes
    });
    
    return removedCount;
  } catch (error) {
    console.error('Error pruning quizzes:', error);
    return 0;
  }
}

/**
 * Generate a unique ID for a quiz
 */
function generateQuizId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `quiz_${timestamp}_${random}`;
} 