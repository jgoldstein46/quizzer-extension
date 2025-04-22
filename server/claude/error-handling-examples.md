# Claude API Error Handling Examples

This document demonstrates how to use the error handling and retry functionality of the Claude API client.

## Using the Retry Mechanism

```typescript
import { 
  sendMessageToClaudeWithRetry, 
  DEFAULT_RETRY_CONFIG 
} from '../services/claude';

async function generateQuizWithRetry() {
  try {
    // Use the retry wrapper function instead of regular sendMessageToClaude
    const response = await sendMessageToClaudeWithRetry(
      [{ role: 'user', content: 'Generate a quiz question about climate change.' }],
      {
        // Use default retry settings
        retryConfig: DEFAULT_RETRY_CONFIG,
        // Set timeout to 30 seconds
        timeoutMs: 30000
      }
    );
    
    console.log('Successfully generated quiz with retry mechanism');
    return response.content;
  } catch (error) {
    console.error('Failed after multiple retry attempts:', error);
    throw error;
  }
}
```

## Custom Retry Configuration

```typescript
import { 
  sendMessageToClaudeWithRetry, 
  RetryConfig 
} from '../services/claude';

async function generateQuizWithCustomRetry() {
  // Create custom retry configuration
  const customRetryConfig: RetryConfig = {
    maxRetries: 5,           // Try up to 5 times
    initialDelayMs: 2000,    // Start with 2 second delay
    maxDelayMs: 60000,       // Maximum 1 minute delay
    backoffFactor: 1.5       // Increase delay by 1.5x each time
  };
  
  try {
    const response = await sendMessageToClaudeWithRetry(
      [{ role: 'user', content: 'Generate a quiz question about renewable energy.' }],
      { retryConfig: customRetryConfig }
    );
    
    return response.content;
  } catch (error) {
    // Handle the final error after all retries have been exhausted
    console.error('Failed after all retry attempts:', error);
    throw error;
  }
}
```

## Error Type Handling

```typescript
import { 
  sendMessageToClaude, 
  ClaudeApiError, 
  ClaudeErrorType 
} from '../services/claude';

async function handleDifferentErrorTypes() {
  try {
    const response = await sendMessageToClaude([
      { role: 'user', content: 'Generate a quiz question.' }
    ]);
    
    return response.content;
  } catch (error) {
    // Check if it's a Claude API error
    if (error instanceof ClaudeApiError) {
      // Handle different error types differently
      switch (error.type) {
        case ClaudeErrorType.AUTHENTICATION:
          console.error('Authentication failed. Check your API key.');
          // Prompt user to update API key
          break;
          
        case ClaudeErrorType.RATE_LIMIT:
          console.error('Rate limit exceeded. Try again later.');
          // Show user a "try again later" message
          break;
          
        case ClaudeErrorType.SERVER:
          console.error('Claude server error. This is not your fault.');
          // Show "service temporarily unavailable" message
          break;
          
        case ClaudeErrorType.CONNECTION:
          console.error('Connection error. Check your internet connection.');
          // Show network troubleshooting tips
          break;
          
        default:
          console.error('Unknown error:', error.message);
          // Show generic error message
      }
    } else {
      // Handle non-Claude errors
      console.error('Unexpected error:', error);
    }
    
    throw error;
  }
}
```

## Response Parsing Example

```typescript
import { 
  sendMessageToClaude, 
  parseQuizQuestions,
  ClaudeApiError,
  ClaudeErrorType
} from '../services/claude';

async function generateAndParseQuestions() {
  try {
    // Generate quiz questions
    const response = await sendMessageToClaude([
      { role: 'user', content: 'Generate 3 questions about climate change. Format each as Q1: question text.' }
    ]);
    
    try {
      // Parse the questions from response
      const questions = parseQuizQuestions(response.content);
      console.log('Successfully parsed questions:', questions);
      return questions;
    } catch (error) {
      // Handle parsing errors
      if (error instanceof ClaudeApiError && error.type === ClaudeErrorType.PARSING) {
        console.error('Failed to parse questions from response:', error.message);
        console.log('Raw response:', response.content);
        
        // Fallback: return raw response
        return [response.content];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}
```

## Evaluation Parsing Example

```typescript
import { 
  sendMessageToClaude,
  parseEvaluationScore,
  parseEvaluationFeedback
} from '../services/claude';

async function evaluateAndParseResponse() {
  // Simulate a response evaluation from Claude
  const evaluationResponse = await sendMessageToClaude([
    { 
      role: 'user', 
      content: 'Evaluate this response to "What causes climate change?": "It\'s mainly caused by greenhouse gases."' 
    }
  ]);
  
  // Parse the score and feedback
  const score = parseEvaluationScore(evaluationResponse.content);
  const feedback = parseEvaluationFeedback(evaluationResponse.content);
  
  console.log(`Score: ${score}/10`);
  console.log(`Feedback: ${feedback}`);
  
  return { score, feedback };
}
``` 