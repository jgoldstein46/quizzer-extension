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
 * Safely access environment variables in both Vite and extension contexts
 */
function getEnvVar(key: string, defaultValue: string = ''): string {
  // Try to access Vite environment variables if available
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // Silent catch - import.meta may not be available in extension context
  }
  
  // Try Node.js process.env (for build-time)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  
  // Try extension storage as fallback (runtime)
  // This would require implementation with chrome.storage in a real extension
  
  return defaultValue;
}

/**
 * Loads and validates Claude API configuration from environment variables
 */
export function loadClaudeConfig(): ClaudeConfig {
  const apiKey = getEnvVar('VITE_ANTHROPIC_API_KEY', getEnvVar('ANTHROPIC_API_KEY', ''));
  const model = getEnvVar('VITE_CLAUDE_MODEL', getEnvVar('MODEL', 'claude-3-7-sonnet-20250219'));
  const maxTokens = parseInt(getEnvVar('VITE_MAX_TOKENS', getEnvVar('MAX_TOKENS', '64000')), 10);
  const temperature = parseFloat(getEnvVar('VITE_TEMPERATURE', getEnvVar('TEMPERATURE', '0.2')));

  // Validate API key
  if (!apiKey) {
    throw new Error('Anthropic API key is required. Set VITE_ANTHROPIC_API_KEY in .env file.');
  }

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
export function isClaudeConfigured(): boolean {
  try {
    const config = loadClaudeConfig();
    return Boolean(config.apiKey);
  } catch (error) {
    console.error('Claude API configuration error:', error);
    return false;
  }
} 