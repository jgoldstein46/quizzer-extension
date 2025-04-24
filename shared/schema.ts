/**
 * Quiz Response Parser
 * Extracts and structures questions returned by Claude into a standardized quiz format
 */

/**
 * Question data structure
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
 * Quiz data structure
 */
export interface Quiz {
questions: QuizQuestion[];
/**
 * metadata fields for quiz history and analytics:
 * - title: title of the article or quiz
 * - generatedAt: ISO string of quiz creation
 * - quizType: type of quiz
 * - articleUrl: source article URL
 * - numCorrect: number of questions the user got right (optional, set after completion)
 * - completed: whether the quiz was completed (optional)
 */
metadata?: {
    title?: string;
    generatedAt: string;
    quizType?: string;
    articleUrl?: string;
    articleReadTime?: number;
    numCorrect?: number;
    completed?: boolean;
};
error?: string;
}