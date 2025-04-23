import { Quiz } from '@/services/quiz';
import { getQuizByTabId } from '@/services/quiz/storage';
import { KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import '../App.css';
import quizzerLogo from '../assets/quizzer-logo.png';
import ErrorBoundary from './ErrorBoundary';
import Onboarding from './Onboarding';
import { UserPreferences } from './UserSettings';
import { QuizForm } from './quiz';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import './ui/dialog.css';

function App() {
  const [articleData, setArticleData] = useState<null | {
    title: string;
    url: string;
  }>(null);
  const [articleContent, setArticleContent] = useState<null | {
    title: string;
    byline: string;
    excerpt: string;
    textContent: string;
    wordCount: number;
    readTime: number;
  }>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  const extractButtonRef = useRef<HTMLButtonElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  

  const handleGlobalKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement> | globalThis.KeyboardEvent) => {
    // Check if not inside an input field
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    // Don't process keyboard shortcuts if onboarding is shown
    if (showOnboarding) {
      return;
    }

    // Keyboard shortcuts
    switch (e.key) {
      case 'e':
        // Extract content
        if (extractionStatus === 'idle' && !articleContent && extractButtonRef.current) {
          extractButtonRef.current.click();
          e.preventDefault();
        }
        break;
      case 'g':
        // Generate quiz
        if (!isLoading && generateButtonRef.current) {
          generateButtonRef.current.click();
          e.preventDefault();
        }
        break;
      
      case '?':
        // Toggle keyboard shortcuts help
        setShowKeyboardShortcuts(prev => !prev);
        e.preventDefault();
        break;
      case 'Escape':
        // Close dialogs
        if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
          e.preventDefault();
        } 
        break;
      default:
        break;
    }
  },
  [showOnboarding, extractionStatus, articleContent, isLoading, showKeyboardShortcuts] 
);
  
  useEffect(() => {
    // Get current tab to check if we have data for it
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        // Check if we have article data for this tab
        chrome.storage.local.get([
          `articleData.${currentTab.id}`,
          `articleContent.${currentTab.id}`,
          'settings',
          'quizzes',
          'onboardingComplete'
        ], (result) => {
          const data = result[`articleData.${currentTab.id}`];
          const content = result[`articleContent.${currentTab.id}`];
          const quizzes = result['quizzes'];
          const prefs = result.settings;
          const onboardingComplete = result.onboardingComplete;
          
          if (data) {
            setArticleData(data);
          }
          
          if (content) {
            setArticleContent(content);
            setExtractionStatus('success');
          }

          if (quizzes) {
            getQuizByTabId(currentTab.id!).then((storedQuiz) => {
              if (storedQuiz) {
                setQuiz({
                  questions: storedQuiz.questions,
                  metadata: {
                    generatedAt: storedQuiz.metadata.generatedAt!,
                    ...storedQuiz.metadata,
                  }
                });
              }
            });
          }
          
          if (prefs) {
            setUserPreferences(prefs);
          }
          
          setIsLoading(false);
          
          // Show onboarding if not completed
          if (!onboardingComplete) {
            setShowOnboarding(true);
          }
        });
      } else {
        setIsLoading(false);
      }
    });
    
    // Add global keyboard listener
    const handleGlobalKeyDownEvent = (event: globalThis.KeyboardEvent) => {
      handleGlobalKeyDown(event);
    };
    
    window.addEventListener('keydown', handleGlobalKeyDownEvent);
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDownEvent);
    };
  }, []);

  

  const extractContent = () => {
    setExtractionStatus('extracting');
    setExtractionError(null);
    
    // Send message to extract content - let background script handle getting the active tab
    chrome.runtime.sendMessage({ action: 'extractContent' }, (response) => {
      console.log('Content extraction response:', response);
      
      if (response && response.success) {
        setArticleContent(response.data);
        setExtractionStatus('success');
        setShowSuccessFeedback(true);
        setTimeout(() => setShowSuccessFeedback(false), 1500);
      } else {
        setExtractionStatus('error');
        setExtractionError(response?.error || 'Unknown error occurred');
      }
    });
  };

  const generateQuiz = async () => {
  
    
      if (!articleContent || !articleData) {
        setExtractionStatus('error');
        setIsLoading(false);
        return;
      }
      console.log("Setting loading to true");
      setIsLoading(true);
      console.log('Generating quiz, about to fetch settings');
      console.log('Got user preferences: ', userPreferences)
      // POST to local server endpoint for quiz generation
      const res = await fetch('http://localhost:3000/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleContent: articleContent.textContent || '',
          articleTitle: articleData.title,
          articleUrl: articleData.url,
          settings: {
            questionsPerQuiz: 5,
            difficultyLevel: 'medium',
            quizType: 'factual',
            questionTypes: ['multiple_choice'],
          },
          articleMetadata: {
            byline: articleContent.byline,
            wordCount: articleContent.wordCount,
            readTime: articleContent.readTime,
          },
        }),
      });
      const data = await res.json();
      console.log('Quiz generation response:', data);
      if (data && data.quiz) {
        console.log('Quiz generated successfully');
        setQuiz(data.quiz);
        setExtractionStatus('success');
        setShowSuccessFeedback(true);
        setTimeout(() => setShowSuccessFeedback(false), 1500);
      } else {
        console.log('Failed to generate quiz');
        setExtractionStatus('error');
      }
      setIsLoading(false);
  };

  const renderContentCard = () => {
    if (!articleContent) return null;
    
    return (
      <div 
        className={`card card-animated p-4 mb-4 animate-slide-in ${showSuccessFeedback ? 'animate-success' : ''}`} 
        style={{ backgroundColor: 'var(--color-primary-bg)' }}
        aria-labelledby="extracted-content-title"
        role="region"
      >
        <h3 id="extracted-content-title" className="font-medium mb-2" style={{ color: 'var(--color-primary-dark)' }}>Extracted Content</h3>
        <div className="text-sm mb-2">
          <p className="font-medium">{articleContent.title}</p>
          {articleContent.byline && <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-xs)' }} className="mt-1">By {articleContent.byline}</p>}
        </div>
        <p className="text-sm italic mb-3" style={{ color: 'var(--color-neutral-700)' }}>{articleContent.excerpt}</p>
        <div className="flex justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
          <span>{articleContent.wordCount} words</span>
          <span>~{articleContent.readTime} min read</span>
        </div>
      </div>
    );
  };

  // Help Button + Dialog using shadcn/ui
  const renderKeyboardShortcutsHelp = () => (
    <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
      <Button
        variant="outline"
        size="sm"
        ref={helpButtonRef}
        className="fixed top-6 right-6 z-50 shadow-md text-white"
        aria-label="Show keyboard shortcuts help"
        onClick={() => setHelpDialogOpen(true)}
      >
        Help
      </Button>
      <DialogContent className="dialog-content">
        <DialogHeader className="dialog-header">
          <DialogTitle className="dialog-title" id="keyboard-shortcuts-title">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="dialog-shortcuts-grid">
          <span className="dialog-shortcut-key">E</span><span>Extract content</span>
          <span className="dialog-shortcut-key">G</span><span>Generate quiz</span>
          <span className="dialog-shortcut-key">S</span><span>Open settings</span>
          <span className="dialog-shortcut-key">?</span><span>Show/hide this help</span>
          <span className="dialog-shortcut-key">ESC</span><span>Close any dialog</span>
          <span className="dialog-shortcut-key">TAB</span><span>Navigate between elements</span>
        </div>
        <DialogDescription className="dialog-description">
          Press <b>TAB</b> to navigate and <b>ENTER</b> to activate buttons or controls.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const appContent = (
    <div 
      className="sidebar-container p-4 h-full flex flex-col" 
      onKeyDown={handleGlobalKeyDown} 
      tabIndex={-1}
      role="application"
      aria-label="Quizzer Extension Interface"
    >
      <a href="#main-content" className="skip-link">Skip to main content</a>
      
      <header className="mb-4 animate-fade-in" role="banner">
        <div className="flex justify-start items-center">
        <img src={quizzerLogo} alt="Quizzer logo" style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8, objectFit: 'cover', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
  <span className="font-bold text-xl" style={{ letterSpacing: '-0.5px', color: 'var(--color-primary-dark)' }}>Quizzer</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-neutral-600)' }}>Generate quizzes from any article</p>
      </header>
      
      <div id="main-content" className="flex-grow overflow-auto" role="main">
        {isLoading ? (
          <div 
            className="flex items-center justify-center h-32 animate-fade-in"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="spinner h-8 w-8" aria-hidden="true"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : articleData ? (
          <div className="animate-fade-in">
            <div 
              className="card card-animated p-4 mb-4"
              role="region"
              aria-labelledby="article-title"
            >
              <h2 id="article-title" className="font-medium mb-2 line-clamp-2">{articleData.title}</h2>
              <p className="text-sm mb-4 line-clamp-1" style={{ color: 'var(--color-neutral-500)' }}>{articleData.url}</p>
              
              {extractionStatus === 'idle' && !articleContent && (
                <button
                  ref={extractButtonRef}
                  onClick={extractContent}
                  className="btn btn-secondary w-full mb-2 interactive-element"
                  aria-label="Extract article content"
                  title="Extract content (Press E)"
                >
                  Extract Content
                </button>
              )}
              
              {extractionStatus === 'extracting' && (
                <div 
                  className="w-full p-2 mb-2 flex items-center justify-center animate-fade-in" 
                  style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', borderRadius: 'var(--radius-md)' }}
                  role="status"
                  aria-live="polite"
                >
                  <div className="spinner h-4 w-4 mr-2" aria-hidden="true"></div>
                  <span>Extracting content...</span>
                </div>
              )}
              
              {extractionStatus === 'error' && (
                <div 
                  className="w-full p-2 mb-2 text-sm animate-slide-in" 
                  style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)' }} 
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="font-medium">Extraction failed</p>
                  {extractionError && <p style={{ fontSize: 'var(--text-xs)' }} className="mt-1">{extractionError}</p>}
                </div>
              )}
              
              {quiz ? 
                <QuizForm
                  quiz={quiz}
                  onSubmit={() => console.log('Quiz submitted')}
                  />
                  :
                <button
                ref={generateButtonRef}
                onClick={generateQuiz}
                disabled={isLoading}
                className="btn btn-primary w-full btn-with-icon interactive-element"
                aria-label="Generate quiz from article"
                title="Generate quiz (Press G)"
              >
                {isLoading ? (
                  <>
                    <span className="spinner h-4 w-4 mr-2" aria-hidden="true"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Quiz
                    <span className="icon" aria-hidden="true">→</span>
                  </>
                )}
              </button>}
            </div>
            
            {renderContentCard()}
          </div>
        ) : (
          <div 
            className="card p-4 animate-slide-in" 
            style={{ borderColor: 'var(--color-warning-light)', backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }} 
            role="alert"
            aria-live="polite"
          >
            <h2 className="font-medium mb-2">No Article Detected</h2>
            <p className="text-sm mb-2">
              Navigate to an article page to generate a quiz.
            </p>
            <p style={{ fontSize: 'var(--text-xs)' }}>
              Quizzer works best on news sites, blogs, and educational content.
            </p>
          </div>
        )}
        
        <div 
          className="mt-4 animate-fade-in" 
          style={{ animationDelay: '200ms' }}
          role="region"
          aria-labelledby="how-to-use"
        >
          <div className="flex items-center mb-4">
  </div>
<h3 id="how-to-use" className="font-medium mb-2">How to use Quizzer:</h3>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Navigate to an article you want to quiz yourself on</li>
            <li>Open this sidebar by clicking the Quizzer icon</li>
            <li>Extract the article content</li>
            <li>Click "Generate Quiz" to create questions</li>
            <li>Answer the questions to test your comprehension</li>
            <li>Review your performance with AI-powered feedback</li>
          </ol>
        </div>
      </div>
      {renderKeyboardShortcutsHelp()}
      
      <footer 
        className="mt-auto pt-2 border-t animate-fade-in" 
        style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)', animationDelay: '400ms' }}
        role="contentinfo"
      >
        Quizzer v1.0 - Powered by Claude
      </footer>
      
      <Onboarding 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete} 
      />
    </div>
  );

  return (
    <ErrorBoundary>
      {appContent}
    </ErrorBoundary>
  );
}

export default App;