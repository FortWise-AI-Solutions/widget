import { ThemeColors, Theme } from '@/types';

export const themes: Record<Theme, ThemeColors> = {
    light: {
        primary: '#FFFFFF',
        primaryHover: '#EEEEEE',
        secondary: '#f8f9fa',
        background: '#ffffff',
        text: '#000000',
        textSecondary: '#6b7280',
        userMessage: '#E1E1E1',
        errorMessage: '#dc2626',
        errorBackground: '#fef2f2',
        iconBackground: '#5190EE'
      },
      dark: {
        primary: '#0E1621',
        primaryHover: '#17212B',
        secondary: '#1f2937',
        background: '#17212B',
        text: '#f9fafb',
        textSecondary: '#9ca3af',
        userMessage: '#E1E1E1',
        errorMessage: '#ef4444',
        errorBackground: '#1f1b24',
        iconBackground: '#1A5FC7'
      }
};

export const getThemeColors = (theme: 'light' | 'dark' = 'light'): ThemeColors => {
    return themes[theme];
};