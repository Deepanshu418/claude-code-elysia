# Elysia + Zod Quick Start Guide

## Installation

```bash
bun create elysia my-app
cd my-app
bun add zod
```

## Minimal Server

```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'

new Elysia()
  .get('/', () => 'Hello World')
  .get('/users/:id', ({ params }) => ({ id: params.id }), {
    params: z.object({ id: z.string().uuid() })
  })
  .post('/users', ({ body }) => body, {
    body: z.object({
      name: z.string(),
      email: z.string().email()
    })
  })
  .listen(3000)
```

## Validation Points

Elysia with Zod supports these validation points:

| Option | Validates | Example |
|--------|-----------|---------|
| `body` | Request body | `z.object({ name: z.string() })` |
| `params` | URL parameters | `z.object({ id: z.string().uuid() })` |
| `query` | Query string | `z.object({ page: z.coerce.number() })` |
| `headers` | Request headers | `z.object({ authorization: z.string() })` |
| `response` | Response shape | `z.object({ id: z.string() })` |

## Common Zod Patterns

```typescript
import { z } from 'zod'

// UUID
const IdSchema = z.string().uuid()

// Email
const EmailSchema = z.string().email('Invalid email')

// Password with requirements
const PasswordSchema = z.string()
  .min(8, 'Must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[0-9]/, 'Must contain number')

// Pagination (with coercion from string query params)
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['asc', 'desc']).optional()
})

// Optional fields
const UpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional()
})

// Date handling
const DateSchema = z.coerce.date() // Converts string to Date

// Enums
const StatusSchema = z.enum(['active', 'inactive', 'pending'])

// Arrays
const TagsSchema = z.array(z.string()).min(1).max(10)

// Nested objects
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/)
})
```

## Route Examples

### CRUD Routes

```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email()
})

const CreateUserSchema = UserSchema.omit({ id: true }).extend({
  password: z.string().min(8)
})

const app = new Elysia().group('/users', (app) =>
  app
    // List with pagination
    .get('/', ({ query }) => listUsers(query), {
      query: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20)
      })
    })

    // Get by ID
    .get('/:id', ({ params }) => getUser(params.id), {
      params: z.object({ id: z.string().uuid() }),
      response: UserSchema
    })

    // Create
    .post('/', ({ body }) => createUser(body), {
      body: CreateUserSchema,
      response: UserSchema
    })

    // Update
    .put('/:id', ({ params, body }) => updateUser(params.id, body), {
      params: z.object({ id: z.string().uuid() }),
      body: UserSchema.partial(),
      response: UserSchema
    })

    // Delete
    .delete('/:id', ({ params }) => deleteUser(params.id), {
      params: z.object({ id: z.string().uuid() })
    })
)
```

## Error Handling

```typescript
import { ZodError } from 'zod'

app.onError(({ code, error, set }) => {
  if (error instanceof ZodError) {
    set.status = 400
    return {
      success: false,
      message: 'Validation failed',
      errors: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    }
  }

  if (code === 'NOT_FOUND') {
    return { success: false, message: 'Not found' }
  }

  if (code === 'VALIDATION') {
    return { success: false, message: error.message }
  }

  return { success: false, message: 'Server error' }
})
```

## OpenAPI Integration

```typescript
app.get('/users/:id', handler, {
  params: z.object({ id: z.string().uuid() }),
  response: UserSchema,
  detail: {
    summary: 'Get user by ID',
    description: 'Returns a single user by their unique identifier',
    tags: ['Users'],
    responses: {
      200: { description: 'User found' },
      404: { description: 'User not found' }
    }
  }
})
```

## Testing

```typescript
import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'

describe('Users API', () => {
  const app = new Elysia().use(userRoutes)

  test('GET /users returns list', async () => {
    const res = await app.handle(new Request('http://localhost/users'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('POST /users validates input', async () => {
    const res = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }) // Missing email
      })
    )
    expect(res.status).toBe(400)
  })
})
```