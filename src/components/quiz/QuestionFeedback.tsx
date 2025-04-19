import { StoredEvaluation } from '../../services/evaluation/storage';
import { QuizQuestion } from '../../services/quiz/parser';
import { UserAnswer } from './index';

interface QuestionFeedbackProps {
  question: QuizQuestion;
  userAnswer: UserAnswer | undefined;
  evaluation: StoredEvaluation | undefined;
  questionNumber: number;
  totalQuestions: number;
}

export const QuestionFeedback = ({
  question,
  userAnswer,
  evaluation,
  questionNumber,
  totalQuestions
}: QuestionFeedbackProps) => {
  // Check if user has answered this question
  const hasAnswer = userAnswer && userAnswer.answer.trim() !== '';
  
  // Default score if no evaluation
  const score = evaluation?.evaluation.scores.overall || 0;
  
  // Get feedback and strengths/weaknesses if evaluation exists
  const feedback = evaluation?.evaluation.feedback || 'No feedback available';
  const strengths = evaluation?.evaluation.strengths || [];
  const weaknesses = evaluation?.evaluation.areas_for_improvement || [];
  
  // Determine if this is a correct answer (score >= 7 is considered good)
  const isCorrect = score >= 7;
  
  return (
    <div className="question-feedback bg-white rounded-lg border shadow-sm mb-4">
      {/* Question header */}
      <div className="border-b p-3 flex justify-between items-center">
        <div className="font-medium">
          Question {questionNumber} of {totalQuestions}
        </div>
        {hasAnswer && (
          <div className={`px-2 py-1 rounded text-sm font-medium ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isCorrect ? 'Correct' : 'Needs Improvement'}
          </div>
        )}
      </div>
      
      {/* Question text */}
      <div className="p-4 border-b">
        <div className="text-gray-700 mb-2">{question.text}</div>
        
        {/* For multiple choice questions, show the options */}
        {question.options && (
          <div className="mt-2 space-y-1">
            {question.options.map((option, index) => (
              <div 
                key={index} 
                className={`p-2 rounded ${
                  userAnswer?.answer === option && option === question.correctAnswer
                    ? 'bg-green-100 text-green-800'
                    : userAnswer?.answer === option
                    ? 'bg-red-100 text-red-800'
                    : option === question.correctAnswer
                    ? 'bg-green-50 text-green-800'
                    : 'bg-gray-50'
                }`}
              >
                {option}
                {userAnswer?.answer === option && <span className="ml-2">← Your answer</span>}
                {option === question.correctAnswer && <span className="ml-2">✓ Correct answer</span>}
              </div>
            ))}
          </div>
        )}
        
        {/* For open-ended questions, show user's answer and correct answer */}
        {!question.options && (
          <div className="mt-3 space-y-3">
            {hasAnswer && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Your Answer:</div>
                <div className="p-3 bg-gray-50 rounded text-gray-800">{userAnswer?.answer}</div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Expected Answer:</div>
              <div className="p-3 bg-green-50 rounded text-green-800">{question.correctAnswer}</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Score section */}
      {evaluation && (
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-500">Score</div>
            <div className="font-bold text-lg">{score}/10</div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                score >= 8 ? 'bg-green-500' : 
                score >= 6 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${score * 10}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Feedback section */}
      {evaluation && (
        <div className="p-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Feedback:</div>
          <div className="text-gray-700 mb-4">{feedback}</div>
          
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-green-600 mb-1">Strengths:</div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-1">
                {strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Areas for improvement */}
          {weaknesses.length > 0 && (
            <div>
              <div className="text-sm font-medium text-red-600 mb-1">Areas for Improvement:</div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-1">
                {weaknesses.map((weakness, index) => (
                  <li key={index}>{weakness}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Follow-up questions if present */}
          {evaluation.followUpQuestions && evaluation.followUpQuestions.questions.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="text-sm font-medium text-blue-600 mb-2">Follow-up Questions:</div>
              <ul className="list-decimal list-outside text-sm text-gray-700 space-y-2 ml-4">
                {evaluation.followUpQuestions.questions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionFeedback; 