/**
 * Storage Service
 * Provides a unified interface to Chrome's Storage API with error handling and logging
 */

import { DEFAULT_STORAGE, STORAGE_KEYS } from './models';

/**
 * StorageItem type represents a key-value pair for storage operations
 */
type StorageItem = { [key: string]: any };

/**
 * Chrome storage area representation
 */
interface StorageArea {
  get(keys?: string | string[] | null): Promise<StorageItem>;
  set(items: StorageItem): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
  getBytesInUse?(keys?: string | string[] | null): Promise<number>;
}

/**
 * Storage options for the service
 */
interface StorageOptions {
  area?: 'local' | 'sync' | 'managed' | 'session';
  logLevel?: 'debug' | 'info' | 'error' | 'none';
}

/**
 * Storage service class for interacting with Chrome's Storage API
 */
export class StorageService {
  private storage: StorageArea;
  private logLevel: 'debug' | 'info' | 'error' | 'none';

  /**
   * Creates a new StorageService instance
   */
  constructor(options: StorageOptions = {}) {
    // Default to local storage
    const area = options.area || 'local';
    this.logLevel = options.logLevel || 'error';

    // Get the appropriate storage area
    if (chrome.storage && chrome.storage[area]) {
      this.storage = chrome.storage[area];
    } else {
      this.log('error', `Failed to initialize storage area: ${area}`);
      throw new Error(`Storage area ${area} not available`);
    }
  }

  /**
   * Initialize storage with default values if not already initialized
   */
  async initialize(): Promise<boolean> {
    try {
      const result = await this.get(STORAGE_KEYS.INITIALIZED);
      
      if (!result[STORAGE_KEYS.INITIALIZED]) {
        this.log('info', 'Initializing storage with default values');
        await this.set(DEFAULT_STORAGE);
        return true;
      }
      
      return false;
    } catch (error) {
      this.log('error', 'Failed to initialize storage', error);
      throw error;
    }
  }

  /**
   * Get items from storage
   */
  async get(keys?: string | string[] | null): Promise<StorageItem> {
    try {
      this.log('debug', `Getting storage items: ${keys ? JSON.stringify(keys) : 'all'}`);
      return await this.storage.get(keys);
    } catch (error) {
      this.log('error', `Failed to get storage items: ${keys ? JSON.stringify(keys) : 'all'}`, error);
      throw error;
    }
  }

  /**
   * Set items in storage
   */
  async set(items: StorageItem): Promise<void> {
    try {
      this.log('debug', `Setting storage items: ${Object.keys(items).join(', ')}`);
      await this.storage.set(items);
    } catch (error) {
      this.log('error', `Failed to set storage items: ${Object.keys(items).join(', ')}`, error);
      throw error;
    }
  }

  /**
   * Remove items from storage
   */
  async remove(keys: string | string[]): Promise<void> {
    try {
      this.log('debug', `Removing storage items: ${Array.isArray(keys) ? keys.join(', ') : keys}`);
      await this.storage.remove(keys);
    } catch (error) {
      this.log('error', `Failed to remove storage items: ${Array.isArray(keys) ? keys.join(', ') : keys}`, error);
      throw error;
    }
  }

  /**
   * Clear all items from storage
   */
  async clear(): Promise<void> {
    try {
      this.log('info', 'Clearing all storage items');
      await this.storage.clear();
    } catch (error) {
      this.log('error', 'Failed to clear storage', error);
      throw error;
    }
  }

  /**
   * Get storage usage in bytes (only available for local and sync storage)
   */
  async getBytesInUse(keys?: string | string[] | null): Promise<number> {
    if (this.storage.getBytesInUse) {
      try {
        return await this.storage.getBytesInUse(keys);
      } catch (error) {
        this.log('error', 'Failed to get storage usage', error);
        throw error;
      }
    } else {
      this.log('error', 'getBytesInUse not available for this storage area');
      throw new Error('getBytesInUse not available for this storage area');
    }
  }

  /**
   * Check if storage is approaching quota limits
   * Local storage quota is typically 5MB
   */
  async checkStorageQuota(): Promise<{
    bytesUsed: number;
    percentUsed: number;
    isApproachingLimit: boolean;
  }> {
    if (!this.storage.getBytesInUse) {
      throw new Error('Storage quota check not available for this storage area');
    }

    const bytesUsed = await this.storage.getBytesInUse(null);
    const storageQuota = 5 * 1024 * 1024; // 5MB default Chrome extension storage quota
    const percentUsed = (bytesUsed / storageQuota) * 100;
    const isApproachingLimit = percentUsed > 80; // Warning threshold at 80%

    if (isApproachingLimit) {
      this.log('info', `Storage usage approaching limit: ${percentUsed.toFixed(2)}% (${bytesUsed} bytes)`);
    }

    return {
      bytesUsed,
      percentUsed,
      isApproachingLimit
    };
  }

  /**
   * Update storage metadata with current usage information
   */
  async updateStorageUsageMeta(): Promise<void> {
    try {
      const { bytesUsed } = await this.checkStorageQuota();
      const meta = await this.get(STORAGE_KEYS.META);
      
      await this.set({
        [STORAGE_KEYS.META]: {
          ...meta[STORAGE_KEYS.META],
          storageUsage: {
            totalBytes: bytesUsed,
            lastChecked: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.log('error', 'Failed to update storage usage metadata', error);
      throw error;
    }
  }

  /**
   * Check if a key exists in storage
   */
  async has(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result[key] !== undefined;
  }

  /**
   * Helper for conditional logging based on logLevel
   */
  private log(level: 'debug' | 'info' | 'error', message: string, error?: unknown): void {
    const levels = {
      debug: 0,
      info: 1,
      error: 2,
      none: 3
    };

    if (levels[level] >= levels[this.logLevel]) {
      if (level === 'error') {
        console.error(`[Storage] ${message}`, error || '');
      } else if (level === 'info') {
        console.info(`[Storage] ${message}`);
      } else if (level === 'debug') {
        console.debug(`[Storage] ${message}`);
      }
    }
  }
}

// Export instance with default settings
export const storage = new StorageService({ area: 'local', logLevel: 'error' }); 