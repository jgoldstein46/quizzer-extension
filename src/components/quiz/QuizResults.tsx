import { useEffect, useState } from 'react';
import { StoredEvaluation } from '../../services/evaluation/storage';
import { Quiz } from '@shared/schema';
import { UserAnswer } from './index';
import PerformanceChart from './PerformanceChart';

interface QuizResultsProps {
  quiz: Quiz;
  answers: UserAnswer[];
  evaluations: StoredEvaluation[];
  onRetry?: () => void;
  onClose?: () => void;
}

export const QuizResults = ({ 
  quiz, 
  answers, 
  evaluations, 
  onRetry, 
  onClose 
}: QuizResultsProps) => {
  const [overallScore, setOverallScore] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState(0);
  
  useEffect(() => {
    // Calculate overall score
    if (evaluations.length > 0) {
      const totalScore = evaluations.reduce((sum, evalItem) => {
        return sum + evalItem.evaluation.scores.overall;
      }, 0);
      setOverallScore(Math.round((totalScore / evaluations.length) * 10) / 10);
      setCompletedQuestions(evaluations.length);
    }
  }, [evaluations]);

  // Get performance level based on score
  const getPerformanceLevel = (score: number) => {
    if (score >= 9) return { text: 'Excellent', className: 'text-green-600' };
    if (score >= 7) return { text: 'Good', className: 'text-green-500' };
    if (score >= 5) return { text: 'Satisfactory', className: 'text-yellow-500' };
    return { text: 'Needs Improvement', className: 'text-red-500' };
  };

  const performance = getPerformanceLevel(overallScore);
  const totalQuestions = quiz.questions.length;
  const completionRate = Math.round((completedQuestions / totalQuestions) * 100);

  return (
    <div className="quiz-results p-4 bg-white rounded-lg border shadow-sm">
      <h2 className="text-xl font-bold mb-4">Quiz Results</h2>
      
      {/* Overall Summary Card */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-blue-900">Performance Summary</h3>
          <div className={`font-bold ${performance.className}`}>
            {performance.text}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-gray-500 text-sm mb-1">Overall Score</div>
            <div className="font-bold text-2xl text-blue-700">{overallScore}/10</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-gray-500 text-sm mb-1">Completion</div>
            <div className="font-bold text-2xl text-blue-700">{completionRate}%</div>
            <div className="text-xs text-gray-500">{completedQuestions} of {totalQuestions} questions</div>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          {overallScore >= 8 ? (
            <p>Excellent work! You demonstrated a strong understanding of the material.</p>
          ) : overallScore >= 6 ? (
            <p>Good job! You have a solid grasp of the key concepts with some areas to explore further.</p>
          ) : (
            <p>You've made a start, but there's room for improvement. Consider reviewing the material again.</p>
          )}
        </div>
      </div>
      
      {/* Performance Chart */}
      {evaluations.length > 0 && (
        <PerformanceChart evaluations={evaluations} />
      )}
      
      {/* Actions */}
      <div className="flex gap-3 mt-4">
        {onRetry && (
          <button 
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Try Another Quiz
          </button>
        )}
        {onClose && (
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizResults; 