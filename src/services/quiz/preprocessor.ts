/**
 * Content Preprocessing Module
 * Prepares article content to fit within Claude's context window 
 * while preserving key information
 */

/**
 * Maximum tokens that can be safely processed by Claude 3.7 Sonnet
 * We use a conservative estimate to account for prompt template and response
 */
export const MAX_CONTENT_TOKENS = 200000;

/**
 * Approximate number of tokens per character
 * This is a rough estimate for English text
 */
const TOKENS_PER_CHAR = 0.25;

/**
 * Options for content preprocessing
 */
export interface PreprocessingOptions {
  maxTokens?: number;
  preserveHeadings?: boolean;
  extractKeyTerms?: boolean;
  summarizeLongSections?: boolean;
}

/**
 * Cleans article content by removing unwanted elements and normalizing text
 */
export function cleanContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove any script or style content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove remaining HTML tags
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Estimates the token count for a given text
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  const charCount = text.length;
  return Math.ceil(charCount * TOKENS_PER_CHAR);
}

/**
 * Extracts important key terms and their definitions from the content
 */
export function extractKeyTerms(content: string): Record<string, string> {
  const keyTerms: Record<string, string> = {};
  
  // Simple regex-based term extraction
  // Look for patterns like "X is defined as" or "X refers to"
  const termDefinitionPatterns = [
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+is\s+defined\s+as\s+([^.]+)/gi,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+refers\s+to\s+([^.]+)/gi,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+means\s+([^.]+)/gi,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+is\s+a\s+([^.]+)/gi,
  ];
  
  termDefinitionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const term = match[1].trim();
      const definition = match[2].trim();
      
      if (term && definition && term.length > 3) {
        keyTerms[term] = definition;
      }
    }
  });
  
  return keyTerms;
}

/**
 * Truncates content to fit within token limits while preserving coherence
 */
export function truncateContent(content: string, maxTokens: number = MAX_CONTENT_TOKENS): string {
  if (!content) return '';
  
  const estimatedTokens = estimateTokenCount(content);
  
  // If already within limits, return as is
  if (estimatedTokens <= maxTokens) {
    return content;
  }
  
  // Split by paragraphs
  const paragraphs = content.split(/\n\s*\n/);
  
  // Calculate approximate token budget per paragraph
  const averageTokensPerParagraph = estimatedTokens / paragraphs.length;
  const maxParagraphs = Math.floor(maxTokens / averageTokensPerParagraph);
  
  // If we need to reduce significantly, extract most important parts
  if (maxParagraphs < paragraphs.length / 2) {
    return extractImportantContent(content, maxTokens);
  }
  
  // Otherwise, use the first paragraphs, middle, and last paragraphs
  const preservedParagraphs: string[] = [];
  
  // Number of paragraphs to take from the beginning
  const startParagraphs = Math.ceil(maxParagraphs * 0.5);
  // Number of paragraphs to take from the end
  const endParagraphs = Math.ceil(maxParagraphs * 0.3);
  // Number of paragraphs to take from the middle
  const middleParagraphs = maxParagraphs - startParagraphs - endParagraphs;
  
  // Take paragraphs from the beginning
  preservedParagraphs.push(...paragraphs.slice(0, startParagraphs));
  
  // Add a note about truncation
  if (paragraphs.length > maxParagraphs) {
    preservedParagraphs.push("[Content truncated for length...]");
  }
  
  // Take paragraphs from the middle
  if (middleParagraphs > 0) {
    const middleStart = Math.floor((paragraphs.length - middleParagraphs) / 2);
    preservedParagraphs.push(...paragraphs.slice(middleStart, middleStart + middleParagraphs));
    preservedParagraphs.push("[Content truncated for length...]");
  }
  
  // Take paragraphs from the end
  if (endParagraphs > 0) {
    preservedParagraphs.push(...paragraphs.slice(paragraphs.length - endParagraphs));
  }
  
  return preservedParagraphs.join('\n\n');
}

/**
 * Extract the most important parts of content to fit within token limits
 */
function extractImportantContent(content: string, maxTokens: number): string {
  // Split the content into sections
  const sections = splitIntoSections(content);
  
  // Get introduction (first section)
  const introduction = sections.shift() || '';
  
  // Get conclusion (last section)
  const conclusion = sections.pop() || '';
  
  // Calculate tokens used by intro and conclusion
  const introTokens = estimateTokenCount(introduction);
  const conclusionTokens = estimateTokenCount(conclusion);
  
  // Calculate remaining token budget
  const remainingTokens = maxTokens - introTokens - conclusionTokens;
  
  // Score and rank the remaining sections
  const rankedSections = rankSectionsByImportance(sections);
  
  // Select sections until we reach the token limit
  const selectedSections: string[] = [];
  let tokenCount = 0;
  
  for (const section of rankedSections) {
    const sectionTokens = estimateTokenCount(section);
    
    if (tokenCount + sectionTokens <= remainingTokens) {
      selectedSections.push(section);
      tokenCount += sectionTokens;
    } else {
      // If we can't fit the whole section, summarize it
      const summaryTokenBudget = remainingTokens - tokenCount;
      if (summaryTokenBudget > 100) { // Only summarize if we have enough token budget
        const summary = summarizeSection(section, summaryTokenBudget);
        selectedSections.push(summary);
      }
      break;
    }
  }
  
  // Combine the parts
  return [
    introduction,
    "[Some content summarized for length...]",
    ...selectedSections,
    "[Some content omitted for length...]",
    conclusion
  ].join('\n\n');
}

