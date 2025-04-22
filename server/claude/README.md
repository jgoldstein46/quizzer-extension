# Claude API Integration

This module provides integration with Anthropic's Claude 3.7 Sonnet API for the Quizzer Chrome Extension.

## Features

- Secure API key management
- Simplified client for Claude API interactions
- Type-safe interfaces for request/response handling
- Error handling and connection testing

## Usage Examples

### Basic Message Exchange

```typescript
import { sendMessageToClaude } from '../services/claude';

// Send a message to Claude and get a response
async function askClaude() {
  try {
    const response = await sendMessageToClaude([
      { role: 'user', content: 'Generate a quiz question about renewable energy.' }
    ]);
    
    console.log('Claude response:', response.content);
    console.log('Token usage:', response.usage);
  } catch (error) {
    console.error('Error communicating with Claude:', error);
  }
}
```

### With Custom Options

```typescript
import { sendMessageToClaude } from '../services/claude';

// Send a message with custom parameters
async function generateCreativeContent() {
  try {
    const response = await sendMessageToClaude(
      [
        { role: 'user', content: 'Write a poem about learning.' }
      ],
      {
        temperature: 0.9, // Higher temperature for more creative output
        maxTokens: 300,   // Limit response length
        system: 'You are a helpful assistant that writes creative and educational content.'
      }
    );
    
    console.log('Claude response:', response.content);
  } catch (error) {
    console.error('Error communicating with Claude:', error);
  }
}
```

### Testing Connection

```typescript
import { testClaudeConnection } from '../services/claude';

// Check if Claude API is properly configured and accessible
async function checkApiAvailability() {
  const isConnected = await testClaudeConnection();
  
  if (isConnected) {
    console.log('Successfully connected to Claude API');
  } else {
    console.error('Could not connect to Claude API. Check your API key and network connection.');
  }
}
```

## Environment Variables

The Claude API client requires the following environment variables:

```
VITE_ANTHROPIC_API_KEY=<your-anthropic-api-key>
VITE_CLAUDE_MODEL=claude-3-7-sonnet-20250219
VITE_MAX_TOKENS=64000
VITE_TEMPERATURE=0.2
```

These can be set in a `.env` file at the project root. 