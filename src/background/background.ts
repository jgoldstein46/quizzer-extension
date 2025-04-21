/**
 * Background script for the Quizzer extension
 * Handles extension lifecycle and core functionality
 */


import { loadClaudeConfig } from '@/services/claude/config';
import { quizController, QuizGenerationRequest } from '../services/quiz';

console.log('Background script loaded');
// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Quizzer extension installed or updated:', details.reason);
  
  // Initialize storage with default values
  initializeStorage();
  
  // Set up side panel behavior
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Open the side panel when the extension icon is clicked
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Initialize storage with default values
function initializeStorage() {
  chrome.storage.local.get('quizzerInitialized', (result) => {
    if (!result.quizzerInitialized) {
      // Set up default storage structure
      chrome.storage.local.set({
        quizzerInitialized: true,
        quizzes: [],
        settings: {
          questionsPerQuiz: 3,
          saveHistory: true,
          voice: {
            enabled: true,
            autoSubmit: false
          },
          theme: 'light'
        },
        articleData: {}
      }, () => {
        console.log('Quizzer storage initialized with defaults');
      });
    }
  });
}

/**
 * Tries to get the active tab ID 
 * @returns Promise with either the tab ID or an error object
 */
async function getActiveTabId(): Promise<{ success: boolean; tabId?: number; error?: string }> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      const tabId = tabs[0].id;
      console.log('Retrieved active tab ID:', tabId);
      return { success: true, tabId };
    } else {
      return { success: false, error: 'No active tab found' };
    }
  } catch (error) {
    console.error('Error getting active tab:', error);
    return { success: false, error: 'Failed to determine active tab' };
  }
}

// Listen for messages from content scripts and the sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);
  
  switch (message.action) {
    case 'articleDetected':
      handleArticleDetected(message.data, sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'generateQuiz':
      handleGenerateQuiz()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error during quiz generation'
        }));
      // Return true to indicate async response
      return true;
      
    case 'extractContent':
      handleExtractContent()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error during content extraction'
        }));
      // Return true to indicate async response
      return true;
      
    case 'getArticleContent':
      handleGetArticleContent()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Error retrieving article content'
        }));
      return true;
      
    case 'getSettings':
      chrome.storage.local.get('settings', (result) => {
        sendResponse({ success: true, settings: result.settings });
      });
      // Return true to indicate async response
      return true;
      
    case 'getQuizzes':
      quizController.getQuizHistory()
        .then(quizzes => sendResponse({ success: true, quizzes }))
        .catch(error => sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Error retrieving quizzes'
        }));
      return true;
      
    case 'getQuizForTab':
      const tabId = message.tabId || sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID provided' });
        return true;
      }
      
      quizController.getQuizForTab(tabId)
        .then(quiz => sendResponse({ success: true, quiz }))
        .catch(error => sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Error retrieving quiz'
        }));
      return true;
      
    default:
      sendResponse({ success: false, message: 'Unknown action' });
  }
  
  // Return true if using sendResponse asynchronously
  return true;
});

// Handle article detection
function handleArticleDetected(data: { url: string, title: string }, tabId?: number) {
  console.log('Article detected:', data.title);
  
  if (tabId) {
    // Store the article data for this tab
    chrome.storage.local.set({
      [`articleData.${tabId}`]: {
        url: data.url,
        title: data.title,
        detectedAt: new Date().toISOString()
      }
    });
    
    // Show the action button as active
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        16: "/icons/icon16.png",
        48: "/icons/icon48.png",
        128: "/icons/icon128.png"
      }
    });
  }
}

// Handle content extraction request
async function handleExtractContent(): Promise<any> {
  // Try to get the active tab ID if none was provided
  const result = await getActiveTabId();
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const tabId = result.tabId;
  
  
  try {
    // First, check if content script is loaded by sending a ping
    try {
      const pingResult = await new Promise<any>((resolve) => {
        // Ensure tabId is defined before using it
        if (tabId === undefined) {
          resolve({ loaded: false, error: 'No tab ID available' });
          return;
        }
        
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ loaded: false, error: chrome.runtime.lastError.message });
          } else if (response && response.pong) {
            resolve({ loaded: true });
          } else {
            resolve({ loaded: false, error: 'No response from content script' });
          }
        });
      });
      
      // If content script is not loaded, inject it
      if (!pingResult.loaded) {
        console.log('Content script not detected, injecting it...');
        // Ensure tabId is defined before using it
        if (tabId === undefined) {
          return { success: false, error: 'No tab ID available for script injection' };
        }
        
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        
        // Wait a moment for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.warn('Error checking content script:', error);
      // Continue anyway, we'll try to send the extraction message
    }
    
    // Send a message to the content script to extract content
    return new Promise((resolve) => {
      // Ensure tabId is defined before using it
      if (tabId === undefined) {
        resolve({ success: false, error: 'No tab ID available for content extraction' });
        return;
      }
      
      chrome.tabs.sendMessage(tabId, { action: 'extractContent' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ 
            success: false, 
            error: chrome.runtime.lastError.message || 'Error communicating with content script'
          });
          return;
        }
        
        if (response && response.success) {
          // Store the extracted content
          chrome.storage.local.set({
            [`articleContent.${tabId}`]: response.data
          });
          
          resolve(response);
        } else {
          resolve({ 
            success: false, 
            error: response?.error || 'Failed to extract content'
          });
        }
      });
    });
  } catch (error) {
    console.error('Error extracting content:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during content extraction'
    };
  }
}

