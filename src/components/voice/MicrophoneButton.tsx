import React from 'react';
import { VoiceInputState } from '../../services/speech';

interface MicrophoneButtonProps {
  state: VoiceInputState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  state,
  onStart,
  onStop,
  disabled = false,
  className = '',
}) => {
  const isListening = state === 'listening';
  const isRequesting = state === 'requesting-permission';
  const isProcessing = state === 'processing';
  const isError = state === 'error';
  
  const getButtonColor = () => {
    if (isListening) return 'bg-red-500 hover:bg-red-600';
    if (isError) return 'bg-gray-300 hover:bg-gray-400';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  const getIcon = () => {
    if (isListening) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="6" y="6" width="12" height="12" strokeWidth="2" />
        </svg>
      );
    }
    
    if (isRequesting || isProcessing) {
      return (
        <div className="animate-spin h-6 w-6 border-2 border-white rounded-full border-t-transparent"></div>
      );
    }
    
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    );
  };

  const handleClick = () => {
    if (isListening) {
      onStop();
    } else if (!isRequesting && !isProcessing) {
      onStart();
    }
  };

  const baseClasses = `w-12 h-12 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${getButtonColor()}`;
  const statusClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isRequesting || isProcessing}
      className={`${baseClasses} ${statusClasses} ${className}`}
      aria-label={isListening ? 'Stop recording' : 'Start recording'}
      title={isListening ? 'Stop recording' : 'Start recording'}
    >
      {getIcon()}
    </button>
  );
};

export default MicrophoneButton; 