/**
 * Storage Maintenance and Migration Service
 * Provides data cleanup routines and migration strategies for extension updates
 */

import {
    DEFAULT_STORAGE,
    STORAGE_KEYS
} from './models';
import { quizRepository } from './repository';
import { sessionManager } from './session';
import { storage } from './storage';

/**
 * Storage maintenance service
 */
export class MaintenanceService {
  /**
   * Current storage schema version
   */
  private currentVersion = '1.0.0';
  
  /**
   * Check if storage needs migration
   */
  async checkMigrationNeeded(): Promise<boolean> {
    try {
      const metaResult = await storage.get(STORAGE_KEYS.META);
      const meta = metaResult[STORAGE_KEYS.META];
      
      // If no meta or version is different, migration is needed
      if (!meta || meta.version !== this.currentVersion) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return true; // Assume migration needed on error
    }
  }
  
  /**
   * Perform storage migration
   */
  async performMigration(): Promise<boolean> {
    try {
      const metaResult = await storage.get(STORAGE_KEYS.META);
      const meta = metaResult[STORAGE_KEYS.META];
      
      // If no meta, initialize with defaults
      if (!meta) {
        console.log('Initializing storage with default structure');
        await storage.set(DEFAULT_STORAGE);
        return true;
      }
      
      // Perform version-specific migrations
      const currentVersion = meta.version || '0.0.0';
      
      // Version migrations (add more as needed)
      if (this.compareVersions(currentVersion, '1.0.0') < 0) {
        await this.migrateToV1();
      }
      
      // Update version after successful migration
      await storage.set({
        [STORAGE_KEYS.META]: {
          ...meta,
          version: this.currentVersion,
          lastMigration: new Date().toISOString()
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error performing migration:', error);
      return false;
    }
  }
  
  /**
   * Migrate to version 1.0.0
   */
  private async migrateToV1(): Promise<void> {
    console.log('Migrating to v1.0.0');
    
    // Get all data from storage
    const allData = await storage.get(null);
    
    // Create the new structure
    const newStructure: any = {
      ...DEFAULT_STORAGE
    };
    
    // Migrate article data
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('articleData.') && value) {
        // Preserve article data
        newStructure[key] = value;
      }
      
      if (key.startsWith('articleContent.') && value) {
        // Preserve article content
        newStructure[key] = value;
      }
    }
    
    // Migrate quizzes
    const quizzes = allData[STORAGE_KEYS.QUIZZES] || [];
    if (Array.isArray(quizzes)) {
      newStructure[STORAGE_KEYS.QUIZZES] = quizzes;
    }
    
    // Migrate settings
    const settings = allData['settings'] || DEFAULT_STORAGE.settings;
    newStructure[STORAGE_KEYS.SETTINGS] = settings;
    
    // Set the updated structure
    await storage.clear();
    await storage.set(newStructure);
  }
  
  /**
   * Run maintenance tasks
   */
  async performMaintenance(): Promise<{ 
    quizzesPruned: number; 
    sessionsPruned: number;
    bytesUsed: number;
    percentUsed: number;
  }> {
    try {
      // Prune old quizzes (keep most recent 50)
      const quizzesPruned = await quizRepository.prune(50);
      
      // Prune old sessions (older than 7 days)
      const sessionsPruned = await sessionManager.pruneOldSessions(7);
      
      // Check storage quota
      const { bytesUsed, percentUsed } = await storage.checkStorageQuota();
      
      // Update storage usage metadata
      await storage.updateStorageUsageMeta();
      
      return { 
        quizzesPruned, 
        sessionsPruned,
        bytesUsed,
        percentUsed
      };
    } catch (error) {
      console.error('Error performing maintenance:', error);
      throw error;
    }
  }
  
  /**
   * Create a backup of storage data
   */
  async createBackup(): Promise<string> {
    try {
      const allData = await storage.get(null);
      const backup = JSON.stringify(allData);
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      
      // Save backup to browser download
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `quizzer_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      return timestamp;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }
  
  /**
   * Restore from backup data
   */
  async restoreFromBackup(backupData: string): Promise<boolean> {
    try {
      const data = JSON.parse(backupData);
      
      // Validate backup data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup data format');
      }
      
      // Clear storage
      await storage.clear();
      
      // Restore data
      await storage.set(data);
      
      // Ensure metadata is updated
      const metaResult = await storage.get(STORAGE_KEYS.META);
      const meta = metaResult[STORAGE_KEYS.META] || {};
      
      await storage.set({
        [STORAGE_KEYS.META]: {
          ...meta,
          version: this.currentVersion,
          lastMigration: new Date().toISOString(),
          restoredFrom: meta.version
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }
  
  /**
   * Erase all stored data (factory reset)
   */
  async factoryReset(): Promise<boolean> {
    try {
      await storage.clear();
      await storage.set(DEFAULT_STORAGE);
      return true;
    } catch (error) {
      console.error('Error performing factory reset:', error);
      return false;
    }
  }
  
  /**
   * Utility function to compare version strings
   * Returns: -1 if v1 < v2, 0 if v1 = v2, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    
    return 0;
  }
}

// Export the maintenance service instance
export const maintenance = new MaintenanceService(); 