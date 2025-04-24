import { CalendarIcon, CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StoredQuiz, getStoredQuizzes } from '../../services/quiz/storage';
import { Button } from '../ui/button';

interface QuizHistoryProps {
  onSelectQuiz?: (quizId: string) => void;
  onClose?: () => void;
}

const QuizHistory = ({ onSelectQuiz, onClose }: QuizHistoryProps) => {
  const [quizzes, setQuizzes] = useState<StoredQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
        <p className="text-gray-600">Loading quiz history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p className="font-medium">{error}</p>
        <p className="text-sm mt-2">Please try again later or contact support if the issue persists.</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-md text-center">
        <div className="text-gray-400 mb-3">
          <FileText size={48} className="mx-auto" />
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
        <h2 className="text-xl font-bold">Quiz History</h2>
        {onClose && (
          <Button 
            onClick={onClose}
            variant="outline"
            className="px-3 py-1 h-auto text-sm"
          >
            Close
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {quizzes.map((quiz) => {
          const isCompleted = quiz.metadata.completed === true;
          const score = quiz.metadata.numCorrect !== undefined 
            ? `${quiz.metadata.numCorrect}/${quiz.questions.length}` 
            : 'Not scored';
          
          return (
            <div 
              key={quiz.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
              onClick={() => onSelectQuiz && onSelectQuiz(quiz.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-blue-800 truncate flex-1">{quiz.title}</h3>
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
              
              <div className="text-sm text-gray-500 truncate mb-2">
                {new URL(quiz.url).hostname}
              </div>
              
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
                <div className="flex items-center">
                  <CalendarIcon size={14} className="mr-1" />
                  {formatDate(quiz.createdAt)}
                </div>
                { quiz.metadata.articleReadTime && 
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
          );
        })}
      </div>
    </div>
  );
};

export default QuizHistory;
