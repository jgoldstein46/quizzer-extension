/**
 * Session Management Service
 * Manages active quiz sessions, state tracking, and persistence
 */

import { QuizSession, UserResponse, generateId } from './models';
import { sessionRepository } from './repository';

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
  quizId: string;
  tabId?: number;
}

/**
 * Session update data
 */
export interface SessionUpdate {
  currentQuestionIndex?: number;
  completedQuestions?: number[];
  responses?: UserResponse[];
  status?: 'active' | 'paused' | 'completed' | 'abandoned';
}

/**
 * Class for managing quiz sessions
 */
export class SessionManager {
  /**
   * Create a new quiz session
   */
  async createSession(options: CreateSessionOptions): Promise<QuizSession> {
    const session: QuizSession = {
      id: generateId('session'),
      quizId: options.quizId,
      tabId: options.tabId,
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      completedQuestions: [],
      responses: [],
      status: 'active'
    };
    
    return sessionRepository.save(session);
  }
  
  /**
   * Get active session for a tab
   */
  async getActiveSession(tabId: number): Promise<QuizSession | null> {
    return sessionRepository.getActiveSessionForTab(tabId);
  }
  
  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<QuizSession | null> {
    return sessionRepository.findById(sessionId);
  }
  
  /**
   * Update a session
   */
  async updateSession(sessionId: string, updates: SessionUpdate): Promise<QuizSession | null> {
    // Get existing session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }
    
    // Apply updates
    const updatedSession: QuizSession = {
      ...session,
      ...updates,
      lastActiveAt: new Date().toISOString()
    };
    
    // Save updated session
    return sessionRepository.save(updatedSession);
  }
  
  /**
   * Record a user response in a session
   */
  async addResponse(sessionId: string, response: Omit<UserResponse, 'submittedAt'>): Promise<QuizSession | null> {
    // Get existing session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }
    
    // Add response with timestamp
    const userResponse: UserResponse = {
      ...response,
      submittedAt: new Date().toISOString()
    };
    
    // Create new responses array with the new response
    const existingResponseIndex = session.responses.findIndex(
      r => r.questionId === response.questionId
    );
    
    let responses;
    if (existingResponseIndex >= 0) {
      // Replace existing response
      responses = [
        ...session.responses.slice(0, existingResponseIndex),
        userResponse,
        ...session.responses.slice(existingResponseIndex + 1)
      ];
    } else {
      // Add new response
      responses = [...session.responses, userResponse];
    }
    
    // If this question isn't already in completedQuestions, add it
    let completedQuestions = [...session.completedQuestions];
    if (!completedQuestions.includes(response.questionId)) {
      completedQuestions.push(response.questionId);
    }
    
    // Update session
    return this.updateSession(sessionId, {
      responses,
      completedQuestions
    });
  }
  
  /**
   * Move to the next question in a session
   */
  async nextQuestion(sessionId: string): Promise<QuizSession | null> {
    // Get existing session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }
    
    // Increment current question index
    return this.updateSession(sessionId, {
      currentQuestionIndex: session.currentQuestionIndex + 1
    });
  }
  
  /**
   * Move to the previous question in a session
   */
  async previousQuestion(sessionId: string): Promise<QuizSession | null> {
    // Get existing session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }
    
    // Decrement current question index (but not below 0)
    const newIndex = Math.max(0, session.currentQuestionIndex - 1);
    return this.updateSession(sessionId, {
      currentQuestionIndex: newIndex
    });
  }
  
  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<QuizSession | null> {
    return this.updateSession(sessionId, {
      status: 'completed'
    });
  }
  
  /**
   * Abandon a session
   */
  async abandonSession(sessionId: string): Promise<QuizSession | null> {
    return this.updateSession(sessionId, {
      status: 'abandoned'
    });
  }
  
  /**
   * Pause a session
   */
  async pauseSession(sessionId: string): Promise<QuizSession | null> {
    return this.updateSession(sessionId, {
      status: 'paused'
    });
  }
  
  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<QuizSession | null> {
    return this.updateSession(sessionId, {
      status: 'active'
    });
  }
  
  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return sessionRepository.delete(sessionId);
  }
  
  /**
   * Clear active session for a tab
   */
  async clearActiveSession(tabId: number): Promise<boolean> {
    return sessionRepository.clearActiveSessionForTab(tabId);
  }
  
  /**
   * Get the current question index for a session
   */
  async getCurrentQuestionIndex(sessionId: string): Promise<number | null> {
    const session = await sessionRepository.findById(sessionId);
    return session ? session.currentQuestionIndex : null;
  }
  
  /**
   * Check if a session is complete
   */
  async isSessionComplete(sessionId: string): Promise<boolean> {
    const session = await sessionRepository.findById(sessionId);
    return session ? session.status === 'completed' : false;
  }
  
  /**
   * Get the responses for a session
   */
  async getResponses(sessionId: string): Promise<UserResponse[]> {
    const session = await sessionRepository.findById(sessionId);
    return session ? session.responses : [];
  }
  
  /**
   * Auto-save support: update the last active timestamp
   */
  async updateLastActive(sessionId: string): Promise<QuizSession | null> {
    // Get existing session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }
    
    // Only update lastActiveAt without changing anything else
    return sessionRepository.save({
      ...session,
      lastActiveAt: new Date().toISOString()
    });
  }
  
  /**
   * Clean up old sessions
   */
  async pruneOldSessions(maxAgeDays: number = 7): Promise<number> {
    return sessionRepository.pruneOldSessions(maxAgeDays);
  }
}

// Export the session manager instance
export const sessionManager = new SessionManager(); 