/**
 * Content script for the Quizzer extension
 * Runs on all pages to identify article content
 */

import { Readability } from '@mozilla/readability';

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
function detectArticle(): boolean {
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
function extractContent(): ArticleContent {
  try {
    const documentClone = document.cloneNode(true) as Document;
    
    // Use Readability to extract the main content
    const reader = new Readability(documentClone);
    const article = reader.parse();
    
    if (!article) {
      console.log('Readability failed to parse the article, falling back to alternative extraction');
      return fallbackExtraction();
    }
    
    // Return the structured content
    return {
      title: article.title || document.title,
      byline: article.byline || extractAuthor(),
      content: article.content || '',
      textContent: article.textContent || '',
      excerpt: article.excerpt || article.textContent?.substring(0, 150) + '...' || '',
      siteName: article.siteName || extractSiteName(),
      publishedTime: extractPublishedTime(),
      url: window.location.href,
      extractedAt: new Date().toISOString(),
      wordCount: article.textContent ? article.textContent.split(/\s+/).length : 0,
      readTime: article.textContent ? Math.ceil(article.textContent.split(/\s+/).length / 200) : 1 // Assuming 200 words per minute
    };
  } catch (error) {
    console.error('Readability extraction error:', error);
    
    // Try fallback if Readability fails 
    try {
      console.log('Attempting fallback extraction...');
      return fallbackExtraction();
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError);
      throw new Error('All content extraction methods failed');
    }
  }
}

/**
 * Fallback content extraction when Readability fails
 */
function fallbackExtraction(): ArticleContent {
  // Identify potential content containers
  const contentContainers = identifyContentContainers();
  let mainContent = '';
  let textContent = '';
  
  if (contentContainers.length > 0) {
    // Use the highest scored container
    const bestContainer = contentContainers[0];
    mainContent = bestContainer.outerHTML;
    textContent = bestContainer.textContent || '';
  } else {
    // Last resort: get all paragraphs
    const paragraphs = document.querySelectorAll('p');
    const paragraphsHtml = Array.from(paragraphs).map(p => p.outerHTML).join('');
    mainContent = `<div>${paragraphsHtml}</div>`;
    textContent = Array.from(paragraphs).map(p => p.textContent).join('\n\n');
  }
  
  return {
    title: document.title,
    byline: extractAuthor(),
    content: mainContent,
    textContent: textContent,
    excerpt: textContent.substring(0, 150) + '...',
    siteName: extractSiteName(),
    publishedTime: extractPublishedTime(),
    url: window.location.href,
    extractedAt: new Date().toISOString(),
    wordCount: textContent.split(/\s+/).length,
    readTime: Math.ceil(textContent.split(/\s+/).length / 200)
  };
}

/**
 * Identify potential content containers by scoring DOM elements
 */
function identifyContentContainers(): Element[] {
  const elements = document.querySelectorAll('article, .article, .content, .post, main, [role="main"], .main, #content, #main');
  
  // Score each element based on content density
  const scoredElements = Array.from(elements).map(element => {
    const textLength = element.textContent?.length || 0;
    const htmlLength = element.outerHTML.length;
    const paragraphCount = element.querySelectorAll('p').length;
    const headingCount = element.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    
    // Calculate text-to-code ratio (higher is better)
    const textToCodeRatio = htmlLength > 0 ? textLength / htmlLength : 0;
    
    // Calculate score based on multiple factors
    const score = (textLength * 0.5) + (paragraphCount * 100) + (headingCount * 50) + (textToCodeRatio * 5000);
    
    return { element, score };
  });
  
  // Sort by score, highest first
  scoredElements.sort((a, b) => b.score - a.score);
  
  // Return elements only
  return scoredElements.map(item => item.element);
}

/**
 * Extract author information from the page
 */
function extractAuthor(): string {
  // Try common author meta tags and selectors
  const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"], meta[property="og:author"]');
  if (authorMeta && authorMeta.getAttribute('content')) {
    return authorMeta.getAttribute('content') || '';
  }
  
  // Try common author elements
  const authorElement = document.querySelector('.author, .byline, .by-line, .article-author');
  if (authorElement && authorElement.textContent) {
    return authorElement.textContent.trim();
  }
  
  return '';
}

/**
 * Extract site name from the page
 */
function extractSiteName(): string {
  // Try meta tags first
  const siteMeta = document.querySelector('meta[property="og:site_name"]');
  if (siteMeta && siteMeta.getAttribute('content')) {
    return siteMeta.getAttribute('content') || '';
  }
  
  // Try using the domain name
  return window.location.hostname.replace(/^www\./, '');
}

/**
 * Extract publication time from the page
 */
function extractPublishedTime(): string | null {
  // Try common time meta tags
  const timeMeta = document.querySelector(
    'meta[property="article:published_time"], meta[name="published_time"], meta[name="date"], meta[name="pubdate"]'
  );
  
  if (timeMeta && timeMeta.getAttribute('content')) {
    return timeMeta.getAttribute('content');
  }
  
  // Try time elements
  const timeElement = document.querySelector('time[datetime], [itemprop="datePublished"]');
  if (timeElement && timeElement.getAttribute('datetime')) {
    return timeElement.getAttribute('datetime');
  }
  
  return null;
}

// Article content interface
interface ArticleContent {
  title: string;
  byline: string;
  content: string;
  textContent: string;
  excerpt: string;
  siteName: string;
  publishedTime: string | null;
  url: string;
  extractedAt: string;
  wordCount: number;
  readTime: number;
}

// Initialize when the script is loaded
init();

// Listen for messages from the background script or sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action);
  
  if (message.action === 'extractContent') {
    console.log('Starting content extraction...');
    try {
      const content = extractContent();
      console.log('Content extraction successful:', content.title);
      sendResponse({ success: true, data: content });
    } catch (error) {
      console.error('Error extracting content:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during content extraction'
      });
    }
  } else if (message.action === 'ping') {
    // Respond to ping messages to confirm content script is loaded
    console.log('Received ping, responding with pong');
    sendResponse({ pong: true });
  }
  
  // Always return true for async response
  return true;
}); 