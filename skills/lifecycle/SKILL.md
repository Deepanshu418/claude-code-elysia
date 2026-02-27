---
description: Create Elysia lifecycle hooks for logging, error handling, and transformations
disable-model-invocation: true
---

Create an Elysia lifecycle hook for: $ARGUMENTS

## Lifecycle Events (in order)

```
Request → onRequest → onParse → onTransform → beforeHandle → [Handler] → afterHandle → onResponse
                                    ↓
                                onError (if error occurs)
```

## 1. onRequest - First event, before routing
```typescript
app.onRequest(({ request, path, method }) => {
  console.log(`[${new Date().toISOString()}] ${method} ${path}`)
})
```

## 2. onParse - Custom body parsing
```typescript
app.onParse(({ request, contentType }) => {
  if (contentType === 'application/custom') {
    return request.text().then(parseCustomFormat)
  }
})
```

## 3. onTransform - Modify request/response
```typescript
app.onTransform(({ set }) => {
  set.headers['x-request-id'] = crypto.randomUUID()
})
```

## 4. beforeHandle - Before route handler (for validation, auth checks)
```typescript
app.beforeHandle(({ path, headers, error }) => {
  // Rate limiting example
  const ip = headers['x-forwarded-for']
  if (isRateLimited(ip)) {
    return error(429, { message: 'Too many requests' })
  }
})
```

## 5. afterHandle - After route handler, can modify response
```typescript
app.afterHandle(({ response, set }) => {
  // Wrap all responses in standard format
  set.headers['x-response-time'] = `${Date.now() - startTime}ms`
  return { success: true, data: response }
})
```

## 6. onError - Centralized error handling
```typescript
import { ZodError } from 'zod'

app.onError(({ code, error, set }) => {
  set.status = code

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    set.status = 400
    return {
      success: false,
      message: 'Validation failed',
      errors: error.errors
    }
  }

  // Handle specific error codes
  switch (code) {
    case 'NOT_FOUND':
      return { success: false, message: 'Resource not found' }
    case 'VALIDATION':
      return { success: false, message: 'Validation error', details: error.message }
    case 'PARSE':
      return { success: false, message: 'Invalid request body' }
    case 'INTERNAL_SERVER_ERROR':
      console.error('Server error:', error)
      return { success: false, message: 'Internal server error' }
    default:
      return { success: false, message: error.message }
  }
})
```

## 7. onResponse - Final response processing
```typescript
app.onResponse(({ request, response, set }) => {
  const duration = Date.now() - startTime
  logger.info({
    method: request.method,
    path: new URL(request.url).pathname,
    status: set.status,
    duration
  })
})
```

## 8. onStop - Cleanup on server shutdown
```typescript
app.onStop(async () => {
  await db.disconnect()
  await cache.quit()
  console.log('Server shutdown complete')
})
```

## Complete Logging Plugin Example
```typescript
const loggerPlugin = new Elysia({ name: 'logger' })
  .state('startTime', 0)
  .onRequest(({ store, request, path }) => {
    store.startTime = Date.now()
    console.log(`→ ${request.method} ${path}`)
  })
  .onResponse(({ store, request, set }) => {
    const duration = Date.now() - store.startTime
    console.log(`← ${request.method} ${new URL(request.url).pathname} ${set.status} (${duration}ms)`)
  })
  .onError(({ code, error, request }) => {
    console.error(`✗ ${request.method} ${new URL(request.url).pathname}: ${code}`, error)
  })
```

## Scoped vs Global Lifecycle
```typescript
// Scoped - only affects routes defined after
app.group('/api', (app) =>
  app
    .onRequest(() => console.log('API request'))  // Only for /api/*
    .get('/users', () => users)
)

// Global - affects all routes
app.onRequest(() => console.log('Global'))  // For all routes
```