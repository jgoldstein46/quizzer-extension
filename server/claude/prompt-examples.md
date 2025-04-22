# Claude Prompt Utilities Examples

This document provides examples of how to use the prompt utilities in your application.

## Quiz Generation Example

```typescript
import { 
  generateQuizPrompt, 
  getSystemMessage, 
  PromptType, 
  sendMessageToClaude 
} from '../services/claude';

async function generateQuiz(articleContent: string) {
  // Configure quiz generation options
  const quizOptions = {
    numberOfQuestions: 5,
    difficultyLevel: 'intermediate',
    questionTypes: ['comprehension', 'analysis', 'application'],
    focusTopics: ['key concepts', 'main arguments']
  };
  
  // Generate the prompt content
  const promptContent = generateQuizPrompt(articleContent, quizOptions);
  
  // Get the appropriate system message
  const systemMessage = getSystemMessage(PromptType.QUIZ_GENERATION);
  
  // Send to Claude API
  const response = await sendMessageToClaude(
    [{ role: 'user', content: promptContent }],
    { system: systemMessage }
  );
  
  return response.content;
}
```

## Response Evaluation Example

```typescript
import { 
  generateEvaluationPrompt, 
  getSystemMessage, 
  PromptType, 
  sendMessageToClaude 
} from '../services/claude';

async function evaluateResponse(articleContent: string, question: string, userResponse: string) {
  // Configure evaluation options
  const evaluationOptions = {
    evaluationCriteria: ['accuracy', 'completeness', 'reasoning', 'clarity'],
    feedbackStyle: 'detailed',
    scoreScale: 10
  };
  
  // Generate the prompt content
  const promptContent = generateEvaluationPrompt(
    articleContent,
    question,
    userResponse,
    evaluationOptions
  );
  
  // Get the appropriate system message
  const systemMessage = getSystemMessage(PromptType.RESPONSE_EVALUATION);
  
  // Send to Claude API
  const response = await sendMessageToClaude(
    [{ role: 'user', content: promptContent }],
    { system: systemMessage }
  );
  
  return response.content;
}
```

## Content Summary Example

```typescript
import { 
  generateSummaryPrompt, 
  getSystemMessage, 
  PromptType, 
  sendMessageToClaude 
} from '../services/claude';

async function summarizeContent(articleContent: string) {
  // Generate the prompt content
  const promptContent = generateSummaryPrompt(articleContent, 200);
  
  // Get the appropriate system message
  const systemMessage = getSystemMessage(PromptType.CONTENT_SUMMARY);
  
  // Send to Claude API
  const response = await sendMessageToClaude(
    [{ role: 'user', content: promptContent }],
    { system: systemMessage }
  );
  
  return response.content;
}
```

## Using Input Sanitization

```typescript
import { sanitizeInput } from '../services/claude';

// Sanitize user input before including in prompts
function processUserInput(userInput: string) {
  const sanitizedInput = sanitizeInput(userInput);
  
  // Use the sanitized input in your application
  console.log('Sanitized input:', sanitizedInput);
  
  return sanitizedInput;
}
```

## Prompt Version Tracking

```typescript
import { PROMPT_VERSION } from '../services/claude';

// Log the current prompt version
function logPromptVersion() {
  console.log(`Using prompt templates version: ${PROMPT_VERSION}`);
  
  // Use this for debugging or compatibility checks
  if (PROMPT_VERSION !== '1.0.0') {
    console.warn('Using a newer prompt version than expected');
  }
}
``` 