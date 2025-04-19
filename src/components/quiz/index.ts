export { default as PerformanceChart } from './PerformanceChart';
export { default as QuestionDisplay } from './QuestionDisplay';
export { default as QuestionFeedback } from './QuestionFeedback';
export { default as QuizForm } from './QuizForm';
export { default as QuizQuestion } from './QuizQuestion';
export { default as QuizResults } from './QuizResults';
export { default as QuizResultsView } from './QuizResultsView';
export { default as TextInput } from './TextInput';

export interface UserAnswer {
  questionId: number;
  answer: string;
} 