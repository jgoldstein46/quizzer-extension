/**
 * Quiz Generation Prompt Templates
 * Specialized prompt templates for generating quiz questions using Claude 3.7 Sonnet
 */

import { PROMPT_VERSION, sanitizeInput } from '../claude/prompts';

/**
 * Question types supported for quiz generation
 */
export type QuestionType = 'multiple_choice' | 'open_ended' | 'true_false' | 'fill_in_blank';

/**
 * Difficulty levels for quiz questions
 */
export type DifficultyLevel = 'basic' | 'intermediate' | 'advanced';

/**
 * Cognitive skills to target with questions
 */
export type CognitiveSkill = 'recall' | 'comprehension' | 'application' | 'analysis' | 'synthesis' | 'evaluation';

/**
 * Options for configuring quiz generation prompts
 */
export interface QuizPromptOptions {
  numberOfQuestions?: number;
  difficultyLevel?: DifficultyLevel;
  questionTypes?: QuestionType[];
  cognitiveSkills?: CognitiveSkill[];
  focusTopics?: string[];
  includeExplanations?: boolean;
  format?: 'json' | 'markdown' | 'structured';
}

/**
 * System message for quiz generation
 */
export const QUIZ_GENERATION_SYSTEM_MESSAGE = `You are an expert educational content creator specialized in creating thought-provoking quiz questions that test deep understanding and critical thinking. Your questions should be clear, contextually relevant to the provided content, and designed to assess genuine comprehension rather than mere factual recall.`;

/**
 * Creates a comprehensive quiz generation prompt for factual content
 */
export function createFactualContentQuizPrompt(
  articleContent: string,
  options: QuizPromptOptions = {}
): string {
  const {
    numberOfQuestions = 3,
    difficultyLevel = 'intermediate',
    questionTypes = ['multiple_choice', 'open_ended'],
    cognitiveSkills = ['comprehension', 'analysis', 'application'],
    includeExplanations = true,
    format = 'json',
    focusTopics = [],
  } = options;

  const sanitizedContent = sanitizeInput(articleContent);
  const focusTopicsText = focusTopics.length > 0 
    ? `Focus particularly on these topics: ${focusTopics.join(', ')}.` 
    : '';

  const formatInstructions = getFormatInstructions(format, includeExplanations);

  return `
VERSION: ${PROMPT_VERSION}
TASK: Generate ${numberOfQuestions} high-quality quiz questions based on the article content provided below.

PARAMETERS:
- Difficulty: ${difficultyLevel}
- Question Types: ${questionTypes.join(', ')}
- Cognitive Skills: ${cognitiveSkills.join(', ')}
- Include Explanations: ${includeExplanations ? 'Yes' : 'No'}
${focusTopicsText}

INSTRUCTIONS:
1. Create exactly ${numberOfQuestions} thought-provoking questions that test understanding of the article.
2. Focus on important concepts and key ideas rather than trivial details.
3. Ensure questions test ${cognitiveSkills.join(', ')} skills, not just factual recall.
4. Make questions challenging but fair for the specified ${difficultyLevel} difficulty level.
5. For multiple-choice questions, provide 4 options with only one correct answer.
6. For true/false questions, ensure the statement is clearly either true or false.
7. For open-ended questions, provide an example of a good answer.
8. Ensure each question has a clear answer that can be derived from the article content.
9. Create questions that require critical thinking but can still be answered concisely.
${includeExplanations ? '10. Include an explanation for the correct answer that deepens understanding.' : ''}

${formatInstructions}

ARTICLE CONTENT:
${sanitizedContent}

QUIZ QUESTIONS:`;
}

/**
 * Creates a comprehensive quiz generation prompt for analytical content
 */
