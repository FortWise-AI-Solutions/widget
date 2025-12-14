import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatWidget } from './components/ChatWidget';
import { ChatWidgetConfig } from './types';
import './styles/widget.css';

const getConfig = (): ChatWidgetConfig => {
  const scripts = document.querySelectorAll('script[data-key]');
  const script = scripts[scripts.length - 1] as HTMLScriptElement;
  const key = script?.getAttribute('data-key') || 'default';
  const globalConfig = (window as any).ChatWidgetConfig || {};
 
  return {
    key,
    botId: globalConfig.botId || '',
    webhook: {
      url: globalConfig.webhook?.url || `https://api.example.com/chat/${key}`,
      route: globalConfig.webhook?.route || 'general',
      ...globalConfig.webhook
    },
    style: {
      theme: globalConfig.style?.theme || 'light',
      position: globalConfig.style?.position || 'right',
      height: globalConfig.style?.height || '600px'
    },
    features: {
      autoOpen: globalConfig.features?.autoOpen ?? false,
      showTypingIndicator: globalConfig.features?.showTypingIndicator ?? true,
      enableNotifications: globalConfig.features?.enableNotifications ?? true,
      lazyLoad: globalConfig.features?.lazyLoad ?? false,
      lazyLoadDelay: globalConfig.features?.lazyLoadDelay ?? 1000,
      typingTimeout: globalConfig.features?.typingTimeout ?? 30000
    },
    messages: {
      greeting: globalConfig.messages?.greeting || 'Hi! How can we help you today?',
      placeholder: globalConfig.messages?.placeholder || 'Type your message...',
      errorMessage: globalConfig.messages?.errorMessage || 'Sorry, there was a connection error. Please try again later.',
      typingText: globalConfig.messages?.typingText || 'Typing...',
      typingTimeoutMessage: globalConfig.messages?.typingTimeoutMessage || 'The response is taking longer than expected. Please try again.'
    },
    socials: {
      instagram: globalConfig.socials?.instagram || '',
      facebook: globalConfig.socials?.facebook || '',
      telegram: globalConfig.socials?.telegram || '',
      whatsapp: globalConfig.socials?.whatsapp || ''
    },
    user: {
      name: globalConfig.user?.name ?? null,
      email: globalConfig.user?.email ?? null,
      metadata: globalConfig.user?.metadata || {}
    }
  };
};

const initWidget = () => {
  // Check if we're running inside Shadow DOM (via loader)
  const shadowContainerScript = document.querySelector('script[data-shadow-container]');
  if (shadowContainerScript) {
    const shadowContainerId = shadowContainerScript.getAttribute('data-shadow-container') || '';
    
    // Find the shadow root
    const rootElement = document.getElementById('chat-widget-root');
    if (rootElement && rootElement.shadowRoot && shadowContainerId) {
      const container = rootElement.shadowRoot.getElementById(shadowContainerId);
      if (container) {
        // We're running in Shadow DOM via loader
        const config = getConfig();
        const root = createRoot(container);
        root.render(<ChatWidget config={config} />);
        
        // Expose global API
        setupGlobalAPI();
        return;
      }
    }
  }
  
  // Standard initialization (for development/direct usage)
  if (document.getElementById('chat-widget-root')) {
    return;
  }
  
  const config = getConfig();
  
  // Create container with Shadow DOM for style isolation
  const container = document.createElement('div');
  container.id = 'chat-widget-root';
  document.body.appendChild(container);
  
  // Create shadow root with 'open' mode
  const shadowRoot = container.attachShadow({ mode: 'open' });
  
  // Fixed font size for consistent appearance across all websites
  const widgetBaseFontSize = 16;
  
  // Create a container inside shadow DOM for React to render into
  const reactContainer = document.createElement('div');
  reactContainer.id = 'chat-widget-shadow-container';
  shadowRoot.appendChild(reactContainer);
  
  // For direct usage, we need to inject styles directly
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = './styles/widget.css';
  shadowRoot.insertBefore(styleLink, reactContainer);
  
  // Add inline styles for complete isolation and consistent appearance
  const inlineStyles = document.createElement('style');
  inlineStyles.textContent = `
    /* Reset all styles and prevent inheritance from host page */
    :host {
      all: initial;
      display: block;
    }
    
    /* Ensure all elements use border-box and reset key inheritable properties */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Set fixed base styles */
    #chat-widget-shadow-container {
      position: fixed;
      z-index: 2147483647;
      bottom: 20px;
      right: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: ${widgetBaseFontSize}px;
      line-height: 1.5;
      color: #333;
      --chat-widget-base-font-size: ${widgetBaseFontSize}px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    #chat-widget-root {
      font-size: ${widgetBaseFontSize}px;
      --chat-widget-base-font-size: ${widgetBaseFontSize}px;
    }
  `;
  shadowRoot.insertBefore(inlineStyles, reactContainer);
  
  // Render React component into shadow DOM
  const root = createRoot(reactContainer);
  root.render(<ChatWidget config={config} />);
  
  // Expose global API
  setupGlobalAPI();
};

