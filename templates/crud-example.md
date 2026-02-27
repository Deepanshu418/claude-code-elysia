# Elysia CRUD Example

Complete example of a REST API with Elysia and Zod.

## File Structure

```
src/
├── index.ts
├── app.ts
├── routes/
│   └── users.ts
├── schemas/
│   └── user.schema.ts
└── services/
    └── user.service.ts
```

## Implementation

### `src/schemas/user.schema.ts`

```typescript
import { z } from 'zod'

// Common schemas
export const IdSchema = z.string().uuid()

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
})

// User schemas
export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['user', 'admin']),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin']).default('user')
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional()
})

// API response schemas
export const UserListResponseSchema = z.object({
  data: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number()
  })
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string()
  })).optional()
})

// Inferred types
export type User = z.infer<typeof UserSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
```

### `src/services/user.service.ts`

```typescript
import type { User, CreateUserInput, UpdateUserInput } from '@/schemas/user.schema'
import { NotFoundError, ConflictError } from '@/utils/errors'

// In-memory store for demo (replace with real database)
const users = new Map<string, User>()
const userEmails = new Set<string>()

export class UserService {
  async findAll(page: number, limit: number) {
    const all = Array.from(users.values())
    const total = all.length
    const offset = (page - 1) * limit
    const data = all.slice(offset, offset + limit)

    return {
      data,
      pagination: { page, limit, total }
    }
  }

  async findById(id: string): Promise<User> {
    const user = users.get(id)
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async create(input: CreateUserInput): Promise<User> {
    if (userEmails.has(input.email)) {
      throw new ConflictError('Email already in use')
    }

    const now = new Date().toISOString()
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role,
      createdAt: now,
      updatedAt: now
    }

    users.set(user.id, user)
    userEmails.add(input.email)

    return user
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.findById(id)

    if (input.email && input.email !== user.email) {
      if (userEmails.has(input.email)) {
        throw new ConflictError('Email already in use')
      }
      userEmails.delete(user.email)
      userEmails.add(input.email)
    }

    const updated = {
      ...user,
      ...input,
      updatedAt: new Date().toISOString()
    }

    users.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id)
    users.delete(id)
    userEmails.delete(user.email)
  }
}
```

### `src/routes/users.ts`

```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'
import { UserService } from '@/services/user.service'
import {
  IdSchema,
  PaginationSchema,
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UserListResponseSchema
} from '@/schemas/user.schema'

const userService = new UserService()

export const userRoutes = new Elysia({ prefix: '/users' })
  // GET /users - List all users
  .get('/', async ({ query }) => {
    return userService.findAll(query.page, query.limit)
  }, {
    query: PaginationSchema,
    response: UserListResponseSchema,
    detail: {
      summary: 'List all users',
      tags: ['Users']
    }
  })

  // GET /users/:id - Get user by ID
  .get('/:id', async ({ params }) => {
    return userService.findById(params.id)
  }, {
    params: z.object({ id: IdSchema }),
    response: UserSchema,
    detail: {
      summary: 'Get user by ID',
      tags: ['Users']
    }
  })

  // POST /users - Create new user
  .post('/', async ({ body, status }) => {
    const user = await userService.create(body)
    return status(201, user)
  }, {
    body: CreateUserSchema,
    response: UserSchema,
    detail: {
      summary: 'Create a new user',
      tags: ['Users']
    }
  })

  // PUT /users/:id - Update user
  .put('/:id', async ({ params, body }) => {
    return userService.update(params.id, body)
  }, {
    params: z.object({ id: IdSchema }),
    body: UpdateUserSchema,
    response: UserSchema,
    detail: {
      summary: 'Update a user',
      tags: ['Users']
    }
  })

  // DELETE /users/:id - Delete user
  .delete('/:id', async ({ params, status }) => {
    await userService.delete(params.id)
    return status(204)
  }, {
    params: z.object({ id: IdSchema }),
    detail: {
      summary: 'Delete a user',
      tags: ['Users']
    }
  })
```

### `src/app.ts`

```typescript
import { Elysia } from 'elysia'
import { ZodError } from 'zod'
import { userRoutes } from '@/routes/users'
import { NotFoundError, ConflictError } from '@/utils/errors'

export const app = new Elysia()
  .onError(({ code, error, set }) => {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      set.status = 400
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    }

    // Handle custom errors
    if (error instanceof NotFoundError) {
      set.status = 404
      return { success: false, message: error.message }
    }

    if (error instanceof ConflictError) {
      set.status = 409
      return { success: false, message: error.message }
    }

    // Handle Elysia error codes
    if (code === 'NOT_FOUND') {
      return { success: false, message: 'Route not found' }
    }

    if (code === 'VALIDATION') {
      set.status = 400
      return { success: false, message: error.message }
    }

    // Unexpected errors
    console.error('Unhandled error:', error)
    set.status = 500
    return { success: false, message: 'Internal server error' }
  })
  .group('/api/v1', (app) => app.use(userRoutes))
```

### `src/index.ts`

```typescript
import { app } from './app'

const port = Number(process.env.PORT) || 3000

app.listen(port)
console.log(`🦊 Server running at http://localhost:${port}`)
```

### `src/utils/errors.ts`

```typescript
export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}
```

## Testing

```typescript
import { describe, expect, test, beforeAll } from 'bun:test'
import { app } from './app'

describe('Users API', () => {
  const baseUrl = 'http://localhost'

  test('POST /api/v1/users creates a user', async () => {
    const res = await app.handle(
      new Request(`${baseUrl}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123'
        })
      })
    )

    expect(res.status).toBe(201)
    const user = await res.json()
    expect(user.email).toBe('test@example.com')
    expect(user.id).toBeDefined()
  })

  test('POST /api/v1/users validates input', async () => {
    const res = await app.handle(
      new Request(`${baseUrl}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }) // Missing email
      })
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.errors).toBeDefined()
  })

  test('GET /api/v1/users returns list', async () => {
    const res = await app.handle(
      new Request(`${baseUrl}/api/v1/users?page=1&limit=10`)
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.pagination).toBeDefined()
  })
})
```

## Running

```bash
# Development
bun run src/index.ts

# Watch mode
bun --watch run src/index.ts

# Test
bun test
```