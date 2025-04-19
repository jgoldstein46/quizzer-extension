/**
 * Evaluation Controller
 * Orchestrates the entire response evaluation process
 */

import { EvaluationResult, FollowUpQuestionsResult, ResponseEvaluationService } from './api';
import { EvaluationPromptOptions, EvaluationPromptType } from './prompts';
import * as EvaluationStorage from './storage';

/**
 * Response evaluation request parameters
 */
export interface ResponseEvaluationRequest {
  articleContent: string;
  question: string;
  userResponse: string;
  expectedElements: string[];
  quizId: string;
  questionId: string;
  questionType?: EvaluationPromptType;
  tabId?: number;
}

/**
 * Response evaluation response
 */
export interface ResponseEvaluationResponse {
  success: boolean;
  evaluation?: EvaluationResult;
  evaluationId?: string;
  followUpQuestions?: FollowUpQuestionsResult;
  error?: string;
  metadata?: {
    processingTimeMs: number;
    storageStatus?: string;
  };
}

/**
 * Evaluation event statuses
 */
export type EvaluationStatus = 
  'started' | 
  'evaluating_response' | 
  'generating_follow_up' | 
  'storing_evaluation' | 
  'complete' | 
  'error';

/**
 * Evaluation event
 */
export interface EvaluationEvent {
  status: EvaluationStatus;
  message: string;
  progress?: number; // 0-100
  error?: string;
  data?: any;
}

/**
 * Evaluation listener
 */
export type EvaluationListener = (event: EvaluationEvent) => void;

/**
 * Controller for response evaluation
 */
export class EvaluationController {
  private service: ResponseEvaluationService;
  private listeners: EvaluationListener[];
  
  constructor() {
    this.service = new ResponseEvaluationService();
    this.listeners = [];
  }
  
