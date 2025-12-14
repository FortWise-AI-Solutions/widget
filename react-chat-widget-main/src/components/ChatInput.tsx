import React, { useState, KeyboardEvent } from 'react';
import { ChatWidgetConfig, ThemeColors } from '@/types';
import { SendIcon } from './icons/SendIcon';

interface ChatInputProps {
  config: ChatWidgetConfig;
  onSend: (message: string) => void;
  disabled: boolean;
  colors: ThemeColors;
}

export const ChatInput: React.FC<ChatInputProps> = ({ config, onSend, disabled, colors }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className="p-3 flex gap-3"
    >
      <div className="flex-1 flex items-center">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown ={handleKeyPress}
          placeholder={config.messages?.placeholder || 'Enter your message'}
          disabled={disabled}
          className="w-full p-3 pr-12 rounded-3xl outline-none transition-all duration-200 resize-none disabled:opacity-60"
          style={{
            backgroundColor: colors.primary,
            border: `1px solid ${colors.primaryHover}`,
            color: colors.text,
            fontSize: '14px'
          }}
          autoComplete="off"
          aria-label="Message input"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="absolute right-6 top-1/2 transform -translate-y-1/2 p-2 border-none cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-80"
          style={{
            backgroundColor: 'transparent'
          }}
          aria-label="Send message"
        >
          <SendIcon fill={colors.text} />
        </button>
      </div> 
    </div>
  );
};