// Setup global API for controlling the widget
const setupGlobalAPI = () => {
  (window as any).ChatWidget = {
    show: () => {
      const event = new CustomEvent('chatWidget:show');
      window.dispatchEvent(event);
    },
    hide: () => {
      const event = new CustomEvent('chatWidget:hide');
      window.dispatchEvent(event);
    },
    sendMessage: (message: string) => {
      const event = new CustomEvent('chatWidget:sendMessage', { detail: message });
      window.dispatchEvent(event);
    },
    showNotification: () => {
      const event = new CustomEvent('chatWidget:notification');
      window.dispatchEvent(event);
    }
  };
};

// Function to get all widget styles as a string
const getWidgetStyles = (): string => {
  // This will be replaced with actual styles during build
  // For development, we'll try to fetch the styles from the CSS file
  const styleSheets = document.styleSheets;
  let widgetStyles = '';
  
  for (let i = 0; i < styleSheets.length; i++) {
    try {
      const sheet = styleSheets[i];
      if (sheet.href && sheet.href.includes('widget.css')) {
        const rules = sheet.cssRules || sheet.rules;
        for (let j = 0; j < rules.length; j++) {
          widgetStyles += rules[j].cssText + '\n';
        }
      }
    } catch (e) {
      // CORS error when trying to access stylesheet from different origin
      console.warn('Could not access stylesheet rules', e);
    }
  }
  
  // Fallback to importing styles during build
  if (!widgetStyles) {
    // Fixed font size for consistent appearance
    const widgetBaseFontSize = 16;
    
    widgetStyles = `
      /* Base styles will be injected here during build */
      :host {
        all: initial;
        display: block;
      }
      
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      #chat-widget-shadow-container {
        position: fixed;
        z-index: 2147483647;
        bottom: 20px;
        right: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: ${widgetBaseFontSize}px;
        line-height: 1.5;
        color: #333;
        --chat-widget-base-font-size: ${widgetBaseFontSize}px;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      #chat-widget-root {
        font-size: ${widgetBaseFontSize}px;
        --chat-widget-base-font-size: ${widgetBaseFontSize}px;
      }
    `;
  }
  
  return widgetStyles;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}

// Example usage configurations for documentation:
/*
// Light theme (default)
window.ChatWidgetConfig = {
  style: { theme: 'light', position: 'right' },
  webhook: { url: 'https://your-api.com/chat' },
  user: { name: null, email: null, metadata: {} }
};

// Dark theme
window.ChatWidgetConfig = {
  style: { theme: 'dark', position: 'left' },
  webhook: { url: 'https://your-api.com/chat' },
  user: { name: null, email: null, metadata: {} }
};

// Full configuration example
window.ChatWidgetConfig = {
  botId: 'your-bot-id',
  style: {
    theme: 'dark',
    position: 'left'
  },
  webhook: {
    url: 'https://your-api.com/chat',
    route: 'support'
  },
  features: {
    autoOpen: true,
    showTypingIndicator: true,
    enableNotifications: true,
    lazyLoad: false,
    lazyLoadDelay: 1000,
    typingTimeout: 30000
  },
  messages: {
    greeting: 'Welcome! How can we help you today?',
    placeholder: 'Ask us anything...',
    errorMessage: 'Connection error. Please try again.',
    typingText: 'Assistant is typing...',
    typingTimeoutMessage: 'Response taking longer than expected. Please try again.'
  },
  socials: {
    instagram: 'https://instagram.com/yourpage',
    facebook: 'https://facebook.com/yourpage',
    telegram: 'https://t.me/yourbot',
    whatsapp: 'https://wa.me/yournumber'
  },
  user: {
    name: null,
    email: null,
    metadata: {
      source: 'website',
      page: 'homepage'
    }
  }
};
*/