import { useEffect, useState } from 'react';
import { QuizQuestion } from '../../services/quiz/parser';

interface QuestionDisplayProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
}

const QuestionDisplay = ({ 
  question, 
  questionNumber, 
  totalQuestions 
}: QuestionDisplayProps) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Reset loading state when question changes
    setIsLoading(false);
  }, [question.id]);

  return (
    <div className="question-display p-4 bg-white rounded-md shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-500">
          Question {questionNumber} of {totalQuestions}
        </h3>
        {question.type === 'multiple_choice' && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            Multiple Choice
          </span>
        )}
        {question.type === 'open_ended' && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            Open Ended
          </span>
        )}
        {question.type === 'true_false' && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            True/False
          </span>
        )}
        {question.type === 'fill_in_blank' && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            Fill in the Blank
          </span>
        )}
      </div>
      
      <div className="question-text text-gray-800 font-medium mb-4">
        {question.text}
      </div>
      

      
      {isLoading && (
        <div className="loading-indicator flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay; 