  /**
   * Add a listener for evaluation events
   */
  addEventListener(listener: EvaluationListener): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove a listener
   */
  removeEventListener(listener: EvaluationListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Emit a status event to all listeners
   */
  private emitEvent(status: EvaluationStatus, message: string, data?: any): void {
    const event: EvaluationEvent = {
      status,
      message,
      data
    };
    
    // Add progress estimates based on status
    switch (status) {
      case 'started':
        event.progress = 5;
        break;
      case 'evaluating_response':
        event.progress = 30;
        break;
      case 'generating_follow_up':
        event.progress = 60;
        break;
      case 'storing_evaluation':
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
        console.error('Error in evaluation listener:', error);
      }
    });
  }
  
  /**
   * Evaluate a user's response
   */
  async evaluateResponse(
    request: ResponseEvaluationRequest,
    options: EvaluationPromptOptions = {}
  ): Promise<ResponseEvaluationResponse> {
    const startTime = Date.now();
    
    try {
      this.emitEvent('started', 'Starting response evaluation');
      
      // Set up options
      const questionType = request.questionType || EvaluationPromptType.FACTUAL;
      
      // Evaluate response
      this.emitEvent('evaluating_response', 'Evaluating user response using Claude API');
      
      const evaluationResult = await this.service.evaluateResponse(
        request.articleContent,
        request.question,
        request.userResponse,
        request.expectedElements,
        questionType,
        options
      );
      
      // Store evaluation
      this.emitEvent('storing_evaluation', 'Saving evaluation results');
      
      const storedEvaluation = await EvaluationStorage.saveEvaluation(
        request.userResponse,
        evaluationResult,
        {
          quizId: request.quizId,
          questionId: request.questionId,
          tabId: request.tabId
        }
      );
      
      // Generate follow-up questions if score is below threshold
      let followUpQuestions: FollowUpQuestionsResult | undefined;
      
      if (evaluationResult.scores.overall < 7) {
        this.emitEvent('generating_follow_up', 'Generating follow-up questions');
        
        followUpQuestions = await this.service.generateFollowUpQuestions(
          request.articleContent,
          request.question,
          request.userResponse,
          evaluationResult,
          options
        );
        
        // Save follow-up questions
        await EvaluationStorage.saveFollowUpQuestions(
          storedEvaluation.id,
          followUpQuestions
        );
      }
      
      // Complete
      const processingTime = Date.now() - startTime;
      
      this.emitEvent('complete', 'Evaluation complete', {
        evaluationId: storedEvaluation.id,
        score: evaluationResult.scores.overall,
        processingTimeMs: processingTime,
        hasFollowUp: !!followUpQuestions
      });
      
      return {
        success: true,
        evaluation: evaluationResult,
        followUpQuestions,
        evaluationId: storedEvaluation.id,
        metadata: {
          processingTimeMs: processingTime,
          storageStatus: 'saved'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.emitEvent('error', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Get evaluation by ID
   */
  async getEvaluation(evaluationId: string): Promise<EvaluationStorage.StoredEvaluation | null> {
    return EvaluationStorage.getEvaluationById(evaluationId);
  }
  
  /**
   * Get evaluations for a quiz
   */
  async getEvaluationsForQuiz(quizId: string): Promise<EvaluationStorage.StoredEvaluation[]> {
    return EvaluationStorage.getEvaluationsForQuiz(quizId);
  }
  
  /**
   * Get evaluation for a specific question in a quiz
   */
  async getEvaluationForQuestion(
    quizId: string, 
    questionId: string
  ): Promise<EvaluationStorage.StoredEvaluation | null> {
    return EvaluationStorage.getEvaluationForQuestion(quizId, questionId);
  }
  
  /**
   * Delete an evaluation
   */
  async deleteEvaluation(evaluationId: string): Promise<boolean> {
    return EvaluationStorage.deleteEvaluation(evaluationId);
  }
  
  /**
   * Delete all evaluations for a quiz
   */
  async deleteEvaluationsForQuiz(quizId: string): Promise<boolean> {
    return EvaluationStorage.deleteEvaluationsForQuiz(quizId);
  }
  
  /**
   * Generate follow-up questions for an existing evaluation
   */
  async generateFollowUpQuestions(
    evaluationId: string,
    options: EvaluationPromptOptions = {}
  ): Promise<FollowUpQuestionsResult | null> {
    try {
      // Get the evaluation
      const evaluation = await EvaluationStorage.getEvaluationById(evaluationId);
      if (!evaluation) {
        throw new Error(`Evaluation with ID ${evaluationId} not found`);
      }
      
      // Check if follow-up questions already exist
      if (evaluation.followUpQuestions) {
        return evaluation.followUpQuestions;
      }
      
      // Generate follow-up questions
      this.emitEvent('generating_follow_up', 'Generating follow-up questions');
      
      // Get quiz from storage to retrieve article content
      const quizResult = await new Promise<Record<string, any>>(resolve => {
        chrome.storage.local.get({ [`quiz.${evaluation.quizId}`]: null }, resolve);
      });
      
      const quiz = quizResult[`quiz.${evaluation.quizId}`];
      if (!quiz || !quiz.content) {
        throw new Error(`Quiz content not found for evaluation ${evaluationId}`);
      }
      
      // Find the question in the quiz
      const question = quiz.questions.find((q: { id: string }) => q.id === evaluation.questionId);
      if (!question) {
        throw new Error(`Question not found for evaluation ${evaluationId}`);
      }
      
      const followUpQuestions = await this.service.generateFollowUpQuestions(
        quiz.content,
        question.text,
        evaluation.userResponse,
        evaluation.evaluation,
        options
      );
      
      // Save follow-up questions
      await EvaluationStorage.saveFollowUpQuestions(
        evaluationId,
        followUpQuestions
      );
      
      return followUpQuestions;
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return null;
    }
  }
  
  /**
   * Clean up old evaluations to free up storage space
   */
  async cleanupOldEvaluations(maxAgeDays: number = 30): Promise<number> {
    return EvaluationStorage.cleanupOldEvaluations(maxAgeDays);
  }
} 