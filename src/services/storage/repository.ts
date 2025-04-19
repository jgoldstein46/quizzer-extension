/**
 * Repository Layer
 * Provides CRUD operations and higher-level access to data stored in Chrome storage
 */

import {
    ArticleContent,
    ArticleData,
    DEFAULT_PREFERENCES,
    generateId,
    Quiz,
    QuizSession,
    STORAGE_KEYS,
    UserPreferences
} from './models';
import { storage } from './storage';

/**
 * Base repository class with common CRUD operations
 */
export abstract class BaseRepository<T> {
  protected abstract storageKey: string;
  protected abstract idField: keyof T;
  
  /**
   * Find an item by its ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const result = await this.getItems();
      return result.find(item => item[this.idField] === id) || null;
    } catch (error) {
      console.error(`Error finding item by ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Find items matching a filter function
   */
  async find(filterFn: (item: T) => boolean): Promise<T[]> {
    try {
      const items = await this.getItems();
      return items.filter(filterFn);
    } catch (error) {
      console.error('Error finding items:', error);
      return [];
    }
  }
  
  /**
   * Get all items
   */
  abstract getItems(): Promise<T[]>;
  
  /**
   * Save an item
   */
  abstract save(item: T): Promise<T>;
  
  /**
   * Delete an item by ID
   */
  abstract delete(id: string): Promise<boolean>;
}

/**
 * Article repository for managing article data
 */
export class ArticleRepository extends BaseRepository<ArticleData> {
  protected storageKey = STORAGE_KEYS.ARTICLE_DATA_PREFIX;
  protected idField = 'url' as keyof ArticleData;
  
  /**
   * Get article data for a specific tab
   */
  async getByTabId(tabId: number): Promise<ArticleData | null> {
    try {
      const key = `${this.storageKey}${tabId}`;
      const result = await storage.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Error getting article data for tab ${tabId}:`, error);
      return null;
    }
  }
  
  /**
   * Save article data for a tab
   */
  async saveForTab(tabId: number, data: ArticleData): Promise<ArticleData> {
    try {
      const key = `${this.storageKey}${tabId}`;
      await storage.set({ [key]: data });
      return data;
    } catch (error) {
      console.error(`Error saving article data for tab ${tabId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all stored article data
   * This retrieves all keys starting with the article data prefix
   */
  async getItems(): Promise<ArticleData[]> {
    try {
      const allData = await storage.get(null);
      const articles: ArticleData[] = [];
      
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.storageKey) && value) {
          articles.push(value as ArticleData);
        }
      }
      
      return articles;
    } catch (error) {
      console.error('Error getting all article data:', error);
      return [];
    }
  }
  
  /**
   * Save article data (not tied to a specific tab)
   */
  async save(data: ArticleData): Promise<ArticleData> {
    try {
      const existingData = await this.findById(data.url);
      const key = `${this.storageKey}${data.url}`;
      
      await storage.set({ [key]: data });
      return data;
    } catch (error) {
      console.error('Error saving article data:', error);
      throw error;
    }
  }
  
  /**
   * Delete article data by URL
   */
  async delete(url: string): Promise<boolean> {
    try {
      const key = `${this.storageKey}${url}`;
      await storage.remove(key);
      return true;
    } catch (error) {
      console.error(`Error deleting article data for URL ${url}:`, error);
      return false;
    }
  }
  
  /**
   * Delete article data for a specific tab
   */
  async deleteForTab(tabId: number): Promise<boolean> {
    try {
      const key = `${this.storageKey}${tabId}`;
      await storage.remove(key);
      return true;
    } catch (error) {
      console.error(`Error deleting article data for tab ${tabId}:`, error);
      return false;
    }
  }
}

/**
 * Content repository for managing article content
 */
export class ContentRepository extends BaseRepository<ArticleContent> {
  protected storageKey = STORAGE_KEYS.ARTICLE_CONTENT_PREFIX;
  protected idField = 'title' as keyof ArticleContent;
  
  /**
   * Get article content for a specific tab
   */
  async getByTabId(tabId: number): Promise<ArticleContent | null> {
    try {
      const key = `${this.storageKey}${tabId}`;
      const result = await storage.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Error getting article content for tab ${tabId}:`, error);
      return null;
    }
  }
  
  /**
   * Save article content for a tab
   */
  async saveForTab(tabId: number, content: ArticleContent): Promise<ArticleContent> {
    try {
      const key = `${this.storageKey}${tabId}`;
      await storage.set({ [key]: content });
      return content;
    } catch (error) {
      console.error(`Error saving article content for tab ${tabId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all stored article content
   */
  async getItems(): Promise<ArticleContent[]> {
    try {
      const allData = await storage.get(null);
      const contents: ArticleContent[] = [];
      
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.storageKey) && value) {
          contents.push(value as ArticleContent);
        }
      }
      
      return contents;
    } catch (error) {
      console.error('Error getting all article content:', error);
      return [];
    }
  }
  
