/**
 * Evaluation Service Index
 * Exports all components of the response evaluation system
 */

// Export API interfaces and classes
export type {
    EvaluationResult,
    FollowUpQuestion,
    FollowUpQuestionsResult, ResponseEvaluationService
} from './api';

// Export controller 
export type {
    EvaluationController, EvaluationEvent, EvaluationListener, EvaluationStatus, ResponseEvaluationRequest,
    ResponseEvaluationResponse
} from './controller';

// Export storage utilities
export type {
    cleanupOldEvaluations, deleteEvaluation,
    deleteEvaluationsForQuiz, EvaluationMetadata, getCurrentEvaluation, getEvaluationById, getEvaluationForQuestion, getEvaluationsForQuiz, saveEvaluation,
    saveFollowUpQuestions, StoredEvaluation
} from './storage';

// Export prompt utilities
export type {
    EVALUATION_SYSTEM_MESSAGE, EvaluationPromptOptions, EvaluationPromptType, generateAnalyticalEvaluationPrompt,
    generateConceptualEvaluationPrompt, generateFactualEvaluationPrompt, generateFollowUpPrompt, getEvaluationPrompt
} from './prompts';

// Create and export a singleton instance of the controller
import { EvaluationController } from './controller';
export const evaluationController = new EvaluationController(); 