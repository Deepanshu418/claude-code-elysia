---
description: Create Elysia guards for authentication, validation, and middleware
disable-model-invoke: true
---

Create an Elysia guard/middleware for: $ARGUMENTS

## Guard Patterns with Zod

### 1. Schema Validation Guard
```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'

// Apply validation to multiple routes
const UserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email()
})

app.guard({
  body: UserSchema
}, (app) =>
  app
    .post('/profile', ({ body }) => updateProfile(body))
    .put('/settings', ({ body }) => updateSettings(body))
)
```

### 2. Authentication Guard (Derive Pattern)
```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'

const authPlugin = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, async ({ headers, error }) => {
    const auth = headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      return error(401, { success: false, message: 'Missing token' })
    }

    const token = auth.slice(7)
    const user = await verifyToken(token)

    if (!user) {
      return error(401, { success: false, message: 'Invalid token' })
    }

    return { user }
  })

// Usage
new Elysia()
  .use(authPlugin)
  .get('/me', ({ user }) => user)  // user is typed and available
```

### 3. Request Validation Guard
```typescript
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['asc', 'desc']).optional()
})

// Apply to all routes in group
app.guard({
  query: PaginationSchema
}, (app) =>
  app
    .get('/users', ({ query }) => listUsers(query))
    .get('/posts', ({ query }) => listPosts(query))
)
```

### 4. Role-Based Access Guard
```typescript
const requireRole = (...roles: string[]) =>
  new Elysia()
    .derive({ as: 'scoped' }, async ({ user, error }) => {
      if (!roles.includes(user.role)) {
        return error(403, { success: false, message: 'Forbidden' })
      }
      return {}
    })

// Usage
app
  .use(authPlugin)
  .use(requireRole('admin', 'moderator'))
  .delete('/users/:id', ({ params }) => deleteUser(params.id))
```

### 5. Request Context Guard (State + Derive)
```typescript
const contextPlugin = new Elysia({ name: 'context' })
  .state('db', createDbConnection())
  .state('cache', createCache())
  .derive({ as: 'scoped' }, async ({ store, headers }) => {
    const requestId = crypto.randomUUID()
    const startTime = Date.now()

    return {
      requestId,
      startTime,
      db: store.db,
      cache: store.cache
    }
  })
```

## Key Concepts
- `.guard()` - Apply validation to route groups
- `.derive()` - Add computed properties to context (scoped)
- `.state()` - Store application-level state
- `.use()` - Compose plugins/guards together
- `.resolve()` - Similar to derive but for global context
- `{ as: 'scoped' }` - Makes derived values available only to downstream routes
- `{ as: 'global' }` - Makes derived values available everywhere

## Error Handling in Guards
```typescript
// Use error() function to return early
.derive(async ({ headers, error }) => {
  if (!headers.authorization) {
    return error(401, { message: 'Unauthorized' })
  }
  // Continue...
})
```