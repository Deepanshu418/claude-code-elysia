---
description: Create Elysia decorators for extending context with custom methods and properties
disable-model-invocation: true
---

Create an Elysia decorator for: $ARGUMENTS

## Decorator Patterns

Decorators extend the context with additional methods and properties.

### 1. Basic Decorator
```typescript
app.decorate('getDate', () => new Date())
  .get('/time', ({ getDate }) => ({ time: getDate() }))
```

### 2. Decorate with Type Safety
```typescript
// Elysia infers types from decorate
app
  .decorate('db', createDb())
  .decorate('logger', console)
  .get('/users', async ({ db, logger }) => {
    logger.log('Fetching users')
    return db.query('SELECT * FROM users')
  })
```

### 3. Service Pattern with Decorators
```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'

type UserService = {
  findById: (id: string) => Promise<User>
  create: (data: CreateUserInput) => Promise<User>
  update: (id: string, data: UpdateUserInput) => Promise<User>
  delete: (id: string) => Promise<void>
}

const userService: UserService = {
  findById: async (id) => { /* ... */ },
  create: async (data) => { /* ... */ },
  update: async (id, data) => { /* ... */ },
  delete: async (id) => { /* ... */ }
}

// Create typed plugin
const userPlugin = new Elysia({ name: 'user-service' })
  .decorate('users', userService)

// Usage
new Elysia()
  .use(userPlugin)
  .get('/users/:id', async ({ users, params }) => {
    return users.findById(params.id)
  })
```

### 4. Repository Pattern
```typescript
const createRepository = <T extends { id: string }>(table: string) => ({
  findAll: async (): Promise<T[]> => db.query(`SELECT * FROM ${table}`),
  findById: async (id: string): Promise<T | null> =>
    db.queryOne(`SELECT * FROM ${table} WHERE id = $1`, [id]),
  create: async (data: Omit<T, 'id'>): Promise<T> => { /* ... */ },
  update: async (id: string, data: Partial<T>): Promise<T> => { /* ... */ },
  delete: async (id: string): Promise<void> => { /* ... */ }
})

// Usage
app
  .decorate('userRepository', createRepository<User>('users'))
  .decorate('postRepository', createRepository<Post>('posts'))
```

### 5. Decorate vs Derive

Use `decorate` for:
- Static values and functions
- Services and utilities
- Things that don't depend on request context

Use `derive` for:
- Values computed from request (headers, params, etc.)
- Authentication/user context
- Request-scoped data

```typescript
// DECORATE - Static, same for all requests
app.decorate('config', { apiVersion: '1.0' })

// DERIVE - Computed per request
app.derive({ as: 'scoped' }, async ({ headers }) => {
  const user = await getUserFromToken(headers.authorization)
  return { user }
})
```

### 6. Composing Multiple Decorators
```typescript
const servicesPlugin = new Elysia({ name: 'services' })
  .decorate('db', db)
  .decorate('cache', cache)
  .decorate('queue', queue)
  .decorate('logger', logger)

const utilsPlugin = new Elysia({ name: 'utils' })
  .decorate('validate', <T>(schema: z.ZodSchema<T>, data: unknown): T => {
    return schema.parse(data)
  })
  .decorate('format', {
    success: <T>(data: T) => ({ success: true, data }),
    error: (message: string, code = 400) => ({ success: false, message, code })
  })

// Use all together
new Elysia()
  .use(servicesPlugin)
  .use(utilsPlugin)
  .post('/users', async ({ body, db, validate, format, UserSchema }) => {
    const data = validate(UserSchema, body)
    const user = await db.users.create(data)
    return format.success(user)
  })
```

### 7. Request-Scoped Decorators
```typescript
// Use derive for request-scoped values
app
  .decorate('baseUri', 'https://api.example.com')
  .derive({ as: 'scoped' }, ({ request, baseUri }) => ({
    fullUrl: baseUri + new URL(request.url).pathname,
    requestId: crypto.randomUUID()
  }))
```

## Best Practices
1. Use plugins with `{ name: 'plugin-name' }` for dependency injection
2. Group related decorators in a single plugin
3. Use TypeScript for type inference
4. Keep decorators pure (no side effects)
5. Use `derive` for request-dependent values