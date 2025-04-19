import { useEffect, useState } from 'react';
import { QuizQuestion as QuizQuestionType } from '../../services/quiz/parser';
import QuestionDisplay from './QuestionDisplay';
import TextInput from './TextInput';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  answer: string;
  onAnswerChange: (questionId: number, answer: string) => void;
  selectedOption?: string;
  onOptionSelect?: (questionId: number, option: string) => void;
}

const QuizQuestion = ({
  question,
  questionNumber,
  totalQuestions,
  answer,
  onAnswerChange,
  selectedOption,
  onOptionSelect
}: QuizQuestionProps) => {
  const [inputValue, setInputValue] = useState<string>(answer || '');

  useEffect(() => {
    // Reset input value when question changes
    setInputValue(answer || '');
  }, [question.id, answer]);

  const handleTextChange = (value: string) => {
    setInputValue(value);
    onAnswerChange(question.id, value);
  };

  const handleOptionSelect = (option: string) => {
    if (onOptionSelect) {
      onOptionSelect(question.id, option);
    }
  };

  const validateAnswer = (value: string) => {
    if (question.type === 'open_ended' && value.length < 10) {
      return {
        valid: false,
        message: 'Please provide a more detailed answer (at least 10 characters)'
      };
    }
    return { valid: true };
  };

  return (
    <div className="quiz-question mb-6">
      <QuestionDisplay 
        question={question} 
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
      />
      
      <div className="mt-4">
        {question.type === 'multiple_choice' && question.options && (
          <div className="options-list space-y-2">
            {question.options.map((option, index) => (
              <div 
                key={index} 
                className={`option p-3 border rounded-md transition cursor-pointer ${
                  selectedOption === option 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleOptionSelect(option)}
              >
                <div className="flex items-start">
                  <div className={`option-letter h-6 w-6 rounded-full flex items-center justify-center mr-3 font-medium flex-shrink-0 ${
                    selectedOption === option 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="option-text text-gray-700">{option}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {question.type === 'open_ended' && (
          <TextInput
            value={inputValue}
            onChange={handleTextChange}
            onValidate={validateAnswer}
            minLength={10}
            maxLength={1000}
            placeholder="Type your answer here..."
            validateOnChange={true}
          />
        )}
        
        {question.type === 'true_false' && (
          <div className="flex space-x-3">
            <button
              className={`flex-1 p-3 border rounded-md transition ${
                selectedOption === 'True' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => handleOptionSelect('True')}
            >
              True
            </button>
            <button
              className={`flex-1 p-3 border rounded-md transition ${
                selectedOption === 'False' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => handleOptionSelect('False')}
            >
              False
            </button>
          </div>
        )}
        
        {question.type === 'fill_in_blank' && (
          <TextInput
            value={inputValue}
            onChange={handleTextChange}
            maxLength={100}
            placeholder="Fill in the blank..."
          />
        )}
      </div>
    </div>
  );
};

export default QuizQuestion; 