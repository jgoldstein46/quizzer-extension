import { useState } from 'react';
import { isClaudeConfigured, sendMessageToClaude, testClaudeConnection } from './';

/**
 * Example component demonstrating Claude API usage
 * This is for development/testing purposes only
 */
export function ClaudeApiExample() {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSendMessage = async () => {
    setLoading(true);
    setError('');
    
    try {
      const claudeResponse = await sendMessageToClaude([
        { role: 'user', content: 'Generate a short quiz question about climate change.' }
      ]);
      
      setResponse(claudeResponse.content);
      setStatus(`Success! Model: ${claudeResponse.model}, Tokens used: ${claudeResponse.usage.totalTokens}`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError('');
    
    try {
      const isConnected = await testClaudeConnection();
      setStatus(isConnected ? 'Connection successful!' : 'Connection test failed');
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const checkConfiguration = () => {
    const isConfigured = isClaudeConfigured();
    setStatus(isConfigured ? 'API properly configured' : 'API configuration missing or invalid');
  };

  return (
    <div className="claude-api-example" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Claude API Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={checkConfiguration}
          style={{ marginRight: '10px', padding: '8px 16px' }}
          disabled={loading}
        >
          Check Configuration
        </button>
        
        <button 
          onClick={handleTestConnection}
          style={{ marginRight: '10px', padding: '8px 16px' }}
          disabled={loading}
        >
          Test Connection
        </button>
        
        <button 
          onClick={handleSendMessage}
          style={{ padding: '8px 16px' }}
          disabled={loading}
        >
          Send Test Message
        </button>
      </div>
      
      {loading && <div>Loading...</div>}
      
      {status && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
          {status}
        </div>
      )}
      
      {error && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff1f0', borderRadius: '4px', color: '#f5222d' }}>
          {error}
        </div>
      )}
      
      {response && (
        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginTop: '20px' }}>
          <h3>Response:</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
} 