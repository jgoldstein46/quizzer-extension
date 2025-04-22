/**
 * Prompt construction utilities for Claude API
 * Contains template generators and helper functions for creating effective prompts
 */

/**
 * Current prompt version used for tracking changes to prompt structures
 */
export const PROMPT_VERSION = '1.0.0';

/**
 * Types of prompts supported by the system
 */
export enum PromptType {
  QUIZ_GENERATION = 'quiz_generation',
  RESPONSE_EVALUATION = 'response_evaluation',
  CONTENT_SUMMARY = 'content_summary',
}

/**
 * Options for quiz generation prompts
 */
export interface QuizGenerationOptions {
  numberOfQuestions?: number;
  difficultyLevel?: 'basic' | 'intermediate' | 'advanced';
  questionTypes?: Array<'comprehension' | 'analysis' | 'application' | 'synthesis'>;
  focusTopics?: string[];
}

/**
 * Options for response evaluation prompts
 */
export interface ResponseEvaluationOptions {
  evaluationCriteria?: Array<'accuracy' | 'completeness' | 'reasoning' | 'clarity'>;
  feedbackStyle?: 'concise' | 'detailed';
  scoreScale?: number;
}

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeInput(input: string): string {
  // Remove any control characters
  const sanitized = input.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  // Trim excessive whitespace
  return sanitized.replace(/\s+/g, ' ').trim();
}

/**
 * Generate a prompt for quiz generation based on article content
 */
export function generateQuizPrompt(
  articleContent: string,
  options: QuizGenerationOptions = {}
): string {
  const {
    numberOfQuestions = 3,
    difficultyLevel = 'intermediate',
    questionTypes = ['comprehension', 'analysis', 'application'],
    focusTopics = [],
  } = options;

  const sanitizedContent = sanitizeInput(articleContent);
  const focusTopicsText = focusTopics.length > 0 
    ? `Focus on these topics: ${focusTopics.join(', ')}.` 
    : '';

  return `
VERSION: ${PROMPT_VERSION}
TASK: Generate ${numberOfQuestions} quiz questions based on the article content below.
DIFFICULTY: ${difficultyLevel}
QUESTION TYPES: ${questionTypes.join(', ')}
${focusTopicsText}

INSTRUCTIONS:
1. Create ${numberOfQuestions} thought-provoking questions that test understanding of the article.
2. Focus on important concepts and key points rather than trivial details.
3. Encourage critical thinking and analysis rather than simple recall.
4. Each question should have a clear answer derivable from the article content.
5. Format each question as "Q1: [Question text]"

ARTICLE CONTENT:
${sanitizedContent}

QUESTIONS:`;
}

/**
 * Generate a prompt for evaluating user responses to quiz questions
 */
export function generateEvaluationPrompt(
  articleContent: string,
  question: string,
  userResponse: string,
  options: ResponseEvaluationOptions = {}
): string {
  const {
    evaluationCriteria = ['accuracy', 'completeness', 'reasoning', 'clarity'],
    feedbackStyle = 'detailed',
    scoreScale = 10,
  } = options;

  const sanitizedArticle = sanitizeInput(articleContent);
  const sanitizedQuestion = sanitizeInput(question);
  const sanitizedResponse = sanitizeInput(userResponse);

  return `
VERSION: ${PROMPT_VERSION}
TASK: Evaluate the user's response to a quiz question based on the article content.
EVALUATION CRITERIA: ${evaluationCriteria.join(', ')}
FEEDBACK STYLE: ${feedbackStyle}
SCORE SCALE: 0-${scoreScale}

INSTRUCTIONS:
1. Read the article content carefully.
2. Consider the quiz question in context of the article.
3. Evaluate the user's response based on the specified criteria.
4. Provide constructive feedback on the response's strengths and weaknesses.
5. Assign a score from 0 to ${scoreScale} based on the quality of the response.
6. Include specific references to the article where relevant.

ARTICLE CONTENT:
${sanitizedArticle}

QUESTION:
${sanitizedQuestion}

USER RESPONSE:
${sanitizedResponse}

EVALUATION:`;
}

/**
 * Generate a prompt for summarizing article content
 */
export function generateSummaryPrompt(articleContent: string, maxWords: number = 150): string {
  const sanitizedContent = sanitizeInput(articleContent);

  return `
VERSION: ${PROMPT_VERSION}
TASK: Summarize the key points from the article content below.
MAX LENGTH: ${maxWords} words

INSTRUCTIONS:
1. Extract the main ideas and key points from the article.
2. Focus on the most important information and concepts.
3. Keep the summary concise and within the specified word limit.
4. Maintain the original meaning and context of the article.

ARTICLE CONTENT:
${sanitizedContent}

SUMMARY:`;
}

/**
 * Get the appropriate system message for different prompt types
 */
export function getSystemMessage(promptType: PromptType): string {
  switch (promptType) {
    case PromptType.QUIZ_GENERATION:
      return 'You are an expert educational content creator specialized in creating thoughtful quiz questions that test comprehension and critical thinking. Your questions should be clear, relevant to the provided content, and encourage deeper analysis.';
    
    case PromptType.RESPONSE_EVALUATION:
      return 'You are an experienced educator skilled at evaluating student responses. Provide fair, constructive feedback that highlights strengths and identifies areas for improvement. Be specific in your feedback and reference the source material.';
    
    case PromptType.CONTENT_SUMMARY:
      return 'You are a skilled content analyst who specializes in identifying and extracting key information from longer texts. Create concise, accurate summaries that capture the essential points.';
    
    default:
      return 'You are a helpful assistant providing accurate and relevant information based on the given content.';
  }
} 