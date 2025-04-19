import { useState } from 'react';
import '../App.css';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

function Onboarding({ isOpen, onClose, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to Quizzer!",
      description: "Generate quizzes from any article to test your comprehension and recall.",
      image: "👋",
    },
    {
      title: "Step 1: Find an Article",
      description: "Navigate to any article, blog post, or educational content you want to learn from.",
      image: "🔍",
    },
    {
      title: "Step 2: Extract Content",
      description: "Click the 'Extract Content' button to let Quizzer analyze the article.",
      image: "📄",
    },
    {
      title: "Step 3: Generate Quiz",
      description: "Click 'Generate Quiz' to create questions based on the article's content.",
      image: "❓",
    },
    {
      title: "Step 4: Test Your Knowledge",
      description: "Answer the questions to test your comprehension of the material.",
      image: "✏️",
    },
    {
      title: "Step 5: Review Results",
      description: "Get detailed feedback on your answers and areas for improvement.",
      image: "📊",
    },
    {
      title: "Ready to Start!",
      description: "You're all set to begin using Quizzer. Open the extension on any article page to get started.",
      image: "🚀",
    }
  ];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const completeOnboarding = () => {
    // Save that onboarding is complete
    chrome.storage.local.set({ onboardingComplete: true }, () => {
      onComplete();
      onClose();
    });
  };
  
  const handleSkip = () => {
    completeOnboarding();
  };
  
  if (!isOpen) return null;
  
  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-labelledby="onboarding-title"
      aria-modal="true"
    >
      <div className="card p-4 m-4 max-w-md w-full animate-slide-in">
        <div className="text-center mb-6">
          <div 
            className="text-4xl mb-4 mx-auto flex items-center justify-center h-16 w-16 rounded-full"
            style={{ backgroundColor: 'var(--color-primary-bg)' }}
            aria-hidden="true"
          >
            {currentStepData.image}
          </div>
          <h2 
            id="onboarding-title" 
            className="text-lg font-medium mb-2"
            style={{ color: 'var(--color-primary)' }}
          >
            {currentStepData.title}
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-neutral-600)' }}>
            {currentStepData.description}
          </p>
        </div>
        
        <div className="mb-6 flex justify-center">
          {steps.map((_, index) => (
            <div 
              key={index}
              className="h-1 rounded-full mx-1 w-4 transition-colors"
              style={{ 
                backgroundColor: index === currentStep 
                  ? 'var(--color-primary)' 
                  : 'var(--color-neutral-200)'
              }}
              aria-hidden="true"
            />
          ))}
        </div>
        
        <div className="flex justify-between">
          <div>
            {!isFirstStep && (
              <button 
                onClick={handlePrevious}
                className="btn btn-secondary"
                aria-label="Go to previous step"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {!isLastStep && (
              <button 
                onClick={handleSkip}
                className="btn"
                style={{ color: 'var(--color-neutral-500)' }}
                aria-label="Skip onboarding"
              >
                Skip
              </button>
            )}
            
            <button 
              onClick={handleNext}
              className="btn btn-primary"
              aria-label={isLastStep ? "Complete onboarding" : "Go to next step"}
            >
              {isLastStep ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding; 