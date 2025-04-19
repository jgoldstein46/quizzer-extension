/**
 * Response parsing and error handling for Claude API interactions
 */

import { ClaudeErrorType, ClaudeResponse } from './client';

/**
 * Types of Claude API errors
 */

/**
 * Custom error class for Claude API errors
 */
export class ClaudeApiError extends Error {
  type: ClaudeErrorType;
  statusCode?: number;
  retryable: boolean;

  constructor(
    message: string,
    type: ClaudeErrorType = 'unknown_error',
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ClaudeApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;
    
    // Needed for proper instanceof checks with extending Error in TypeScript
    Object.setPrototypeOf(this, ClaudeApiError.prototype);
  }
}

/**
 * Classifies API errors based on status code and error messages
 */
export function classifyApiError(error: unknown): ClaudeApiError {
  if (error instanceof ClaudeApiError) {
    return error;
  }

  // Handle standard Anthropic SDK errors
  if (error instanceof Error) {
    // Check for network/connection errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      return new ClaudeApiError(
        `Connection error: ${error.message}`,
        'connection_error',
        undefined,
        true
      );
    }

    // Check for timeout errors
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return new ClaudeApiError(
        `Request timed out: ${error.message}`,
        'timeout_error',
        undefined,
        true
      );
    }

    // Try to extract status code and message from API errors
    const statusMatch = error.message.match(/status (\d+)/);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10);
      
      switch (statusCode) {
        case 401:
          return new ClaudeApiError(
            `Authentication failed: ${error.message}`,
            'authentication_error',
            statusCode,
            false
          );
        case 400:
          return new ClaudeApiError(
            `Invalid request: ${error.message}`,
            'invalid_request_error',
            statusCode,
            false
          );
        case 429:
          return new ClaudeApiError(
            `Rate limit exceeded: ${error.message}`,
            'rate_limit_error',
            statusCode,
            true
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new ClaudeApiError(
            `Server error: ${error.message}`,
            'api_error',
            statusCode,
            true
          );
      }
    }

    // If we couldn't classify it specifically, return unknown error
    return new ClaudeApiError(
      `Unknown error: ${error.message}`,
      'unknown_error',
      undefined,
      false
    );
  }

  // If error isn't an Error object, convert to string
  return new ClaudeApiError(
    `Unexpected error: ${String(error)}`,
    'unknown_error',
    undefined,
    false
  );
}

/**
 * Retry strategy configuration for API calls
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
};

/**
 * Calculate backoff time for retries with exponential strategy
 */
export function calculateBackoff(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffFactor, retryCount),
    config.maxDelayMs
  );
  
  // Add jitter to prevent thundering herd problem
  const jitter = delay * 0.2 * Math.random();
  return delay + jitter;
}

/**
 * Extracts quiz questions from Claude API response
 */
export function parseQuizQuestions(responseText: string): string[] {
  // Look for lines starting with Q1, Q2, etc.
  const questionRegex = /Q(\d+):\s*(.+?)(?=Q\d+:|$)/gs;
  const matches = [...responseText.matchAll(questionRegex)];
  
  if (matches.length === 0) {
    // Try alternative format: numbered questions without 'Q' prefix
    const altRegex = /(\d+)\.\s*(.+?)(?=\d+\.|$)/gs;
    const altMatches = [...responseText.matchAll(altRegex)];
    
    if (altMatches.length === 0) {
      throw new ClaudeApiError(
        'Failed to parse quiz questions from response',
        'parsing_error'
      );
    }
    
    return altMatches.map(match => match[2].trim());
  }
  
  return matches.map(match => match[2].trim());
}

/**
 * Extracts evaluation score from Claude API response
 */
export function parseEvaluationScore(responseText: string): number {
  const scoreRegex = /Score:\s*(\d+(?:\.\d+)?)\s*(?:\/\s*\d+)?/i;
  const match = responseText.match(scoreRegex);
  
  if (!match) {
    // Try alternative formats
    const altRegexes = [
      /Rating:\s*(\d+(?:\.\d+)?)\s*(?:\/\s*\d+)?/i,
      /(\d+(?:\.\d+)?)\s*\/\s*\d+/,
      /scored\s*(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*\d+/i
    ];
    
    for (const regex of altRegexes) {
      const altMatch = responseText.match(regex);
      if (altMatch) {
        return parseFloat(altMatch[1]);
      }
    }
    
    // If no score found, assume a default middle score
    return 5;
  }
  
  return parseFloat(match[1]);
}

/**
 * Extracts evaluation feedback from Claude API response
 */
export function parseEvaluationFeedback(responseText: string): string {
  // Remove score line if present
  const withoutScore = responseText.replace(/Score:\s*\d+(?:\.\d+)?\s*(?:\/\s*\d+)?/i, '').trim();
  
  // Split into sections
  const sections = withoutScore.split(/\n{2,}/);
  
  // Find feedback section
  const feedbackSection = sections.find(section => 
    section.toLowerCase().includes('feedback') || 
    section.toLowerCase().includes('evaluation') ||
    section.toLowerCase().includes('assessment')
  );
  
  return feedbackSection || withoutScore;
}

/**
 * Checks if Claude API response is valid
 */
export function validateResponse(response: ClaudeResponse): boolean {
  if (!response) {
    return false;
  }
  
  if (!response.content || typeof response.content !== 'string') {
    return false;
  }
  
  if (!response.model || typeof response.model !== 'string') {
    return false;
  }
  
  if (!response.usage || 
      typeof response.usage.inputTokens !== 'number' || 
      typeof response.usage.outputTokens !== 'number' || 
      typeof response.usage.totalTokens !== 'number') {
    return false;
  }
  
  return true;
} 