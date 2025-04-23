import { useEffect, useState } from 'react';
import { Quiz } from '../../services/quiz/parser';
import { Button } from '../ui/button';
import { RotateCcw } from 'lucide-react';
import QuizQuestion from './QuizQuestion';

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
  // Duolingo-style state for MCQ grading
  const [isGraded, setIsGraded] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [, setSubmitted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Count number of correct answers for summary
  const numCorrect = quiz.questions.reduce((acc, q) => {
    const userAnswer = answers.find(a => a.questionId === q.id);
    if (!userAnswer) return acc;
    if (q.type === 'multiple_choice') {
      const correctIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : parseInt(q.correctAnswer);
      const selectedIndex = Array.isArray(q.options)
        ? q.options.findIndex(opt => opt === userAnswer.answer)
        : -1;
      if (selectedIndex === correctIndex) return acc + 1;
    } else if (q.type === 'open_ended' && q.correctAnswer) {
      // Accept open-ended if answer matches correctAnswer (case-insensitive, trimmed)
      if (typeof q.correctAnswer === 'string' && userAnswer.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        return acc + 1;
      }
    } else if (q.type === 'fill_in_blank' && q.correctAnswer) {
      if (typeof q.correctAnswer === 'string' && userAnswer.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        return acc + 1;
      }
    } else if (q.type === 'true_false' && typeof q.correctAnswer === 'string') {
      if (userAnswer.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        return acc + 1;
      }
    }
    return acc;
  }, 0);

  // Restart handler
  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setAnswers(quiz.questions.map(q => ({ questionId: q.id, answer: '' })));
    setValidationErrors({});
    setShowConfirmation(false);
    setIsGraded(false);
    setIsCorrect(null);
    setSubmitted(false);
  };



  useEffect(() => {
    // Reset grading state when question changes
    setIsGraded(false);
    setIsCorrect(null);
  }, [currentQuestionIndex]);

  useEffect(() => {
    console.log("In QuizForm, got quiz:", quiz);
    // Initialize answers array with empty answers for each question
    if (quiz && quiz.questions) {
      const initialAnswers = quiz.questions.map(q => ({
        questionId: q.id,
        answer: ''
      }));
      setAnswers(initialAnswers);
    }
  }, [quiz]);

  useEffect(() => {
    console.log("In QuizForm, got quiz:", quiz);
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

  // For MCQ: grade or advance
  const handleContinue = () => {
    if (currentQuestion.type === 'multiple_choice') {
      if (!isGraded) {
        // Grade the answer
        const currentAnswer = answers.find(a => a.questionId === currentQuestion.id)?.answer;
        // correctAnswer is index (0-3) for multiple choice
        const correctIndex = typeof currentQuestion.correctAnswer === 'number' ? currentQuestion.correctAnswer : parseInt(currentQuestion.correctAnswer);
        const selectedIndex = Array.isArray(currentQuestion.options)
          ? currentQuestion.options.findIndex(opt => opt === currentAnswer)
          : -1;
        const correct = selectedIndex === correctIndex;
        setIsCorrect(correct);
        setIsGraded(true);
      } else {
        // Advance to next question
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          setQuizFinished(true);
        }
      }
    } else {
      // Default: validate and advance
      if (validateCurrentQuestion()) {
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
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
      {quizFinished ? (
        <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-lg shadow-md animate-fade-in" style={{ minHeight: 300 }}>
          <div className="text-5xl mb-3" role="img" aria-label="Congratulations">🎉</div>
          <h2 className="text-2xl font-bold mb-2 text-green-800">Congratulations!</h2>
          <p className="text-lg mb-4 text-green-700">You finished the quiz.</p>
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4 w-full max-w-xs text-center">
            <span className="text-green-700 font-semibold text-lg">{numCorrect}</span>
            <span className="text-green-700"> out of </span>
            <span className="text-green-700 font-semibold text-lg">{totalQuestions}</span>
            <span className="text-green-700"> correct</span>
          </div>
          <Button
            onClick={handleRestart}
            className="mt-2 px-2 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition flex items-center justify-center"
            aria-label="Restart Quiz"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>
      ) : (
        quiz.questions && quiz.questions.length > 0 ? (
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
            <div className="quiz-navigation flex flex-col gap-3 mt-6">
              {currentQuestion.type === 'multiple_choice' ? (
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={isSubmitting || !getCurrentAnswerForQuestion(currentQuestion.id)}
                  className="w-full shadow-lg py-3 text-base font-semibold"
                >
                  {isGraded ? (currentQuestionIndex < totalQuestions - 1 ? 'Continue' : 'Finish Quiz') : 'Check Answer'}
                </Button>
              ) : (
                currentQuestionIndex < totalQuestions - 1 ? (
                  <Button
                    type="button"
                    onClick={handleContinue}
                    disabled={isSubmitting}
                    className="w-full shadow-lg py-3 text-base font-semibold"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      handleSubmit();
                      setSubmitted(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full shadow-lg py-3 text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      'Submit Answers'
                    )}
                  </Button>
                )
              )}
            </div>
            {/* Feedback for MCQ */}
            {currentQuestion.type === 'multiple_choice' && isGraded && (
              <div className={`mt-4 p-4 rounded-lg text-center font-semibold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isCorrect ? 'Correct! 🎉' : `❌ The correct answer is: ${Array.isArray(currentQuestion.options) ? currentQuestion.options[typeof currentQuestion.correctAnswer === 'number' ? currentQuestion.correctAnswer : parseInt(currentQuestion.correctAnswer)] : ''}`}
              </div>
            )}
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
                    <Button
                      onClick={cancelSubmit}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmSubmit}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      Submit Anyway
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-6 bg-gray-50 rounded-md">
            <p className="text-gray-500">No quiz questions available</p>
          </div>
        )
      )}
    </div>
  );

};

export default QuizForm; 