// Handle quiz generation request
async function handleGenerateQuiz(): Promise<any> {
  // Check if API key is configured
  const { apiKey } = await loadClaudeConfig();
  
  if (!apiKey) {
    return { 
      success: false, 
      error: 'API key not configured. Please add your Anthropic API key in the settings.',
      needsApiKey: true
    };
  }
  
  const result = await getActiveTabId();
  console.log('Active tab ID:', result);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const tabId = result.tabId;

  
  try {
    // Check if we need to extract content first
    let articleContent: any | null = null;
    let contentResult: any | null = null;
    
    const storageResult = await chrome.storage.local.get(`articleContent.${tabId}`);
    articleContent = storageResult[`articleContent.${tabId}`];
    
    if (!articleContent) {
      // Extract content first
      contentResult = await handleExtractContent();
      console.log('Content extraction result:', contentResult);
      if (!contentResult.success) {
        return contentResult;
      }
      articleContent = contentResult.data;
    }

    console.log("Extracted article content:", articleContent);
    
    // Get article data
    const articleDataResult = await chrome.storage.local.get(`articleData.${tabId}`);
    const articleData = articleDataResult[`articleData.${tabId}`];
    
    if (!articleData) {
      return { success: false, error: 'No article data found for this tab' };
    }

    console.log("Article data:", articleData);
    
    // Get settings
    const settingsResult = await chrome.storage.local.get('settings');
    const settings = settingsResult.settings || {};
    
    // Prepare the quiz generation request
    const request: QuizGenerationRequest = {
      articleContent: articleContent!.excerpt,
      articleTitle: articleData.title,
      articleUrl: articleData.url,
      tabId: tabId,
      questionCount: settings.questionsPerQuiz || 3,
      difficultyLevel: settings.difficultyLevel || 'intermediate',
      articleMetadata: {
        wordCount: articleContent!.wordCount,
        readTime: articleContent!.readTime
      }
    };
    
    // Set up progress tracking
    let progressPort: chrome.runtime.Port | null = null;
    
    // Listen for progress updates from the quiz controller
    quizController.addEventListener((event) => {
      if (progressPort) {
        try {
          progressPort.postMessage({
            action: 'quizGenerationProgress',
            data: event
          });
        } catch (e) {
          // Port might be closed, ignore the error
          console.warn('Progress port closed:', e);
        }
      }
    });
    
    // Set up a connection for progress updates
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === `quiz_generation_${tabId}`) {
        progressPort = port;
        
        port.onDisconnect.addListener(() => {
          progressPort = null;
        });
      }
    });
    
    // Generate the quiz
    const quizResult = await quizController.generateQuiz(request);
    console.log('Quiz generation result:', quizResult);
    
    if (quizResult.success) {
      return {
        success: true,
        message: 'Quiz generated successfully',
        data: {
          contentExtracted: !!contentResult?.success,
          quizId: quizResult.storedQuizId,
          questionCount: quizResult.quiz?.questions.length || 0
        }
      };
    } else {
      return {
        success: false,
        error: quizResult.error || 'Failed to generate quiz',
        data: {
          contentExtracted: !!contentResult?.success
        }
      };
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during quiz generation'
    };
  }
}

// Handle retrieving article content for the active tab
async function handleGetArticleContent(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Get active tab
    const result = await getActiveTabId();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    const tabId = result.tabId;
    
    // Get article content from storage
    const storageResult = await chrome.storage.local.get(`articleContent.${tabId}`);
    const content = storageResult[`articleContent.${tabId}`];
    
    if (!content) {
      return { success: false, error: 'No content found for this tab' };
    }
    
    return { success: true, data: content };
  } catch (error) {
    console.error('Error getting article content:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error retrieving article content'
    };
  }
} 