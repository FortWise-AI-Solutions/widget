import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatState, Message, ChatWidgetConfig } from '@/types';
import { sessionManager } from '@/utils/sessionStorage';
import { errorTracker } from '@/utils/errorTracker';
import { domCapture, sendDOMToServer, getDOMStats, type DOMCaptureOptions } from '@/utils/domCapture';

// Constants
const POLLING_CONFIG = {
  ACTIVE_INTERVAL: 2000,
  PASSIVE_INTERVAL: 15000,
  ACTIVITY_TIMEOUT: 45000,
  AUTO_REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  TYPING_TIMEOUT: 200000, // 200 seconds (~3.3 minutes)
  ACTIVITY_CHECK_INTERVAL: 5000,
  SESSION_EXPIRY_CHECK_INTERVAL: 30000 // Check session expiry every 30 seconds
} as const;

const POLL_RETRY_DELAYS = [500, 1500, 3000] as const;

export const useChat = (config: ChatWidgetConfig) => {
  // Core state
  const [state, setState] = useState<ChatState>({
    isOpen: false,
    isAnimating: false,
    messages: [] as Message[],
    isTyping: false,
    chatId: null,
    humanRequired: false
  });

  // Refs for stateful data that doesn't trigger re-renders
  const refs = useRef({
    polling: null as NodeJS.Timeout | null,
    typingTimeout: null as NodeJS.Timeout | null,
    autoRefreshTimer: null as NodeJS.Timeout | null,
    chatId: null as string | null,
    lastPollingTimestamp: null as string | null,
    processedMessageIds: new Set<number>(),
    hasUserSentMessage: false,
    greetingAdded: false,
    lastError: null as string | null,
    humanRequiredNotificationShown: false,
    lastUserActivity: Date.now(),
    isActivePolling: true,
    currentPollingInterval: POLLING_CONFIG.ACTIVE_INTERVAL as number
  });

  const isWebhookMode = Boolean(config.botId);

  function getPageContext() {
    try {
      const { innerWidth, innerHeight, scrollY } = window;
      const chatWidgetRoot = document.getElementById('chat-widget-root');

      const isInsideChatWidget = (element: Element) => {
        if (!chatWidgetRoot) return false;
        return element === chatWidgetRoot || chatWidgetRoot.contains(element);
      };  

      const disallowedTags = new Set([
        'SCRIPT',
        'STYLE',
        'NOSCRIPT',
        'TEMPLATE',
        'HEAD',
        'HTML'
      ]);

      const getElementText = (element: Element) => {
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_SKIP;
              if (parent.closest('script, style, noscript, template')) {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let text = '';
        let current = walker.nextNode();
        while (current) {
          text += current.textContent ?? '';
          current = walker.nextNode();
        }

        return text
          .split(/\s+/)
          .filter(Boolean)
          .join(' ');
      };

      const elements = Array.from(document.body?.querySelectorAll('*') ?? []).filter(el => {
        if (disallowedTags.has(el.tagName)) return false;
        if (isInsideChatWidget(el)) return false;

        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          return false;
        }

        const rect = el.getBoundingClientRect();
        const visible =
          rect.top < innerHeight &&
          rect.bottom > 0 &&
          rect.left < innerWidth &&
          rect.right > 0;

        if (!visible) return false;

        const textContent = getElementText(el).trim();
        if (!textContent) return false;

        // Avoid collecting massive parent containers; prefer leaf nodes
        if (textContent.length > 0 && el.children.length > 0) {
          const childText = Array.from(el.children)
            .map(child => getElementText(child).trim())
            .join('');

          if (childText && childText === textContent) {
            return false;
          }
        }

        return true;
      });

      const snippet = elements
        .map(el => {
          const tag = el.tagName.toLowerCase();
          const text = getElementText(el).trim();
          return `<${tag}>${text}</${tag}>`;
        })
        .join(' ')
        .slice(0, 2000);

      const metaTags = Array.from(
        document.querySelectorAll('meta[name], meta[property]')
      ).reduce<Record<string, string>>((acc, meta) => {
        const key = meta.getAttribute('name') || meta.getAttribute('property');
        if (!key) return acc;

        const value = meta.getAttribute('content') || '';
        acc[key] = value.slice(0, 500);
        return acc;
      }, {});

      const context = {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        scrollY,
        viewport: { width: innerWidth, height: innerHeight },
        visibleHTML: snippet,
        meta: metaTags
      };

      // console.log('[ChatWidget] Collected page context:', context);
      return context;
    } catch (error) {
      // console.error('[ChatWidget] Failed to collect page context:', error);
      return {
        title: '',
        url: '',
        referrer: '',
        scrollY: 0,
        viewport: { width: 0, height: 0 },
        visibleHTML: '',
        meta: {}
      };
    }
  }
  
  // Activity tracking
  const updateUserActivity = useCallback(() => {
    refs.current.lastUserActivity = Date.now();
    
    if (!refs.current.isActivePolling && state.isOpen && isWebhookMode) {
      refs.current.isActivePolling = true;
      // console.log('Switching to active polling mode');
      
      if (refs.current.polling) {
        clearInterval(refs.current.polling);
        refs.current.currentPollingInterval = POLLING_CONFIG.ACTIVE_INTERVAL;
        refs.current.polling = setInterval(pollForMessages, POLLING_CONFIG.ACTIVE_INTERVAL);
      }
    }
  }, [state.isOpen, isWebhookMode]);

  const checkUserActivity = useCallback(() => {
    const timeSinceActivity = Date.now() - refs.current.lastUserActivity;
    const shouldBeActive = timeSinceActivity < POLLING_CONFIG.ACTIVITY_TIMEOUT;
    
    if (refs.current.isActivePolling && !shouldBeActive && state.isOpen && isWebhookMode) {
      refs.current.isActivePolling = false;
      // console.log('Switching to passive polling mode');
      
      if (refs.current.polling) {
        clearInterval(refs.current.polling);
        refs.current.currentPollingInterval = POLLING_CONFIG.PASSIVE_INTERVAL;
        refs.current.polling = setInterval(pollForMessages, POLLING_CONFIG.PASSIVE_INTERVAL);
      }
    } else if (!refs.current.isActivePolling && shouldBeActive && state.isOpen && isWebhookMode) {
      refs.current.isActivePolling = true;
      // console.log('Switching back to active polling mode');
      
      if (refs.current.polling) {
        clearInterval(refs.current.polling);
        refs.current.currentPollingInterval = POLLING_CONFIG.ACTIVE_INTERVAL;
        refs.current.polling = setInterval(pollForMessages, POLLING_CONFIG.ACTIVE_INTERVAL);
      }
    }
  }, [state.isOpen, isWebhookMode]);

  // Session expiry check
  const checkSessionExpiry = useCallback(() => {
    if (state.isOpen && sessionManager.isCurrentSessionExpired()) {
      // console.log('Session expired after 30 minutes of inactivity - closing widget');
      // Trigger the proper close event instead of directly changing state
      const event = new CustomEvent('chatWidget:sessionExpired');
      window.dispatchEvent(event);
    }
  }, [state.isOpen]);

  // Chat ID management
  const generateChatId = useCallback(() => {
    if (!refs.current.chatId) {
      const newChatId = `chat_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      refs.current.chatId = newChatId;
      sessionManager.setSessionId(newChatId);
      setState(prev => ({ ...prev, chatId: newChatId }));
    }
    return refs.current.chatId;
  }, []);

  // Session management
  const refreshChatSession = useCallback((options: {
    clearMessages?: boolean;
    generateNewVisitorId?: boolean;
    resetHumanRequired?: boolean;
  } = {}) => {
    const {
      clearMessages = false,
      generateNewVisitorId = false,
      resetHumanRequired = true
    } = options;

    // console.log('Refreshing chat session with options:', options);
    
    const oldChatId = refs.current.chatId;
    
    // Reset refs
    Object.assign(refs.current, {
      chatId: null,
      lastPollingTimestamp: null,
      hasUserSentMessage: false,
      ...(resetHumanRequired && { humanRequiredNotificationShown: false })
    });
    
    refs.current.processedMessageIds.clear();
    
    // Clear polling
    if (refs.current.polling) {
      clearInterval(refs.current.polling);
      refs.current.polling = null;
    }
    
    // Reset session using sessionManager
    sessionManager.resetSession({
      keepVisitorId: !generateNewVisitorId,
      keepMessages: !clearMessages,
      keepSentrySession: true
    });
    
    // Generate new chat ID and update state
    const newChatId = generateChatId();
    
    setState(prev => ({
      ...prev,
      chatId: newChatId,
      ...(clearMessages && { messages: [] }),
      ...(resetHumanRequired && { humanRequired: false }),
      isTyping: false
    }));
    
    // Reset flags
    if (clearMessages) {
      refs.current.greetingAdded = false;
    }
    
    // Reset activity tracking
    refs.current.lastUserActivity = Date.now();
    refs.current.isActivePolling = true;
    refs.current.currentPollingInterval = POLLING_CONFIG.ACTIVE_INTERVAL;
    
    // Restart polling if needed
    if (state.isOpen && isWebhookMode && config.botId) {
      setTimeout(() => {
        if (!refs.current.polling) {
          refs.current.polling = setInterval(pollForMessages, POLLING_CONFIG.ACTIVE_INTERVAL);
          pollForMessages();
        }
      }, 1000);
    }
    
    // console.log(`Chat session refreshed: ${oldChatId} -> ${newChatId}`);
    return newChatId;
  }, [isWebhookMode, config.botId, state.isOpen, generateChatId]);

  // Typing indicator management
  const clearTypingIndicator = useCallback(() => {
    if (refs.current.typingTimeout) {
      clearTimeout(refs.current.typingTimeout);
      refs.current.typingTimeout = null;
    }
    setState(prev => ({ ...prev, isTyping: false }));
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    if (isTyping && state.humanRequired) {
      // console.log('Typing indicator suppressed - human required');
      return;
    }

    if (refs.current.typingTimeout) {
      clearTimeout(refs.current.typingTimeout);
      refs.current.typingTimeout = null;
    }

    setState(prev => ({ ...prev, isTyping }));

    if (isTyping) {
      updateUserActivity();
      
      const timeoutDuration = config.features?.typingTimeout || POLLING_CONFIG.TYPING_TIMEOUT;
      refs.current.typingTimeout = setTimeout(() => {
        const timeoutMessage = config.messages?.typingTimeoutMessage || 
          'Sorry, the response is taking longer than expected. Please try again.';
        
        // Track timeout error
        errorTracker.track('timeout', 'Typing indicator timeout exceeded', {
          chatId: refs.current.chatId || undefined,
          visitorId: sessionManager.getVisitorId(),
          timeoutDuration,
          lastPollingTimestamp: refs.current.lastPollingTimestamp || undefined
        });
        
        addMessage(timeoutMessage, 'error');
        setState(prev => ({ ...prev, isTyping: false }));
      }, timeoutDuration);
    }
  }, [config.features?.typingTimeout, config.messages?.typingTimeoutMessage, updateUserActivity, state.humanRequired]);

  // Message management
  const addMessage = useCallback((
    content: string,
    type: 'user' | 'bot' | 'operator' | 'error',
    isHTML = false,
    options?: {
      id?: string;
      timestamp?: Date;
      operatorId?: string | null;
      human_required?: boolean;
    }
  ) => {
    const message: Message = {
      id: options?.id || `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      content,
      type,
      timestamp: options?.timestamp || new Date(),
      isHTML,
      human_required: options?.human_required || false,
      ...(type === 'operator' && { operatorId: options?.operatorId })
    };

    sessionManager.addMessage(message);
    
    setState(prev => ({
      ...prev,
      messages: prev.messages.some(m => m.id === message.id) 
        ? prev.messages 
        : [...prev.messages, message],
      humanRequired: (type === 'bot' || type === 'operator') && typeof options?.human_required === 'boolean'
        ? options.human_required
        : prev.humanRequired
    }));

    if (type === 'user') {
      updateUserActivity();
    }

    return message;
  }, [updateUserActivity]);

  // Polling for messages
  const pollForMessages = useCallback(async () => {
    if (!isWebhookMode || !config.botId || !config.webhook?.url) return;

    try {
      const sessionId = generateChatId();
      const visitorId = sessionManager.getVisitorId();

      const params = new URLSearchParams({ visitorId });
      if (refs.current.lastPollingTimestamp) {
        params.append('since', refs.current.lastPollingTimestamp);
      }

      const url = `${config.webhook.url}/${config.webhook.route}/messages/${config.botId}/${sessionId}?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Track HTTP error from polling
        errorTracker.track('polling', errorMsg, {
          chatId: refs.current.chatId || undefined,
          visitorId: sessionManager.getVisitorId(),
          statusCode: response.status,
          url: url,
          pollingInterval: refs.current.currentPollingInterval
        });
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      if (data.success && data.messages?.length > 0) {
        processPollingResponse(data.messages);
      }
      
    } catch (error) {
      handlePollingError(error);
    }
  }, [isWebhookMode, config, generateChatId]);

  const processPollingResponse = useCallback((messages: any[]) => {
    // Handle echoed user messages
    const echoedUserMessages = messages.filter(msg => 
      msg.from === 'user' && msg.clientMessageId
    );
    
    if (echoedUserMessages.length > 0) {
      const currentTime = new Date().toISOString();
      
      echoedUserMessages.forEach(msg => {
        sessionManager.updateMessageTimestamp(msg.clientMessageId, currentTime);
        
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m => 
            m.id === msg.clientMessageId ? { ...m, timestamp: new Date(currentTime) } : m
          )
        }));
      });
    }

    // Handle new bot messages
    const newBotMessages = messages.filter(msg => {
      return (msg.from === 'bot' || msg.from === 'operator') && 
             msg.response && 
             !refs.current.processedMessageIds.has(msg.id);
    });

    if (newBotMessages.length > 0) {
      processNewBotMessages(newBotMessages);
    }
  }, []);

  const processNewBotMessages = useCallback((newMessages: any[]) => {
    clearTypingIndicator();

    const processedMessages: Message[] = [];
    let latestHumanRequired = false;
    let hasHumanRequiredChanged = false;
    
    newMessages.forEach(msg => {
      refs.current.processedMessageIds.add(msg.id);
      
      const isOperatorMessage = msg.from === 'operator' || msg.isOperatorMessage;
      const messageType = isOperatorMessage ? 'operator' : 'bot';
      const messageIdPrefix = isOperatorMessage ? 'operator' : 'bot';
      
      const messageHumanRequired = Boolean(msg.human_required);
      latestHumanRequired = messageHumanRequired;
      
      setState(prevState => {
        if (prevState.humanRequired !== messageHumanRequired) {
          hasHumanRequiredChanged = true;
        }
        return prevState;
      });
      
      const botMessage: Message = {
        id: `${messageIdPrefix}_${msg.id}`,
        content: msg.response,
        type: messageType,
        timestamp: new Date(),
        isHTML: true,
        human_required: messageHumanRequired,
        ...(isOperatorMessage && { operatorId: msg.operatorId })
      };

      processedMessages.push(botMessage);
      sessionManager.addMessage(botMessage);
    });

    // Update notification state
    if (latestHumanRequired && !refs.current.humanRequiredNotificationShown) {
      refs.current.humanRequiredNotificationShown = true;
    } else if (!latestHumanRequired && hasHumanRequiredChanged) {
      refs.current.humanRequiredNotificationShown = false;
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, ...processedMessages],
      isTyping: false,
      humanRequired: latestHumanRequired
    }));

    // Update timestamp for next poll
    if (processedMessages.length > 0) {
      refs.current.lastPollingTimestamp = processedMessages[processedMessages.length - 1].timestamp.toISOString();
    }

    updateUserActivity();
    refs.current.lastError = null;
  }, [clearTypingIndicator, updateUserActivity]);

  const handlePollingError = useCallback((error: any) => {
    if (!(error instanceof Error)) return;

    let shouldStopPolling = false;
    let errorMessage = config.messages?.errorMessage || 
      'Sorry, there was a connection error. Please try again later.';
    let errorType: 'polling' | 'network' | 'session' = 'polling';

    if (error.message.includes('Bot not found')) {
      errorMessage = 'Sorry, the chat service is currently unavailable. Please try again later.';
      shouldStopPolling = true;
      errorType = 'polling';
      
      // Track critical error
      errorTracker.track('polling', error.message, {
        chatId: refs.current.chatId || undefined,
        visitorId: sessionManager.getVisitorId(),
        botId: config.botId,
        critical: true,
        pollingInterval: refs.current.currentPollingInterval
      });
    } else if (error.message.includes('Session not found')) {
      errorType = 'session';
      
      // Track session error
      errorTracker.track('session', error.message, {
        chatId: refs.current.chatId || undefined,
        visitorId: sessionManager.getVisitorId(),
        action: 'auto_refresh'
      });
      
      refreshChatSession({ clearMessages: false, generateNewVisitorId: false, resetHumanRequired: false });
      return;
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      // Track network errors but don't show to user
      errorTracker.track('network', error.message, {
        chatId: refs.current.chatId || undefined,
        visitorId: sessionManager.getVisitorId(),
        url: config.webhook?.url,
        pollingInterval: refs.current.currentPollingInterval,
        silent: true
      });
      return; // Silent fail for network issues
    } else {
      // Track general polling errors
      errorTracker.track('polling', error.message, {
        chatId: refs.current.chatId || undefined,
        visitorId: sessionManager.getVisitorId(),
        url: config.webhook?.url,
        pollingInterval: refs.current.currentPollingInterval
      });
    }

    if (shouldStopPolling && refs.current.polling) {
      clearInterval(refs.current.polling);
      refs.current.polling = null;
    }

    clearTypingIndicator();

    if (refs.current.lastError !== errorMessage) {
      refs.current.lastError = errorMessage;
      addMessage(errorMessage, 'error');
    }
  }, [config.messages?.errorMessage, config.botId, config.webhook?.url, refreshChatSession, clearTypingIndicator, addMessage]);

  // Auto-refresh management
  const startAutoRefreshTimer = useCallback((intervalMs: number = POLLING_CONFIG.AUTO_REFRESH_INTERVAL) => {
    if (refs.current.autoRefreshTimer) {
      clearInterval(refs.current.autoRefreshTimer);
    }

    refs.current.autoRefreshTimer = setInterval(() => {
      // console.log(`Auto-refreshing chat session after ${intervalMs}ms`);
      refreshChatSession({ resetHumanRequired: true, generateNewVisitorId: false });
    }, intervalMs);
  }, [refreshChatSession]);

  const stopAutoRefreshTimer = useCallback(() => {
    if (refs.current.autoRefreshTimer) {
      clearInterval(refs.current.autoRefreshTimer);
      refs.current.autoRefreshTimer = null;
      // console.log('Auto-refresh timer stopped');
    }
  }, []);

  // Public API methods
  const resetChatCompletely = useCallback(() => {
    // console.log('Performing complete chat reset');
    return refreshChatSession({
      clearMessages: true,
      generateNewVisitorId: true,
      resetHumanRequired: true
    });
  }, [refreshChatSession]);

  const startNewConversation = useCallback(() => {
    // console.log('Starting new conversation');
    return refreshChatSession({
      clearMessages: true,
      generateNewVisitorId: false,
      resetHumanRequired: true
    });
  }, [refreshChatSession]);

  const refreshSessionOnly = useCallback(() => {
    // console.log('Refreshing session only');
    return refreshChatSession({
      clearMessages: false,
      generateNewVisitorId: false,
      resetHumanRequired: false
    });
  }, [refreshChatSession]);

  // Chat controls
  const setOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      // Check if session expired and refresh it if needed
      if (sessionManager.isCurrentSessionExpired()) {
        // console.log('Session expired - refreshing session on widget open');
        refreshChatSession({ clearMessages: false, generateNewVisitorId: false, resetHumanRequired: false });
      }
      
      updateUserActivity();
      
      // Add greeting if needed
      const hasStoredMessages = sessionManager.getMessages().length > 0;
      const shouldShowGreeting = !hasStoredMessages || state.messages.length === 0;

      if (!refs.current.greetingAdded && config.messages?.greeting && shouldShowGreeting) {
        addMessage(config.messages.greeting, 'bot', true, {
          id: `bot_greeting_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        });
        refs.current.greetingAdded = true;
      }
    }
    
    setState(prev => ({ ...prev, isOpen }));
  }, [updateUserActivity, addMessage, config.messages?.greeting, state.messages.length, refreshChatSession]);

  const setAnimating = useCallback((isAnimating: boolean) => {
    setState(prev => ({ ...prev, isAnimating }));
  }, []);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    updateUserActivity();

    const clientMessage = addMessage(trimmedMessage, 'user');
    if (!state.humanRequired) {
      setTyping(true);
    }

    // Start polling on first user message
    if (!refs.current.hasUserSentMessage) {
      refs.current.hasUserSentMessage = true;

      setTimeout(() => {
        if (!refs.current.polling && isWebhookMode && config.botId) {
          refs.current.currentPollingInterval = POLLING_CONFIG.ACTIVE_INTERVAL;
          refs.current.polling = setInterval(pollForMessages, POLLING_CONFIG.ACTIVE_INTERVAL);
          pollForMessages();
        }
      }, 3000);
    }

    try {
      if (isWebhookMode && config.botId) {
        await sendWebhookMessage(trimmedMessage, clientMessage.id);
      } else {
        await sendDirectMessage(trimmedMessage);
      }
    } catch (error) {
      handleSendMessageError(error);
    }
  }, [config, isWebhookMode, addMessage, setTyping, pollForMessages, updateUserActivity, state.humanRequired]);

  const sendWebhookMessage = useCallback(async (message: string, clientMessageId: string) => {
    const sessionId = generateChatId();
    const visitorId = sessionManager.getVisitorId();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const payload = {
      type: "message",
      sessionId,
      messageId, // Unique ID to correlate with DOM chunks
      message: { 
        content: message, 
        clientMessageId 
      },
      timestamp: new Date().toISOString(),
      context: getPageContext(), // Keep short context for backward compatibility
      user: {
        name: config.user?.name || null,
        email: config.user?.email || null,
        metadata: {
          ...config.user?.metadata,
          visitorId,
          sentrySessionId: sessionManager.getSentrySession()?.id
        }
      }
    };
    
    const response = await fetch(`${config.webhook?.url}/${config.webhook?.route}/${config.botId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'ngrok-skip-browser-warning': 'true' 
      },
      body: JSON.stringify(payload),
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      
      // Track webhook send error
      errorTracker.track('send_message', errorMsg, {
        chatId: refs.current.chatId || undefined,
        visitorId: sessionManager.getVisitorId(),
        statusCode: response.status,
        url: config.webhook?.url,
        botId: config.botId
      });
      
      throw new Error(errorMsg);
    }
    
    // Send full DOM capture in parallel (don't wait for it)
    if (config.features?.captureDOMOnMessage !== false) {
      // Send DOM chunks in the background
      sendDOMToServer(
        `${config.webhook?.url}/${config.webhook?.route}/dom-capture/${config.botId}`,
        {
          sessionId,
          visitorId,
          metadata: {
            messageId, // Link DOM capture to this message
            clientMessageId,
            chatId: refs.current.chatId,
            triggerType: 'user-message'
          }
        }
      ).catch(error => {
        // Log but don't fail the message send
        console.error('[ChatWidget] Failed to send DOM capture:', error);
        errorTracker.track('dom_capture', error instanceof Error ? error.message : String(error), {
          chatId: refs.current.chatId || undefined,
          visitorId: sessionManager.getVisitorId(),
          messageId,
          silent: true
        });
      });
    }
    
    // Schedule polling retries
    POLL_RETRY_DELAYS.forEach(delay => {
      setTimeout(pollForMessages, delay);
    });
  }, [config, generateChatId, pollForMessages]);

  const sendDirectMessage = useCallback(async (message: string) => {
    const response = await fetch(config.webhook?.url || '/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'ngrok-skip-browser-warning': 'true' 
      },
      body: JSON.stringify({
        chatId: generateChatId(),
        message,
        route: config.webhook?.route || 'general',
        timestamp: new Date().toISOString(),
        visitorId: sessionManager.getVisitorId(),
        sentrySessionId: sessionManager.getSentrySession()?.id
      })
    });

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      
      // Track direct message send error
      errorTracker.track('send_message', errorMsg, {
        chatId: refs.current.chatId || undefined,
        visitorId: sessionManager.getVisitorId(),
        statusCode: response.status,
        url: config.webhook?.url || '/api/chat'
      });
      
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const botResponse = data.output || data.message || "I'm sorry, I didn't understand that.";
   
    clearTypingIndicator();
    addMessage(botResponse, 'bot', true);
  }, [config, generateChatId, clearTypingIndicator, addMessage]);

  const handleSendMessageError = useCallback((error: any) => {
    clearTypingIndicator();
    
    const errorMessage = config.messages?.errorMessage || 
      'Sorry, there was a connection error. Please try again later.';
    
    // Track send message error
    const errorText = error instanceof Error ? error.message : String(error);
    errorTracker.track('send_message', errorText, {
      chatId: refs.current.chatId || undefined,
      visitorId: sessionManager.getVisitorId(),
      url: config.webhook?.url,
      webhookMode: isWebhookMode
    });
    
    addMessage(errorMessage, 'error');
  }, [config.messages?.errorMessage, config.webhook?.url, isWebhookMode, clearTypingIndicator, addMessage]);

  // Initialize messages from session storage
  const initializeMessages = useCallback(() => {
    const savedMessages = sessionManager.getMessages();
    if (savedMessages.length === 0) return { messages: [], humanRequired: false };

    const convertedMessages: Message[] = savedMessages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    // Get human required state from most recent bot/operator message
    const recentMessages = convertedMessages
      .filter(msg => msg.timestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);

    const lastBotMessage = recentMessages.find(msg => 
      (msg.type === 'bot' || msg.type === 'operator') && 
      typeof msg.human_required === 'boolean'
    );

    const initialHumanRequired = lastBotMessage?.human_required || false;
    if (!initialHumanRequired) {
      refs.current.humanRequiredNotificationShown = false;
    }

    // Set up polling timestamp for webhook mode
    if (isWebhookMode && convertedMessages.length > 0) {
      const sortedMessages = convertedMessages
        .filter(msg => msg.timestamp)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      if (sortedMessages.length > 0) {
        refs.current.lastPollingTimestamp = sortedMessages[0].timestamp.toISOString();
      }
    }

    // Track processed message IDs
    convertedMessages.forEach(msg => {
      if (typeof msg.id === 'string') {
        const parts = msg.id.split('_');
        if (parts.length > 1 && (parts[0] === 'bot' || parts[0] === 'operator')) {
          const numericId = parseInt(parts[1]);
          if (!isNaN(numericId)) {
            refs.current.processedMessageIds.add(numericId);
          }
        }
      }
    });
    
    // Check if greeting was already added
    const normalize = (s: string) => s.replace(/<[^>]*>/g, '').trim();
    refs.current.greetingAdded = convertedMessages.some(msg => {
      if (msg.type !== 'bot') return false;
      if (typeof msg.id === 'string' && msg.id.startsWith('bot_greeting_')) return true;
      if (config.messages?.greeting) {
        try {
          return normalize(msg.content).includes(normalize(config.messages.greeting));
        } catch {
          return false;
        }
      }
      return false;
    });

    return { messages: convertedMessages, humanRequired: initialHumanRequired };
  }, [config.messages?.greeting, isWebhookMode]);

  // Effects
  useEffect(() => {
    const { messages, humanRequired } = initializeMessages();
    
    setState(prev => ({
      ...prev,
      messages,
      humanRequired
    }));

    generateChatId();
    startAutoRefreshTimer();
  }, [initializeMessages, generateChatId, startAutoRefreshTimer]);

  useEffect(() => {
    const activityInterval = setInterval(checkUserActivity, POLLING_CONFIG.ACTIVITY_CHECK_INTERVAL);
    return () => clearInterval(activityInterval);
  }, [checkUserActivity]);

  useEffect(() => {
    const sessionExpiryInterval = setInterval(checkSessionExpiry, POLLING_CONFIG.SESSION_EXPIRY_CHECK_INTERVAL);
    return () => clearInterval(sessionExpiryInterval);
  }, [checkSessionExpiry]);

  useEffect(() => {
    if (state.isOpen && isWebhookMode && config.botId && refs.current.hasUserSentMessage) {
      if (!refs.current.polling) {
        refs.current.currentPollingInterval = POLLING_CONFIG.ACTIVE_INTERVAL;
        refs.current.polling = setInterval(pollForMessages, POLLING_CONFIG.ACTIVE_INTERVAL);
        setTimeout(pollForMessages, 1000);
      }
    } else if (refs.current.polling) {
      clearInterval(refs.current.polling);
      refs.current.polling = null;
    }

    return () => {
      if (refs.current.polling) {
        clearInterval(refs.current.polling);
        refs.current.polling = null;
      }
    };
  }, [state.isOpen, isWebhookMode, config.botId, pollForMessages]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refs.current.typingTimeout) {
        clearTimeout(refs.current.typingTimeout);
      }
      if (refs.current.polling) {
        clearInterval(refs.current.polling);
      }
      if (refs.current.autoRefreshTimer) {
        clearInterval(refs.current.autoRefreshTimer);
      }
    };
  }, []);

  // DOM capture methods
  const captureDOMAndSend = useCallback(async (
    url?: string,
    options: Omit<DOMCaptureOptions, 'sessionId' | 'visitorId'> & {
      metadata?: Record<string, any>;
    } = {}
  ) => {
    const webhookUrl = url || config.webhook?.url;
    if (!webhookUrl) {
      throw new Error('No webhook URL provided for DOM capture');
    }

    const captureUrl = `${webhookUrl}/${config.webhook?.route || 'webhook'}/dom-capture/${config.botId}`;
    const sessionId = generateChatId();
    const visitorId = sessionManager.getVisitorId();

    return sendDOMToServer(captureUrl, {
      ...options,
      sessionId,
      visitorId,
      metadata: {
        ...options.metadata,
        chatId: refs.current.chatId,
      },
    });
  }, [config.webhook?.url, config.webhook?.route, config.botId, generateChatId]);

  const getDOMCaptureStats = useCallback((options?: DOMCaptureOptions) => {
    return getDOMStats(options);
  }, []);

  const captureDOMChunks = useCallback((options?: DOMCaptureOptions) => {
    return domCapture.captureAndChunk(options);
  }, []);

  return {
    ...state,
    addMessage,
    sendMessage,
    setOpen,
    setAnimating,
    setTyping,
    getChatId: generateChatId,
    updateUserActivity,
    refreshChatSession,
    resetChatCompletely,
    startNewConversation,
    refreshSessionOnly,
    setAutoRefreshInterval: (intervalMs: number | null) => {
      stopAutoRefreshTimer();
      if (intervalMs && intervalMs > 0) {
        startAutoRefreshTimer(intervalMs);
      }
    },
    stopChatRefreshTimer: stopAutoRefreshTimer,
    startChatRefreshTimer: startAutoRefreshTimer,
    // DOM capture methods
    captureDOMAndSend,
    getDOMCaptureStats,
    captureDOMChunks
  };
};
