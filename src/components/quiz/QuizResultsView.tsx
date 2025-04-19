import { useEffect, useState } from 'react';
import { StoredEvaluation } from '../../services/evaluation/storage';
import { Quiz } from '../../services/quiz/parser';
import { UserAnswer } from './index';
import QuestionFeedback from './QuestionFeedback';
import QuizResults from './QuizResults';

interface QuizResultsViewProps {
  quiz: Quiz;
  answers: UserAnswer[];
  quizId: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export const QuizResultsView = ({
  quiz,
  answers,
  quizId,
  onRetry,
  onClose
}: QuizResultsViewProps) => {
  const [evaluations, setEvaluations] = useState<StoredEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [showOverview, setShowOverview] = useState(true);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setIsLoading(true);
        // Get evaluations from storage
        const result = await new Promise<{[key: string]: any}>(resolve => {
          chrome.storage.local.get(`evaluations.${quizId}`, resolve);
        });
        
        const evaluationsArray = result[`evaluations.${quizId}`] || [];
        setEvaluations(evaluationsArray);
      } catch (error) {
        console.error('Error fetching evaluations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvaluations();
  }, [quizId]);

  // Handle question selection
  const handleQuestionSelect = (index: number) => {
    setSelectedQuestionIndex(index);
    setShowOverview(false);
  };

  // Go back to overview
  const handleBackToOverview = () => {
    setShowOverview(true);
  };

  // Navigate to previous question
  const handlePreviousQuestion = () => {
    if (selectedQuestionIndex !== null && selectedQuestionIndex > 0) {
      setSelectedQuestionIndex(selectedQuestionIndex - 1);
    }
  };

  // Navigate to next question
  const handleNextQuestion = () => {
    if (selectedQuestionIndex !== null && selectedQuestionIndex < quiz.questions.length - 1) {
      setSelectedQuestionIndex(selectedQuestionIndex + 1);
    }
  };

  // Find evaluation for a specific question
  const findEvaluationForQuestion = (questionId: number) => {
    return evaluations.find(e => e.questionId === questionId.toString());
  };

  // Find user answer for a specific question
  const findUserAnswerForQuestion = (questionId: number) => {
    return answers.find(a => a.questionId === questionId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
        <p className="text-gray-600">Loading quiz results...</p>
      </div>
    );
  }

  // Show specific question feedback if selected
  if (!showOverview && selectedQuestionIndex !== null) {
    const question = quiz.questions[selectedQuestionIndex];
    const evaluation = findEvaluationForQuestion(question.id);
    const userAnswer = findUserAnswerForQuestion(question.id);
    
    return (
      <div className="quiz-results-view">
        {/* Navigation header */}
        <div className="flex items-center mb-4">
          <button
            onClick={handleBackToOverview}
            className="mr-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h2 className="text-lg font-medium">Question Review</h2>
        </div>
        
        {/* Question feedback component */}
        <QuestionFeedback
          question={question}
          userAnswer={userAnswer}
          evaluation={evaluation}
          questionNumber={selectedQuestionIndex + 1}
          totalQuestions={quiz.questions.length}
        />
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={handlePreviousQuestion}
            disabled={selectedQuestionIndex === 0}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous Question
          </button>
          <button
            onClick={handleNextQuestion}
            disabled={selectedQuestionIndex === quiz.questions.length - 1}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Question
          </button>
        </div>
      </div>
    );
  }

  // Show overview by default
  return (
    <div className="quiz-results-view">
      {/* Results summary component */}
      <QuizResults
        quiz={quiz}
        answers={answers}
        evaluations={evaluations}
        onRetry={onRetry}
        onClose={onClose}
      />
      
      {/* Question list for navigation */}
      <div className="mt-6">
        <h3 className="font-medium mb-3">Question Review</h3>
        <div className="space-y-2">
          {quiz.questions.map((question, index) => {
            const evaluation = findEvaluationForQuestion(question.id);
            const score = evaluation?.evaluation.scores.overall || 0;
            const hasEvaluation = !!evaluation;
            
            // Determine status color based on score or evaluation existence
            let statusColor = 'bg-gray-200'; // Default for unanswered
            if (hasEvaluation) {
              statusColor = score >= 8 ? 'bg-green-500' : 
                          score >= 6 ? 'bg-yellow-500' : 
                          'bg-red-500';
            }
            
            return (
              <button
                key={index}
                onClick={() => handleQuestionSelect(index)}
                className="w-full text-left p-3 border rounded hover:bg-gray-50 transition flex items-center"
              >
                <div className={`${statusColor} h-4 w-4 rounded-full mr-3`}></div>
                <div className="flex-1 truncate">
                  <div className="font-medium">Question {index + 1}</div>
                  <div className="text-sm text-gray-500 truncate">{question.text}</div>
                </div>
                {hasEvaluation && (
                  <div className="text-sm font-medium ml-2">{score}/10</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizResultsView; 