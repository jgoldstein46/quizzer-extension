import React from 'react';
import { VoiceInputState } from '../../services/speech';

interface TranscriptionDisplayProps {
  interimText: string;
  finalText: string;
  state: VoiceInputState;
  className?: string;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  interimText,
  finalText,
  state,
  className = '',
}) => {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isError = state === 'error';
  
  const getStatusText = () => {
    if (isListening) return 'Listening...';
    if (isProcessing) return 'Processing...';
    if (isError) return 'Error occurred';
    return '';
  };

  const getTranscriptText = () => {
    if (isListening && interimText) {
      return (
        <>
          {finalText}
          <span className="text-gray-500">{interimText}</span>
        </>
      );
    }
    return finalText || 'Say something...';
  };

  const getStatusIndicator = () => {
    if (isListening) {
      return (
        <div className="flex items-center">
          <div className="relative w-3 h-3 mr-2">
            <div className="absolute w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-xs text-green-500">{getStatusText()}</span>
        </div>
      );
    }
    if (isProcessing) {
      return (
        <div className="flex items-center">
          <div className="animate-spin mr-2 h-3 w-3 border border-blue-500 rounded-full border-t-transparent"></div>
          <span className="text-xs text-blue-500">{getStatusText()}</span>
        </div>
      );
    }
    if (isError) {
      return (
        <div className="flex items-center">
          <div className="w-3 h-3 mr-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-red-500">{getStatusText()}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">Voice Input</h3>
        {getStatusIndicator()}
      </div>
      <div className="min-h-[60px] bg-gray-50 rounded p-3 text-gray-800">
        {getTranscriptText()}
      </div>
    </div>
  );
};

export default TranscriptionDisplay; 