  /**
   * Save article content (not tied to a specific tab)
   */
  async save(content: ArticleContent): Promise<ArticleContent> {
    try {
      const key = `${this.storageKey}${content.title}`;
      await storage.set({ [key]: content });
      return content;
    } catch (error) {
      console.error('Error saving article content:', error);
      throw error;
    }
  }
  
  /**
   * Delete article content by title
   */
  async delete(title: string): Promise<boolean> {
    try {
      const key = `${this.storageKey}${title}`;
      await storage.remove(key);
      return true;
    } catch (error) {
      console.error(`Error deleting article content for title ${title}:`, error);
      return false;
    }
  }
  
  /**
   * Delete article content for a specific tab
   */
  async deleteForTab(tabId: number): Promise<boolean> {
    try {
      const key = `${this.storageKey}${tabId}`;
      await storage.remove(key);
      return true;
    } catch (error) {
      console.error(`Error deleting article content for tab ${tabId}:`, error);
      return false;
    }
  }
}

/**
 * Quiz repository for managing quizzes
 */
export class QuizRepository extends BaseRepository<Quiz> {
  protected storageKey = STORAGE_KEYS.QUIZZES;
  protected idField = 'id' as keyof Quiz;
  
  /**
   * Get all quizzes
   */
  async getItems(): Promise<Quiz[]> {
    try {
      const result = await storage.get(this.storageKey);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('Error getting quizzes:', error);
      return [];
    }
  }
  
  /**
   * Get quiz by tab ID (most recent for the tab)
   */
  async getByTabId(tabId: number): Promise<Quiz | null> {
    try {
      const quizzes = await this.getItems();
      return quizzes.find(quiz => quiz.tabId === tabId) || null;
    } catch (error) {
      console.error(`Error getting quiz for tab ${tabId}:`, error);
      return null;
    }
  }
  
