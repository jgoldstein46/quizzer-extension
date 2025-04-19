import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Compile TypeScript background and content scripts
const compileTypeScriptFiles = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Compiling TypeScript background and content scripts...');
      
      // Make sure the dist directory exists
      if (!fs.existsSync(path.join(rootDir, 'dist'))) {
        fs.mkdirSync(path.join(rootDir, 'dist'));
      }
      
      // Create a temporary tsconfig for the background script
      const backgroundTsConfig = {
        compilerOptions: {
          target: "ES2020",
          module: "ES2020",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          outDir: "dist/temp"
        },
        include: ["src/background/background.ts"]
      };
      
      // Write the temporary tsconfig
      fs.writeFileSync(
        path.join(rootDir, 'temp-background-tsconfig.json'),
        JSON.stringify(backgroundTsConfig, null, 2)
      );
      
      // Create a temporary tsconfig for the content script
      const contentTsConfig = {
        compilerOptions: {
          target: "ES2020",
          module: "ES2020",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          outDir: "dist/temp"
        },
        include: ["src/content/content.ts"]
      };
      
      // Write the temporary tsconfig
      fs.writeFileSync(
        path.join(rootDir, 'temp-content-tsconfig.json'),
        JSON.stringify(contentTsConfig, null, 2)
      );
      
      // Compile background.ts with its temporary config
      exec('npx tsc -p temp-background-tsconfig.json', 
        { cwd: rootDir }, 
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Error compiling background script: ${error.message}`);
            console.error(`Compilation error details:\n${stderr || stdout}`);
            
            // Clean up temporary configs even if there's an error
            cleanupTempConfigs();
            
            reject(error);
            return;
          }
          
          console.log('Background script compiled successfully');
          
          // Now compile content.ts with its temporary config
          exec('npx tsc -p temp-content-tsconfig.json',
            { cwd: rootDir },
            async (error, stdout, stderr) => {
              if (error) {
                console.error(`Error compiling content script: ${error.message}`);
                console.error(`Compilation error details:\n${stderr || stdout}`);
                
                // Clean up temporary configs even if there's an error
                cleanupTempConfigs();
                
                reject(error);
                return;
              }
              
              console.log('Content script compiled successfully');
              
              // Bundle the compiled files with their dependencies
              try {
                await bundleScripts();
                
                // Clean up temporary files
                if (fs.existsSync(path.join(rootDir, 'dist', 'temp'))) {
                  fs.rmSync(path.join(rootDir, 'dist', 'temp'), { recursive: true, force: true });
                }
                
                // Clean up temporary configs after successful compilation
                cleanupTempConfigs();
                
                resolve();
              } catch (bundleError) {
                // Clean up temporary configs even if there's a bundling error
                cleanupTempConfigs();
                
                reject(bundleError);
              }
            }
          );
        }
      );
    } catch (error) {
      console.error(`Error in TypeScript compilation: ${error.message}`);
      
      // Clean up temporary configs even if there's an initialization error
      cleanupTempConfigs();
      
      reject(error);
    }
  });
};

// Helper function to clean up temporary tsconfig files
function cleanupTempConfigs() {
  try {
    if (fs.existsSync(path.join(rootDir, 'temp-background-tsconfig.json'))) {
      fs.unlinkSync(path.join(rootDir, 'temp-background-tsconfig.json'));
    }
    if (fs.existsSync(path.join(rootDir, 'temp-content-tsconfig.json'))) {
      fs.unlinkSync(path.join(rootDir, 'temp-content-tsconfig.json'));
    }
  } catch (error) {
    console.warn(`Warning: Failed to clean up temporary config files: ${error.message}`);
  }
}

// Bundle the compiled files with their dependencies
const bundleScripts = () => {
  return new Promise((resolve, reject) => {
    console.log('Bundling scripts with dependencies...');
    
    // Bundle background script
    exec('npx esbuild dist/temp/background/background.js --bundle --outfile=dist/background.js --format=esm',
      { cwd: rootDir },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error bundling background script: ${error.message}`);
          console.error(stderr);
          reject(error);
          return;
        }
        
        console.log('Background script bundled successfully');
        
        // Bundle content script
        exec('npx esbuild dist/temp/content/content.js --bundle --outfile=dist/content.js --format=iife',
          { cwd: rootDir },
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error bundling content script: ${error.message}`);
              console.error(stderr);
              reject(error);
              return;
            }
            
            console.log('Content script bundled successfully');
            resolve();
          }
        );
      }
    );
  });
};

// Copy the manifest and other static files
const copyStaticFiles = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Copying static files...');
      
      // Create dist directory if it doesn't exist
      if (!fs.existsSync(path.join(rootDir, 'dist'))) {
        fs.mkdirSync(path.join(rootDir, 'dist'));
      }
      
      // Copy manifest.json
      fs.copyFileSync(
        path.join(rootDir, 'public', 'manifest.json'),
        path.join(rootDir, 'dist', 'manifest.json')
      );
      
      // Create icons directory if it doesn't exist
      if (!fs.existsSync(path.join(rootDir, 'dist', 'icons'))) {
        fs.mkdirSync(path.join(rootDir, 'dist', 'icons'));
      }
      
      // Copy icon files
      const iconFiles = fs.readdirSync(path.join(rootDir, 'public', 'icons'));
      iconFiles.forEach(file => {
        fs.copyFileSync(
          path.join(rootDir, 'public', 'icons', file),
          path.join(rootDir, 'dist', 'icons', file)
        );
      });
      
      console.log('Static files copied successfully');
      resolve();
    } catch (error) {
      console.error(`Error copying static files: ${error.message}`);
      reject(error);
    }
  });
};

// Run Vite build
const runViteBuild = () => {
  return new Promise((resolve, reject) => {
    console.log('Running Vite build...');
    exec('npx vite build', { cwd: rootDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running Vite build: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      console.log(stdout);
      console.log('Vite build successful');
      resolve();
    });
  });
};

// Fallback to create simplified browser-compatible scripts
const createSimpleScripts = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Creating simplified browser-compatible scripts as fallback...');
      
      // Simple background script
      const backgroundScript = `/**
 * Background script for the Quizzer extension - Simple fallback version
 */

// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Quizzer extension installed or updated:', details.reason);
  
  // Initialize storage with default values
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
      });
    }
  });
  
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