/**
 * Split content into logical sections
 */
function splitIntoSections(content: string): string[] {
  // Look for headings or double newlines as section dividers
  const sectionDelimiters = /\n\s*#{1,3}\s+[^\n]+|\n\s*\n/g;
  
  // Split content at delimiters and preserve delimiters
  const sections: string[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = sectionDelimiters.exec(content)) !== null) {
    if (lastIndex < match.index) {
      sections.push(content.substring(lastIndex, match.index));
    }
    lastIndex = match.index + match[0].length;
  }
  
  // Add the last section
  if (lastIndex < content.length) {
    sections.push(content.substring(lastIndex));
  }
  
  // Filter out empty sections
  return sections.filter(section => section.trim().length > 0);
}

/**
 * Rank sections by their likely importance
 */
function rankSectionsByImportance(sections: string[]): string[] {
  // Simple importance score calculation
  const sectionScores = sections.map(section => {
    let score = 0;
    
    // Headings with keywords like "important", "key", "main", etc.
    if (/#{1,3}\s+.*?(important|key|main|significant|primary|central)/i.test(section)) {
      score += 10;
    }
    
    // Sections with bullet points or numbered lists (likely key points)
    const listItemCount = (section.match(/\n\s*[-*]\s+|\n\s*\d+\.\s+/g) || []).length;
    score += listItemCount * 2;
    
    // Sections with many keywords indicating conclusions or important points
    const keywordMatches = section.match(/conclusion|therefore|thus|in summary|key point|importantly/gi);
    if (keywordMatches) {
      score += keywordMatches.length * 3;
    }
    
    // Prefer shorter sections (often more focused on key points)
    const wordCount = section.split(/\s+/).length;
    if (wordCount < 50) score += 2;
    
    return { section, score };
  });
  
  // Sort by score descending
  return sectionScores
    .sort((a, b) => b.score - a.score)
    .map(item => item.section);
}

/**
 * Summarize a section to fit within token limit
 */
function summarizeSection(section: string, maxTokens: number): string {
  // Split section into sentences
  const sentences = section.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) {
    return '';
  }
  
  // If section is short enough, return as-is
  if (estimateTokenCount(section) <= maxTokens) {
    return section;
  }
  
  // Take the first sentence
  let summary = sentences[0];
  let tokenCount = estimateTokenCount(summary!);
  
  // Add more sentences until we reach the token limit
  let sentenceIndex = 1;
  while (sentenceIndex < sentences.length && tokenCount < maxTokens) {
    const nextSentence = sentences[sentenceIndex];
    if (!nextSentence) {
      sentenceIndex++;
      continue;
    }
    
    const nextTokens = estimateTokenCount(nextSentence);
    
    if (tokenCount + nextTokens <= maxTokens) {
      summary += ' ' + nextSentence;
      tokenCount += nextTokens;
    } else {
      break;
    }
    
    sentenceIndex++;
  }
  
  return summary + ' [...]';
}

/**
 * Main preprocessing function that prepares content for quiz generation
 */
export function preprocessContent(content: string, options: PreprocessingOptions = {}): string {
  const {
    maxTokens = MAX_CONTENT_TOKENS,
    preserveHeadings = true,
    extractKeyTerms: shouldExtractTerms = true,
    summarizeLongSections = true
  } = options;
  
  // Clean the content first
  let processedContent = cleanContent(content);
  
  // Calculate token estimate
  const tokenEstimate = estimateTokenCount(processedContent);
  
  // Extract key terms if requested
  let keyTermsSection = '';
  if (shouldExtractTerms) {
    const terms = extractKeyTerms(processedContent);
    if (Object.keys(terms).length > 0) {
      keyTermsSection = 'KEY TERMS:\n' + 
        Object.entries(terms)
          .map(([term, definition]) => `- ${term}: ${definition}`)
          .join('\n') + 
        '\n\n';
    }
  }
  
  // Adjust token budget for key terms section
  const keyTermsTokens = estimateTokenCount(keyTermsSection);
  const contentTokenBudget = maxTokens - keyTermsTokens;
  
  // If content exceeds token limit, truncate it
  if (tokenEstimate > contentTokenBudget) {
    processedContent = truncateContent(processedContent, contentTokenBudget);
  }
  
  // Combine key terms and processed content
  return keyTermsSection + processedContent;
} 