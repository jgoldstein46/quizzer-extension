/**
 * Prompt construction utilities for response evaluation
 * Contains template generators and helper functions for evaluating user responses
 */

/**
 * Current prompt version used for tracking changes to prompt structures
 */
export const PROMPT_VERSION = '1.0.0';

/**
 * Types of evaluation prompts supported by the system
 */
export enum EvaluationPromptType {
  FACTUAL = 'factual',
  ANALYTICAL = 'analytical',
  CONCEPTUAL = 'conceptual'
}

/**
 * Options for response evaluation prompts
 */
export interface EvaluationPromptOptions {
  scoringScale?: number;
  evaluationCriteria?: string[];
  feedbackDetail?: 'concise' | 'detailed';
  includeExamples?: boolean;
  format?: 'json' | 'markdown';
  language?: string;
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
 * System message for evaluation prompts
 */
export const EVALUATION_SYSTEM_MESSAGE = 
  'You are an expert educator specialized in evaluating student responses. ' +
  'Your task is to provide fair, specific, and constructive feedback that highlights strengths, ' +
  'identifies misconceptions, and offers suggestions for improvement. ' +
  'Use the provided rubric criteria to evaluate the response objectively. ' +
  'Be specific in your feedback and reference the source material.';

/**
 * Generate a basic evaluation prompt template
 */
export function generateBasicEvaluationPrompt(
  articleContent: string,
  question: string,
  userResponse: string,
  expectedElements: string[],
  options: EvaluationPromptOptions = {}
): string {
  const {
    scoringScale = 10,
    evaluationCriteria = ['accuracy', 'completeness', 'reasoning', 'clarity'],
    feedbackDetail = 'detailed',
    format = 'json'
  } = options;

  const sanitizedArticle = sanitizeInput(articleContent);
  const sanitizedQuestion = sanitizeInput(question);
  const sanitizedResponse = sanitizeInput(userResponse);
  const sanitizedElements = expectedElements.map(item => sanitizeInput(item));

  return `
VERSION: ${PROMPT_VERSION}
TASK: Evaluate the user's response to a quiz question based on the article content.
SCORING_SCALE: 0-${scoringScale}
EVALUATION_CRITERIA: ${evaluationCriteria.join(', ')}
FEEDBACK_DETAIL: ${feedbackDetail}
OUTPUT_FORMAT: ${format}

ARTICLE CONTENT:
${sanitizedArticle}

QUESTION:
${sanitizedQuestion}

EXPECTED ANSWER ELEMENTS:
${sanitizedElements.map(item => `- ${item}`).join('\n')}

USER RESPONSE:
${sanitizedResponse}

INSTRUCTIONS:
1. Compare the user's response against the expected answer elements
2. Evaluate each criterion (${evaluationCriteria.join(', ')}) on a scale of 0-${scoringScale}
3. Identify specific strengths in the response
4. Note missing concepts or misconceptions
5. Provide ${feedbackDetail} feedback with suggestions for improvement
6. Calculate an overall score (0-${scoringScale})

${format === 'json' ? 'Format your response as a JSON object with the following structure:' : 'Format your response with the following sections:'}

${format === 'json' ? `{
  "scores": {
    "overall": number,
    "criteria": {
      "accuracy": number,
      "completeness": number,
      "reasoning": number,
      "clarity": number
    }
  },
  "feedback": {
    "strengths": [string, string, ...],
    "improvements": [string, string, ...],
    "misconceptions": [string, string, ...],
    "summary": string
  },
  "missingElements": [string, string, ...],
  "explanation": string
}` : `
## Scores
- Overall: [score]/10
- Accuracy: [score]/10
- Completeness: [score]/10
- Reasoning: [score]/10
- Clarity: [score]/10

## Feedback
### Strengths:
- [Point 1]
- [Point 2]

### Areas for Improvement:
- [Point 1]
- [Point 2]

### Misconceptions:
- [Point 1]
- [Point 2]

## Missing Elements:
- [Element 1]
- [Element 2]

## Explanation:
[Detailed explanation of the evaluation]
`}

EVALUATION:`;
}

/**
 * Generate an evaluation prompt for factual questions
 */
export function generateFactualEvaluationPrompt(
  articleContent: string,
  question: string,
  userResponse: string,
  expectedElements: string[],
  options: EvaluationPromptOptions = {}
): string {
  const enhancedOptions = {
    ...options,
    evaluationCriteria: options.evaluationCriteria || 
      ['factual_accuracy', 'completeness', 'specificity', 'clarity']
  };
  
  return generateBasicEvaluationPrompt(
    articleContent,
    question,
    userResponse,
    expectedElements,
    enhancedOptions
  );
}

/**
 * Generate an evaluation prompt for analytical questions
 */
export function generateAnalyticalEvaluationPrompt(
  articleContent: string,
  question: string,
  userResponse: string,
  expectedElements: string[],
  options: EvaluationPromptOptions = {}
): string {
  const enhancedOptions = {
    ...options,
    evaluationCriteria: options.evaluationCriteria || 
      ['analytical_depth', 'evidence_use', 'logical_structure', 'insight']
  };
  
  return generateBasicEvaluationPrompt(
    articleContent,
    question,
    userResponse,
    expectedElements,
    enhancedOptions
  );
}

/**
 * Generate an evaluation prompt for conceptual questions
 */
export function generateConceptualEvaluationPrompt(
  articleContent: string,
  question: string,
  userResponse: string,
  expectedElements: string[],
  options: EvaluationPromptOptions = {}
): string {
  const enhancedOptions = {
    ...options,
    evaluationCriteria: options.evaluationCriteria || 
      ['concept_understanding', 'application', 'connection_making', 'expression']
  };
  
  return generateBasicEvaluationPrompt(
    articleContent,
    question,
    userResponse,
    expectedElements,
    enhancedOptions
  );
}

/**
 * Generate a prompt for evaluating responses with follow-up questions
 */
export function generateFollowUpPrompt(
  articleContent: string,
  question: string,
  userResponse: string,
  evaluationResult: any,
  options: EvaluationPromptOptions = {}
): string {
  const sanitizedArticle = sanitizeInput(articleContent);
  const sanitizedQuestion = sanitizeInput(question);
  const sanitizedResponse = sanitizeInput(userResponse);
  const format = options.format || 'json';
  
  // Extract missing elements and misconceptions from the evaluation
  let missingElements: string[] = [];
  let misconceptions: string[] = [];
  
  if (typeof evaluationResult === 'object' && evaluationResult !== null) {
    missingElements = evaluationResult.missingElements || [];
    misconceptions = evaluationResult.feedback?.misconceptions || [];
  }
  
  return `
VERSION: ${PROMPT_VERSION}
TASK: Generate follow-up questions to help the user improve their understanding.
OUTPUT_FORMAT: ${format}

ARTICLE CONTENT:
${sanitizedArticle}

ORIGINAL QUESTION:
${sanitizedQuestion}

USER RESPONSE:
${sanitizedResponse}

MISSING ELEMENTS:
${missingElements.map(item => `- ${sanitizeInput(item)}`).join('\n')}

MISCONCEPTIONS:
${misconceptions.map(item => `- ${sanitizeInput(item)}`).join('\n')}

INSTRUCTIONS:
1. Based on the missing elements and misconceptions, generate 2-3 targeted follow-up questions
2. Design questions that will help the user explore the gaps in their understanding
3. Make questions specific, clear, and directly related to the article content
4. Ensure questions are scaffolded appropriately (starting with simpler concepts)

${format === 'json' ? `Format your response as a JSON object with the following structure:
{
  "followUpQuestions": [
    {
      "question": string,
      "purpose": string,
      "targetedMisconception": string (optional),
      "targetedMissingElement": string (optional)
    },
    ...
  ],
  "explanation": string
}` : `Format your response with the following sections:

## Follow-Up Questions
1. [Question 1]
   - Purpose: [Why this question will help]
   - Targets: [What misconception or missing element this addresses]

2. [Question 2]
   - Purpose: [Why this question will help]
   - Targets: [What misconception or missing element this addresses]

## Explanation
[Brief explanation of how these questions will help the user]`}

FOLLOW_UP_QUESTIONS:`;
}

/**
 * Choose the appropriate evaluation prompt based on question type
 */
export function getEvaluationPrompt(
  articleContent: string,
  question: string,
  userResponse: string,
  expectedElements: string[],
  questionType: EvaluationPromptType,
  options: EvaluationPromptOptions = {}
): string {
  switch (questionType) {
    case EvaluationPromptType.ANALYTICAL:
      return generateAnalyticalEvaluationPrompt(
        articleContent, question, userResponse, expectedElements, options
      );
    case EvaluationPromptType.CONCEPTUAL:
      return generateConceptualEvaluationPrompt(
        articleContent, question, userResponse, expectedElements, options
      );
    case EvaluationPromptType.FACTUAL:
    default:
      return generateFactualEvaluationPrompt(
        articleContent, question, userResponse, expectedElements, options
      );
  }
} 