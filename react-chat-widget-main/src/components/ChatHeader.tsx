import React from 'react';
import { ChatWidgetConfig, ThemeColors } from '@/types';
import { CloseIcon } from './icons/CloseIcon';
import { BotIcon } from './icons/BotIcon';
import { InstagramIcon } from './icons/InstagramIcon';
import { FacebookIcon } from './icons/FacebookIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';

interface ChatHeaderProps {
  config: ChatWidgetConfig;
  onClose: () => void;
  colors: ThemeColors;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ config, onClose, colors }) => {
  const socials = config.socials || {};

  const handleSocialClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        fontWeight: 600,
        userSelect: 'none',
        position: 'relative',
        color: colors.text,
        fontSize: '16px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          padding: '4px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          backgroundColor: colors.iconBackground,
          color: "white",
          boxShadow: `
            0 8px 25px rgba(0, 0, 0, 0.1),
            0 4px 10px rgba(0, 0, 0, 0.05),
            0 2px 4px rgba(0, 0, 0, 0.05)
            `
        }}
        >
          <BotIcon />
        </div>
        <span>{'AlaraBot'}</span>
        <span style={{ 
          width: '8px', 
          height: '8px', 
          backgroundColor: '#4DE944', 
          borderRadius: '50%' 
        }}></span>
      </div>
      
      {/* Social Media Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
        {socials.instagram && (
          <button
            onClick={() => handleSocialClick(socials.instagram!)}
            style={{
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 200ms',
              padding: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 0,
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              color: 'white',
              boxShadow: `
                0 4px 12px rgba(0, 0, 0, 0.1),
                0 2px 6px rgba(0, 0, 0, 0.05)
                `
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
            }}
            aria-label="Instagram"
          >
            <InstagramIcon />
          </button>
        )}
        
        {socials.facebook && (
          <button
            onClick={() => handleSocialClick(socials.facebook!)}
            style={{
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 200ms',
              padding: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 0,
              backgroundColor: '#1A5FC7',
              color: 'white',
              boxShadow: `
                0 4px 12px rgba(0, 0, 0, 0.1),
                0 2px 6px rgba(0, 0, 0, 0.05)
                `
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1A5FC7';
            }}
            aria-label="Facebook"
          >
            <FacebookIcon />
          </button>
        )}
        
        {socials.telegram && (
          <button
            onClick={() => handleSocialClick(socials.telegram!)}
            style={{
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 200ms',
              padding: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 0,
              backgroundColor: '#37AEE2',
              color: 'white',
              boxShadow: `
                0 4px 12px rgba(0, 0, 0, 0.1),
                0 2px 6px rgba(0, 0, 0, 0.05)
                `
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#37AEE2';
            }}
            aria-label="Telegram"
          >
            <TelegramIcon />
          </button>
        )}
        
        {socials.whatsapp && (
          <button
            onClick={() => handleSocialClick(socials.whatsapp!)}
            style={{
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 200ms',
              padding: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 0,
              backgroundColor: '#25D366',
              color: 'white',
              boxShadow: `
                0 4px 12px rgba(0, 0, 0, 0.1),
                0 2px 6px rgba(0, 0, 0, 0.05)
                `
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#25D366';
            }}
            aria-label="WhatsApp"
          >
            <WhatsAppIcon />
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        style={{
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 200ms',
          padding: '4px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 0,
          backgroundColor: colors.primary,
          color: colors.textSecondary,
          boxShadow: `
            0 8px 25px rgba(0, 0, 0, 0.1),
            0 4px 10px rgba(0, 0, 0, 0.05),
            0 2px 4px rgba(0, 0, 0, 0.05)
            `
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.textSecondary + '33'; // 20% opacity
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.primary;
        }}
        aria-label="Close chat"
      >
        <CloseIcon />   
      </button>
    </div>
  );
};