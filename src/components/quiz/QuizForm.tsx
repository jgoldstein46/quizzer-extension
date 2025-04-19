import { useEffect, useState } from 'react';
import { Quiz } from '../../services/quiz/parser';

interface UserAnswer {
  questionId: number;
  answer: string;
}

interface QuizFormProps {
  quiz: Quiz;
  onSubmit: (answers: UserAnswer[]) => void;
  isSubmitting?: boolean;
}

const QuizForm = ({ quiz, onSubmit, isSubmitting = false }: QuizFormProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ [key: number]: string }>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    // Initialize answers array with empty answers for each question
    if (quiz && quiz.questions) {
      const initialAnswers = quiz.questions.map(q => ({
        questionId: q.id,
        answer: ''
      }));
      setAnswers(initialAnswers);
    }
  }, [quiz]);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => 
      prev.map(a => a.questionId === questionId ? { ...a, answer } : a)
    );
    
    // Clear validation error when user starts typing
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    }
  };

  const handleOptionSelect = (questionId: number, option: string) => {
    handleAnswerChange(questionId, option);
  };

  const validateCurrentQuestion = (): boolean => {
    const currentAnswer = answers.find(a => a.questionId === currentQuestion.id);
    
    if (!currentAnswer || !currentAnswer.answer.trim()) {
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: 'Please provide an answer before continuing'
      }));
      return false;
    }
    
    if (currentQuestion.type === 'open_ended' && currentAnswer.answer.trim().length < 10) {
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: 'Please provide a more detailed answer (at least 10 characters)'
      }));
      return false;
    }
    
    return true;
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNextQuestion = () => {
    if (validateCurrentQuestion()) {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }
  };

  const handleSubmit = () => {
    if (validateCurrentQuestion()) {
      // Check if all questions have answers
      const unansweredQuestions = answers.filter(a => !a.answer.trim());
      
      if (unansweredQuestions.length > 0) {
        setShowConfirmation(true);
      } else {
        onSubmit(answers);
      }
    }
  };

  const confirmSubmit = () => {
    setShowConfirmation(false);
    onSubmit(answers);
  };

  const cancelSubmit = () => {
    setShowConfirmation(false);
  };

  const getCurrentAnswerForQuestion = (questionId: number): string => {
    const answer = answers.find(a => a.questionId === questionId);
    return answer ? answer.answer : '';
  };

  return (
    <div className="quiz-form">
      {quiz.questions && quiz.questions.length > 0 ? (
        <>
          <QuizQuestion
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            answer={getCurrentAnswerForQuestion(currentQuestion.id)}
            onAnswerChange={handleAnswerChange}
            selectedOption={getCurrentAnswerForQuestion(currentQuestion.id)}
            onOptionSelect={handleOptionSelect}
          />
          
          {validationErrors[currentQuestion.id] && (
            <div className="text-red-500 text-sm mb-3">
              {validationErrors[currentQuestion.id]}
            </div>
          )}
          
          <div className="quiz-navigation flex justify-between mt-6">
            <button
              type="button"
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={goToNextQuestion}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit Answers'
                )}
              </button>
            )}
          </div>
          
          <div className="quiz-progress mt-6">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Progress</span>
              <span>{currentQuestionIndex + 1} of {totalQuestions}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-lg font-medium mb-3">Submit Incomplete Quiz?</h3>
                <p className="text-gray-600 mb-4">
                  Some questions are still unanswered. Are you sure you want to submit your quiz?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={cancelSubmit}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSubmit}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    Submit Anyway
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-6 bg-gray-50 rounded-md">
          <p className="text-gray-500">No quiz questions available</p>
        </div>
      )}
    </div>
  );
};

export default QuizForm; 