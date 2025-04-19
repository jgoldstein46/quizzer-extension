type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

type MicrophonePermissionListeners = {
  onPermissionChange?: (state: PermissionState) => void;
  onPermissionError?: (error: string) => void;
};

class MicrophonePermissionService {
  private currentPermissionState: PermissionState = 'unknown';
  private listeners: MicrophonePermissionListeners = {};

  constructor() {
    this.checkInitialPermissionState();
  }

  private async checkInitialPermissionState(): Promise<void> {
    try {
      // Check if the browser supports the permissions API
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        this.updatePermissionState(permissionStatus.state as PermissionState);
        
        // Set up a listener for permission state changes
        permissionStatus.onchange = () => {
          this.updatePermissionState(permissionStatus.state as PermissionState);
        };
      } else {
        // For browsers that don't support permissions API, we'll determine state when requested
        console.warn('Permissions API is not supported in this browser');
        this.currentPermissionState = 'unknown';
      }
    } catch (error) {
      console.warn('Failed to check microphone permission state:', error);
      this.currentPermissionState = 'unknown';
    }
  }

  public async requestPermission(): Promise<PermissionState> {
    try {
      // Try to access the microphone
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.updatePermissionState('granted');
      return 'granted';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Parse the error to determine if permission was denied
      if (errorMessage.includes('Permission denied') || errorMessage.includes('not allowed')) {
        this.updatePermissionState('denied');
        if (this.listeners.onPermissionError) {
          this.listeners.onPermissionError('Microphone access was denied by the user.');
        }
        return 'denied';
      } else {
        // Handle other errors like device not available
        this.updatePermissionState('unknown');
        if (this.listeners.onPermissionError) {
          this.listeners.onPermissionError(`Failed to access microphone: ${errorMessage}`);
        }
        return 'unknown';
      }
    }
  }

  public getCurrentPermissionState(): PermissionState {
    return this.currentPermissionState;
  }

  public setEventListeners(listeners: MicrophonePermissionListeners): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  public isMicrophoneSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  private updatePermissionState(state: PermissionState): void {
    if (this.currentPermissionState !== state) {
      this.currentPermissionState = state;
      if (this.listeners.onPermissionChange) {
        this.listeners.onPermissionChange(state);
      }
    }
  }
}

export default MicrophonePermissionService; 