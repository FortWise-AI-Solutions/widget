import { SessionData } from '@/types';

const SESSION_KEY = 'chat-widget-session';
const VISITOR_ID_KEY = 'chat-visitor-id';
const SENTRY_SESSION_KEY = 'sentryReplaySession';
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes - used for auto-closing widget
// const DEFAULT_SESSION_TIMEOUT = 15 * 1000; // 15 seconds - used for testing


export class SessionStorageManager {
  private static instance: SessionStorageManager;
  private sessionData: SessionData | null = null;
  private customTimeout?: number;

  private constructor() {
    this.initializeSession();
  }

  public static getInstance(): SessionStorageManager {
    if (!SessionStorageManager.instance) {
      SessionStorageManager.instance = new SessionStorageManager();
    }
    return SessionStorageManager.instance;
  }

  // Core session management
  private initializeSession(): void {
    const existingSession = this.loadSession();
    
    if (existingSession && this.isSessionValid(existingSession)) {
      this.sessionData = existingSession;
      this.syncVisitorIdToLocalStorage();
      this.updateLastActivity();
    } else {
      this.createNewSession();
    }
  }

  private createNewSession(): void {
    const visitorId = this.getOrCreateVisitorId();
    const sentrySession = this.generateSentrySession();
    
    this.sessionData = {
      visitorId,
      sentryReplaySession: sentrySession,
      messages: [],
      sessionStartTime: Date.now(),
      lastActivity: Date.now(),
      sessionId: '' as string
    } as SessionData;

    this.saveSession();
    this.saveSentrySession(sentrySession);
  }

  private getOrCreateVisitorId(): string {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    
    if (!visitorId) {
      visitorId = this.generateVisitorId();
      this.setVisitorId(visitorId);
    }
    
    return visitorId;
  }

  private syncVisitorIdToLocalStorage(): void {
    if (this.sessionData?.visitorId) {
      this.setVisitorId(this.sessionData.visitorId);
    }
  }

  private setVisitorId(visitorId: string): void {
    try {
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    } catch (error) {
      console.error('Error setting visitor ID:', error);
    }
  }

