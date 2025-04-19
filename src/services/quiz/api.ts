/**
 * Claude API integration service for quiz generation
 */

import {
    ClaudeMessage,
    sendMessageToClaudeWithRetry
} from '../claude/client';
import { ClaudeApiError } from '../claude/parser';
import { preprocessContent, PreprocessingOptions } from './preprocessor';
import { createAnalyticalContentQuizPrompt, createConceptFocusedQuizPrompt, createFactualContentQuizPrompt, QUIZ_GENERATION_SYSTEM_MESSAGE, QuizPromptOptions } from './prompts';

/**
 * Quiz type classifications
 */
export type QuizType = 'factual' | 'analytical' | 'conceptual';

/**
 * Service options for quiz generation
 */
export interface QuizGenerationServiceOptions {
  temperature?: number;
  maxRetries?: number;
  timeoutMs?: number;
  cacheExpiry?: number; // in minutes
}

/**
 * Service for generating quizzes using Claude API
 */
export class QuizGenerationService {
  private cache: Map<string, { timestamp: number, data: any }>;
  private options: QuizGenerationServiceOptions;
  
  constructor(options: QuizGenerationServiceOptions = {}) {
    this.cache = new Map();
    this.options = {
      temperature: 0.7,
      maxRetries: 3,
      timeoutMs: 60000,
      cacheExpiry: 60,
      ...options
    };
  }
  
  /**
   * Generate a quiz based on article content
   */
  async generateQuiz(
    articleContent: string,
    title: string = '',
    quizType: QuizType = 'factual',
    promptOptions: QuizPromptOptions = {},
    preprocessOptions: PreprocessingOptions = {}
  ): Promise<any> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(articleContent, quizType, promptOptions);
      
