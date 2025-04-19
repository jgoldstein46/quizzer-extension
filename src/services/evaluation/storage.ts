/**
 * Storage utilities for response evaluations
 */

import { EvaluationResult, FollowUpQuestionsResult } from './api';

/**
 * Stored evaluation interface
 */
export interface StoredEvaluation {
  id: string;
  quizId: string;
  questionId: string;
  userResponse: string;
  evaluation: EvaluationResult;
  followUpQuestions?: FollowUpQuestionsResult;
  timestamp: number;
}

/**
 * Evaluation storage metadata
 */
export interface EvaluationMetadata {
  quizId: string;
  questionId: string;
  tabId?: number;
  timestamp?: number;
}

/**
 * Generate a unique ID for the evaluation
 */
function generateEvaluationId(): string {
  return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save an evaluation to storage
 */
export async function saveEvaluation(
  userResponse: string,
  evaluation: EvaluationResult,
  metadata: EvaluationMetadata
): Promise<StoredEvaluation> {
  try {
    // Create stored evaluation object
    const storedEvaluation: StoredEvaluation = {
      id: generateEvaluationId(),
      quizId: metadata.quizId,
      questionId: metadata.questionId,
      userResponse,
      evaluation,
      timestamp: metadata.timestamp || Date.now()
    };
    
    // Get existing evaluations
    const existingKey = `evaluations.${metadata.quizId}`;
    const result = await new Promise<any>(resolve => {
      chrome.storage.local.get(existingKey, resolve);
    });
    
    // Create or update evaluations array
    const evaluations = result[existingKey] || [];
    
    // Check if there's an existing evaluation for this question
    const existingIndex = evaluations.findIndex(
      (e: StoredEvaluation) => e.questionId === metadata.questionId
    );
    
    if (existingIndex >= 0) {
      // Update existing evaluation
      evaluations[existingIndex] = storedEvaluation;
    } else {
      // Add new evaluation
      evaluations.push(storedEvaluation);
    }
    
    // Save to storage
    await new Promise<void>(resolve => {
      chrome.storage.local.set({ [existingKey]: evaluations }, resolve);
    });
    
    // If tab ID is provided, store reference for quick access
    if (metadata.tabId) {
      const tabKey = `currentEvaluation.${metadata.tabId}.${metadata.questionId}`;
      await new Promise<void>(resolve => {
        chrome.storage.local.set({ [tabKey]: storedEvaluation.id }, resolve);
      });
    }
    
    return storedEvaluation;
  } catch (error) {
    console.error('Error saving evaluation:', error);
    throw new Error(`Failed to save evaluation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save follow-up questions for an evaluation
 */
export async function saveFollowUpQuestions(
  evaluationId: string,
  followUpQuestions: FollowUpQuestionsResult
): Promise<boolean> {
  try {
    // Get all evaluations from storage
    const result = await new Promise<Record<string, any>>(resolve => {
      chrome.storage.local.get(null, resolve);
    });
    
    // Find the evaluation in storage
    let evaluationFound = false;
    let updatedKey = '';
    
    for (const [key, value] of Object.entries(result)) {
      if (!key.startsWith('evaluations.')) continue;
      
      const evaluations = value as StoredEvaluation[];
      const evalIndex = evaluations.findIndex(e => e.id === evaluationId);
      
      if (evalIndex >= 0) {
        // Update the evaluation with follow-up questions
        evaluations[evalIndex].followUpQuestions = followUpQuestions;
        evaluationFound = true;
        updatedKey = key;
        
        // Save the updated evaluations
        await new Promise<void>(resolve => {
          chrome.storage.local.set({ [key]: evaluations }, resolve);
        });
        
        break;
      }
    }
    
    if (!evaluationFound) {
      console.warn(`Evaluation with ID ${evaluationId} not found in storage`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving follow-up questions:', error);
    throw new Error(`Failed to save follow-up questions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get an evaluation by ID
 */
export async function getEvaluationById(evaluationId: string): Promise<StoredEvaluation | null> {
  try {
    // Get all evaluations from storage
    const result = await new Promise<Record<string, any>>(resolve => {
      chrome.storage.local.get(null, resolve);
    });
    
    // Find the evaluation in storage
    for (const [key, value] of Object.entries(result)) {
      if (!key.startsWith('evaluations.')) continue;
      
      const evaluations = value as StoredEvaluation[];
      const evaluation = evaluations.find(e => e.id === evaluationId);
      
      if (evaluation) {
        return evaluation;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting evaluation by ID:', error);
    return null;
  }
}

/**
 * Get evaluations for a quiz
 */
export async function getEvaluationsForQuiz(quizId: string): Promise<StoredEvaluation[]> {
  try {
    const key = `evaluations.${quizId}`;
    const result = await new Promise<any>(resolve => {
      chrome.storage.local.get(key, resolve);
    });
    
    return result[key] || [];
  } catch (error) {
    console.error('Error getting evaluations for quiz:', error);
    return [];
  }
}

/**
 * Get the evaluation for a specific question in a quiz
 */
export async function getEvaluationForQuestion(
  quizId: string,
  questionId: string
): Promise<StoredEvaluation | null> {
  try {
    const evaluations = await getEvaluationsForQuiz(quizId);
    return evaluations.find(e => e.questionId === questionId) || null;
  } catch (error) {
    console.error('Error getting evaluation for question:', error);
    return null;
  }
}

/**
 * Get the current evaluation for a tab and question
 */
export async function getCurrentEvaluation(
  tabId: number,
  questionId: string
): Promise<StoredEvaluation | null> {
  try {
    const key = `currentEvaluation.${tabId}.${questionId}`;
    const result = await new Promise<any>(resolve => {
      chrome.storage.local.get(key, resolve);
    });
    
    const evaluationId = result[key];
    if (!evaluationId) return null;
    
    return getEvaluationById(evaluationId);
  } catch (error) {
    console.error('Error getting current evaluation:', error);
    return null;
  }
}

/**
 * Delete an evaluation by ID
 */
export async function deleteEvaluation(evaluationId: string): Promise<boolean> {
  try {
    // Get all evaluations from storage
    const result = await new Promise<Record<string, any>>(resolve => {
      chrome.storage.local.get(null, resolve);
    });
    
    // Find and remove the evaluation
    let evaluationFound = false;
    
    for (const [key, value] of Object.entries(result)) {
      if (!key.startsWith('evaluations.')) continue;
      
      const evaluations = value as StoredEvaluation[];
      const evalIndex = evaluations.findIndex(e => e.id === evaluationId);
      
      if (evalIndex >= 0) {
        // Remove the evaluation
        evaluations.splice(evalIndex, 1);
        evaluationFound = true;
        
        // Save the updated evaluations
        await new Promise<void>(resolve => {
          chrome.storage.local.set({ [key]: evaluations }, resolve);
        });
        
        break;
      }
    }
    
    // Also remove any tab references
    const tabReferences = Object.entries(result)
      .filter(([key, value]) => 
        key.startsWith('currentEvaluation.') && value === evaluationId
      )
      .map(([key]) => key);
    
    if (tabReferences.length > 0) {
      await new Promise<void>(resolve => {
        chrome.storage.local.remove(tabReferences, resolve);
      });
    }
    
    return evaluationFound;
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    return false;
  }
}

/**
 * Delete all evaluations for a quiz
 */
export async function deleteEvaluationsForQuiz(quizId: string): Promise<boolean> {
  try {
    const key = `evaluations.${quizId}`;
    
    // Get evaluations to find IDs
    const result = await new Promise<any>(resolve => {
      chrome.storage.local.get(key, resolve);
    });
    
    const evaluations = result[key] || [];
    
    // Remove from storage
    await new Promise<void>(resolve => {
      chrome.storage.local.remove(key, resolve);
    });
    
    // Also remove any tab references
    const allResult = await new Promise<Record<string, any>>(resolve => {
      chrome.storage.local.get(null, resolve);
    });
    
    const evaluationIds = evaluations.map((e: { id: any; }) => e.id);
    const tabReferences = Object.entries(allResult)
      .filter(([key, value]) => 
        key.startsWith('currentEvaluation.') && 
        typeof value === 'string' && 
        evaluationIds.includes(value)
      )
      .map(([key]) => key);
    
    if (tabReferences.length > 0) {
      await new Promise<void>(resolve => {
        chrome.storage.local.remove(tabReferences, resolve);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting evaluations for quiz:', error);
    return false;
  }
}

/**
 * Clean up old evaluations (older than specified days)
 */
export async function cleanupOldEvaluations(maxAgeDays: number = 30): Promise<number> {
  try {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const result = await new Promise<Record<string, any>>(resolve => {
      chrome.storage.local.get(null, resolve);
    });
    
    let totalRemoved = 0;
    const updates: Record<string, StoredEvaluation[]> = {};
    
    // Find evaluations older than cutoff
    for (const [key, value] of Object.entries(result)) {
      if (!key.startsWith('evaluations.')) continue;
      
      const evaluations = value as StoredEvaluation[];
      const newEvaluations = evaluations.filter(e => e.timestamp >= cutoffTime);
      
      if (newEvaluations.length < evaluations.length) {
        updates[key] = newEvaluations;
        totalRemoved += (evaluations.length - newEvaluations.length);
      }
    }
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      await new Promise<void>(resolve => {
        chrome.storage.local.set(updates, resolve);
      });
    }
    
    return totalRemoved;
  } catch (error) {
    console.error('Error cleaning up old evaluations:', error);
    return 0;
  }
} 