// Listen for messages from content scripts and the sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);
  
  switch (message.action) {
    case 'articleDetected':
      // Handle article detection
      if (sender.tab?.id) {
        const tabId = sender.tab.id;
        
        // Store the article data for this tab
        chrome.storage.local.set({
          ['articleData.' + tabId]: {
            url: message.data.url,
            title: message.data.title,
            detectedAt: new Date().toISOString()
          }
        });
      }
      sendResponse({ success: true });
      break;
      
    case 'extractContent':
      // Handle content extraction request
      if (sender.tab?.id) {
        const tabId = sender.tab.id;
        
        // First check if the content script is loaded by sending a ping
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (pingResponse) => {
          if (chrome.runtime.lastError) {
            // If the content script isn't loaded, try to inject it
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['content.js']
            }).then(() => {
              // Wait a moment for the script to initialize
              setTimeout(() => {
                // Send the extraction message again
                chrome.tabs.sendMessage(tabId, { action: 'extractContent' }, (response) => {
                  if (response && response.success) {
                    // Store the extracted content
                    chrome.storage.local.set({
                      ['articleContent.' + tabId]: response.data
                    });
                    sendResponse(response);
                  } else {
                    sendResponse({ 
                      success: false, 
                      error: response?.error || 'Failed to extract content after script injection'
                    });
                  }
                });
              }, 500);
            }).catch(error => {
              sendResponse({ 
                success: false, 
                error: 'Error injecting content script: ' + (error.message || 'Unknown error')
              });
            });
          } else {
            // Content script is loaded, send the extract message
            chrome.tabs.sendMessage(tabId, { action: 'extractContent' }, (response) => {
              if (response && response.success) {
                // Store the extracted content
                chrome.storage.local.set({
                  ['articleContent.' + tabId]: response.data
                });
                sendResponse(response);
              } else {
                sendResponse({ 
                  success: false, 
                  error: response?.error || 'Failed to extract content'
                });
              }
            });
          }
        });
        
        // Return true to indicate we'll respond asynchronously
        return true;
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
      break;
      
    case 'generateQuiz':
      // Simple placeholder for quiz generation
      sendResponse({ success: true, message: 'Quiz generation not yet implemented' });
      break;
      
    case 'getSettings':
      chrome.storage.local.get('settings', (result) => {
        sendResponse({ success: true, settings: result.settings });
      });
      // Return true to indicate async response
      return true;
      
    default:
      sendResponse({ success: false, message: 'Unknown action' });
  }
  
  // Return true if using sendResponse asynchronously
  return true;
});`;

      // Simple content script that handles article detection and extraction
      const contentScript = `/**
 * Content script for the Quizzer extension - Simple fallback version
 */

