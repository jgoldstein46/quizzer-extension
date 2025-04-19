import React, { useEffect, useRef, useState } from 'react';

interface TranscriptionEditorProps {
  text: string;
  confidence: number;
  onAccept: (text: string) => void;
  onRetry: () => void;
  onCancel: () => void;
  className?: string;
}

const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  text,
  confidence,
  onAccept,
  onRetry,
  onCancel,
  className = '',
}) => {
  const [editedText, setEditedText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    // Focus textarea and place cursor at end when component mounts
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  };

  const handleAccept = () => {
    if (editedText.trim().length > 0) {
      onAccept(editedText);
    }
  };

  // Get confidence level color
  const getConfidenceColor = () => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">Review Transcription</h3>
        <div className="flex items-center">
          <span className="text-xs mr-1">Confidence:</span>
          <span className={`text-xs font-medium ${getConfidenceColor()}`}>
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>
      
      <textarea
        ref={textareaRef}
        value={editedText}
        onChange={handleTextChange}
        className="w-full min-h-[100px] p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        placeholder="Edit your transcription..."
        aria-label="Edit transcription"
      />
      
      <div className="flex justify-end space-x-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition"
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          onClick={onRetry}
          className="px-3 py-1 text-sm border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition"
          aria-label="Try again"
        >
          Try Again
        </button>
        <button
          onClick={handleAccept}
          disabled={editedText.trim().length === 0}
          className={`px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition ${
            editedText.trim().length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Accept"
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default TranscriptionEditor; 