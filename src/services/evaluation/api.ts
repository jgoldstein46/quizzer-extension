/**
 * Claude API integration service for response evaluation
 */

import { ClaudeMessage, sendMessageToClaudeWithRetry } from '../claude/client';
import { EVALUATION_SYSTEM_MESSAGE, EvaluationPromptOptions, EvaluationPromptType, generateFollowUpPrompt, getEvaluationPrompt } from './prompts';

/**
 * Response evaluation result interface
 */
export interface EvaluationResult {
  scores: {
    overall: number;
    criteria: Record<string, number>;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    misconceptions: string[];
    summary: string;
  };
  missingElements: string[];
  explanation: string;
  raw?: string;
}

/**
 * Follow-up question interface
 */
export interface FollowUpQuestion {
  question: string;
  purpose: string;
  targetedMisconception?: string;
  targetedMissingElement?: string;
}

/**
 * Follow-up questions result interface
 */
export interface FollowUpQuestionsResult {
  followUpQuestions: FollowUpQuestion[];
  explanation: string;
  raw?: string;
}

/**
 * Options for the response evaluation service
 */
export interface ResponseEvaluationServiceOptions {
  temperature?: number;
  maxRetries?: number;
  timeoutMs?: number;
  cacheExpiry?: number;
}

/**
 * Service for evaluating user responses using Claude API
 */
export class ResponseEvaluationService {
  private cache: Map<string, { timestamp: number, data: any }>;
  private options: ResponseEvaluationServiceOptions;
  
  constructor(options: ResponseEvaluationServiceOptions = {}) {
    this.cache = new Map();
    this.options = {
      temperature: 0.3,
      maxRetries: 3,
      timeoutMs: 60000,
      cacheExpiry: 60,
      ...options
    };
  }
  
  /**
   * Evaluate a user's response to a quiz question
   */
  async evaluateResponse(
    articleContent: string,
    question: string,
    userResponse: string,
    expectedElements: string[],
    questionType: EvaluationPromptType = EvaluationPromptType.FACTUAL,
    options: EvaluationPromptOptions = {}
  ): Promise<EvaluationResult> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(
        userResponse,
        question,
        expectedElements,
        questionType
      );
      