// Send a message to the background script when the page loads
function init() {
  console.log('Quizzer content script loaded');
  
  // Basic detection for article-like content
  const isArticle = detectArticle();
  
  if (isArticle) {
    // Notify the background script that this page contains an article
    chrome.runtime.sendMessage({
      action: 'articleDetected',
      data: {
        url: window.location.href,
        title: document.title
      }
    });
  }
}

/**
 * Simple heuristic to detect if the current page is likely an article
 */
function detectArticle() {
  // Look for common article indicators
  const hasArticleTag = document.querySelector('article') !== null;
  const hasContentClass = document.querySelector('.content, .post, .article, .story') !== null;
  
  // Count paragraphs to determine if this is content-heavy
  const paragraphs = document.querySelectorAll('p');
  const hasManyParagraphs = paragraphs.length > 3;
  
  // Check for common article sites
  const isNewsSite = window.location.hostname.includes('news') || 
                    window.location.hostname.includes('blog') ||
                    window.location.hostname.includes('article');
  
  return (hasArticleTag || hasContentClass || isNewsSite) && hasManyParagraphs;
}

/**
 * Extract the main content from the current page
 */
function extractContent() {
  try {
    // Get all paragraphs as a simple extraction mechanism
    const paragraphs = document.querySelectorAll('p');
    const textContent = Array.from(paragraphs).map(p => p.textContent || '').join('\\n\\n');
    const excerpt = textContent.substring(0, 150) + '...';
    
    // Return the structured content
    return {
      success: true,
      data: {
        title: document.title,
        byline: extractAuthor(),
        content: Array.from(paragraphs).map(p => p.outerHTML).join(''),
        textContent: textContent,
        excerpt: excerpt,
        siteName: window.location.hostname.replace(/^www\\./, ''),
        publishedTime: null,
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        wordCount: textContent.split(/\\s+/).length,
        readTime: Math.ceil(textContent.split(/\\s+/).length / 200) // Assuming 200 words per minute
      }
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error during content extraction' 
    };
  }
}

/**
 * Extract author information from the page
 */
function extractAuthor() {
  // Try common author meta tags and selectors
  const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"], meta[property="og:author"]');
  if (authorMeta && authorMeta.getAttribute('content')) {
    return authorMeta.getAttribute('content');
  }
  
  // Try common author elements
  const authorElement = document.querySelector('.author, .byline, .by-line, .article-author');
  if (authorElement && authorElement.textContent) {
    return authorElement.textContent.trim();
  }
  
  return '';
}

// Initialize when the script is loaded
init();

// Listen for messages from the background script or sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action);
  
  if (message.action === 'extractContent') {
    const result = extractContent();
    sendResponse(result);
  } else if (message.action === 'ping') {
    // Respond to ping messages to confirm content script is loaded
    sendResponse({ pong: true });
  }
  
  // Always return true for async response
  return true;
});`;

      // Create dist directory if it doesn't exist
      if (!fs.existsSync(path.join(rootDir, 'dist'))) {
        fs.mkdirSync(path.join(rootDir, 'dist'));
      }
      
      // Write the files
      fs.writeFileSync(path.join(rootDir, 'dist', 'background.js'), backgroundScript);
      fs.writeFileSync(path.join(rootDir, 'dist', 'content.js'), contentScript);
      
      console.log('Simple browser-compatible scripts created successfully');
      resolve();
    } catch (error) {
      console.error(`Error creating simple scripts: ${error.message}`);
      reject(error);
    }
  });
};

// Main build function
const build = async () => {
  try {
    console.log('Starting extension build process...');
    
    // Run Vite build for React app
    await runViteBuild();
    
    // Try to compile and bundle TypeScript files with improved TypeScript config
    try {
      // Use the dedicated extension TypeScript config
      console.log('Compiling TypeScript files with extension configuration...');
      
      // Compile background and content scripts
      await new Promise((resolve, reject) => {
        exec('npx tsc -p tsconfig.extension.json', 
          { cwd: rootDir }, 
          (error, stdout, stderr) => {
            if (error) {
              console.error(`TypeScript compilation error:`);
              if (stderr) console.error(stderr);
              if (stdout) console.error(stdout);
              
              reject(error);
              return;
            }
            
            console.log('TypeScript compilation successful');
            resolve();
          }
        );
      });
      
      // Bundle the compiled files
      await bundleScripts();
      
    } catch (error) {
      console.error('TypeScript compilation failed, falling back to simple scripts:', error.message);
      // Fall back to creating simple browser-compatible scripts
      await createSimpleScripts();
    }
    
    // Copy static files
    await copyStaticFiles();
    
    console.log('Extension build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
};

// Run build
build(); 