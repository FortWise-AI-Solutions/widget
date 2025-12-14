import React from 'react';
import { ChatWidgetConfig, ThemeColors } from '@/types';
import { ChatButtonIcon } from './icons/ChatButtonIcon';

interface ChatButtonProps {
  config: ChatWidgetConfig;
  onClick: () => void;
  hasNotification: boolean;
  isHiding: boolean;
  colors: ThemeColors;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  config,
  onClick,
  hasNotification,
  isHiding,
  colors
}) => {
  const positionStyle = config.style?.position === 'left' ? { left: '48px' } : { right: '48px' };
  
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '48px',
        ...positionStyle,
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        transform: isHiding ? 'scale(0.75)' : 'scale(1)',
        transition: 'all 300ms ease-in-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        border: 'none',
        outline: 'none',
        opacity: isHiding ? 0 : 1,
        pointerEvents: isHiding ? 'none' : 'auto',
        cursor: 'pointer',
        backgroundColor: colors.primary,
        boxShadow: `
          0 8px 25px rgba(0, 0, 0, 0.3),
          0 4px 10px rgba(0, 0, 0, 0.2),
          0 2px 4px rgba(0, 0, 0, 0.1)
        `
      }}
      onMouseEnter={(e) => {
        if (!isHiding) {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = colors.primaryHover;
          e.currentTarget.style.boxShadow = `
            0 12px 35px rgba(0, 0, 0, 0.4),
            0 6px 15px rgba(0, 0, 0, 0.3),
            0 3px 6px rgba(0, 0, 0, 0.2)
          `;
        }
      }}
      onMouseLeave={(e) => {
        if (!isHiding) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = colors.primary;
          e.currentTarget.style.boxShadow = `
            0 8px 25px rgba(0, 0, 0, 0.3),
            0 4px 10px rgba(0, 0, 0, 0.2),
            0 2px 4px rgba(0, 0, 0, 0.1)
          `;
        }
      }}
      onMouseDown={(e) => {
        if (!isHiding) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseUp={(e) => {
        if (!isHiding) {
          e.currentTarget.style.transform = 'scale(1.1)';
        }
      }}
      aria-label="Open chat"
    >
      <ChatButtonIcon />
      {hasNotification && (
        <span 
          style={{ 
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: colors.errorMessage
          }}
        />
      )}
    </button>
  );
};