  // ID generators
  private generateVisitorId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateSentrySession(): SessionData['sentryReplaySession'] {
    return {
      id: this.generateId(),
      started: Date.now(),
      lastActivity: Date.now(),
      segmentId: 0,
      sampled: 'buffer'
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Storage operations
  private loadSession(): SessionData | null {
    try {
      const sessionStr = sessionStorage.getItem(SESSION_KEY);
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  private saveSession(): void {
    if (!this.sessionData) return;
    
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.sessionData));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  private saveSentrySession(sentrySession: SessionData['sentryReplaySession']): void {
    try {
      sessionStorage.setItem(SENTRY_SESSION_KEY, JSON.stringify(sentrySession));
    } catch (error) {
      console.error('Error saving Sentry session:', error);
    }
  }

  // Validation and activity
  private isSessionValid(session: SessionData): boolean {
    const timeout = this.customTimeout || DEFAULT_SESSION_TIMEOUT;
    return (Date.now() - session.lastActivity) < timeout;
  }

  private updateLastActivity(): void {
    if (!this.sessionData) return;
    
    const now = Date.now();
    this.sessionData.lastActivity = now;
    this.sessionData.sentryReplaySession.lastActivity = now;
    
    this.saveSession();
    this.saveSentrySession(this.sessionData.sentryReplaySession);
  }

  // Public API - Core methods
  public getVisitorId(): string {
    const localVisitorId = localStorage.getItem(VISITOR_ID_KEY);
    
    if (localVisitorId) {
      // Sync session data if needed
      if (this.sessionData && this.sessionData.visitorId !== localVisitorId) {
        this.sessionData.visitorId = localVisitorId;
        this.saveSession();
      }
      return localVisitorId;
    }
    
    const sessionVisitorId = this.sessionData?.visitorId || '';
    if (sessionVisitorId) {
      this.setVisitorId(sessionVisitorId);
    }
    
    return sessionVisitorId;
  }

  public setSessionId(sessionId: string): void {
    if (this.sessionData) {
      this.sessionData.sessionId = sessionId || '';
      this.saveSession();
    }
  }

  public getSentrySession(): SessionData['sentryReplaySession'] | null {
    return this.sessionData?.sentryReplaySession || null;
  }

  public getMessages(): SessionData['messages'] {
    return this.sessionData?.messages || [];
  }

  public addMessage(message: {
    id: string;
    content: string;
    type: 'user' | 'bot' | 'operator' | 'error';
    human_required: boolean;
    timestamp: Date;
    isHTML?: boolean;
  }): void {
    if (!this.sessionData) return;
    
    this.sessionData.messages.push({
      ...message,
      timestamp: message.timestamp.toISOString()
    });
    
    this.updateLastActivity();
  }

  public updateMessageTimestamp(id: string, isoTimestamp: string): void {
    if (!this.sessionData) return;
    
    const message = this.sessionData.messages.find(m => m.id === id);
    if (message) {
      message.timestamp = isoTimestamp;
      this.updateLastActivity();
    }
  }

  public refreshActivity(): void {
    this.updateLastActivity();
  }

  // Public API - Session control
  public resetSession(options: {
    keepVisitorId?: boolean;
    keepMessages?: boolean;
    keepSentrySession?: boolean;
  } = {}): void {
    const {
      keepVisitorId = true,
      keepMessages = false,
      keepSentrySession = false
    } = options;

    // Preserve data if requested
    const preservedData = {
      visitorId: keepVisitorId ? this.getVisitorId() : null,
      messages: keepMessages ? this.getMessages() : [],
      sentrySession: keepSentrySession ? this.getSentrySession() : null
    };

    // Clear current session
    this.clearAllData(false);

    // Restore visitor ID
    if (preservedData.visitorId) {
      this.setVisitorId(preservedData.visitorId);
    }

    // Initialize new session
    this.initializeSession();

    // Restore messages
    if (keepMessages && preservedData.messages.length > 0) {
      preservedData.messages.forEach(msg => {
        this.addMessage({
          ...msg,
          timestamp: new Date(msg.timestamp)
        });
      });
    }

    // Restore Sentry session
    if (keepSentrySession && preservedData.sentrySession && this.sessionData) {
      this.sessionData.sentryReplaySession = preservedData.sentrySession;
      this.saveSession();
      this.saveSentrySession(preservedData.sentrySession);
    }

    console.log('Session reset with options:', options);
  }

  public clearMessages(): void {
    if (this.sessionData) {
      this.sessionData.messages = [];
      this.updateLastActivity();
    }
  }

  public clearSession(): void {
    this.clearStorageItems([SESSION_KEY, SENTRY_SESSION_KEY]);
    this.sessionData = null;
    this.initializeSession();
  }

  public clearAllData(reinitialize: boolean = true): void {
    this.clearStorageItems([SESSION_KEY, SENTRY_SESSION_KEY], [VISITOR_ID_KEY]);
    this.sessionData = null;
    
    if (reinitialize) {
      this.initializeSession();
    }
  }

  private clearStorageItems(sessionItems: string[], localItems: string[] = []): void {
    try {
      sessionItems.forEach(key => sessionStorage.removeItem(key));
      localItems.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Public API - Session info and utilities
  public isCurrentSessionExpired(customTimeoutMs?: number): boolean {
    if (!this.sessionData) return true;
    
    const timeout = customTimeoutMs || this.customTimeout || DEFAULT_SESSION_TIMEOUT;
    return (Date.now() - this.sessionData.lastActivity) >= timeout;
  }

  public getSessionAge(): number {
    return this.sessionData ? Date.now() - this.sessionData.sessionStartTime : 0;
  }

  public getTimeSinceLastActivity(): number {
    return this.sessionData ? Date.now() - this.sessionData.lastActivity : 0;
  }

  public getSessionInfo() {
    if (!this.sessionData) return null;
    
    return {
      visitorId: this.getVisitorId(),
      sessionStartTime: this.sessionData.sessionStartTime,
      lastActivity: this.sessionData.lastActivity,
      messageCount: this.sessionData.messages.length,
      sessionAge: this.getSessionAge(),
      timeSinceLastActivity: this.getTimeSinceLastActivity(),
      isExpired: this.isCurrentSessionExpired()
    };
  }

  public setSessionTimeout(timeoutMs: number): void {
    this.customTimeout = timeoutMs;
  }

  // Public API - Advanced features
  public forceNewSession(keepVisitorId: boolean = true): void {
    const currentVisitorId = keepVisitorId ? this.getVisitorId() : null;
    
    this.clearStorageItems([SESSION_KEY, SENTRY_SESSION_KEY]);
    
    if (!keepVisitorId) {
      this.clearStorageItems([], [VISITOR_ID_KEY]);
    }

    this.sessionData = null;
    
    if (currentVisitorId && keepVisitorId) {
      this.setVisitorId(currentVisitorId);
    }
    
    this.createNewSession();
    console.log(`New session created. Visitor ID ${keepVisitorId ? 'preserved' : 'regenerated'}.`);
  }

  public generateNewVisitor(): string {
    this.forceNewSession(false);
    return this.getVisitorId();
  }

  public exportSessionData(): SessionData | null {
    return this.sessionData ? JSON.parse(JSON.stringify(this.sessionData)) : null;
  }

  public importSessionData(sessionData: SessionData): boolean {
    try {
      this.sessionData = sessionData;
      this.saveSession();
      
      if (sessionData.visitorId) {
        this.setVisitorId(sessionData.visitorId);
      }
      
      this.saveSentrySession(sessionData.sentryReplaySession);
      
      console.log('Session data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing session data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sessionManager = SessionStorageManager.getInstance();