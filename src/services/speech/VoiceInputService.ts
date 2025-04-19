import MicrophonePermissionService from './MicrophonePermissionService';
import SpeechRecognitionService from './SpeechRecognitionService';

export type VoiceInputState = 'idle' | 'requesting-permission' | 'listening' | 'processing' | 'error';

export interface VoiceInputResult {
  transcript: string;
  confidence: number;
}

type VoiceInputListeners = {
  onStateChange?: (state: VoiceInputState) => void;
  onInterimResult?: (text: string) => void;
  onFinalResult?: (result: VoiceInputResult) => void;
  onError?: (error: string) => void;
};

class VoiceInputService {
  private speechRecognition: SpeechRecognitionService;
  private microphonePermission: MicrophonePermissionService;
  private currentState: VoiceInputState = 'idle';
  private listeners: VoiceInputListeners = {};

  constructor() {
    this.speechRecognition = new SpeechRecognitionService();
    this.microphonePermission = new MicrophonePermissionService();

    // Set up event listeners for speech recognition
    this.speechRecognition.setEventListeners({
      onStart: this.handleRecognitionStart.bind(this),
      onEnd: this.handleRecognitionEnd.bind(this),
      onResult: this.handleRecognitionResult.bind(this),
      onError: this.handleRecognitionError.bind(this),
      onNoSpeech: this.handleNoSpeech.bind(this)
    });

    // Set up event listeners for microphone permission
    this.microphonePermission.setEventListeners({
      onPermissionChange: this.handlePermissionChange.bind(this),
      onPermissionError: this.handlePermissionError.bind(this)
    });
  }

  public isVoiceInputSupported(): boolean {
    return this.microphonePermission.isMicrophoneSupported() && 
           this.speechRecognition.isSpeechRecognitionSupported();
  }

  public async startVoiceInput(): Promise<boolean> {
    if (!this.isVoiceInputSupported()) {
      this.updateState('error');
      this.notifyError('Voice input is not supported in this browser.');
      return false;
    }

    if (this.currentState === 'listening' || this.currentState === 'requesting-permission') {
      return false;
    }

    // First, check/request microphone permission
    this.updateState('requesting-permission');
    const permissionState = await this.microphonePermission.requestPermission();
    
    if (permissionState !== 'granted') {
      this.updateState('error');
      return false;
    }

    // Start speech recognition
    const started = this.speechRecognition.startListening();
    if (started) {
      this.updateState('listening');
      return true;
    } else {
      this.updateState('error');
      this.notifyError('Failed to start voice recognition.');
      return false;
    }
  }

  public stopVoiceInput(): boolean {
    if (this.currentState !== 'listening') {
      return false;
    }

    const stopped = this.speechRecognition.stopListening();
    if (stopped) {
      this.updateState('processing');
      return true;
    } else {
      this.notifyError('Failed to stop voice recognition.');
      return false;
    }
  }

  public setEventListeners(listeners: VoiceInputListeners): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  public getCurrentState(): VoiceInputState {
    return this.currentState;
  }

  private handleRecognitionStart(): void {
    this.updateState('listening');
  }

  private handleRecognitionEnd(): void {
    if (this.currentState === 'listening') {
      this.updateState('idle');
    }
  }

  private handleRecognitionResult(result: { transcript: string; isFinal: boolean; confidence: number }): void {
    if (result.isFinal) {
      this.updateState('processing');
      if (this.listeners.onFinalResult) {
        this.listeners.onFinalResult({
          transcript: result.transcript,
          confidence: result.confidence
        });
      }
    } else if (this.listeners.onInterimResult) {
      this.listeners.onInterimResult(result.transcript);
    }
  }

  private handleRecognitionError(error: string): void {
    this.updateState('error');
    this.notifyError(error);
  }

  private handleNoSpeech(): void {
    this.updateState('idle');
    this.notifyError('No speech detected. Please try again.');
  }

  private handlePermissionChange(state: string): void {
    if (state === 'denied') {
      this.updateState('error');
      this.notifyError('Microphone access is required for voice input.');
    }
  }

  private handlePermissionError(error: string): void {
    this.updateState('error');
    this.notifyError(error);
  }

  private updateState(newState: VoiceInputState): void {
    if (this.currentState !== newState) {
      this.currentState = newState;
      if (this.listeners.onStateChange) {
        this.listeners.onStateChange(newState);
      }
    }
  }

  private notifyError(error: string): void {
    if (this.listeners.onError) {
      this.listeners.onError(error);
    }
  }
}

export default VoiceInputService; 