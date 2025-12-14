(function() {
  'use strict';
  
  // Prevent multiple loading
  if ((window as any).__chatWidgetLoaded) return;
  (window as any).__chatWidgetLoaded = true;
  
  // Get the script element that loaded this loader
  const scripts = document.querySelectorAll('script[data-key]');
  const currentScript = scripts[scripts.length - 1] as HTMLScriptElement;

  if (!currentScript) {
    console.error('Chat Widget: No script tag with data-key found');
    return;
  }
  
  const key = currentScript.getAttribute('data-key');
  if (!key) {
    console.error('Chat Widget: data-key attribute is required');
    return;
  }
  
  // Extract CDN base URL from the current script source
  const scriptSrc = currentScript.src;
  const cdnBaseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));

  let isLoaded = false;
  
  const loadWidget = () => {
    if (isLoaded) return;
    isLoaded = true;
    
    // Check for lazy loading configuration
    const globalConfig = (window as any).ChatWidgetConfig || {};
    const isLazyLoad = globalConfig.features?.lazyLoad ?? false;
    const lazyLoadDelay = globalConfig.features?.lazyLoadDelay ?? 1000;
    
    const actualLoad = () => {
      // Create container with Shadow DOM for style isolation
      const container = document.createElement('div');
      container.id = 'chat-widget-root';
      document.body.appendChild(container);
      
      // Create shadow root
      const shadowRoot = container.attachShadow({ mode: 'open' });
      
      // Fixed font size for consistent appearance across all websites
      const widgetBaseFontSize = 16;
      
      // Create a container inside shadow DOM for React to render into
      const reactContainer = document.createElement('div');
      reactContainer.id = 'chat-widget-shadow-container';
      
      // Append the container to the shadow root first
      shadowRoot.appendChild(reactContainer);
      
      // Create a temporary loading indicator style
      const loadingStyleElement = document.createElement('style');
      loadingStyleElement.textContent = `
        #chat-widget-shadow-container {
          position: fixed;
          z-index: 2147483647;
          bottom: 20px;
          right: 20px;
        }
      `;
      shadowRoot.insertBefore(loadingStyleElement, reactContainer);
      
      // Load CSS file and inject into Shadow DOM
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = `${cdnBaseUrl}/chat-widget.css`;
      shadowRoot.insertBefore(cssLink, reactContainer);
      
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
      
      // Load JavaScript
      const script = document.createElement('script');
      script.src = `${cdnBaseUrl}/chat-widget.iife.js`;
      script.async = true;
      script.setAttribute('data-shadow-container', reactContainer.id);
      script.setAttribute('data-key', key);
      script.onerror = () => {
        console.error('Chat Widget: Failed to load widget script');
      };
      script.onload = () => {
        console.log('Chat Widget: Successfully loaded');
        
        // Dispatch custom event when widget is ready
        const readyEvent = new CustomEvent('chatWidget:ready', {
          detail: { 
            key, 
            cdnBaseUrl,
            shadowRoot,
            container
          }
        });
        window.dispatchEvent(readyEvent);
      };
      document.head.appendChild(script);
    };
    
    if (isLazyLoad) {
      // Lazy load after specified delay
      setTimeout(actualLoad, lazyLoadDelay);
    } else {
      // Load immediately
      actualLoad();
    }
  };
  
  // Check if we should load immediately or wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget);
  } else {
    loadWidget();
  }
  
  // Expose loader information for debugging
  (window as any).__chatWidgetLoader = {
    key,
    cdnBaseUrl,
    loaded: () => isLoaded,
    version: '1.0.0',
    loadTime: Date.now()
  };
  
})();