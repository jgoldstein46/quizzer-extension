import Anthropic from '@anthropic-ai/sdk';
import { loadClaudeConfig } from './config';
import { calculateBackoff, classifyApiError, ClaudeApiError, DEFAULT_RETRY_CONFIG, RetryConfig } from './parser';
import {
  checkBudgetLimits,
  estimateMessageTokens,
  getBudgetLimits,
  recordUsage,
  setBudgetLimits,
  TokenBudget
} from './tokens';

/**
 * Message interface aligned with Anthropic's API
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Claude API client response type
 */
export interface ClaudeResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Options for Claude API requests
 */
export interface ClaudeRequestOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  system?: string;
  retryConfig?: RetryConfig;
  timeoutMs?: number;
  dryRun?: boolean;
  trackUsage?: boolean;
}

/**
 * Error types for Claude API
 */
export type ClaudeErrorType = 
  | 'invalid_request_error'
  | 'authentication_error'
  | 'permission_error'
  | 'not_found_error'
  | 'rate_limit_error'
  | 'api_error'
  | 'timeout_error'
  | 'connection_error'
  | 'parsing_error'
  | 'unknown_error';

let claudeInstance: Anthropic | null = null;

/**
 * Initialize the Claude API client with the configuration
 */
export async function initializeClaudeClient(): Promise<Anthropic> {
  if (claudeInstance) {
    return claudeInstance;
  }

  const config = await loadClaudeConfig();
  claudeInstance = new Anthropic({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  });

  return claudeInstance;
}

/**
 * Set budget limits for Claude API usage
 */
export function setClaudeBudgetLimits(budget: TokenBudget): void {
  setBudgetLimits(budget);
}

/**
 * Get current Claude API budget limits
 */
export function getClaudeBudgetLimits(): TokenBudget {
  return getBudgetLimits();
}

/**
 * Send a message to Claude API and get a response
 */
export async function sendMessageToClaude(
  messages: ClaudeMessage[],
  options: ClaudeRequestOptions = {}
): Promise<ClaudeResponse> {
  const client = await initializeClaudeClient();
  const config = await loadClaudeConfig();
  const tokenEstimate = estimateMessageTokens(messages);
  const trackUsage = options.trackUsage !== false; // Track usage by default
  
  // Check budget limits
  const budgetCheck = checkBudgetLimits(tokenEstimate);
  if (!budgetCheck.allowed) {
    throw new ClaudeApiError(
      `Budget limit exceeded: ${budgetCheck.reason}`,
      'invalid_request_error' as ClaudeErrorType,
      undefined,
      false
    );
  }
  
  // Handle dry-run mode (estimate tokens without making API call)
  if (options.dryRun) {
    console.log(`DRY RUN: Estimated ${tokenEstimate} input tokens`);
    return {
      content: `[DRY RUN] This would have been a response from Claude. Estimated input tokens: ${tokenEstimate}`,
      model: options.model || config.model,
      usage: {
        inputTokens: tokenEstimate,
        outputTokens: 0,
        totalTokens: tokenEstimate,
      },
    };
  }

  try {
    const model = options.model || config.model;
    const maxTokens = options.maxTokens || config.maxTokens;
    const temperature = options.temperature || config.temperature;
    
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: options.system,

      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Handle different content block types
    let responseContent = "";
    if (response.content && response.content.length > 0) {
      const contentBlock = response.content[0];
      if ('text' in contentBlock) {
        responseContent = contentBlock.text;
      } else {
        responseContent = JSON.stringify(contentBlock);
      }
    }

    const result = {
      content: responseContent,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
    
    // Record usage statistics
    if (trackUsage) {
      recordUsage({
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        timestamp: Date.now(),
        model: result.model,
        endpoint: 'messages',
        successful: true,
        requestId: response.id,
      });
    }
    
    return result;
  } catch (error) {
    // Record failed usage if tracking is enabled
    if (trackUsage) {
      recordUsage({
        inputTokens: tokenEstimate,
        outputTokens: 0,
        totalTokens: tokenEstimate,
        timestamp: Date.now(),
        model: options.model || config.model,
        endpoint: 'messages',
        successful: false,
      });
    }
    
    console.error('Error sending message to Claude:', error);
    throw classifyApiError(error);
  }
}

/**
 * Send a message to Claude API with automatic retry logic for transient errors
 */
export async function sendMessageToClaudeWithRetry(
  messages: ClaudeMessage[],
  options: ClaudeRequestOptions = {}
): Promise<ClaudeResponse> {
  const retryConfig = options.retryConfig || DEFAULT_RETRY_CONFIG;
  let lastError: ClaudeApiError | null = null;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Add attempt number to logged messages (except first attempt)
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} of ${retryConfig.maxRetries}...`);
      }
      
      // Make the API call with timeout if specified
      if (options.timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new ClaudeApiError('Request timed out', 'timeout_error' as ClaudeErrorType, undefined, true));
          }, options.timeoutMs);
        });
        
        return await Promise.race([
          sendMessageToClaude(messages, options),
          timeoutPromise
        ]);
      } else {
        return await sendMessageToClaude(messages, options);
      }
    } catch (error) {
      const claudeError = error instanceof ClaudeApiError 
        ? error 
        : classifyApiError(error);
      
      lastError = claudeError;
      
      // Only retry if the error is retryable and we haven't exceeded max retries
      if (claudeError.retryable && attempt < retryConfig.maxRetries) {
        const backoffMs = calculateBackoff(attempt, retryConfig);
        console.log(`Encountered retryable error: ${claudeError.message}. Retrying in ${Math.round(backoffMs / 1000)} seconds...`);
        
        // Wait for the backoff period
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      // If not retryable or exceeded retries, rethrow
      throw claudeError;
    }
  }
  
  // This should never happen (we should always return in the loop or throw),
  // but TypeScript needs this for proper type checking
  throw lastError || new ClaudeApiError('Unknown error during retry logic', 'unknown_error' as ClaudeErrorType);
}

/**
 * Estimate the token usage and cost for a potential Claude API request without making the actual API call
 */
export async function estimateClaudeRequest(
  messages: ClaudeMessage[],
  options: ClaudeRequestOptions = {}
): Promise<{ inputTokens: number; costEstimate: number; model: string; }> {
  const config = await loadClaudeConfig();
  const model = options.model || config.model;
  const inputTokens = estimateMessageTokens(messages);
  
  // Estimate cost based on input tokens and expected output tokens
  // This is a rough estimate and actual costs will vary
  const avgResponseTokens = options.maxTokens || Math.min(config.maxTokens, 500);
  const totalEstimatedTokens = inputTokens + avgResponseTokens;
  
  // Calculate cost (using pricing from tokens.ts)
  const ratePerThousandTokens = model.includes('opus') ? 0.015 : 0.008;
  const costEstimate = (totalEstimatedTokens / 1000) * ratePerThousandTokens;
  
  return {
    inputTokens,
    costEstimate,
    model
  };
}

/**
 * Check if Claude API is available by sending a test message
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    await sendMessageToClaude([
      { role: 'user', content: 'Hello Claude, please respond with "Connection successful!"' }
    ], { maxTokens: 20 });
    
    return true;
  } catch (error) {
    console.error('Claude API connection test failed:', error);
    return false;
  }
} 