/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly MODE: string;
    readonly VITE_ANTHROPIC_API_KEY?: string;
    readonly VITE_CLAUDE_MODEL?: string;
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_MAX_TOKENS?: string;
    // Add other environment variables as needed
    [key: string]: string | undefined;
  };
} 