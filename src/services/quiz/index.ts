/**
 * Quiz Generation Service Index
 * Exports all quiz generation related modules
 */

// Export controller (main entry point)
export { QuizController, quizController } from './controller';
export type {
    QuizGenerationEvent,
    QuizGenerationListener, QuizGenerationRequest,
    QuizGenerationResponse,
    QuizGenerationStatus
} from './controller';

// Export API service
export { QuizGenerationService } from './api';
export type { QuizType } from './api';

// Export preprocessor
export { cleanContent, estimateTokenCount, preprocessContent } from './preprocessor';
export type { PreprocessingOptions } from './preprocessor';

// Export prompts
export {
    createAnalyticalContentQuizPrompt,
    createConceptFocusedQuizPrompt, createFactualContentQuizPrompt
} from './prompts';
export type { CognitiveSkill, DifficultyLevel, QuestionType, QuizPromptOptions } from './prompts';

// Export parser
export { parseQuizResponse } from './parser';
export type { ParsingOptions, Quiz, QuizQuestion } from './parser';

// Export storage
export * as QuizStorage from './storage';
export type { SaveQuizOptions, StoredQuiz } from './storage';
