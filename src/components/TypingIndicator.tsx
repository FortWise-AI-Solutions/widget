import React from 'react';
import { ChatWidgetConfig, ThemeColors } from '@/types';

interface TypingIndicatorProps {
  config: ChatWidgetConfig;
  colors: ThemeColors;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ config, colors }) => {
  return (
    <div 
      className="flex items-center gap-2 p-3 animate-[messageSlide_0.3s_ease-out] max-w-xs rounded-lg"
      style={{
        marginRight: 'auto',
        marginLeft: '8px',
      }}
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ 
              backgroundColor: colors.text,
              animation: `jump 0.6s ease infinite`,
              animationDelay: `${i * 0.1}s` 
            }}
          />
        ))}
      </div>
    </div>
  );
};
