# Error Tracking System

Система отслеживания ошибок для React Chat Widget с хранением в session storage.

## Основные возможности

- ✅ Автоматическое отслеживание всех типов ошибок
- ✅ Хранение в session storage (автоматическая очистка через 24 часа)
- ✅ Детальная контекстная информация по каждой ошибке
- ✅ Статистика и аналитика ошибок
- ✅ Глобальный доступ для отладки через консоль
- ✅ Экспорт ошибок в JSON

## Типы отслеживаемых ошибок

### 1. **Timeout Errors** (`timeout`)
Когда ответ бота превышает лимит времени ожидания (по умолчанию ~3.3 минуты)

```javascript
{
  type: 'timeout',
  error: 'Typing indicator timeout exceeded',
  context: {
    chatId: 'chat_xxx',
    visitorId: 'visitor_xxx',
    timeoutDuration: 200000,
    lastPollingTimestamp: '2025-10-30T10:00:00.000Z'
  }
}
```

### 2. **Polling Errors** (`polling`)
Ошибки при получении сообщений от сервера

```javascript
{
  type: 'polling',
  error: 'HTTP 404: Not Found',
  context: {
    chatId: 'chat_xxx',
    visitorId: 'visitor_xxx',
    statusCode: 404,
    url: 'https://api.example.com',
    pollingInterval: 2000
  }
}
```

### 3. **Network Errors** (`network`)
Сетевые ошибки (Failed to fetch, NetworkError)
> **Note:** Эти ошибки отслеживаются, но не показываются пользователю

```javascript
{
  type: 'network',
  error: 'Failed to fetch',
  context: {
    chatId: 'chat_xxx',
    visitorId: 'visitor_xxx',
    url: 'https://api.example.com',
    silent: true
  }
}
```

### 4. **Send Message Errors** (`send_message`)
Ошибки при отправке сообщений

```javascript
{
  type: 'send_message',
  error: 'HTTP 500: Internal Server Error',
  context: {
    chatId: 'chat_xxx',
    visitorId: 'visitor_xxx',
    statusCode: 500,
    url: 'https://api.example.com',
    webhookMode: true
  }
}
```

### 5. **Session Errors** (`session`)
Ошибки сессии (Session not found, Session expired)

```javascript
{
  type: 'session',
  error: 'Session not found',
  context: {
    chatId: 'chat_xxx',
    visitorId: 'visitor_xxx',
    action: 'auto_refresh'
  }
}
```

## Использование через консоль браузера

### Доступ к ErrorTracker

```javascript
// Глобальный доступ
window.chatErrorTracker
```

### Основные команды

#### Получить все ошибки
```javascript
window.chatErrorTracker.getAll()
```

#### Получить последние 10 ошибок
```javascript
window.chatErrorTracker.getRecent(10)
```

#### Получить неразрешенные ошибки
```javascript
window.chatErrorTracker.getUnresolved()
```

#### Получить ошибки по типу
```javascript
// Все timeout ошибки
window.chatErrorTracker.getByType('timeout')

// Все сетевые ошибки
window.chatErrorTracker.getByType('network')

// Все ошибки отправки сообщений
window.chatErrorTracker.getByType('send_message')
```

#### Статистика
```javascript
window.chatErrorTracker.getStats()
// Возвращает:
// {
//   total: 15,
//   unresolved: 3,
//   byType: { timeout: 2, polling: 5, network: 8 },
//   last24h: 12
// }
```

#### Красивый отчет в консоль
```javascript
window.chatErrorTracker.printReport()
// Выводит форматированный отчет с последними ошибками
```

#### Экспорт для отладки
```javascript
// Получить JSON со всеми ошибками
const errorLog = window.chatErrorTracker.export()

// Скопировать в буфер обмена
copy(errorLog)

// Или скачать как файл
const blob = new Blob([errorLog], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `chat-errors-${Date.now()}.json`
a.click()
```

#### Очистка ошибок
```javascript
// Очистить все ошибки
window.chatErrorTracker.clear()

// Очистить только разрешенные ошибки
window.chatErrorTracker.clearResolved()
```

#### Пометить ошибку как разрешенную
```javascript
// Получить ID ошибки
const errors = window.chatErrorTracker.getUnresolved()
const errorId = errors[0].id

// Пометить как разрешенную
window.chatErrorTracker.resolve(errorId)
```

## Мониторинг ошибок в реальном времени

