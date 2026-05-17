# medusa-payment-paykeeper

Платежный провайдер [Paykeeper](https://paykeeper.ru) для Medusa v2.

## Архитектура

Пакет реализован как переиспользуемый модуль платежного провайдера Medusa v2 в соответствии с официальной архитектурой:

- **`ModuleProvider(Modules.PAYMENT, ...)`** — точка входа, регистрирует сервис как платежного провайдера
- **`PaykeeperProviderService extends AbstractPaymentProvider`** — основной класс, реализует все обязательные методы платежного провайдера
- **Вебхук** — отдельный API route для приема уведомлений от Paykeeper

## Файлы

```
packages/medusa-payment-paykeeper/
├── package.json                          # npm-пакет
├── tsconfig.json                         # Настройки TypeScript для сборки
├── LICENSE
├── README.md
└── src/
    ├── index.ts                          # ModuleProvider — регистрация провайдера
    ├── types.ts                          # PaykeeperOptions, типы API-ответов
    ├── services/
    │   └── paykeeper-provider.ts         # Основной класс платежного провайдера
    └── api/
        └── hooks/
            └── payment/
                └── paykeeper/
                    └── route.ts          # Вебхук для уведомлений от Paykeeper
```

## Установка и подключение

### 1. Установка пакета

```bash
# Если пакет опубликован в npm:
npm add medusa-payment-paykeeper

# Или локально через workspace (pnpm-workspace.yaml):
pnpm add medusa-payment-paykeeper@workspace:*
```

### 2. Регистрация в medusa-config.ts

```ts
import { Modules } from "@medusajs/framework/utils"

module.exports = defineConfig({
  modules: {
    [Modules.PAYMENT]: {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "medusa-payment-paykeeper",
            id: "paykeeper",
            options: {
              server: process.env.PAYKEEPER_SERVER,
              login: process.env.PAYKEEPER_LOGIN,
              password: process.env.PAYKEEPER_PASSWORD,
              secret_word: process.env.PAYKEEPER_SECRET_WORD,
              storefront_url: process.env.STOREFRONT_URL,
            },
          },
        ],
      },
    },
  },
})
```

Параметр `id` определяет идентификатор провайдера. В корзине и платежных сессиях он будет выглядеть как `pp_paykeeper` (префикс `pp_` добавляется автоматически).

### 3. Опции провайдера

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `server` | `string` | да | URL сервера Paykeeper (напр. `https://kassa-xxxx.server.paykeeper.ru`) |
| `login` | `string` | да | Логин от личного кабинета Paykeeper |
| `password` | `string` | да | Пароль от личного кабинета Paykeeper |
| `secret_word` | `string` | да | Секретное слово для проверки подписи вебхуков |
| `storefront_url` | `string` | да | URL витрины для редиректа после оплаты (напр. `https://example.com`) |

### 4. Настройка вебхука

Paykeeper присылает уведомления об изменении статуса платежа на указанный URL. Этот URL нужно зарегистрировать в личном кабинете Paykeeper.

**Формат вебхука:** `https://your-medusa-backend.com/hooks/payment/paykeeper`

**Необходимые middleware:**

```ts
// src/api/middlewares.ts — в корне вашего Medusa-приложения
import { defineMiddlewares } from "@medusajs/medusa"
import { urlencoded } from "express"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/hooks/payment/paykeeper",
      method: "POST",
      middlewares: [urlencoded({ extended: true })],
    },
  ],
})
```

Paykeeper отправляет данные в формате `application/x-www-form-urlencoded`, поэтому нужен соответствующий парсер.

Если пакет используется как плагин Medusa (через `plugins`), API-route из `src/api/` подхватится автоматически — middleware всё равно нужно добавить вручную.

## Как это работает

### Поток оплаты

```
1. Чекаут → выбор Paykeeper
       ↓
2. initiatePayment()
   ─ получает токен от Paykeeper API
   ─ создает счет (invoice) с суммой, orderid, email клиента
   ─ возвращает URL оплаты
       ↓
3. Покупатель редиректится на invoice_url (платежная страница Paykeeper)
       ↓
4. После оплаты → редирект на storefront/callback?cart_id=...
       ↓
5. Storefront перенаправляет на /checkout?step=review
       ↓
6. Place Order → authorizePayment()
   ─ запрашивает статус счета у Paykeeper
   ─ если статус "paid" → возвращает AUTHORIZED
       ↓
7. Medusa создает заказ
```

### Вебхук (альтернативный способ)

Paykeeper может присылать HTTP-уведомления на бэкенд. Обработчик:

1. Проверяет MD5-подпись: `md5(id + sum + clientid + orderid + secret_word)`
2. Если подпись верна — эмитит событие `WebhookReceived`
3. Отвечает `OK <md5(id + secret_word)>` (Paykeeper ожидает именно такой ответ)

### Методы провайдера

| Метод | Что делает |
|---|---|
| `initiatePayment` | Создает счет в Paykeeper, возвращает URL для редиректа |
| `authorizePayment` | Проверяет статус счета по API Paykeeper |
| `capturePayment` | Подтверждает платеж (захват средств) |
| `refundPayment` | Возвращает средства покупателю |
| `getPaymentStatus` | Проверяет текущий статус платежа |
| `cancelPayment` | Отменяет платеж |
| `deletePayment` | Удаляет платежную сессию |
| `getWebhookActionAndData` | Обрабатывает данные вебхука, проверяет подпись |

## Интеграция с витриной (Storefront)

### constants.ts

```ts
// Добавьте в paymentInfoMap:
pp_paykeeper: {
  title: "Paykeeper",
  icon: <CreditCard />,  // или ваш компонент иконки
}

// Хелпер:
export function isPaykeeper(providerId: string) {
  return providerId?.startsWith("pp_paykeeper")
}
```

### Редирект на Paykeeper

После `initiatePaymentSession()` при выборе Paykeeper:

```ts
if (isPaykeeper(selectedPaymentMethod)) {
  const session = cart.payment_collection?.payment_sessions?.find(
    s => s.status === "pending"
  )
  sessionStorage.setItem("paykeeper_cart_id", cart.id)
  window.location.href = session?.data?.invoice_url
}
```

### Страница callback

Создайте страницу `/payments/callback` на витрине:

```ts
// Читает cart_id и result из URL
// При success: sessionStorage.setItem("paykeeper_paid", "true")
// Редирект на /checkout?step=review
```

### Кнопка Place Order

При оформлении заказа проверьте sessionStorage и вызовите `completeCart()`:

```ts
const paid = sessionStorage.getItem("paykeeper_paid")
if (paid) {
  sessionStorage.removeItem("paykeeper_paid")
  sessionStorage.removeItem("paykeeper_cart_id")
  // Place order
}
```

## Разработка

```bash
# Сборка
pnpm build

# Разработка (watch)
pnpm watch
```

## Лицензия

MIT
