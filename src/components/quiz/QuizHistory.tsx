import { CalendarIcon, CheckCircle, Clock, FileText, Flame, RefreshCcw, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StoredQuiz, getStoredQuizzes } from '../../services/quiz/storage';
import { Button } from '../ui/button';

interface QuizHistoryProps {
  onSelectQuiz?: (quizId: string, mode?: 'retake' | 'focus') => void;
  onClose?: () => void;
}

const QuizHistory = ({ onSelectQuiz, onClose }: QuizHistoryProps) => {
  const [quizzes, setQuizzes] = useState<StoredQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setIsLoading(true);
        const storedQuizzes = await getStoredQuizzes();
        setQuizzes(storedQuizzes);
        setError(null);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
        setError('Failed to load quiz history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
        <p className="text-gray-600">Loading quiz history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
        <p className="font-medium">{error}</p>
        <p className="text-sm mt-2">Please try again later or contact support if the issue persists.</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-md text-center">
        <div className="text-gray-400 mb-3">
          <FileText size={36} className="mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Quiz History</h3>
        <p className="text-gray-500 mb-4">You haven't completed any quizzes yet.</p>
        <Button onClick={onClose} className="bg-blue-500 hover:bg-blue-600">
          Start a New Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="quiz-history">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold flex items-center">
          <Clock size={18} className="mr-2 text-blue-500" />
          Quiz History
        </h2>
        {onClose && (
          <Button 
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6 rounded-full flex items-center justify-center"
            aria-label="Close history"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {quizzes.filter(quiz => quiz.metadata.completed === true).map((quiz) => {
          const isCompleted = quiz.metadata.completed === true;
          const score = quiz.metadata.numCorrect !== undefined 
            ? `${quiz.metadata.numCorrect}/${quiz.questions.length}` 
            : 'Not scored';
          
          return (
            <div key={quiz.id} className="mb-1">
              <div 
                className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer shadow-sm"
                onClick={() => setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-blue-700 truncate flex-1 text-sm">{quiz.title}</h3>
                  <div className="flex items-center text-sm">
                    {isCompleted ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle size={16} className="mr-1" />
                        Completed
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-600">
                        <XCircle size={16} className="mr-1" />
                        Incomplete
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 truncate mb-2">
                  {new URL(quiz.url).hostname}
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
                  <div className="flex items-center">
                    <CalendarIcon size={14} className="mr-1" />
                    {formatDate(quiz.createdAt)}
                  </div>
                  {quiz.metadata.articleReadTime && 
                    <div className="flex items-center">
                      <Clock size={14} className="mr-1" />
                      {`${quiz.metadata.articleReadTime} min read`}
                    </div>
                  }
                  
                  {isCompleted && (
                    <div className="flex items-center font-medium text-blue-700">
                      Score: {score}
                    </div>
                  )}
                </div>
              </div>
              
              {expandedQuizId === quiz.id && (
                <div className="rounded-b-lg overflow-hidden shadow-sm border border-t-0 border-gray-200 animate-slide-in-from-top p-4" style={{animationDuration: '150ms'}}>
                  <Button 
                    variant="ghost"
                    className="w-full py-3 justify-between text-sm font-medium rounded-lg border-b border-gray-200 hover:bg-blue-50"
                    onClick={() => onSelectQuiz && onSelectQuiz(quiz.id, 'retake')}
                  >
                    <div className="flex items-center">
                      <RefreshCcw size={16} className="mr-2 text-blue-600" />
                      Retake
                    </div>
                    <span className="text-xs font-semibold text-green-600">+25 XP</span>
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full py-3 justify-between text-sm font-medium rounded-lg hover:bg-blue-50"
                    onClick={() => onSelectQuiz && onSelectQuiz(quiz.id, 'focus')}
                  >
                    <div className="flex items-center">
                      <Flame size={16} className="mr-2 text-orange-500" />
                      Focus on missed questions
                    </div>
                    <span className="text-xs font-semibold text-green-600">+40 XP</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizHistory;
