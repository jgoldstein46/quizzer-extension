/**
 * Configuration module for Claude API integration
 * Handles secure loading of API keys and other configuration settings
 */
interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Loads and validates Claude API configuration
 */
export async function loadClaudeConfig(): Promise<ClaudeConfig> {

  
  // Default values
  const model = 'claude-3-7-sonnet-20250219';
  const maxTokens = 64000;
  const temperature = 0.2;
  
  // Get API key from settings
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  return {
    apiKey,
    model,
    maxTokens,
    temperature
  };
}

/**
 * Checks if the Claude API is properly configured
 * Returns true if configuration is valid, false otherwise
 */
export async function isClaudeConfigured(): Promise<boolean> {
  try {
    const config = await loadClaudeConfig();
    return Boolean(config.apiKey);
  } catch (error) {
    console.error('Claude API configuration error:', error);
    return false;
  }
} 