import { Component, ErrorInfo, ReactNode } from 'react';
import '../App.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to extension storage for debugging
    chrome.storage.local.get('errorLog', (result) => {
      const errorLog = result.errorLog || [];
      const newError = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      };
      
      chrome.storage.local.set({
        errorLog: [...errorLog, newError].slice(-10) // Keep only last 10 errors
      });
    });
  }

  handleReset = (): void => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div 
          className="p-4 animate-fade-in"
          role="alert"
          aria-live="assertive"
        >
          <div 
            className="card p-4 mb-4"
            style={{ 
              backgroundColor: 'var(--color-error-light)', 
              borderColor: 'var(--color-error)',
              color: 'var(--color-error)'
            }}
          >
            <h2 className="text-lg font-medium mb-2">Something went wrong</h2>
            <p className="text-sm mb-4">
              An error occurred in the Quizzer extension. Please try reloading or clearing your data.
            </p>
            
            <div className="mb-4">
              <button 
                onClick={this.handleReset}
                className="btn btn-secondary mr-2"
                style={{
                  backgroundColor: 'white',
                  color: 'var(--color-error)'
                }}
              >
                Try Again
              </button>
              
              <button 
                onClick={() => chrome.runtime.reload()}
                className="btn btn-secondary"
                style={{
                  backgroundColor: 'white',
                  color: 'var(--color-error)'
                }}
              >
                Reload Extension
              </button>
            </div>
            
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Error details</summary>
              <p className="mt-2">{this.state.error && this.state.error.toString()}</p>
              <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-32 p-2 bg-white bg-opacity-20 rounded">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 