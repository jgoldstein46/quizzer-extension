import React, { useCallback, useEffect, useState } from 'react';
import { VoiceInputResult, VoiceInputService, VoiceInputState } from '../../services/speech';
import { MicrophoneButton, TranscriptionDisplay, TranscriptionEditor } from './index';

interface VoiceInputProps {
  onTranscriptionComplete: (text: string) => void;
  className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onTranscriptionComplete,
  className = '' 
}) => {
  const [voiceService] = useState(() => new VoiceInputService());
  const [voiceState, setVoiceState] = useState<VoiceInputState>('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [finalResult, setFinalResult] = useState<VoiceInputResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Check if voice input is supported
  useEffect(() => {
    setIsSupported(voiceService.isVoiceInputSupported());
  }, [voiceService]);

  // Set up event listeners for the voice service
  useEffect(() => {
    voiceService.setEventListeners({
      onStateChange: (state) => {
        setVoiceState(state);
        
        // Reset interim text when not listening
        if (state !== 'listening') {
          setInterimText('');
        }
        
        // Show editor when we have a final result and are not in error state
        if (state === 'processing') {
          setIsEditing(true);
        }
      },
      onInterimResult: (text) => {
        setInterimText(text);
      },
      onFinalResult: (result) => {
        setFinalText((prev) => prev + (prev ? ' ' : '') + result.transcript);
        setFinalResult(result);
      },
      onError: (error) => {
        setErrorMessage(error);
      }
    });
  }, [voiceService]);

  // Handler for starting voice input
  const handleStart = useCallback(async () => {
    setErrorMessage(null);
    await voiceService.startVoiceInput();
  }, [voiceService]);

  // Handler for stopping voice input
  const handleStop = useCallback(() => {
    voiceService.stopVoiceInput();
  }, [voiceService]);

  // Handler for accepting the transcription
  const handleAccept = useCallback((text: string) => {
    setIsEditing(false);
    setVoiceState('idle');
    onTranscriptionComplete(text);
    
    // Reset after completion
    setFinalText('');
    setInterimText('');
    setFinalResult(null);
  }, [onTranscriptionComplete]);

  // Handler for retrying voice input
  const handleRetry = useCallback(() => {
    setIsEditing(false);
    setFinalText('');
    setInterimText('');
    setFinalResult(null);
    setVoiceState('idle');
    
    // Short delay to allow state to reset before starting again
    setTimeout(() => {
      handleStart();
    }, 100);
  }, [handleStart]);

  // Handler for canceling voice input
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setVoiceState('idle');
    setFinalText('');
    setInterimText('');
    setFinalResult(null);
  }, []);

  // Render unsupported message if voice input is not supported
  if (!isSupported) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-100 rounded text-yellow-800 ${className}`}>
        <p className="text-sm font-medium">Voice input is not supported in this browser.</p>
        <p className="text-xs mt-1">Please try a modern browser like Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-100 rounded text-red-800 text-sm">
          {errorMessage}
        </div>
      )}
      
      {isEditing && finalResult ? (
        <TranscriptionEditor 
          text={finalText}
          confidence={finalResult.confidence}
          onAccept={handleAccept}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      ) : (
        <TranscriptionDisplay 
          interimText={interimText}
          finalText={finalText}
          state={voiceState}
        />
      )}
      
      <div className="flex justify-center">
        <MicrophoneButton 
          state={voiceState}
          onStart={handleStart}
          onStop={handleStop}
          disabled={isEditing}
        />
      </div>
    </div>
  );
};

export default VoiceInput; 