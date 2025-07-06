import { TFile, Vault } from 'obsidian';

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  details?: any;
  stack?: string;
}

export class FileLogger {
  private static instance: FileLogger;
  private logFile: string = 'session-log.json';
  private vault: Vault | null = null;
  private logEntries: LogEntry[] = [];
  private isSaving = false;
  private saveQueue: (() => Promise<void>)[] = [];

  private constructor() {}

  static getInstance(): FileLogger {
    if (!FileLogger.instance) {
      FileLogger.instance = new FileLogger();
    }
    return FileLogger.instance;
  }

  public initialize(vault: Vault): void {
    console.log('Initializing logger with vault:', vault);
    console.log('Log file will be created at:', this.logFile);
    
    this.vault = vault;
    
    // Load existing logs if any
    this.loadLogs().catch(error => {
      console.error('Failed to load logs:', error);
    });
    
    // Log a test message to trigger file creation
    this.info('Logger initialized', { timestamp: new Date().toISOString() });
  }

  private async loadLogs(): Promise<void> {
    if (!this.vault) return;

    try {
      const file = this.vault.getAbstractFileByPath(this.logFile);
      if (file instanceof TFile) {
        const content = await this.vault.read(file);
        this.logEntries = JSON.parse(content);
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start with empty logs
      this.logEntries = [];
    }
  }

  private async saveLogs(): Promise<void> {
    if (!this.vault) {
      console.error('Vault is not initialized');
      return;
    }
    
    if (this.isSaving) {
      console.log('Already saving, queuing save operation');
      this.saveQueue.push(() => this.saveLogs());
      return;
    }

    this.isSaving = true;
    console.log('Starting save operation for log file:', this.logFile);
    
    try {
      const content = JSON.stringify(this.logEntries, null, 2);
      console.log('Looking for file at path:', this.logFile);
      
      const file = this.vault.getAbstractFileByPath(this.logFile);
      
      if (file) {
        console.log('File exists, checking if it\'s a TFile');
        if (file instanceof TFile) {
          console.log('Modifying existing file');
          await this.vault.modify(file, content);
          console.log('Successfully modified file');
        } else {
          console.warn('Path exists but is not a file:', file);
        }
      } else {
        console.log('File does not exist, creating it');
        // Ensure the directory exists
        const dir = this.logFile.split('/').slice(0, -1).join('/');
        console.log('Checking directory:', dir);
        
        if (dir) {
          const dirExists = this.vault.getAbstractFileByPath(dir) !== null;
          console.log('Directory exists:', dirExists);
          
          if (!dirExists) {
            console.log('Creating directory:', dir);
            try {
              await this.vault.createFolder(dir);
              console.log('Successfully created directory');
            } catch (dirError) {
              console.error('Failed to create directory:', dirError);
              throw dirError;
            }
          }
        }
        
        console.log('Creating log file:', this.logFile);
        try {
          await this.vault.create(this.logFile, content);
          console.log('Successfully created log file');
        } catch (createError) {
          console.error('Failed to create file:', createError);
          throw createError;
        }
      }
    } catch (error) {
      // Log to console if available
      if (typeof console !== 'undefined') {
        console.error('Failed to save logs:', error);
      }
      
      // If we're here, the vault operations failed - try direct file system access as last resort
      try {
        await this.vault.adapter.write(this.logFile, JSON.stringify(this.logEntries, null, 2));
      } catch (e) {
        console.error('Failed to save logs (fallback):', e);
      }
    } finally {
      this.isSaving = false;
      
      // Process any queued saves
      const nextSave = this.saveQueue.shift();
      if (nextSave) {
        await nextSave();
      }
    }
  }

  private addEntry(level: LogEntry['level'], message: string, details?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details: details instanceof Error ? {
        message: details.message,
        name: details.name,
        stack: details.stack
      } : details
    };

    this.logEntries.push(entry);
    
    // Keep only the last 1000 entries
    if (this.logEntries.length > 1000) {
      this.logEntries = this.logEntries.slice(-1000);
    }

    this.saveLogs().catch(error => {
      console.error('Failed to save log entry:', error);
    });

    // Also log to console
    const logMethod = console[level] || console.log;
    logMethod(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, details || '');
  }

  error(message: string, details?: any): void {
    this.addEntry('error', message, details);
  }

  warn(message: string, details?: any): void {
    this.addEntry('warn', message, details);
  }

  info(message: string, details?: any): void {
    this.addEntry('info', message, details);
  }

  debug(message: string, details?: any): void {
    this.addEntry('debug', message, details);
  }

  getLogs(limit: number = 100): LogEntry[] {
    return [...this.logEntries].reverse().slice(0, limit);
  }

  async clearLogs(): Promise<void> {
    this.logEntries = [];
    await this.saveLogs();
  }
}

// Export a singleton instance
export const logger = FileLogger.getInstance();
