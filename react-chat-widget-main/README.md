# React Chat Widget

Universal chat widget built with React for CDN deployment.

## Quick Start

```bash
npm install
npm run dev      # Development
npm run build:all    # Production build
```

## Integration

```html
<script>
window.ChatWidgetConfig = {
    key: 'client',
    botId: '12', // bot_id got from aminds of Alara 
    webhook: {
      url: 'https://admin-panel-server-3be3d9c3a642.herokuapp.com',
      route: 'webhooks/web'
    },
    style: {
      theme: 'light', // 'light' | 'dark'
      position: 'right' // 'left' | 'right'
    },
    features: {
      autoOpen: false, // Don't open automatically
      showTypingIndicator: true, // Show typing animation,
      enableErrorMonitoring: true, // enable error monitoring 
      maxErrorHistory: 50, // Maximum number of errors to keep in history
    },
    messages: {
      greeting: `Привет! Чем я могу помочь?`,
      placeholder: 'Напишите ваш вопрос...',
      errorMessage: 'Ошибка при подключении. Пожалуйста, попробуйте еще раз.',
      typingTimeoutMessage: 'Длительный ответ. Пожалуйста, попробуйте еще раз...'
    },
    socials: {
      instagram: 'https://www.instagram.com',
      facebook: 'https://www.facebook.com',
      telegram: 'https://www.telegram.com',
      whatsapp: 'https://www.whatsapp.com'
    }
  };
</script>
<script src="https://react-chat-widget-rosy.vercel.app/loader.iife.js" data-load="lazy"  data-key="client"></script>
```
