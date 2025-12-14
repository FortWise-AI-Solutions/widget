/**
 * DOM Capture Utility
 * Captures the entire accessible DOM of the host page (excluding the chat widget)
 * and sends it in chunks to the server
 */

const CHUNK_SIZE = 50000; // Characters per chunk (adjust based on your needs)
const MAX_ELEMENT_DEPTH = 100; // Prevent infinite recursion

export interface    DOMCaptureOptions {
  excludeSelectors?: string[]; // Additional selectors to exclude
  includeHidden?: boolean; // Include hidden elements
  maxDepth?: number; // Maximum DOM tree depth
  chunkSize?: number; // Size of each chunk in characters
  onProgress?: (current: number, total: number) => void; // Progress callback
  onChunkReady?: (chunk: string, index: number, total: number) => void; // Chunk callback
}

export  interface SerializedElement {
  tag: string;
  text?: string;
  attributes?: Record<string, string>;
  children?: SerializedElement[];
  depth: number;
}

export class DOMCapture {
  private chatWidgetRoot: HTMLElement | null = null;
  private excludeSelectors: string[] = [
    'script',
    'style',
    'noscript',
    'template',
    'link[rel="stylesheet"]',
    'meta',
    '#chat-widget-root',
    '.chat-container',
    '.chat-button',
  ];

  constructor() {
    this.chatWidgetRoot = document.getElementById('chat-widget-root');
  }

  /**
   * Check if an element is inside the chat widget
   */
  private isInsideChatWidget(element: Element): boolean {
    if (!this.chatWidgetRoot) return false;
    return element === this.chatWidgetRoot || this.chatWidgetRoot.contains(element);
  }

