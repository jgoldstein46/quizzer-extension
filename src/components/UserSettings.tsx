import { useEffect, useState } from 'react';
import '../App.css';

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  reduceMotion: boolean;
  highContrast: boolean;
  largeTargets: boolean;
};

const defaultPreferences: UserPreferences = {
  theme: 'system',
  fontSize: 'medium',
  reduceMotion: false,
  highContrast: false,
  largeTargets: false
};

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

function UserSettings({ isOpen, onClose }: UserSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  
  useEffect(() => {
    // Load saved preferences from storage
    chrome.storage.local.get('userPreferences', (result) => {
      if (result.userPreferences) {
        setPreferences(result.userPreferences);
      }
    });
  }, []);
  
  const savePreferences = (newPrefs: UserPreferences) => {
    // Save to chrome storage
    chrome.storage.local.set({ userPreferences: newPrefs });
    
    // Apply theme
    if (newPrefs.theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else if (newPrefs.theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.documentElement.classList.remove('light-theme', 'dark-theme');
    }
    
    // Apply font size
    document.documentElement.classList.remove('text-small', 'text-medium', 'text-large');
    document.documentElement.classList.add(`text-${newPrefs.fontSize}`);
    
    // Apply motion preferences
    if (newPrefs.reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    // Apply contrast
    if (newPrefs.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Apply large targets
    if (newPrefs.largeTargets) {
      document.documentElement.classList.add('large-targets');
    } else {
      document.documentElement.classList.remove('large-targets');
    }
    
    setPreferences(newPrefs);
  };
  
  const handleChange = (key: keyof UserPreferences, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    savePreferences(newPrefs);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-labelledby="settings-title"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="card p-4 m-4 max-w-md w-full animate-slide-in overflow-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="settings-title" className="text-lg font-medium" style={{ color: 'var(--color-primary)' }}>User Preferences</h2>
          <button 
            className="btn text-sm"
            style={{ color: 'var(--color-neutral-500)' }}
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-2">
            <label className="font-medium block" htmlFor="theme-select">Theme</label>
            <select 
              id="theme-select"
              className="input w-full"
              value={preferences.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
              Choose your preferred color scheme
            </p>
          </div>
          
          {/* Font Size */}
          <div className="space-y-2">
            <label className="font-medium block" htmlFor="font-size-select">Font Size</label>
            <select 
              id="font-size-select"
              className="input w-full"
              value={preferences.fontSize}
              onChange={(e) => handleChange('fontSize', e.target.value)}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
              Adjust text size for better readability
            </p>
          </div>
          
          {/* Accessibility Options */}
          <div className="space-y-3">
            <h3 className="font-medium">Accessibility</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="reduce-motion" className="block">Reduce Motion</label>
                <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                  Minimize animations and transitions
                </p>
              </div>
              <div className="relative inline-block w-12 h-6">
                <input 
                  type="checkbox" 
                  id="reduce-motion" 
                  className="visually-hidden"
                  checked={preferences.reduceMotion}
                  onChange={(e) => handleChange('reduceMotion', e.target.checked)}
                />
                <label 
                  htmlFor="reduce-motion"
                  className="block absolute cursor-pointer inset-0 rounded-full transition-colors duration-200"
                  style={{ 
                    backgroundColor: preferences.reduceMotion ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                  }}
                >
                  <span 
                    className={`block rounded-full w-5 h-5 ml-0.5 mt-0.5 transition-transform duration-200 ${preferences.reduceMotion ? 'translate-x-6' : ''}`}
                    style={{ backgroundColor: 'white' }}
                  ></span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="high-contrast" className="block">High Contrast</label>
                <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                  Increase color contrast for better visibility
                </p>
              </div>
              <div className="relative inline-block w-12 h-6">
                <input 
                  type="checkbox" 
                  id="high-contrast" 
                  className="visually-hidden"
                  checked={preferences.highContrast}
                  onChange={(e) => handleChange('highContrast', e.target.checked)}
                />
                <label 
                  htmlFor="high-contrast"
                  className="block absolute cursor-pointer inset-0 rounded-full transition-colors duration-200"
                  style={{ 
                    backgroundColor: preferences.highContrast ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                  }}
                >
                  <span 
                    className={`block rounded-full w-5 h-5 ml-0.5 mt-0.5 transition-transform duration-200 ${preferences.highContrast ? 'translate-x-6' : ''}`}
                    style={{ backgroundColor: 'white' }}
                  ></span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="large-targets" className="block">Large Click Targets</label>
                <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                  Increase size of buttons and interactive elements
                </p>
              </div>
              <div className="relative inline-block w-12 h-6">
                <input 
                  type="checkbox" 
                  id="large-targets" 
                  className="visually-hidden"
                  checked={preferences.largeTargets}
                  onChange={(e) => handleChange('largeTargets', e.target.checked)}
                />
                <label 
                  htmlFor="large-targets"
                  className="block absolute cursor-pointer inset-0 rounded-full transition-colors duration-200"
                  style={{ 
                    backgroundColor: preferences.largeTargets ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                  }}
                >
                  <span 
                    className={`block rounded-full w-5 h-5 ml-0.5 mt-0.5 transition-transform duration-200 ${preferences.largeTargets ? 'translate-x-6' : ''}`}
                    style={{ backgroundColor: 'white' }}
                  ></span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <button 
              className="btn btn-secondary w-full"
              onClick={() => savePreferences(defaultPreferences)}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettings; 