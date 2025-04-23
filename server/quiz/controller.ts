/**
 * Quiz Generation Controller
 * Orchestrates the entire quiz generation process from content input to storage
 */

import { QuizGenerationService, QuizType } from './api';
import { parseQuizResponse, Quiz } from './parser';
import { preprocessContent, PreprocessingOptions } from './preprocessor';
import { QuestionType, QuizPromptOptions } from './prompts';
import * as QuizStorage from './storage';

/**
 * Quiz generation request parameters
 */
export interface QuizGenerationRequest {
  articleContent: string;
  articleTitle: string;
  articleUrl: string;
  tabId?: number;
  quizType?: QuizType;
  questionCount?: number;
  questionTypes?: string[];
  difficultyLevel?: 'basic' | 'intermediate' | 'advanced';
  articleMetadata?: {
    wordCount?: number;
    readTime?: number;
    author?: string;
    source?: string;
    publishDate?: string;
  };
}

/**
 * Quiz generation response
 */
export interface QuizGenerationResponse {
  success: boolean;
  quiz?: Quiz;
  storedQuizId?: string;
  error?: string;
  metadata?: {
    processingTimeMs: number;
    contentTokenCount?: number;
    apiCallStatus?: string;
  };
}

/**
 * Quiz generation event statuses
 */
export type QuizGenerationStatus = 
  'started' | 
  'processing_content' | 
  'calling_api' | 
  'parsing_response' | 
  'storing_quiz' | 
  'complete' | 
  'error';

/**
 * Quiz generation event
 */
export interface QuizGenerationEvent {
  status: QuizGenerationStatus;
  message: string;
  progress?: number; // 0-100
  error?: string;
  data?: any;
}

/**
 * Quiz generation listener
 */
export type QuizGenerationListener = (event: QuizGenerationEvent) => void;

/**
 * Controller for quiz generation
 */
export class QuizController {
  private service: QuizGenerationService;
  private listeners: QuizGenerationListener[];
  
  constructor() {
    this.service = new QuizGenerationService();
    this.listeners = [];
  }
  
  /**
   * Add a listener for quiz generation events
   */
  addEventListener(listener: QuizGenerationListener): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove a listener
   */
  removeEventListener(listener: QuizGenerationListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Emit a status event to all listeners
   */
  private emitEvent(status: QuizGenerationStatus, message: string, data?: any): void {
    const event: QuizGenerationEvent = {
      status,
      message,
      data
    };
    
    // Add progress estimates based on status
    switch (status) {
      case 'started':
        event.progress = 5;
        break;
      case 'processing_content':
        event.progress = 20;
        break;
      case 'calling_api':
        event.progress = 40;
        break;
      case 'parsing_response':
        event.progress = 80;
        break;
      case 'storing_quiz':
        event.progress = 90;
        break;
      case 'complete':
        event.progress = 100;
        break;
      case 'error':
        event.error = message;
        break;
    }
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in quiz generation listener:', error);
      }
    });
  }
  
  /**
   * Generate a quiz based on article content
   */
  async generateQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
    const startTime = Date.now();
    
    try {       
      // Set up options
      const quizType = request.quizType || 'factual';
      const questionCount = request.questionCount || 3;
      const difficultyLevel = request.difficultyLevel || 'intermediate';
      const questionTypes = request.questionTypes || ['multiple_choice'];
      
      // Process content
      const preprocessOptions: PreprocessingOptions = {
        extractKeyTerms: true,
        summarizeLongSections: true
      };
      
      const processedContent = preprocessContent(
        request.articleContent,
        preprocessOptions
      );
      
      // Set up prompt options
      const promptOptions: QuizPromptOptions = {
        numberOfQuestions: questionCount,
        difficultyLevel: difficultyLevel,
        questionTypes: questionTypes as QuestionType[],
        cognitiveSkills: ['comprehension', 'analysis', 'application'],
        includeExplanations: true,
        format: 'json'
      };
      
      // Call API
      const apiResponse = await this.service.generateQuiz(
        processedContent,
        request.articleTitle,
        quizType,
        promptOptions,
        preprocessOptions
      );
            
      let quiz: Quiz;
      
      if (apiResponse.questions) {
        // Response already has a valid questions array
        quiz = {
          questions: apiResponse.questions,
          metadata: apiResponse.metadata
        };
      } else if (apiResponse.raw) {
        // Need to parse the raw response
        quiz = parseQuizResponse(apiResponse.raw);
      } else {
        throw new Error('Invalid API response: no questions or raw response found');
      }
      
      // Complete
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        quiz,
        metadata: {
          processingTimeMs: processingTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.emitEvent('error', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * Retrieve a stored quiz for a tab
   */
  async getQuizForTab(tabId: number): Promise<Quiz | null> {
    const storedQuiz = await QuizStorage.getQuizByTabId(tabId);
    
    if (!storedQuiz) {
      return null;
    }
    
    return {
      questions: storedQuiz.questions,
      metadata: {
        ...storedQuiz.metadata,
        generatedAt: storedQuiz.metadata.generatedAt || new Date().toISOString()
      }
    };
  }
  
  /**
   * Retrieve a stored quiz for a URL
   */
  async getQuizForUrl(url: string): Promise<Quiz | null> {
    const storedQuiz = await QuizStorage.getQuizByUrl(url);
    
    if (!storedQuiz) {
      return null;
    }
    
    return {
      questions: storedQuiz.questions,
      metadata: {
        ...storedQuiz.metadata,
        generatedAt: storedQuiz.metadata.generatedAt || new Date().toISOString()
      }
    };
  }
  
  /**
   * Get all stored quizzes
   */
  async getQuizHistory(): Promise<QuizStorage.StoredQuiz[]> {
    return await QuizStorage.getStoredQuizzes();
  }
  
  /**
   * Delete a quiz
   */
  async deleteQuiz(quizId: string): Promise<boolean> {
    return await QuizStorage.deleteQuiz(quizId);
  }
}

// Export singleton instance
export const quizController = new QuizController(); 