      // Check cache first
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        console.log('Returning cached evaluation result');
        return cachedResult;
      }
      
      // Generate prompt
      const prompt = getEvaluationPrompt(
        articleContent,
        question,
        userResponse,
        expectedElements,
        questionType,
        options
      );
      
      // Call Claude API
      const messages: ClaudeMessage[] = [
        { role: 'user', content: prompt }
      ];
      
      const response = await sendMessageToClaudeWithRetry(messages, {
        system: EVALUATION_SYSTEM_MESSAGE,
        temperature: this.options.temperature,
        maxTokens: 2000,
        timeoutMs: this.options.timeoutMs,
        retryConfig: {
          maxRetries: this.options.maxRetries || 0,
          initialDelayMs: 1000,
          maxDelayMs: 8000,
          backoffFactor: 2
        }
      });
      
      // Parse response
      const result = this.parseEvaluationResponse(response.content);
      
      // Cache the result
      this.saveToCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Response evaluation failed:', error);
      throw new Error(`Failed to evaluate response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate follow-up questions based on evaluation results
   */
  async generateFollowUpQuestions(
    articleContent: string,
    question: string,
    userResponse: string,
    evaluationResult: EvaluationResult,
    options: EvaluationPromptOptions = {}
  ): Promise<FollowUpQuestionsResult> {
    try {
      // Generate prompt
      const prompt = generateFollowUpPrompt(
        articleContent,
        question,
        userResponse,
        evaluationResult,
        options
      );
      
      // Call Claude API
      const messages: ClaudeMessage[] = [
        { role: 'user', content: prompt }
      ];
      
      const response = await sendMessageToClaudeWithRetry(messages, {
        temperature: this.options.temperature,
        system: EVALUATION_SYSTEM_MESSAGE,
        maxTokens: 1500,
        timeoutMs: this.options.timeoutMs,
        retryConfig: {
          maxRetries: this.options.maxRetries || 0,
          initialDelayMs: 1000,
          maxDelayMs: 8000,
          backoffFactor: 2
        }
      });
      
      // Parse response
      return this.parseFollowUpResponse(response.content);
    } catch (error) {
      console.error('Follow-up questions generation failed:', error);
      throw new Error(`Failed to generate follow-up questions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Parse the evaluation response from Claude
   */
  private parseEvaluationResponse(response: string): EvaluationResult {
    try {
      // Try to extract JSON if response is in JSON format
      const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        // Clean up and parse JSON
        const cleanJson = jsonMatch[1]
          .replace(/\/\/.*$/gm, '') // Remove comments
          .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        
        const parsedJson = JSON.parse(cleanJson);
        
        // Add raw response for debugging
        parsedJson.raw = response;
        
        return this.validateEvaluationResult(parsedJson);
      }
      
      // If not JSON, try to extract structured format
      const parsedResult = this.extractStructuredEvaluation(response);
      
      if (parsedResult) {
        return {
          ...parsedResult,
          raw: response
        };
      }
      
      // Fallback: create a minimal valid result structure
      console.warn('Could not parse evaluation response as JSON or structured format:', response);
      return {
        scores: {
          overall: 0,
          criteria: {}
        },
        feedback: {
          strengths: [],
          improvements: ["Could not parse evaluation"],
          misconceptions: [],
          summary: "Unable to process the evaluation"
        },
        missingElements: [],
        explanation: "The system encountered an error processing the evaluation",
        raw: response
      };
    } catch (error) {
      console.error('Error parsing evaluation response:', error);
      throw new Error(`Failed to parse evaluation response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Extract structured evaluation from non-JSON response
   */
  private extractStructuredEvaluation(response: string): EvaluationResult | null {
    // Extract overall score
    const overallScoreMatch = response.match(/Overall:\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*out of\s*)\s*10/i);
    const overallScore = overallScoreMatch ? parseFloat(overallScoreMatch[1]) : 0;
    
    // Extract criteria scores
    const criteriaScores: Record<string, number> = {};
    const scoreRegex = /([A-Za-z_]+):\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*out of\s*)\s*10/g;
    let match;
    
    while ((match = scoreRegex.exec(response)) !== null) {
      const criterion = match[1].toLowerCase().trim();
      if (criterion !== 'overall') {
        criteriaScores[criterion] = parseFloat(match[2]);
      }
    }
    
    // Extract strengths
    const strengthsMatch = response.match(/(?:Strengths|Strengths:)([\s\S]*?)(?:Areas for Improvement|Improvements|Misconceptions|Missing Elements|$)/i);
    const strengths = strengthsMatch ? this.extractBulletPoints(strengthsMatch[1]) : [];
    
    // Extract improvements
    const improvementsMatch = response.match(/(?:Areas for Improvement|Improvements:)([\s\S]*?)(?:Misconceptions|Missing Elements|Explanation|$)/i);
    const improvements = improvementsMatch ? this.extractBulletPoints(improvementsMatch[1]) : [];
    
    // Extract misconceptions
    const misconceptionsMatch = response.match(/(?:Misconceptions:)([\s\S]*?)(?:Missing Elements|Explanation|$)/i);
    const misconceptions = misconceptionsMatch ? this.extractBulletPoints(misconceptionsMatch[1]) : [];
    
    // Extract missing elements
    const missingElementsMatch = response.match(/(?:Missing Elements:)([\s\S]*?)(?:Explanation|$)/i);
    const missingElements = missingElementsMatch ? this.extractBulletPoints(missingElementsMatch[1]) : [];
    
    // Extract explanation
    const explanationMatch = response.match(/(?:Explanation:)([\s\S]*?)$/i);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';
    
    // If we couldn't extract core components, return null
    if (!overallScoreMatch && Object.keys(criteriaScores).length === 0) {
      return null;
    }
    
    return {
      scores: {
        overall: overallScore,
        criteria: criteriaScores
      },
      feedback: {
        strengths,
        improvements,
        misconceptions,
        summary: explanation.substring(0, 200) // Use first 200 chars of explanation as summary
      },
      missingElements,
      explanation
    };
  }
  
  /**
   * Extract bullet points from a string
   */
  private extractBulletPoints(text: string): string[] {
    if (!text) return [];
    
    // Split by bullet points, numbers, or new lines
    const points = text.split(/(?:\r?\n|^)\s*(?:[-•*]|\d+\.)\s*/);
    
    // Filter out empty lines and trim
    return points
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  /**
   * Parse the follow-up questions response
   */
  private parseFollowUpResponse(response: string): FollowUpQuestionsResult {
    try {
      // Try to extract JSON if response is in JSON format
      const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        // Clean up and parse JSON
        const cleanJson = jsonMatch[1]
          .replace(/\/\/.*$/gm, '') // Remove comments
          .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        
        const parsedJson = JSON.parse(cleanJson);
        
        // Add raw response for debugging
        parsedJson.raw = response;
        
        return this.validateFollowUpResult(parsedJson);
      }
      
      // If not JSON, try to extract structured format
      const parsedResult = this.extractStructuredFollowUps(response);
      
      if (parsedResult) {
        return {
          ...parsedResult,
          raw: response
        };
      }
      
      // Fallback: create a minimal valid result structure
      return {
        followUpQuestions: [
          {
            question: "What else would you like to know about this topic?",
            purpose: "General follow-up to encourage further exploration"
          }
        ],
        explanation: "Unable to generate specific follow-up questions",
        raw: response
      };
    } catch (error) {
      console.error('Error parsing follow-up response:', error);
      throw new Error(`Failed to parse follow-up response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Extract structured follow-up questions from non-JSON response
   */
  private extractStructuredFollowUps(response: string): FollowUpQuestionsResult | null {
    // Look for numbered questions (1. Question text)
    const questionRegex = /(?:\d+\.|\*|-)\s*(.+?)(?:\n|$)(?:\s*-\s*Purpose:\s*(.+?)(?:\n|$))?(?:\s*-\s*Targets:\s*(.+?)(?:\n|$))?/gi;
    
    const followUpQuestions: FollowUpQuestion[] = [];
    let match;
    
    while ((match = questionRegex.exec(response)) !== null) {
      const question = match[1]?.trim();
      if (question) {
        followUpQuestions.push({
          question,
          purpose: match[2]?.trim() || 'Help fill gaps in understanding',
          targetedMisconception: match[3]?.includes('misconception') ? match[3]?.trim() : undefined,
          targetedMissingElement: match[3]?.includes('missing') ? match[3]?.trim() : undefined
        });
      }
    }
    
    // Extract explanation
    const explanationMatch = response.match(/(?:Explanation:|Why these questions will help:)([\s\S]*?)$/i);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';
    
    // If we couldn't extract any questions, return null
    if (followUpQuestions.length === 0) {
      return null;
    }
    
    return {
      followUpQuestions,
      explanation
    };
  }
  
  /**
   * Validate and normalize evaluation result
   */
  private validateEvaluationResult(result: any): EvaluationResult {
    // Ensure required structure exists
    const validatedResult: EvaluationResult = {
      scores: {
        overall: typeof result.scores?.overall === 'number' ? result.scores.overall : 0,
        criteria: result.scores?.criteria || {}
      },
      feedback: {
        strengths: Array.isArray(result.feedback?.strengths) ? result.feedback.strengths : [],
        improvements: Array.isArray(result.feedback?.improvements) ? result.feedback.improvements : [],
        misconceptions: Array.isArray(result.feedback?.misconceptions) ? result.feedback.misconceptions : [],
        summary: typeof result.feedback?.summary === 'string' ? result.feedback.summary : ''
      },
      missingElements: Array.isArray(result.missingElements) ? result.missingElements : [],
      explanation: typeof result.explanation === 'string' ? result.explanation : '',
      raw: result.raw
    };
    
    return validatedResult;
  }
  
  /**
   * Validate and normalize follow-up questions result
   */
  private validateFollowUpResult(result: any): FollowUpQuestionsResult {
    // Ensure required structure exists
    const validatedResult: FollowUpQuestionsResult = {
      followUpQuestions: Array.isArray(result.followUpQuestions) 
        ? result.followUpQuestions.map((q: any) => ({
            question: typeof q.question === 'string' ? q.question : '',
            purpose: typeof q.purpose === 'string' ? q.purpose : '',
            targetedMisconception: typeof q.targetedMisconception === 'string' ? q.targetedMisconception : undefined,
            targetedMissingElement: typeof q.targetedMissingElement === 'string' ? q.targetedMissingElement : undefined
          }))
        : [],
      explanation: typeof result.explanation === 'string' ? result.explanation : '',
      raw: result.raw
    };
    
    return validatedResult;
  }
  
  /**
   * Generate cache key
   */
  private generateCacheKey(
    userResponse: string,
    question: string,
    expectedElements: string[],
    questionType: EvaluationPromptType
  ): string {
    const normalizedResponse = userResponse.trim().toLowerCase();
    const normalizedQuestion = question.trim().toLowerCase();
    const normalizedElements = expectedElements.map(e => e.trim().toLowerCase()).sort().join('|');
    
    const input = `${normalizedResponse}|${normalizedQuestion}|${normalizedElements}|${questionType}`;
    return this.simpleHash(input);
  }
  
  /**
   * Simple string hashing function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Get item from cache
   */
  private getFromCache(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    const expiryMs = this.options.cacheExpiry! * 60 * 1000;
    
    if (now - item.timestamp > expiryMs) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  /**
   * Save item to cache
   */
  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
    
    // Clean up old cache entries
    this.cleanCache();
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const expiryMs = this.options.cacheExpiry! * 60 * 1000;
    
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > expiryMs) {
        this.cache.delete(key);
      }
    });
  }
} 