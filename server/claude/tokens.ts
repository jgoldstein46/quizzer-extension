/**
 * Token counting and usage tracking for Claude API
 */

/**
 * Usage data for a single API request
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  timestamp: number;
  model: string;
  endpoint: string;
  successful: boolean;
  requestId?: string;
}

/**
 * Aggregated usage statistics
 */
export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  requestsByModel: Record<string, number>;
  tokensByModel: Record<string, number>;
  usageByDay: Record<string, number>;
}

/**
 * Budget configuration for token usage
 */
export interface TokenBudget {
  maxTokensPerRequest?: number;
  maxTokensPerDay?: number;
  maxTokensPerMonth?: number;
  maxRequestsPerDay?: number;
}

// In-memory storage for usage data
const usageHistory: TokenUsage[] = [];
const currentBudget: TokenBudget = {};

/**
 * Very rough estimate of token count based on characters in text
 * Claude tokenization is complex, but this gives a reasonable estimate
 * For production use, consider using a dedicated tokenizer library
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // Simple heuristic: average of 4 characters per token for English text
  // This is a rough approximation and will vary based on content
  return Math.ceil(text.length / 4);
}

/**
 * Checks if a request would exceed the configured budget limits
 */
export function checkBudgetLimits(tokenEstimate: number): { allowed: boolean; reason?: string } {
  if (currentBudget.maxTokensPerRequest && tokenEstimate > currentBudget.maxTokensPerRequest) {
    return { 
      allowed: false, 
      reason: `Estimated ${tokenEstimate} tokens exceeds the per-request limit of ${currentBudget.maxTokensPerRequest}` 
    };
  }
  
  // Check daily token limit if configured
  if (currentBudget.maxTokensPerDay) {
    const today = new Date().toISOString().split('T')[0];
    const tokensUsedToday = usageHistory
      .filter(usage => {
        const usageDate = new Date(usage.timestamp).toISOString().split('T')[0];
        return usageDate === today;
      })
      .reduce((sum, usage) => sum + usage.totalTokens, 0);
    
    if (tokensUsedToday + tokenEstimate > currentBudget.maxTokensPerDay) {
      return { 
        allowed: false, 
        reason: `Daily token limit of ${currentBudget.maxTokensPerDay} would be exceeded (${tokensUsedToday} used)` 
      };
    }
  }
  
  // Check daily request limit if configured
  if (currentBudget.maxRequestsPerDay) {
    const today = new Date().toISOString().split('T')[0];
    const requestsToday = usageHistory.filter(usage => {
      const usageDate = new Date(usage.timestamp).toISOString().split('T')[0];
      return usageDate === today;
    }).length;
    
    if (requestsToday >= currentBudget.maxRequestsPerDay) {
      return { 
        allowed: false, 
        reason: `Daily request limit of ${currentBudget.maxRequestsPerDay} has been reached` 
      };
    }
  }
  
  // Check monthly token limit if configured
  if (currentBudget.maxTokensPerMonth) {
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const tokensUsedThisMonth = usageHistory
      .filter(usage => {
        const usageMonth = new Date(usage.timestamp).toISOString().slice(0, 7);
        return usageMonth === thisMonth;
      })
      .reduce((sum, usage) => sum + usage.totalTokens, 0);
    
    if (tokensUsedThisMonth + tokenEstimate > currentBudget.maxTokensPerMonth) {
      return { 
        allowed: false, 
        reason: `Monthly token limit of ${currentBudget.maxTokensPerMonth} would be exceeded (${tokensUsedThisMonth} used)` 
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Configure budget limits for API usage
 */
export function setBudgetLimits(budget: TokenBudget): void {
  Object.assign(currentBudget, budget);
}

/**
 * Get current budget configuration
 */
export function getBudgetLimits(): TokenBudget {
  return { ...currentBudget };
}

/**
 * Record usage data from an API request
 */
export function recordUsage(usage: TokenUsage): void {
  usageHistory.push({
    ...usage,
    timestamp: usage.timestamp || Date.now()
  });
  
  // Optional: persist to storage or send to analytics service
  saveUsageData();
}

/**
 * Calculate estimated cost of API usage based on token counts
 * These are example rates and may not reflect actual Claude pricing
 */
export function estimateCost(tokenCount: number, model: string): number {
  // Example pricing (hypothetical)
  const ratePerThousandTokens = model.includes('opus') ? 0.015 : 0.008;
  
  return (tokenCount / 1000) * ratePerThousandTokens;
}

/**
 * Get usage statistics for a given time period
 */
export function getUsageStats(startDate?: Date, endDate?: Date): UsageStats {
  let filteredUsage = [...usageHistory];
  
  if (startDate) {
    filteredUsage = filteredUsage.filter(usage => usage.timestamp >= startDate.getTime());
  }
  
  if (endDate) {
    filteredUsage = filteredUsage.filter(usage => usage.timestamp <= endDate.getTime());
  }
  
  const stats: UsageStats = {
    totalRequests: filteredUsage.length,
    successfulRequests: filteredUsage.filter(u => u.successful).length,
    failedRequests: filteredUsage.filter(u => !u.successful).length,
    totalInputTokens: filteredUsage.reduce((sum, u) => sum + u.inputTokens, 0),
    totalOutputTokens: filteredUsage.reduce((sum, u) => sum + u.outputTokens, 0),
    totalTokens: filteredUsage.reduce((sum, u) => sum + u.totalTokens, 0),
    requestsByModel: {},
    tokensByModel: {},
    usageByDay: {}
  };
  
  // Aggregate by model
  filteredUsage.forEach(usage => {
    if (!stats.requestsByModel[usage.model]) {
      stats.requestsByModel[usage.model] = 0;
      stats.tokensByModel[usage.model] = 0;
    }
    
    stats.requestsByModel[usage.model]++;
    stats.tokensByModel[usage.model] += usage.totalTokens;
    
    // Aggregate by day
    const day = new Date(usage.timestamp).toISOString().split('T')[0];
    if (!stats.usageByDay[day]) {
      stats.usageByDay[day] = 0;
    }
    stats.usageByDay[day] += usage.totalTokens;
  });
  
  return stats;
}

/**
 * Estimate tokens for a set of messages before sending to the API
 */
export function estimateMessageTokens(messages: Array<{ role: string; content: string }>): number {
  let totalTokens = 0;
  
  // Add estimated tokens for each message
  messages.forEach(msg => {
    totalTokens += estimateTokenCount(msg.content);
    // Add overhead for role and message formatting (approx. 4 tokens per message)
    totalTokens += 4;
  });
  
  // Add system overhead (approx. 10 tokens)
  totalTokens += 10;
  
  return totalTokens;
}

/**
 * Save usage data to persistent storage (localStorage in browser environment)
 * In a real application, you might send this to a server or database
 */
function saveUsageData(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('claude_usage_history', JSON.stringify(usageHistory));
    }
  } catch (error) {
    console.error('Failed to save usage data:', error);
  }
}

/**
 * Load usage data from persistent storage
 */
export function loadUsageData(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const savedData = localStorage.getItem('claude_usage_history');
      if (savedData) {
        const parsed = JSON.parse(savedData) as TokenUsage[];
        usageHistory.length = 0;
        usageHistory.push(...parsed);
      }
    }
  } catch (error) {
    console.error('Failed to load usage data:', error);
  }
}

// Initialize by loading saved data
loadUsageData(); 