  /**
   * Check if an element should be excluded
   */
  private shouldExcludeElement(element: Element, excludeSelectors: string[]): boolean {
    // Check if it's the chat widget or inside it
    if (this.isInsideChatWidget(element)) {
      return true;
    }

    // Check against exclude selectors
    const allSelectors = [...this.excludeSelectors, ...excludeSelectors];
    return allSelectors.some(selector => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }

  /**
   * Check if an element is visible
   */
  private isElementVisible(element: Element): boolean {
    if (element === document.documentElement || element === document.body) {
      return true;
    }

    const style = window.getComputedStyle(element);
    
    // Check display and visibility
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // Check opacity
    if (parseFloat(style.opacity) === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get clean text content from an element
   */
  private getElementText(element: Element): string {
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

    const texts: string[] = [];
    let current = walker.nextNode();
    while (current) {
      const text = current.textContent?.trim();
      if (text) {
        texts.push(text);
      }
      current = walker.nextNode();
    }

    return texts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract relevant attributes from an element
   */
  private extractAttributes(element: Element): Record<string, string> {
    const relevantAttrs = [
      'id',
      'class',
      'href',
      'src',
      'alt',
      'title',
      'aria-label',
      'placeholder',
      'value',
      'name',
      'type',
      'role',
      'data-testid',
    ];

    const attrs: Record<string, string> = {};
    
    relevantAttrs.forEach(attrName => {
      const value = element.getAttribute(attrName);
      if (value && value.length < 500) { // Limit attribute length
        attrs[attrName] = value;
      }
    });

    return Object.keys(attrs).length > 0 ? attrs : {};
  }

  /**
   * Serialize a single element
   */
  private serializeElement(
    element: Element,
    options: Required<Omit<DOMCaptureOptions, 'onProgress' | 'onChunkReady'>>,
    currentDepth: number = 0
  ): SerializedElement | null {
    // Check depth limit
    if (currentDepth > options.maxDepth) {
      return null;
    }

    // Check if should exclude
    if (this.shouldExcludeElement(element, options.excludeSelectors)) {
      return null;
    }

    // Check visibility if required
    if (!options.includeHidden && !this.isElementVisible(element)) {
      return null;
    }

    const serialized: SerializedElement = {
      tag: element.tagName.toLowerCase(),
      depth: currentDepth,
    };

    // Extract attributes
    const attrs = this.extractAttributes(element);
    if (Object.keys(attrs).length > 0) {
      serialized.attributes = attrs;
    }

    // Get direct text content (not from children)
    const childElements = Array.from(element.children);
    if (childElements.length === 0) {
      const text = this.getElementText(element);
      if (text) {
        serialized.text = text;
      }
    }

    // Process children
    const children: SerializedElement[] = [];
    for (const child of childElements) {
      const serializedChild = this.serializeElement(child, options, currentDepth + 1);
      if (serializedChild) {
        children.push(serializedChild);
      }
    }

    if (children.length > 0) {
      serialized.children = children;
    }

    return serialized;
  }

  /**
   * Convert serialized element to HTML string
   */
  private elementToHTML(element: SerializedElement): string {
    let html = `<${element.tag}`;

    // Add attributes
    if (element.attributes) {
      for (const [key, value] of Object.entries(element.attributes)) {
        // Escape quotes in attribute values
        const escapedValue = value.replace(/"/g, '&quot;');
        html += ` ${key}="${escapedValue}"`;
      }
    }

    html += '>';

    // Add text content
    if (element.text) {
      // Escape HTML entities in text
      const escapedText = element.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      html += escapedText;
    }

    // Add children
    if (element.children) {
      for (const child of element.children) {
        html += this.elementToHTML(child);
      }
    }

    html += `</${element.tag}>`;
    return html;
  }

  /**
   * Capture the entire DOM and serialize it
   */
  public captureDOM(options: DOMCaptureOptions = {}): SerializedElement | null {
    const defaultOptions: Required<Omit<DOMCaptureOptions, 'onProgress' | 'onChunkReady'>> = {
      excludeSelectors: options.excludeSelectors || [],
      includeHidden: options.includeHidden ?? false,
      maxDepth: options.maxDepth ?? MAX_ELEMENT_DEPTH,
      chunkSize: options.chunkSize ?? CHUNK_SIZE,
    };

    try {
      // Start from body or documentElement
      const root = document.body || document.documentElement;
      return this.serializeElement(root, defaultOptions, 0);
    } catch (error) {
      console.error('[DOMCapture] Failed to capture DOM:', error);
      return null;
    }
  }

  /**
   * Convert serialized DOM to HTML string
   */
  public toHTML(serialized: SerializedElement | null): string {
    if (!serialized) return '';
    return this.elementToHTML(serialized);
  }

  /**
   * Split HTML into chunks
   */
  public chunkHTML(html: string, chunkSize: number = CHUNK_SIZE): string[] {
    if (html.length <= chunkSize) {
      return [html];
    }

    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < html.length) {
      let endPos = currentPos + chunkSize;
      
      // Try to break at a tag boundary
      if (endPos < html.length) {
        // Look backwards for a closing tag
        const lastClosingTag = html.lastIndexOf('>', endPos);
        const lastOpeningTag = html.lastIndexOf('<', endPos);
        
        if (lastClosingTag > currentPos && lastClosingTag > lastOpeningTag) {
          endPos = lastClosingTag + 1;
        } else if (lastOpeningTag > currentPos) {
          endPos = lastOpeningTag;
        }
      }

      chunks.push(html.substring(currentPos, endPos));
      currentPos = endPos;
    }

    return chunks;
  }

  /**
   * Capture DOM and return as chunks
   */
  public captureAndChunk(options: DOMCaptureOptions = {}): string[] {
    const chunkSize = options.chunkSize ?? CHUNK_SIZE;
    const serialized = this.captureDOM(options);
    
    if (!serialized) {
      return [];
    }

    const html = this.toHTML(serialized);
    return this.chunkHTML(html, chunkSize);
  }

  /**
   * Capture DOM and send chunks to server
   */
  public async captureAndSend(
    url: string,
    options: DOMCaptureOptions & {
      sessionId?: string;
      visitorId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ success: boolean; chunksSent: number; errors: string[] }> {
    const chunks = this.captureAndChunk(options);
    const errors: string[] = [];
    let successCount = 0;

    console.log(`[DOMCapture] Captured ${chunks.length} chunks, starting upload...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Call progress callback
      if (options.onProgress) {
        options.onProgress(i + 1, chunks.length);
      }

      // Call chunk ready callback
      if (options.onChunkReady) {
        options.onChunkReady(chunk, i, chunks.length);
      }

      try {
        const payload = {
          chunk,
          chunkIndex: i,
          totalChunks: chunks.length,
          sessionId: options.sessionId,
          visitorId: options.visitorId,
          metadata: {
            ...options.metadata,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify(payload),
          mode: 'cors',
          credentials: 'omit',
        });

        if (!response.ok) {
          const errorMsg = `Chunk ${i + 1}/${chunks.length} failed: HTTP ${response.status}`;
          console.error(`[DOMCapture] ${errorMsg}`);
          errors.push(errorMsg);
        } else {
          successCount++;
          console.log(`[DOMCapture] Chunk ${i + 1}/${chunks.length} sent successfully`);
        }
      } catch (error) {
        const errorMsg = `Chunk ${i + 1}/${chunks.length} failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[DOMCapture] ${errorMsg}`);
        errors.push(errorMsg);
      }

      // Small delay between chunks to avoid overwhelming the server
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[DOMCapture] Sent ${successCount}/${chunks.length} chunks successfully`);

    return {
      success: successCount === chunks.length,
      chunksSent: successCount,
      errors,
    };
  }

  /**
   * Get DOM capture statistics
   */
  public getStats(options: DOMCaptureOptions = {}): {
    totalElements: number;
    totalSize: number;
    estimatedChunks: number;
  } {
    const serialized = this.captureDOM(options);
    
    if (!serialized) {
      return { totalElements: 0, totalSize: 0, estimatedChunks: 0 };
    }

    const html = this.toHTML(serialized);
    const chunkSize = options.chunkSize ?? CHUNK_SIZE;
    
    // Count total elements
    const countElements = (el: SerializedElement): number => {
      let count = 1;
      if (el.children) {
        for (const child of el.children) {
          count += countElements(child);
        }
      }
      return count;
    };

    return {
      totalElements: countElements(serialized),
      totalSize: html.length,
      estimatedChunks: Math.ceil(html.length / chunkSize),
    };
  }
}

// Export singleton instance
export const domCapture = new DOMCapture();

// Export helper functions for convenience
export const captureDOMChunks = (options?: DOMCaptureOptions) => 
  domCapture.captureAndChunk(options);

export const sendDOMToServer = (url: string, options?: DOMCaptureOptions & {
  sessionId?: string;
  visitorId?: string;
  metadata?: Record<string, any>;
}) => domCapture.captureAndSend(url, options);

export const getDOMStats = (options?: DOMCaptureOptions) => 
  domCapture.getStats(options);