### Вариант 1: Проверка в консоли
```javascript
// Установить интервал проверки
setInterval(() => {
  const unresolved = window.chatErrorTracker.getUnresolved()
  if (unresolved.length > 0) {
    console.warn('Unresolved errors:', unresolved.length)
    window.chatErrorTracker.printReport()
  }
}, 10000) // каждые 10 секунд
```

### Вариант 2: Слушать логи консоли
```javascript
// Все ошибки автоматически логируются с префиксом [ErrorTracker]
// Можно использовать фильтр консоли: "[ErrorTracker]"
```

### Вариант 3: Интеграция с внешним сервисом
```javascript
// Отправлять ошибки на внешний сервис
const sendToMonitoring = () => {
  const unresolved = window.chatErrorTracker.getUnresolved()
  if (unresolved.length > 0) {
    fetch('https://your-monitoring-service.com/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unresolved)
    }).then(() => {
      // Пометить как отправленные
      unresolved.forEach(e => window.chatErrorTracker.resolve(e.id))
    })
  }
}

// Отправлять каждые 5 минут
setInterval(sendToMonitoring, 5 * 60 * 1000)
```

## Примеры использования

### Отладка проблем с таймаутом
```javascript
// 1. Получить все timeout ошибки
const timeoutErrors = window.chatErrorTracker.getByType('timeout')

// 2. Проверить настройки таймаута
timeoutErrors.forEach(error => {
  console.log('Timeout duration:', error.context.timeoutDuration, 'ms')
  console.log('Last polling:', error.context.lastPollingTimestamp)
})

// 3. Если таймауты происходят часто, можно увеличить время
// через config.features.typingTimeout
```

### Мониторинг сетевых проблем
```javascript
// Получить статистику по типам ошибок
const stats = window.chatErrorTracker.getStats()

// Если много network errors - проблемы с соединением
if (stats.byType.network > 10) {
  console.warn('⚠️ Много сетевых ошибок, возможны проблемы с подключением')
  
  // Посмотреть детали
  const networkErrors = window.chatErrorTracker.getByType('network')
  console.table(networkErrors.map(e => ({
    time: e.timestamp,
    error: e.error,
    url: e.context.url
  })))
}
```

### Анализ критических ошибок
```javascript
// Найти критические ошибки (Bot not found и т.д.)
const criticalErrors = window.chatErrorTracker.getAll().filter(e => 
  e.context?.critical === true
)

if (criticalErrors.length > 0) {
  console.error('🚨 Критические ошибки:')
  criticalErrors.forEach(e => {
    console.error(`[${e.type}] ${e.error}`, e.context)
  })
}
```

## Автоматическая очистка

- Ошибки старше **24 часов** автоматически удаляются
- Хранится максимум **100 последних ошибок**
- При перезагрузке страницы данные сохраняются (session storage)
- При закрытии вкладки все данные удаляются

## Best Practices

1. **Регулярно проверяйте статистику** - используйте `printReport()` для быстрого обзора
2. **Экспортируйте логи** перед важными тестами - используйте `export()` для сохранения состояния
3. **Мониторьте unresolved ошибки** - это активные проблемы, требующие внимания
4. **Используйте фильтры по типу** - для целевой диагностики конкретных проблем
5. **Интегрируйте с CI/CD** - отправляйте критические ошибки в систему мониторинга

## API Reference

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `track()` | `type, error, context?` | `string` | Отслеживает новую ошибку, возвращает ID |
| `resolve()` | `errorId` | `void` | Помечает ошибку как разрешенную |
| `getAll()` | - | `TrackedError[]` | Возвращает все ошибки |
| `getByType()` | `type` | `TrackedError[]` | Возвращает ошибки определенного типа |
| `getUnresolved()` | - | `TrackedError[]` | Возвращает неразрешенные ошибки |
| `getRecent()` | `count?` | `TrackedError[]` | Возвращает N последних ошибок (default: 10) |
| `getStats()` | - | `Object` | Возвращает статистику |
| `clear()` | - | `void` | Удаляет все ошибки |
| `clearResolved()` | - | `void` | Удаляет разрешенные ошибки |
| `export()` | - | `string` | Экспортирует все данные в JSON |
| `printReport()` | - | `void` | Выводит отчет в консоль |

### Types

```typescript
interface TrackedError {
  id: string;
  timestamp: string;
  type: 'polling' | 'send_message' | 'network' | 'timeout' | 'session' | 'unknown';
  error: string;
  context?: {
    chatId?: string;
    visitorId?: string;
    url?: string;
    statusCode?: number;
    [key: string]: any;
  };
  resolved?: boolean;
}
```

