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
      
      {question.type === 'multiple_choice' && question.options && (
        <div className="options-list space-y-2">
          {question.options.map((option, index) => (
            <div 
              key={index} 
              className="option p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition cursor-pointer"
            >
              <div className="flex items-start">
                <div className="option-letter h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-gray-600 font-medium flex-shrink-0">
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="option-text text-gray-700">{option}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isLoading && (
        <div className="loading-indicator flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay; 