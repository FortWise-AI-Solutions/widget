import React from 'react';
import { Message as MessageType, ChatWidgetConfig, ThemeColors } from '@/types';
import UserIcon from './icons/UserIcon';
import { linkify } from '@/utils/linkify';

interface MessageProps {
  message: MessageType;
  config: ChatWidgetConfig;
  colors: ThemeColors;
}

export const Message: React.FC<MessageProps> = ({ message, config, colors }) => {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getMessageStyle = () => {
    const baseStyle = {
      marginBottom: '0px',
      padding: '12px 16px',
      fontSize: '14px',
      lineHeight: '1.5',
      wordWrap: 'break-word' as const,
      maxWidth: '85%',
      minWidth: '60px',
      width: 'fit-content' as const,
      display: 'block' as const,
      clear: 'both' as const,
      position: 'relative' as const
    };

    if (isUser) {
      return {
        ...baseStyle,
        backgroundColor: "transparent",
        color: colors.text,
        marginLeft: 'auto',
        marginRight: '0px',
        borderRadius: '15px 15px 1px 15px',
        border: `1px solid ${colors.userMessage}`
      };
    } else if (isError) {
      return {
        ...baseStyle,
        backgroundColor: colors.errorBackground,
        color: colors.errorMessage,
        marginRight: 'auto',
        marginLeft: '0px',
        borderRadius: '15px 15px 15px 1px',
        border: `1px solid ${colors.errorMessage}`
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: colors.text,
        marginRight: 'auto',
        marginLeft: '0px',
        borderRadius: '15px 15px 15px 1px',
        border: `1px solid ${colors.userMessage}`
      };
    }
  };

  return (
    <div className="animate-[messageSlide_0.3s_ease-out]">
      {isUser ? (
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <div style={getMessageStyle()}>
            {message.isHTML ? (
              <div dangerouslySetInnerHTML={{ __html: message.content }} />
            ) : (
              message.content
            )}
          </div>
          <div style={{
            width: '35px',
            height: '35px',
            borderRadius: '8px',
            backgroundColor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: "white",
            flexShrink: 0
          }}>
            <div className="w-full h-full rounded-xl flex items-center justify-center" style={{backgroundColor: colors.iconBackground}}>
              <UserIcon fill={"white"} />
            </div>
          </div>
        </div>
      ) : (
        <div style={getMessageStyle()}>
          {message.isHTML ? (
            React.useMemo(() => {
              const linkified = linkify(message.content);
              return linkified.isHTML ? 
                <div dangerouslySetInnerHTML={{ __html: linkified.content }} /> : 
                message.content;
            }, [message.content])  
          ) : (
            message.content
          )}
        </div>
      )}
      <div 
        style={{
          fontSize: '12px',
          color: colors.textSecondary,
          marginBottom: '24px',
          ...(isUser ? { marginLeft: 'auto', marginRight: '45px', textAlign: 'right' as const } : { marginLeft: '8px' })
        }}
      >
        {formatTime(message.timestamp)}
      </div>
    </div>
  );
};