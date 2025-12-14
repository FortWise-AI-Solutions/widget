import React, { useEffect, useRef, useState } from 'react';
import { ChatWidgetConfig } from '@/types';
import { useChat } from '@/hooks/useChat';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getThemeColors } from '@/utils/themes';
import { sessionManager } from '@/utils/sessionStorage';
import { ChatButton } from './ChatButton';
import { ChatHeader } from './ChatHeader';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';

interface ChatWidgetProps {
  config: ChatWidgetConfig;
}

// Animation timing constants
const ANIMATION_TIMING = {
  BUTTON_HIDE_DELAY: 150,
  CONTAINER_SHOW_DELAY: 200,
  CLOSE_ANIMATION_DURATION: 300,
  DEVICE_TRANSITION_DELAY: 300,
  NOTIFICATION_DURATION: 5000,
  AUTO_OPEN_DELAY: 1000,
  SCROLL_DELAY: 100
} as const;

export const ChatWidget: React.FC<ChatWidgetProps> = ({ config }) => {
  // State
  const [hasNotification, setHasNotification] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isDeviceChanging, setIsDeviceChanging] = useState(false);
  
  // Hooks
  const isMobile = useIsMobile();
  const chat = useChat(config);
  
  // Refs
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const prevIsMobileRef = useRef(isMobile);

  // Theme
  const theme = config.style?.theme || 'light';
  const colors = getThemeColors(theme);

  // Chat controls (defined before useEffects that need them)
  const openChat = React.useCallback(async () => {
    if (chat.isOpen || chat.isAnimating) return;

    chat.updateUserActivity();

    setIsHiding(true);
    chat.setAnimating(true);
    
    setTimeout(() => {
      chat.setOpen(true);
      
      setTimeout(() => {
        const container = document.querySelector('.chat-container');
        if (container) {
          container.classList.add('open');
        }
        chat.setAnimating(false);
      }, ANIMATION_TIMING.CONTAINER_SHOW_DELAY);
    }, ANIMATION_TIMING.BUTTON_HIDE_DELAY);
  }, [chat]);

  const closeChat = React.useCallback(async () => {
    if (!chat.isOpen || chat.isAnimating) return;

    chat.setAnimating(true);
    
    const container = document.querySelector('.chat-container');
    if (container) {
      container.classList.remove('open');
      container.classList.add('closing');
    }

    const elements = container?.querySelectorAll('.chat-header, .chat-body, .chat-footer');
    elements?.forEach(el => el.classList.add('closing'));

    setTimeout(() => {
      chat.setOpen(false);
      setIsHiding(false);
      chat.setAnimating(false);
      
      if (container) {
        container.classList.remove('closing');
        elements?.forEach(el => el.classList.remove('closing'));
      }
    }, ANIMATION_TIMING.CLOSE_ANIMATION_DURATION);
  }, [chat]);

  const showNotification = () => {
    if (!config.features?.enableNotifications) return;
    
    setHasNotification(true);
    setTimeout(() => setHasNotification(false), ANIMATION_TIMING.NOTIFICATION_DURATION);
  };

  const handleBackdropClick = () => {
    if (isMobile) {
      closeChat();
    }
  };

  // Smooth device transitions
  useEffect(() => {
    if (prevIsMobileRef.current !== isMobile && chat.isOpen) {
      setIsDeviceChanging(true);
      
      const timer = setTimeout(() => {
        setIsDeviceChanging(false);
      }, ANIMATION_TIMING.DEVICE_TRANSITION_DELAY);
      
      return () => clearTimeout(timer);
    }
    
    prevIsMobileRef.current = isMobile;
  }, [isMobile, chat.isOpen]);

  // Prevent host page scroll when chat is open (desktop + mobile)
  useEffect(() => {
    if (!chat.isOpen) return;

    // Store original styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalTop = document.body.style.top;

    // Add class and disable scrolling
    document.body.classList.add('alara-chat-open');
    document.body.style.overflow = 'hidden';
    if (isMobile) {
      // On mobile, use fixed positioning to avoid bounce/backdrop scroll
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    }

    return () => {
      // Restore original styles and remove class
      document.body.classList.remove('alara-chat-open');
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.top = originalTop;
    };
  }, [isMobile, chat.isOpen]);
  
  

  // Auto-scroll to bottom
  useEffect(() => {
    if (!chatBodyRef.current || !chat.isOpen || isDeviceChanging) return;

    const scrollToBottom = () => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
    };
    
    scrollToBottom();
    setTimeout(scrollToBottom, ANIMATION_TIMING.SCROLL_DELAY);
  }, [chat.messages, chat.isTyping, chat.isOpen, isDeviceChanging]);

  // Auto-open feature
  useEffect(() => {
    if (config.features?.autoOpen) {
      const timer = setTimeout(openChat, ANIMATION_TIMING.AUTO_OPEN_DELAY);
      return () => clearTimeout(timer);
    }
  }, [config.features?.autoOpen]);

  // User activity tracking
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      chat.updateUserActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [chat.updateUserActivity]);

  // Session expiry handler
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('Session expired event received - closing chat widget');
      closeChat();
    };

    window.addEventListener('chatWidget:sessionExpired', handleSessionExpired);

    return () => {
      window.removeEventListener('chatWidget:sessionExpired', handleSessionExpired);
    };
  }, [closeChat]);

  // Session management helpers
  const formatTimeDuration = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getSessionInfo = () => {
    const sessionInfo = sessionManager.getSessionInfo();
    const isExpired = sessionManager.isCurrentSessionExpired();
    const timeSinceActivity = sessionInfo?.timeSinceLastActivity || 0;
    
    return {
      ...sessionInfo,
      isExpired,
      timeSinceActivityFormatted: formatTimeDuration(timeSinceActivity),
      sessionAgeFormatted: formatTimeDuration(sessionInfo?.sessionAge || 0)
    };
  };

  // Container styles
  const getContainerStyles = () => {
    const position = config.style?.position === 'left' ? 'left' : 'right';
    
    const baseStyles = {
      backgroundColor: colors.background,
      transition: 'all 0.3s ease-in-out',
    };

    if (isMobile) {
      return {
        ...baseStyles,
        left: 0, 
        right: 0, 
        top: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        maxWidth: 'none',
        maxHeight: 'none'
      };
    }

    return {
      ...baseStyles,
      ...(position === 'left' ? { left: '50px' } : { right: '50px' })
    };
  };

  // Enhanced API exposure
  useEffect(() => {
    const chatWidgetAPI = {
      // Basic controls
      show: openChat,
      hide: closeChat,
      sendMessage: (message: string) => {
        chat.updateUserActivity();
        chat.sendMessage(message);
      },
      showNotification,
      
      // Session management
      session: {
        refresh: chat.refreshChatSession,
        clear: chat.startNewConversation,
        reset: chat.resetChatCompletely,
        refreshOnly: chat.refreshSessionOnly,
        getInfo: getSessionInfo,
        
        // Timer management
        setAutoRefresh: chat.setAutoRefreshInterval,
        stopAutoRefresh: chat.stopChatRefreshTimer,
        startAutoRefresh: chat.startChatRefreshTimer,
        
        // Advanced session management
        forceNewSession: (keepVisitorId: boolean = true) => {
          sessionManager.forceNewSession(keepVisitorId);
          chat.refreshSessionOnly();
        },
        
        generateNewVisitor: () => {
          const newVisitorId = sessionManager.generateNewVisitor();
          chat.refreshSessionOnly();
          return newVisitorId;
        },
        
        export: () => sessionManager.exportSessionData(),
        import: (sessionData: any) => {
          const success = sessionManager.importSessionData(sessionData);
          if (success) {
            chat.refreshSessionOnly();
          }
          return success;
        }
      },
      
      // DOM Capture API
      dom: {
        /**
         * Capture the entire DOM and send it in chunks to the server
         * @param options - Configuration options for DOM capture
         * @returns Promise with capture results
         */
        captureAndSend: (options?: {
          url?: string;
          excludeSelectors?: string[];
          includeHidden?: boolean;
          maxDepth?: number;
          chunkSize?: number;
          metadata?: Record<string, any>;
          onProgress?: (current: number, total: number) => void;
          onChunkReady?: (chunk: string, index: number, total: number) => void;
        }) => chat.captureDOMAndSend(options?.url, options),
        
        /**
         * Get statistics about the current DOM capture
         * @param options - Configuration options for DOM capture
         * @returns Object with totalElements, totalSize, and estimatedChunks
         */
        getStats: (options?: {
          excludeSelectors?: string[];
          includeHidden?: boolean;
          maxDepth?: number;
          chunkSize?: number;
        }) => chat.getDOMCaptureStats(options),
        
        /**
         * Capture DOM and return as string chunks (without sending)
         * @param options - Configuration options for DOM capture
         * @returns Array of HTML string chunks
         */
        getChunks: (options?: {
          excludeSelectors?: string[];
          includeHidden?: boolean;
          maxDepth?: number;
          chunkSize?: number;
        }) => chat.captureDOMChunks(options),
      },
      
      // State getters
      getState: () => ({
        isOpen: chat.isOpen,
        isTyping: chat.isTyping,
        humanRequired: chat.humanRequired,
        messageCount: chat.messages.length,
        isMobile,
        theme,
        sessionInfo: getSessionInfo()
      }),
      
      // Configuration
      config: {
        get: () => config,
        updateAutoRefresh: (enabled: boolean, intervalMs?: number) => {
          if (enabled) {
            chat.setAutoRefreshInterval(intervalMs || 30 * 60 * 1000);
          } else {
            chat.stopChatRefreshTimer();
          }
        }
      }
    };

    (window as any).ChatWidget = chatWidgetAPI;
    
    // Development helper
    if (process.env.NODE_ENV === 'development') {
      console.log('ChatWidget API available at window.ChatWidget:', {
        methods: [
          'show()', 'hide()', 'sendMessage(text)', 'showNotification()',
          'session.refresh(options)', 'session.clear()', 'session.reset()',
          'session.getInfo()', 'session.setAutoRefresh(ms)', 
          'session.forceNewSession(keepVisitorId)', 'getState()',
          'dom.captureAndSend(options)', 'dom.getStats(options)', 'dom.getChunks(options)'
        ]
      });
    }
  }, [
    chat.sendMessage, chat.updateUserActivity, chat.refreshChatSession, 
    chat.resetChatCompletely, chat.startNewConversation, chat.refreshSessionOnly,
    chat.setAutoRefreshInterval, chat.stopChatRefreshTimer, chat.startChatRefreshTimer,
    chat.captureDOMAndSend, chat.getDOMCaptureStats, chat.captureDOMChunks,
    chat.isOpen, chat.isTyping, chat.humanRequired, chat.messages.length, 
    isMobile, theme, config, openChat, closeChat, showNotification, getSessionInfo
  ]);

  return (
    <>
      {/* Mobile backdrop */}
      {chat.isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-[9999] transition-opacity duration-300"
          onClick={handleBackdropClick}
        />
      )}

      {/* Chat button */}
      {!chat.isOpen && (
        <ChatButton
          config={config}
          onClick={openChat}
          hasNotification={hasNotification}
          isHiding={isHiding}
          colors={colors}
        />
      )}

      {/* Chat container */}
      {chat.isOpen && (
        <div
          className={`
            chat-container fixed bottom-12 shadow-2xl
            flex flex-col z-[10000] overflow-hidden font-sans
            transition-all duration-300 ease-in-out
            ${isMobile ? 'w-screen h-screen bottom-0 top-0 rounded-none ios-safe-all' : 'rounded-xl'}
            ${isDeviceChanging ? 'transition-all duration-300 ease-in-out' : ''}
          `}
          style={{
            ...getContainerStyles(),
            ...(isMobile ? {} : { 
              height: `min(${config.style?.height || '600px'}, 85vh)`,
              width: `min(${config.style?.width || '384px'}, 90vw)`
            })
          }}
          role="dialog"
          aria-label="Chat widget"
        >
          {/* Header */}
          <div className={`chat-header transition-all duration-300 delay-200 ${isMobile ? 'ios-safe-top' : ''} ${chat.isOpen && !isDeviceChanging ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
            <ChatHeader 
              config={config} 
              onClose={closeChat} 
              colors={colors}
            />
          </div>

          {/* Body */}
          <div 
            ref={chatBodyRef}
            className={`chat-body flex-1 p-4 overflow-y-auto transition-all duration-300 delay-150 scrollbar-hide ${isMobile ? 'ios-safe-left ios-safe-right' : ''} ${chat.isOpen && !isDeviceChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            style={{ backgroundColor: colors.background }}
            role="log"
            aria-live="polite"
          >
            {chat.messages.map((message) => (
              <Message key={message.id} message={message} config={config} colors={colors} />
            ))}
            {chat.isTyping && (
              <TypingIndicator config={config} colors={colors} />
            )}
          </div>

          {/* Footer */}
          <div className={`chat-footer transition-all duration-300 delay-100 ${isMobile ? 'ios-safe-bottom ios-safe-left ios-safe-right' : ''} ${chat.isOpen && !isDeviceChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <ChatInput
              config={config}
              onSend={chat.sendMessage}
              disabled={chat.isTyping}
              colors={colors}
            />
          </div>
        </div>
      )}

      {/* Global styles with iOS safe area support */}
      <style>{`
        .chat-container.open > div {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        
        .chat-container.closing .chat-header {
          opacity: 0 !important;
          transform: translateY(-10px) !important;
          transition-delay: 0ms !important;
        }
        
        .chat-container.closing .chat-body {
          opacity: 0 !important;
          transform: translateY(-5px) !important;
          transition-delay: 50ms !important;
        }
        
        .chat-container.closing .chat-footer {
          opacity: 0 !important;
          transform: translateY(-10px) !important;
          transition-delay: 100ms !important;
        }
        
        .chat-container.closing {
          transform: scale(0.95) !important;
          opacity: 0.8 !important;
        }
        
        /* Force iOS safe area support */
        @supports (padding: env(safe-area-inset-top)) {
          @media (max-width: 768px) {
            .chat-container {
              padding-top: env(safe-area-inset-top) !important;
              padding-bottom: env(safe-area-inset-bottom) !important;
              padding-left: env(safe-area-inset-left) !important;
              padding-right: env(safe-area-inset-right) !important;
              height: 100vh !important;
              height: 100dvh !important;
            }
          }
        }
        
        /* Fallback for browsers without env() support */
        @supports not (padding: env(safe-area-inset-top)) {
          @media (max-width: 768px) {
            .chat-container {
              padding-top: 44px !important; /* iOS status bar */
              padding-bottom: 34px !important; /* iOS home indicator */
            }
          }
        }
        
        /* Additional mobile-specific overrides */
        @media (max-width: 768px) {
          .chat-container {
            box-sizing: border-box !important;
            border-radius: 0 !important;
          }
          
          /* Prevent body scroll when chat is open */
          body.alara-chat-open { overflow: hidden !important; }
          @media (max-width: 768px) {
            body.alara-chat-open {
              position: fixed !important;
              width: 100% !important;
              top: 0 !important;
            }
          }
          
          .chat-header {
            flex-shrink: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          
          .chat-body {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          
          .chat-footer {
            flex-shrink: 0 !important;
          }
        }
        
        @keyframes messageSlide {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes typing {
          0%, 80%, 100% { 
            transform: scale(0.8); 
            opacity: 0.5; 
          }
          40% { 
            transform: scale(1.2); 
            opacity: 1; 
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Prevent input zoom on mobile devices */
        @media (max-width: 768px) {
          input[type="text"], input[type="email"], input[type="tel"], textarea {
            font-size: 16px !important;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
          }
          
          /* Additional zoom prevention for iOS Safari */
          input:focus, textarea:focus {
            -webkit-user-select: text;
            user-select: text;
          }
        }
      `}</style>
    </>
  );
};