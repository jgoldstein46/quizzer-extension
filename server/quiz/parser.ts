import { Quiz, QuizQuestion } from "@shared/schema";

/**
 * Parsing options
 */
export interface ParsingOptions {
  validateQuestions?: boolean;
  requireExplanations?: boolean;
  normalizeAnswers?: boolean;
}

/**
 * Try to parse JSON format quiz from Claude's response
 */
export function parseJSONResponse(response: string): Quiz | null {
  try {
    // Look for JSON block in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    
    if (jsonMatch && jsonMatch[1]) {
      // Clean up JSON string
      const cleanJson = jsonMatch[1]
        .replace(/\/\/.*$/gm, '') // Remove comments
        .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
      
      // Parse JSON
      const parsed = JSON.parse(cleanJson);
      
      // Validate structure
      if (parsed && Array.isArray(parsed.questions)) {
        // Normalize questions
        const validQuestions = parsed.questions
          .map(normalizeQuestion)
          .filter((q: null) => q !== null) as QuizQuestion[];
        
        return {
          questions: validQuestions,
          metadata: {
            generatedAt: new Date().toISOString(),
            ...parsed.metadata
          }
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing JSON quiz response:', error);
    return null;
  }
}

/**
 * Parse markdown formatted quiz questions
 */
export function parseMarkdownResponse(response: string): Quiz | null {
  try {
    // Extract question sections
    const questionSections = response.split(/#{1,3}\s*Question\s+\d+/i);
    
    // Filter out introduction section
    const filteredSections = questionSections.slice(1);
    
    if (filteredSections.length === 0) {
      return null;
    }
    
    // Parse each question section
    const questions: QuizQuestion[] = [];
    
    filteredSections.forEach((section, index) => {
      // Extract type
      const typeMatch = section.match(/\*\*Type\*\*:\s*([^\n]+)/i);
      const type = typeMatch ? typeMatch[1].toLowerCase().trim() : 'open_ended';
      
      // Extract question text - first paragraph after type or beginning
      let questionText = '';
      const lines = section.split('\n').map(line => line.trim());
      let questionTextIndex = -1;
      
      if (typeMatch) {
        // Find the line after the type line
        const typeLineIndex = lines.findIndex(line => line.includes('**Type**:'));
        questionTextIndex = typeLineIndex + 1;
      } else {
        // Take the first non-empty line
        questionTextIndex = lines.findIndex(line => line.length > 0);
      }
      
      if (questionTextIndex >= 0 && questionTextIndex < lines.length) {
        questionText = lines[questionTextIndex];
      }
      
      // Extract options for multiple choice
      const options: string[] = [];
      if (type.includes('multiple') || type.includes('choice')) {
        // Look for A, B, C, D style options
        const optionLines = lines.filter(line => /^[A-D]\.\s+/.test(line));
        
        if (optionLines.length > 0) {
          optionLines.forEach(line => {
            const option = line.replace(/^[A-D]\.\s+/, '').trim();
            options.push(option);
          });
        }
      }
      
      // Extract correct answer
      let correctAnswer = '';
      const correctMatch = section.match(/\*\*Correct\s+Answer\*\*:\s*([^\n]+)/i);
      if (correctMatch) {
        correctAnswer = correctMatch[1].trim();
        
        // Convert letter answer to option text for multiple choice
        if (options.length > 0) {
          const letterMatch = correctAnswer.match(/^([A-D])/i);
          if (letterMatch) {
            const index = letterMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
            if (index >= 0 && index < options.length) {
              correctAnswer = options[index];
            }
          }
        }
      }
      
      // Extract explanation
      let explanation = '';
      const explanationMatch = section.match(/\*\*Explanation\*\*:\s*([^\n].+?)(?=\n\s*(?:#{1,3}|$))/is);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }
      
      // Create question object
      questions.push({
        id: index + 1,
        type: normalizeQuestionType(type),
        text: questionText,
        ...(options.length > 0 ? { options } : {}),
        correctAnswer,
        ...(explanation ? { explanation } : {})
      });
    });
    
    return {
      questions,
      metadata: {
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error parsing Markdown quiz response:', error);
    return null;
  }
}

/**
 * Parse a structured text format quiz response
 */
export function parseStructuredResponse(response: string): Quiz | null {
  try {
    // Extract question blocks
    const questionBlocks = response.split(/\n\s*(?:Q|Question)\s*\d+\.\s*/i);
    
    // Remove first element if it's not a question
    const startIndex = questionBlocks[0].trim().length > 0 ? 0 : 1;
    const questions: QuizQuestion[] = [];
    
    for (let i = startIndex; i < questionBlocks.length; i++) {
      const block = questionBlocks[i].trim();
      if (!block) continue;
      
      // Extract question type
      const typeMatch = block.match(/\[(?:Question\s+)?Type:\s*([^\]]+)\]/i);
      const type = typeMatch ? typeMatch[1].toLowerCase().trim() : 'open_ended';
      
      // Extract question text
      let questionText = '';
      
      if (typeMatch) {
        // Text is after type marker up to first breakline or option
        const afterType = block.substring(block.indexOf(']') + 1).trim();
        const firstBreak = afterType.search(/\n\s*(?:Options|[A-D]\.|\([a-d]\)|[a-d]\))/i);
        
        questionText = firstBreak > 0 
          ? afterType.substring(0, firstBreak).trim() 
          : afterType.split('\n')[0].trim();
      } else {
        // Take first paragraph
        questionText = block.split('\n')[0].trim();
      }
      
      // Extract options for multiple choice
      const options: string[] = [];
      if (type.includes('multiple') || type.includes('choice')) {
        // Look for options section
        const optionSection = block.match(/(?:Options|\n\s*[A-D]\.|\n\s*\([a-d]\)|\n\s*[a-d]\))([\s\S]*?)(?=\nCorrect Answer|\nAnswer|$)/i);
        
        if (optionSection) {
          // Extract individual options
          const optionLines = optionSection[1].split('\n').filter(line => 
            /^[A-D]\.|\([a-d]\)|[a-d]\)|^[a-d]\)|\s+[A-D]\./i.test(line.trim())
          );
          
          optionLines.forEach(line => {
            const option = line.replace(/^[A-D]\.|\([a-d]\)|[a-d]\)|\s+[A-D]\./i, '').trim();
            if (option) {
              options.push(option);
            }
          });
        }
      }
      
      // Extract correct answer
      let correctAnswer = '';
      const correctMatch = block.match(/(?:Correct\s+Answer|Answer):\s*([^\n]+)/i);
      if (correctMatch) {
        correctAnswer = correctMatch[1].trim();
        
        // Convert letter answer to option text for multiple choice
        if (options.length > 0 && /^[A-D]$/i.test(correctAnswer)) {
          const index = correctAnswer.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
          if (index >= 0 && index < options.length) {
            correctAnswer = options[index];
          }
        }
      }
      
      // Extract explanation
      let explanation = '';
      const explanationMatch = block.match(/(?:Explanation|Rationale):\s*([^\n].*?)(?=\n\s*(?:Q|Question)\s*\d+\.?|$)/is);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }
      
      // Add normalized question
      questions.push({
        id: i - startIndex + 1,
        type: normalizeQuestionType(type),
        text: questionText,
        ...(options.length > 0 ? { options } : {}),
        correctAnswer,
        ...(explanation ? { explanation } : {})
      });
    }
    
    return questions.length > 0 ? {
      questions,
      metadata: {
        generatedAt: new Date().toISOString()
      }
    } : null;
  } catch (error) {
    console.error('Error parsing structured quiz response:', error);
    return null;
  }
}

/**
 * Main parser function that tries different formats
 */
export function parseQuizResponse(response: string, options: ParsingOptions = {}): Quiz {
  // Try parsing different formats in order of preference
  const jsonQuiz = parseJSONResponse(response);
  if (jsonQuiz && jsonQuiz.questions.length > 0) {
    return validateQuiz(jsonQuiz, options);
  }
  
  const markdownQuiz = parseMarkdownResponse(response);
  if (markdownQuiz && markdownQuiz.questions.length > 0) {
    return validateQuiz(markdownQuiz, options);
  }
  
  const structuredQuiz = parseStructuredResponse(response);
  if (structuredQuiz && structuredQuiz.questions.length > 0) {
    return validateQuiz(structuredQuiz, options);
  }
  
  // If all parsing methods fail, return error
  return {
    questions: [],
    error: 'Failed to parse quiz response into a structured format',
    metadata: {
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Normalize question type to standard format
 */
export function normalizeQuestionType(type: string): QuizQuestion['type'] {
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
 * Normalize a question object to standard format
 */
function normalizeQuestion(question: any): QuizQuestion | null {
  if (!question || typeof question !== 'object') {
    return null;
  }
  
  // Ensure question has required fields
  if (!question.text || typeof question.text !== 'string') {
    return null;
  }
  
  // Create standardized question object
  return {
    id: typeof question.id === 'number' ? question.id : 0,
    type: normalizeQuestionType(question.type || 'open_ended'),
    text: question.text.trim(),
    ...(Array.isArray(question.options) && question.options.length > 0 
      ? { options: question.options.map((opt: any) => String(opt).trim()) } 
      : {}),
    correctAnswer: typeof question.correctAnswer === 'string' 
      ? question.correctAnswer.trim() 
      : '',
    ...(typeof question.explanation === 'string' && question.explanation.trim().length > 0 
      ? { explanation: question.explanation.trim() } 
      : {})
  };
}

/**
 * Validate a quiz object
 */
function validateQuiz(quiz: Quiz, options: ParsingOptions = {}): Quiz {
  const {
    validateQuestions = true,
    requireExplanations = false,
    normalizeAnswers = true
  } = options;
  
  if (!quiz.questions || !Array.isArray(quiz.questions)) {
    return {
      questions: [],
      error: 'Invalid quiz structure: missing questions array',
      metadata: quiz.metadata || { generatedAt: new Date().toISOString() }
    };
  }
  
  // If validation not required, return as is
  if (!validateQuestions) {
    return quiz;
  }
  
  // Validate and normalize each question
  const validQuestions = quiz.questions
    .map((q, index) => {
      // Fix question ID if needed
      if (!q.id || typeof q.id !== 'number') {
        q.id = index + 1;
      }
      
      // Validate question type
      if (!q.type || !['multiple_choice', 'open_ended', 'true_false', 'fill_in_blank'].includes(q.type)) {
        q.type = normalizeQuestionType(q.type || 'open_ended');
      }
      
      // Validate options for multiple choice questions
      if (q.type === 'multiple_choice' && (!q.options || !Array.isArray(q.options) || q.options.length < 2)) {
        return null; // Invalid multiple choice question
      }
      
      // Validate true/false questions
      if (q.type === 'true_false') {
        if (normalizeAnswers) {
          q.correctAnswer = q.correctAnswer.toLowerCase().includes('true') ? 'True' : 'False';
        }
      }
      
      // Check for required explanation
      if (requireExplanations && (!q.explanation || q.explanation.trim().length === 0)) {
        return null; // Missing required explanation
      }
      
      return q;
    })
    .filter(q => q !== null) as QuizQuestion[];
  
  if (validQuestions.length === 0) {
    return {
      questions: [],
      error: 'No valid questions found after validation',
      metadata: quiz.metadata || { generatedAt: new Date().toISOString() }
    };
  }
  
  return {
    questions: validQuestions,
    metadata: quiz.metadata || { generatedAt: new Date().toISOString() }
  };
} 