export function createAnalyticalContentQuizPrompt(
  articleContent: string,
  options: QuizPromptOptions = {}
): string {
  const {
    numberOfQuestions = 3,
    difficultyLevel = 'intermediate',
    questionTypes = ['open_ended', 'multiple_choice'],
    cognitiveSkills = ['analysis', 'evaluation', 'synthesis'],
    includeExplanations = true,
    format = 'json',
    focusTopics = [],
  } = options;

  const sanitizedContent = sanitizeInput(articleContent);
  const focusTopicsText = focusTopics.length > 0 
    ? `Focus particularly on these topics: ${focusTopics.join(', ')}.` 
    : '';

  const formatInstructions = getFormatInstructions(format, includeExplanations);

  return `
VERSION: ${PROMPT_VERSION}
TASK: Generate ${numberOfQuestions} analytical quiz questions that promote critical thinking based on the article content.

PARAMETERS:
- Difficulty: ${difficultyLevel}
- Question Types: ${questionTypes.join(', ')}
- Cognitive Skills: ${cognitiveSkills.join(', ')}
- Include Explanations: ${includeExplanations ? 'Yes' : 'No'}
${focusTopicsText}

INSTRUCTIONS:
1. Create exactly ${numberOfQuestions} questions that require deep analysis of the article content.
2. Focus on underlying themes, arguments, evidence, and implications rather than surface details.
3. Craft questions that encourage students to evaluate claims, analyze reasoning, or synthesize information.
4. For multiple-choice questions, ensure options represent plausible interpretations or analyses.
5. For open-ended questions, provide criteria for what constitutes a thorough answer.
6. Design questions that could have multiple defensible answers but require textual evidence.
7. Ensure questions are appropriate for the ${difficultyLevel} difficulty level.
8. Avoid questions with simplistic right/wrong answers in favor of nuanced analysis.
${includeExplanations ? '9. Include sample responses or rubrics that demonstrate analytical depth.' : ''}

${formatInstructions}

ARTICLE CONTENT:
${sanitizedContent}

QUIZ QUESTIONS:`;
}

/**
 * Creates a prompt for generating questions focused on key concepts and terminology
 */
export function createConceptFocusedQuizPrompt(
  articleContent: string,
  options: QuizPromptOptions = {}
): string {
  const {
    numberOfQuestions = 3,
    difficultyLevel = 'intermediate',
    questionTypes = ['multiple_choice', 'fill_in_blank'],
    cognitiveSkills = ['comprehension', 'application'],
    includeExplanations = true,
    format = 'json',
    focusTopics = [],
  } = options;

  const sanitizedContent = sanitizeInput(articleContent);
  const focusTopicsText = focusTopics.length > 0 
    ? `Focus particularly on these concepts: ${focusTopics.join(', ')}.` 
    : '';

  const formatInstructions = getFormatInstructions(format, includeExplanations);

  return `
VERSION: ${PROMPT_VERSION}
TASK: Generate ${numberOfQuestions} quiz questions focused on key concepts and terminology from the article.

PARAMETERS:
- Difficulty: ${difficultyLevel}
- Question Types: ${questionTypes.join(', ')}
- Cognitive Skills: ${cognitiveSkills.join(', ')}
- Include Explanations: ${includeExplanations ? 'Yes' : 'No'}
${focusTopicsText}

INSTRUCTIONS:
1. Create exactly ${numberOfQuestions} questions that test understanding of important concepts and terminology.
2. Identify the most significant terms, principles, or ideas in the article.
3. For each concept, create a question that tests true understanding, not just definition recall.
4. For multiple-choice questions, include common misconceptions as distractors.
5. For fill-in-blank questions, ensure the missing term is central to understanding the concept.
6. Ensure questions are appropriate for the ${difficultyLevel} difficulty level.
7. Questions should test whether readers can apply concepts in context.
${includeExplanations ? '8. Include explanations that clarify conceptual understanding.' : ''}

${formatInstructions}

ARTICLE CONTENT:
${sanitizedContent}

QUIZ QUESTIONS:`;
}

/**
 * Get format instructions based on the requested output format
 */
function getFormatInstructions(format: 'json' | 'markdown' | 'structured', includeExplanations: boolean): string {
  switch (format) {
    case 'json':
      return `OUTPUT FORMAT: Return the questions in JSON format as follows:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice", // or other question type
      "text": "Question text goes here?",
      "options": ["Option A", "Option B", "Option C", "Option D"], // for multiple choice questions
      "correctAnswer": "index (0-3) for multiple choice",
      ${includeExplanations ? `"explanation": "Explanation of the correct answer..."` : ''}
    },
    // more questions...
  ]
}`;

    case 'markdown':
      return `OUTPUT FORMAT: Return the questions in markdown format as follows:

## Question 1
**Type**: multiple_choice (or other question type)

Question text goes here?

A. Option A
B. Option B
C. Option C
D. Option D

**Correct Answer**: A (or the correct option letter)
${includeExplanations ? '**Explanation**: Explanation of the correct answer...' : ''}

## Question 2
// and so on...`;

    case 'structured':
    default:
      return `OUTPUT FORMAT: Return the questions in a structured format as follows:

Q1. [Question Type: multiple_choice] Question text goes here?
Options:
a) Option A
b) Option B
c) Option C
d) Option D
Correct Answer: a
${includeExplanations ? 'Explanation: Explanation of the correct answer...' : ''}

Q2. [Question Type: open_ended] Question text goes here?
Sample Answer: A good response would include...
${includeExplanations ? 'Explanation: Explanation of what makes a good answer...' : ''}

// and so on...`;
  }
} 