      // Check cache first
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        console.log('Returning cached quiz result');
        return cachedResult;
      }
      
      // Preprocess the content
      const processedContent = preprocessContent(articleContent, preprocessOptions);
      
      // Generate prompt based on quiz type
      const prompt = this.createPromptForQuizType(processedContent, quizType, promptOptions);
      
      // Call Claude API
      const response = await this.callClaudeWithRetries(prompt, quizType);
      
      // Parse the response
      const parsedQuiz = this.parseQuizResponse(response, quizType);
      
      // Add metadata
      const quizWithMetadata = {
        ...parsedQuiz,
        metadata: {
          title,
          generatedAt: new Date().toISOString(),
          quizType,
          promptOptions
        }
      };
      
      // Cache the result
      this.saveToCache(cacheKey, quizWithMetadata);
      
      return quizWithMetadata;
    } catch (error) {
      console.error('Quiz generation failed:', error);
      throw this.formatError(error);
    }
  }
  
  /**
   * Create the appropriate prompt based on quiz type
   */
  private createPromptForQuizType(
    content: string,
    quizType: QuizType,
    options: QuizPromptOptions
  ): string {
    switch (quizType) {
      case 'analytical':
        return createAnalyticalContentQuizPrompt(content, options);
      case 'conceptual':
        return createConceptFocusedQuizPrompt(content, options);
      case 'factual':
      default:
        return createFactualContentQuizPrompt(content, options);
    }
  }
  
  /**
   * Call Claude API with retry logic
   */
  private async callClaudeWithRetries(prompt: string, quizType: QuizType): Promise<string> {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];
    
    try {
      const response = await sendMessageToClaudeWithRetry(messages, {
        temperature: this.options.temperature,
        maxTokens: 4000,
        system: QUIZ_GENERATION_SYSTEM_MESSAGE,
        timeoutMs: this.options.timeoutMs,
        retryConfig: {
          maxRetries: this.options.maxRetries || 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffFactor: 2,
        }
      });
      
      return response.content;
    } catch (error) {
      console.error('Error calling Claude API:', error);
      if (error instanceof ClaudeApiError) {
        throw error;
      } else {
        throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  /**
   * Parse the response from Claude into a structured quiz format
   */
  private parseQuizResponse(response: string, quizType: QuizType): any {
    try {
      // Try to extract JSON if response is in JSON format
      const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        // Clean up and parse JSON
        const cleanJson = jsonMatch[1]
          .replace(/\/\/.*$/gm, '') // Remove comments
          .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        
        return JSON.parse(cleanJson);
      }
      
      // If not JSON, try to parse structured format
      const questions = this.parseStructuredQuizResponse(response);
      
      if (questions.length > 0) {
        return { questions };
      }
      
      // Fallback: return raw response if parsing fails
      return { 
        raw: response,
        error: 'Failed to parse structured quiz data'
      };
    } catch (error) {
      console.error('Error parsing quiz response:', error);
      return { 
        raw: response,
        error: 'Failed to parse quiz response'
      };
    }
  }
  
  /**
   * Parse a structured format quiz response
   */
  private parseStructuredQuizResponse(response: string): any[] {
    const questions: any[] = [];
    
    // Try to find question blocks (Q1, Question 1, etc.)
    const questionBlocks = response.split(/\n\s*(?:#{1,3}\s*)?(?:Question|Q)\s*\d+\.?(?:\s+|:)/i);
    
    if (questionBlocks.length <= 1) {
      return questions;
    }
    
    // Skip the first block if it doesn't contain a question
    const startIndex = questionBlocks[0].trim().length > 0 ? 0 : 1;
    
    for (let i = startIndex; i < questionBlocks.length; i++) {
      const block = questionBlocks[i].trim();
      if (!block) continue;
      
      // Extract question type if available
      const typeMatch = block.match(/\[(?:Question\s+)?Type:\s*([^\]]+)\]/i);
      const type = typeMatch ? typeMatch[1].toLowerCase().trim() : 'open_ended';
      
      // Extract question text - first paragraph or until options
      let questionText = '';
      const firstParagraph = block.split(/\n\s*\n/)[0];
      const textBeforeOptions = block.split(/\n\s*(?:Options|A\.|[a-d]\))/i)[0];
      
      questionText = (textBeforeOptions || firstParagraph || '')
        .replace(/\[(?:Question\s+)?Type:[^\]]+\]/i, '')
        .trim();
      
      // Extract options for multiple choice
      const options: string[] = [];
      if (type.includes('multiple') || type.includes('choice')) {
        // Try different formats of options
        const optionBlocks = block.match(/(?:^|\n)(?:[A-D]\.|\([a-d]\)|[a-d]\))\s*(.+?)(?=(?:\n(?:[A-D]\.|\([a-d]\)|[a-d]\))|$))/g);
        
        if (optionBlocks) {
          optionBlocks.forEach(opt => {
            const optionText = opt.replace(/^[A-D]\.|\([a-d]\)|[a-d]\)\s*/i, '').trim();
            options.push(optionText);
          });
        }
      }
      
      // Extract correct answer
      let correctAnswer = '';
      const correctMatch = block.match(/(?:Correct\s+Answer|Answer):\s*([^\n]+)/i);
      if (correctMatch) {
        correctAnswer = correctMatch[1].trim();
        
        // Convert letter answer to option text for multiple choice
        if (type.includes('multiple') || type.includes('choice')) {
          const letterMatch = correctAnswer.match(/^([A-D])/i);
          if (letterMatch && options.length > 0) {
            const index = letterMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
            if (index >= 0 && index < options.length) {
              correctAnswer = options[index];
            }
          }
        }
      }
      
      // Extract explanation
      let explanation = '';
      const explanationMatch = block.match(/(?:Explanation|Rationale):\s*([^\n].*?)(?=\n\s*(?:Question|Q)\d+\.?|$)/is);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }
      
      // Add to questions array
      questions.push({
        id: i - startIndex + 1,
        type: this.normalizeQuestionType(type),
        text: questionText,
        ...(options.length > 0 ? { options } : {}),
        correctAnswer,
        ...(explanation ? { explanation } : {})
      });
    }
    
    return questions;
  }
  
  /**
   * Normalize question type to one of the standard types
   */
  private normalizeQuestionType(type: string): string {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('multiple') || lowerType.includes('choice')) {
      return 'multiple_choice';
    } else if (lowerType.includes('true') && lowerType.includes('false')) {
      return 'true_false';
    } else if (lowerType.includes('fill') && lowerType.includes('blank')) {
      return 'fill_in_blank';
    } else {
      return 'open_ended';
    }
  }
  
  /**
   * Generate a cache key based on content and options
   */
  private generateCacheKey(
    content: string,
    quizType: QuizType,
    options: QuizPromptOptions
  ): string {
    // Use a hash of the content to avoid large keys
    const contentHash = this.simpleHash(content);
    const optionsStr = JSON.stringify(options);
    return `quiz:${quizType}:${contentHash}:${this.simpleHash(optionsStr)}`;
  }
  
  /**
   * Simple hashing function for strings
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  /**
   * Get a cached result if it exists and is not expired
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    const now = Date.now();
    const expiryTime = cached.timestamp + (this.options.cacheExpiry! * 60 * 1000);
    
    if (now > expiryTime) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Save a result to the cache
   */
  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
    
    // Clean up old cache entries if cache is getting too large
    if (this.cache.size > 100) {
      this.cleanCache();
    }
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const expiryMs = this.options.cacheExpiry! * 60 * 1000;
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > expiryMs) {
        this.cache.delete(key);
      }
    });
  }
  
  /**
   * Format error for client consumption
   */
  private formatError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(`Quiz generation error: ${String(error)}`);
  }
} 