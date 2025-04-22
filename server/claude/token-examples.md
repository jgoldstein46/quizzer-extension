# Claude API Token Usage Examples

This document demonstrates how to use the token tracking and budget management functionality.

## Checking Token Estimates

```typescript
import { estimateMessageTokens, estimateClaudeRequest } from '../services/claude';

// Estimate tokens for a potential request
function checkTokenUsage() {
  const messages = [
    { role: 'user', content: 'Generate a quiz based on the following article: ' + longArticleText }
  ];
  
  // Get a simple token count estimate
  const tokenCount = estimateMessageTokens(messages);
  console.log(`Estimated input tokens: ${tokenCount}`);
  
  // Get a more comprehensive estimate including cost
  const estimate = estimateClaudeRequest(messages, { 
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 1000 
  });
  
  console.log(`Estimated input tokens: ${estimate.inputTokens}`);
  console.log(`Estimated cost: $${estimate.costEstimate.toFixed(4)}`);
  console.log(`Model: ${estimate.model}`);
  
  return estimate;
}
```

## Setting Budget Limits

```typescript
import { 
  setClaudeBudgetLimits, 
  getClaudeBudgetLimits,
  TokenBudget 
} from '../services/claude';

// Configure budget limits to prevent excessive usage
function configureBudgetLimits() {
  // Define budget limits
  const budgetLimits: TokenBudget = {
    maxTokensPerRequest: 100000,  // Max tokens per individual request
    maxTokensPerDay: 500000,      // Daily token limit
    maxRequestsPerDay: 50,        // Max number of requests per day
    maxTokensPerMonth: 5000000    // Monthly token limit
  };
  
  // Apply the budget limits
  setClaudeBudgetLimits(budgetLimits);
  
  // Get current budget configuration
  const currentBudget = getClaudeBudgetLimits();
  console.log('Current budget limits:', currentBudget);
}
```

## Dry Run Mode

```typescript
import { sendMessageToClaude } from '../services/claude';

// Test with dry run mode to estimate without making actual API call
async function testDryRun() {
  const response = await sendMessageToClaude(
    [{ role: 'user', content: 'Generate a quiz about machine learning concepts.' }],
    { 
      dryRun: true,  // Enable dry run mode
      maxTokens: 1000
    }
  );
  
  console.log('Dry run response:', response);
  console.log('Estimated tokens:', response.usage.inputTokens);
  
  return response;
}
```

## Usage Tracking

```typescript
import { 
  getUsageStats, 
  estimateCost,
  UsageStats 
} from '../services/claude';

// Get usage statistics
function checkUsageStatistics() {
  // Get all-time usage stats
  const allTimeStats = getUsageStats();
  console.log('Total requests:', allTimeStats.totalRequests);
  console.log('Total tokens used:', allTimeStats.totalTokens);
  
  // Get usage for a specific date range
  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const lastWeekStats = getUsageStats(lastWeekStart);
  console.log('Requests in last 7 days:', lastWeekStats.totalRequests);
  console.log('Tokens in last 7 days:', lastWeekStats.totalTokens);
  
  // Estimate cost
  const estimatedCost = estimateCost(
    lastWeekStats.totalTokens, 
    'claude-3-7-sonnet-20250219'
  );
  console.log(`Estimated cost for last week: $${estimatedCost.toFixed(2)}`);
  
  // Show usage by model
  console.log('Usage by model:', lastWeekStats.tokensByModel);
  
  // Show usage by day
  console.log('Daily usage:', lastWeekStats.usageByDay);
  
  return {
    allTime: allTimeStats,
    lastWeek: lastWeekStats,
    estimatedCost
  };
}
```

## Complete Usage Management Example

```typescript
import { 
  sendMessageToClaude, 
  setClaudeBudgetLimits,
  getUsageStats,
  estimateClaudeRequest
} from '../services/claude';

async function managedApiUsage() {
  // 1. Set budget limits
  setClaudeBudgetLimits({
    maxTokensPerDay: 100000,
    maxRequestsPerDay: 20
  });
  
  // 2. Estimate the request before sending
  const messages = [
    { role: 'user', content: 'Generate a short quiz about renewable energy.' }
  ];
  
  const estimate = estimateClaudeRequest(messages);
  console.log(`This request will use approximately ${estimate.inputTokens} input tokens`);
  console.log(`Estimated cost: $${estimate.costEstimate.toFixed(4)}`);
  
  // 3. Check if we have enough budget remaining
  const todayStats = getUsageStats(new Date());
  const remainingDailyTokens = 100000 - todayStats.totalTokens;
  const remainingRequests = 20 - todayStats.totalRequests;
  
  console.log(`Remaining daily token budget: ${remainingDailyTokens}`);
  console.log(`Remaining requests today: ${remainingRequests}`);
  
  if (estimate.inputTokens > remainingDailyTokens) {
    console.error('This request would exceed your daily token budget');
    return null;
  }
  
  if (remainingRequests <= 0) {
    console.error('You have used all your daily requests');
    return null;
  }
  
  // 4. Make the API call (usage tracking is enabled by default)
  try {
    const response = await sendMessageToClaude(messages);
    console.log('API call successful');
    console.log('Actual tokens used:', response.usage.totalTokens);
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
}
``` 