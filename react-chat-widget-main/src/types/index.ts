export type Theme = 'light' | 'dark';

export interface ChatWidgetConfig {
  key: string;
  botId: string;
  webhook?: {
    url?: string;
    route?: string;
  };
  style?: {
    theme?: Theme;
    position?: 'left' | 'right';
    /**
     * Preferred desktop height for the widget container.
     * Any valid CSS size (e.g., '560px', '70vh'). Ignored on mobile.
     */
    height?: string;
    /**
     * Preferred desktop width for the widget container.
     * Any valid CSS size (e.g., '384px', '25vw'). Ignored on mobile.
     */
    width?: string;
  };
  features?: {
    autoOpen?: boolean;
    showTypingIndicator?: boolean;
    enableNotifications?: boolean;
    lazyLoad?: boolean;
    lazyLoadDelay?: number;
    typingTimeout?: number; // Timeout in milliseconds for typing indicator (default: 10000)
    captureDOMOnMessage?: boolean; // Automatically capture full DOM on each message (default: true)
  };
  messages?: {
    greeting?: string;
    placeholder?: string;
    errorMessage?: string;
    typingText?: string;
    typingTimeoutMessage?: string;
  };
  socials?:{
    instagram?: string;
    facebook?: string;
    telegram?: string;
    whatsapp?: string;
  };
  user?:{
    name?: null;
    email?: null;
    metadata?: Record<string, any>;
  }
}

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot' | 'operator' | 'error';
  timestamp: Date;
  isHTML?: boolean;
  human_required: boolean;
}

export interface ChatState {
  isOpen: boolean;
  isAnimating: boolean;
  messages: Message[];
  isTyping: boolean;
  chatId: string | null;
  humanRequired: boolean;
}

export interface SessionData {
  visitorId: string;
  sentryReplaySession: {
    id: string;
    started: number;
    lastActivity: number;
    segmentId: number;
    sampled: string;
  };
  messages: Array<{
    id: string;
    content: string;
    type: 'user' | 'bot' | 'operator' | 'error';
    human_required: boolean;
    timestamp: string;
    isHTML?: boolean;
  }>;
  sessionStartTime: number;
  lastActivity: number;
  sessionId: string;
}
  
export interface ThemeColors {
  primary: string;
  primaryHover: string;
  iconBackground: string;
  secondary: string;
  background: string;
  text: string;
  textSecondary: string;
  userMessage: string;
  errorMessage: string;
  errorBackground: string;
}