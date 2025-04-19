interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

type SpeechRecognitionEventListeners = {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onNoSpeech?: () => void;
};

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private listeners: SpeechRecognitionEventListeners = {};

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition(): void {
    // Check for browser support
    if (!this.isSpeechRecognitionSupported()) {
      console.warn('Speech Recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionAPI();

    if (this.recognition) {
      // Configure recognition settings
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      // Set up event handlers
      this.recognition.onstart = this.handleStart.bind(this);
      this.recognition.onend = this.handleEnd.bind(this);
      this.recognition.onresult = this.handleResult.bind(this);
      this.recognition.onerror = this.handleError.bind(this);
      this.recognition.onnomatch = this.handleNoMatch.bind(this);
    }
  }

  public isSpeechRecognitionSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public startListening(): boolean {
    if (!this.recognition || this.isListening) {
      return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  public stopListening(): boolean {
    if (!this.recognition || !this.isListening) {
      return false;
    }

    try {
      this.recognition.stop();
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      return false;
    }
  }

  public setEventListeners(listeners: SpeechRecognitionEventListeners): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  private handleStart(): void {
    if (this.listeners.onStart) {
      this.listeners.onStart();
    }
  }

  private handleEnd(): void {
    this.isListening = false;
    if (this.listeners.onEnd) {
      this.listeners.onEnd();
    }
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    if (!this.listeners.onResult) return;

    const results = event.results;
    const resultLength = results.length;

    if (resultLength > 0) {
      const lastResult = results[resultLength - 1];
      const { transcript } = lastResult[0];
      const confidence = lastResult[0].confidence;
      const isFinal = lastResult.isFinal;

      this.listeners.onResult({
        transcript,
        isFinal,
        confidence
      });
    }
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    this.isListening = false;
    
    if (this.listeners.onError) {
      let errorMessage: string;
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech was detected.';
          if (this.listeners.onNoSpeech) {
            this.listeners.onNoSpeech();
          }
          break;
        case 'aborted':
          errorMessage = 'Speech recognition was aborted.';
          break;
        case 'audio-capture':
          errorMessage = 'Audio capture failed. Please check your microphone.';
          break;
        case 'network':
          errorMessage = 'Network error occurred during recognition.';
          break;
        case 'not-allowed':
        case 'service-not-allowed':
          errorMessage = 'Microphone access was denied.';
          break;
        case 'bad-grammar':
          errorMessage = 'Recognition grammar failed to load.';
          break;
        case 'language-not-supported':
          errorMessage = 'Selected language is not supported.';
          break;
        default:
          errorMessage = `Error occurred during speech recognition: ${event.error}`;
      }
      
      this.listeners.onError(errorMessage);
    }
  }

  private handleNoMatch(): void {
    if (this.listeners.onError) {
      this.listeners.onError('No speech was recognized. Please try again.');
    }
  }
}

export default SpeechRecognitionService; 