  /**
   * Get quiz by URL (most recent for the URL)
   */
  async getByUrl(url: string): Promise<Quiz | null> {
    try {
      const quizzes = await this.getItems();
      return quizzes.find(quiz => quiz.url === url) || null;
    } catch (error) {
      console.error(`Error getting quiz for URL ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Save a quiz
   */
  async save(quiz: Quiz): Promise<Quiz> {
    try {
      // Get all quizzes
      const quizzes = await this.getItems();
      
      // Check if this is an update or new quiz
      const index = quizzes.findIndex(q => q.id === quiz.id);
      
      if (index >= 0) {
        // Update existing quiz
        quiz.updatedAt = new Date().toISOString();
        quizzes[index] = quiz;
      } else {
        // Add new quiz
        if (!quiz.id) {
          quiz.id = generateId('quiz');
        }
        quiz.createdAt = quiz.createdAt || new Date().toISOString();
        quiz.updatedAt = new Date().toISOString();
        quizzes.unshift(quiz);
      }
      
      // Enforce maximum storage limit (keep most recent 50)
      const MAX_QUIZZES = 50;
      const trimmedQuizzes = quizzes.slice(0, MAX_QUIZZES);
      
      // Save back to storage
      await storage.set({ [this.storageKey]: trimmedQuizzes });
      
      return quiz;
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  }
  
  /**
   * Delete a quiz by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const quizzes = await this.getItems();
      const filteredQuizzes = quizzes.filter(quiz => quiz.id !== id);
      
      // If no quiz was removed, return false
      if (filteredQuizzes.length === quizzes.length) {
        return false;
      }
      
      // Save back to storage
      await storage.set({ [this.storageKey]: filteredQuizzes });
      
      return true;
    } catch (error) {
      console.error(`Error deleting quiz with ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Clear all quizzes
   */
  async clear(): Promise<boolean> {
    try {
      await storage.set({ [this.storageKey]: [] });
      return true;
    } catch (error) {
      console.error('Error clearing quizzes:', error);
      return false;
    }
  }
  
  /**
   * Delete old quizzes beyond the retention limit
   */
  async prune(maxQuizzes: number = 50): Promise<number> {
    try {
      const quizzes = await this.getItems();
      
      if (quizzes.length <= maxQuizzes) {
        return 0;
      }
      
      // Sort by updatedAt and keep only the most recent ones
      const sortedQuizzes = quizzes
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, maxQuizzes);
      
      const removedCount = quizzes.length - sortedQuizzes.length;
      
      // Save back to storage
      await storage.set({ [this.storageKey]: sortedQuizzes });
      
      return removedCount;
    } catch (error) {
      console.error('Error pruning quizzes:', error);
      return 0;
    }
  }
}

/**
 * Session repository for managing quiz sessions
 */
export class SessionRepository extends BaseRepository<QuizSession> {
  protected storageKey = STORAGE_KEYS.SESSION_PREFIX;
  protected idField = 'id' as keyof QuizSession;
  
  /**
   * Get all sessions
   */
  async getItems(): Promise<QuizSession[]> {
    try {
      const allData = await storage.get(null);
      const sessions: QuizSession[] = [];
      
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.storageKey) && value) {
          sessions.push(value as QuizSession);
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return [];
    }
  }
  
  /**
   * Get active session for a tab
   */
  async getActiveSessionForTab(tabId: number): Promise<QuizSession | null> {
    try {
      const key = `${STORAGE_KEYS.ACTIVE_SESSION_PREFIX}${tabId}`;
      const result = await storage.get(key);
      
      if (result[key]) {
        // Get the actual session data
        const sessionId = result[key];
        const sessionKey = `${this.storageKey}${sessionId}`;
        const sessionResult = await storage.get(sessionKey);
        return sessionResult[sessionKey] || null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting active session for tab ${tabId}:`, error);
      return null;
    }
  }
  
  /**
   * Get sessions for a quiz
   */
  async getSessionsForQuiz(quizId: string): Promise<QuizSession[]> {
    try {
      const sessions = await this.getItems();
      return sessions.filter(session => session.quizId === quizId);
    } catch (error) {
      console.error(`Error getting sessions for quiz ${quizId}:`, error);
      return [];
    }
  }
  
  /**
   * Save a session
   */
  async save(session: QuizSession): Promise<QuizSession> {
    try {
      // Generate ID if new session
      if (!session.id) {
        session.id = generateId('session');
      }
      
      // Update timestamps
      session.lastActiveAt = new Date().toISOString();
      
      // Save session data
      const sessionKey = `${this.storageKey}${session.id}`;
      await storage.set({ [sessionKey]: session });
      
      // If there's a tab ID, set this as the active session for that tab
      if (session.tabId) {
        const activeSessionKey = `${STORAGE_KEYS.ACTIVE_SESSION_PREFIX}${session.tabId}`;
        await storage.set({ [activeSessionKey]: session.id });
      }
      
      return session;
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }
  
  /**
   * Delete a session by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Get session first to check for tab ID
      const sessionKey = `${this.storageKey}${id}`;
      const result = await storage.get(sessionKey);
      const session = result[sessionKey] as QuizSession | undefined;
      
      // Remove session
      await storage.remove(sessionKey);
      
      // If this session was active for a tab, remove that reference too
      if (session?.tabId) {
        const activeSessionKey = `${STORAGE_KEYS.ACTIVE_SESSION_PREFIX}${session.tabId}`;
        await storage.remove(activeSessionKey);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting session with ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Clear active session for a tab
   */
  async clearActiveSessionForTab(tabId: number): Promise<boolean> {
    try {
      const activeSessionKey = `${STORAGE_KEYS.ACTIVE_SESSION_PREFIX}${tabId}`;
      await storage.remove(activeSessionKey);
      return true;
    } catch (error) {
      console.error(`Error clearing active session for tab ${tabId}:`, error);
      return false;
    }
  }
  
  /**
   * Delete old sessions (completed/abandoned) beyond a certain age
   */
  async pruneOldSessions(maxAgeDays: number = 7): Promise<number> {
    try {
      const sessions = await this.getItems();
      const now = new Date();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      let removedCount = 0;
      
      for (const session of sessions) {
        // Only prune completed or abandoned sessions
        if (session.status !== 'completed' && session.status !== 'abandoned') {
          continue;
        }
        
        const lastActiveDate = new Date(session.lastActiveAt);
        const ageMs = now.getTime() - lastActiveDate.getTime();
        
        if (ageMs > maxAgeMs) {
          await this.delete(session.id);
          removedCount++;
        }
      }
      
      return removedCount;
    } catch (error) {
      console.error('Error pruning old sessions:', error);
      return 0;
    }
  }
}

/**
 * Settings repository for managing user preferences
 */
export class SettingsRepository {
  private storageKey = STORAGE_KEYS.SETTINGS;
  
  /**
   * Get user preferences
   */
  async getSettings(): Promise<UserPreferences> {
    try {
      const result = await storage.get(this.storageKey);
      return result[this.storageKey] || DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_PREFERENCES;
    }
  }
  
  /**
   * Save user preferences
   */
  async saveSettings(settings: UserPreferences): Promise<UserPreferences> {
    try {
      await storage.set({ [this.storageKey]: settings });
      return settings;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
  
  /**
   * Update specific preferences
   */
  async updateSettings(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...updates };
      await this.saveSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
  
  /**
   * Reset preferences to defaults
   */
  async resetSettings(): Promise<UserPreferences> {
    try {
      await storage.set({ [this.storageKey]: DEFAULT_PREFERENCES });
      return DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }
}

// Export repository instances
export const articleRepository = new ArticleRepository();
export const contentRepository = new ContentRepository();
export const quizRepository = new QuizRepository();
export const sessionRepository = new SessionRepository();
export const settingsRepository = new SettingsRepository(); 