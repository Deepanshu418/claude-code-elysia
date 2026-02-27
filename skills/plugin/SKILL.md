---
description: Create reusable Elysia plugins with state, derive, and composition
disable-model-invocation: true
---

Create an Elysia plugin for: $ARGUMENTS

## Plugin Fundamentals

Plugins are reusable Elysia instances that can be composed with `.use()`.

### 1. Basic Plugin Structure
```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'

// Always name your plugin for dependency injection
const myPlugin = new Elysia({ name: 'my-plugin' })
  .state('counter', 0)
  .derive(({ store }) => ({
    increment: () => ++store.counter,
    decrement: () => --store.counter
  }))

// Usage
new Elysia()
  .use(myPlugin)
  .get('/count', ({ store }) => ({ count: store.counter }))
  .get('/increment', ({ increment }) => { increment(); return { ok: true } })
```

### 2. Plugin with Configuration
```typescript
type Config = {
  prefix: string
  maxItems: number
  logging: boolean
}

const createItemPlugin = (config: Config) => new Elysia({ name: 'items' })
  .state('items', [] as string[])
  .derive(({ store }) => ({
    addItem: (item: string) => {
      if (store.items.length >= config.maxItems) {
        throw new Error('Max items reached')
      }
      store.items.push(item)
      if (config.logging) console.log('Added:', item)
    }
  }))
  .group(config.prefix, (app) =>
    app
      .get('/', ({ store }) => store.items)
      .post('/', ({ body, addItem }) => {
        addItem(body.item)
        return { success: true }
      }, {
        body: z.object({ item: z.string() })
      })
  )

// Usage
new Elysia()
  .use(createItemPlugin({ prefix: '/items', maxItems: 100, logging: true }))
```

### 3. Database Plugin Pattern
```typescript
import { Database } from 'bun:sqlite'

type DbConfig = {
  path: string
}

const dbPlugin = (config: DbConfig) => new Elysia({ name: 'db' })
  .state('db', new Database(config.path))
  .derive(({ store }) => ({
    db: store.db
  }))
  .onStop(({ store }) => {
    store.db.close()
  })

// Usage
new Elysia()
  .use(dbPlugin({ path: './data.db' }))
  .get('/users', ({ db }) => {
    return db.query('SELECT * FROM users').all()
  })
```

### 4. Authentication Plugin
```typescript
import { verify } from 'jsonwebtoken'

type AuthConfig = {
  secret: string
  excludedPaths: string[]
}

const authPlugin = (config: AuthConfig) => new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, async ({ headers, path, error }) => {
    // Skip excluded paths
    if (config.excludedPaths.includes(path)) {
      return { user: null }
    }

    const token = headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return error(401, { message: 'Missing token' })
    }

    try {
      const payload = verify(token, config.secret)
      return { user: payload }
    } catch {
      return error(401, { message: 'Invalid token' })
    }
  })

// Usage
new Elysia()
  .use(authPlugin({
    secret: process.env.JWT_SECRET!,
    excludedPaths: ['/health', '/login', '/register']
  }))
  .get('/me', ({ user }) => user)
```

### 5. CORS Plugin
```typescript
const corsPlugin = (options?: {
  origin?: string | string[]
  methods?: string[]
  headers?: string[]
}) => new Elysia({ name: 'cors' })
  .onRequest(({ set }) => {
    set.headers['Access-Control-Allow-Origin'] = options?.origin ?? '*'
    set.headers['Access-Control-Allow-Methods'] = options?.methods?.join(', ') ?? 'GET, POST, PUT, DELETE, OPTIONS'
    set.headers['Access-Control-Allow-Headers'] = options?.headers?.join(', ') ?? 'Content-Type, Authorization'
  })
  .options('/*', () => '')
```

### 6. Plugin Composition
```typescript
// Base plugin with shared functionality
const basePlugin = new Elysia({ name: 'base' })
  .decorate('logger', console)
  .decorate('config', { version: '1.0' })

// Extended plugin
const apiPlugin = new Elysia({ name: 'api' })
  .use(basePlugin)
  .derive(({ logger, config }) => ({
    logRequest: (method: string, path: string) => {
      logger.log(`[${config.version}] ${method} ${path}`)
    }
  }))

// Compose everything
const app = new Elysia()
  .use(basePlugin)
  .use(apiPlugin)
```

### 7. Plugin with Lifecycle Hooks
```typescript
const loggingPlugin = new Elysia({ name: 'logging' })
  .state('startTime', 0)
  .onRequest(({ store, request, path }) => {
    store.startTime = Date.now()
  })
  .onResponse(({ store, request, set }) => {
    const duration = Date.now() - store.startTime
    console.log({
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status,
      duration: `${duration}ms`
    })
  })
  .onError(({ code, error, request }) => {
    console.error({
      method: request.method,
      path: new URL(request.url).pathname,
      error: code,
      message: error.message
    })
  })
```

## Plugin Naming Convention

Use descriptive names that reflect the plugin's purpose:
- `auth` - Authentication
- `db` - Database
- `logger` - Logging
- `cors` - CORS handling
- `rate-limit` - Rate limiting
- `users` - User domain
- `products` - Product domain

## Best Practices

1. **Always name plugins** - Required for dependency injection
2. **Use factory functions** - For configurable plugins
3. **Keep plugins focused** - Single responsibility
4. **Use `derive` with `{ as: 'scoped' }`** - For request-scoped data
5. **Clean up in `onStop`** - Close connections, clear intervals
6. **Export types** - For TypeScript consumers