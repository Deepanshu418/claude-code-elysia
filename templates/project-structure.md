# Elysia Project Structure

Recommended structure for production Elysia applications.

```
src/
├── index.ts              # Entry point - starts server
├── app.ts                # App definition and plugin composition
│
├── routes/
│   ├── index.ts          # Route aggregator
│   ├── health.ts         # Health check routes
│   ├── users.ts          # User routes
│   ├── posts.ts          # Post routes
│   └── auth.ts           # Auth routes (login, register)
│
├── plugins/
│   ├── index.ts          # Plugin aggregator
│   ├── db.ts             # Database connection plugin
│   ├── auth.ts           # Authentication plugin
│   ├── logger.ts         # Request logging plugin
│   └── cors.ts           # CORS configuration
│
├── services/
│   ├── user.service.ts   # User business logic
│   ├── post.service.ts   # Post business logic
│   └── auth.service.ts   # Auth business logic
│
├── schemas/
│   ├── user.schema.ts    # User Zod schemas
│   ├── post.schema.ts    # Post Zod schemas
│   ├── auth.schema.ts    # Auth Zod schemas
│   └── common.schema.ts  # Shared schemas (pagination, IDs)
│
├── types/
│   └── index.ts          # TypeScript type definitions
│
├── utils/
│   ├── errors.ts         # Custom error classes
│   ├── response.ts       # Response formatters
│   └── validation.ts     # Validation helpers
│
└── config/
    ├── index.ts          # Config aggregator
    └── env.ts            # Environment variables
```

## Entry Point Pattern

### `src/index.ts`
```typescript
import { app } from './app'

const port = Number(process.env.PORT) || 3000

app.listen(port)

console.log(`🦊 Server running at http://localhost:${port}`)
```

### `src/app.ts`
```typescript
import { Elysia } from 'elysia'
import { routes } from './routes'
import { plugins } from './plugins'
import { handleError } from './utils/errors'

export const app = new Elysia()
  .use(plugins)
  .use(routes)
  .onError(handleError)
```

## Route Pattern

### `src/routes/users.ts`
```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'
import { UserService } from '@/services/user.service'
import { IdSchema, PaginationSchema } from '@/schemas/common.schema'
import { CreateUserSchema, UpdateUserSchema, UserResponseSchema } from '@/schemas/user.schema'

const userService = new UserService()

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/', async ({ query }) => {
    return userService.findAll(query)
  }, {
    query: PaginationSchema,
    detail: { tags: ['Users'], summary: 'List all users' }
  })
  .get('/:id', async ({ params }) => {
    return userService.findById(params.id)
  }, {
    params: z.object({ id: IdSchema }),
    response: UserResponseSchema,
    detail: { tags: ['Users'], summary: 'Get user by ID' }
  })
  .post('/', async ({ body }) => {
    return userService.create(body)
  }, {
    body: CreateUserSchema,
    response: UserResponseSchema,
    detail: { tags: ['Users'], summary: 'Create a new user' }
  })
  .put('/:id', async ({ params, body }) => {
    return userService.update(params.id, body)
  }, {
    params: z.object({ id: IdSchema }),
    body: UpdateUserSchema,
    response: UserResponseSchema,
    detail: { tags: ['Users'], summary: 'Update a user' }
  })
  .delete('/:id', async ({ params }) => {
    await userService.delete(params.id)
    return { success: true }
  }, {
    params: z.object({ id: IdSchema }),
    detail: { tags: ['Users'], summary: 'Delete a user' }
  })
```

### `src/routes/index.ts`
```typescript
import { Elysia } from 'elysia'
import { healthRoutes } from './health'
import { userRoutes } from './users'
import { postRoutes } from './posts'
import { authRoutes } from './auth'

export const routes = new Elysia()
  .use(healthRoutes)
  .group('/api/v1', (app) =>
    app
      .use(authRoutes)
      .use(userRoutes)
      .use(postRoutes)
  )
```

## Plugin Pattern

### `src/plugins/db.ts`
```typescript
import { Elysia } from 'elysia'
import { Database } from 'bun:sqlite'

export const dbPlugin = new Elysia({ name: 'db' })
  .state('db', new Database(process.env.DB_PATH!))
  .derive(({ store }) => ({ db: store.db }))
  .onStop(({ store }) => store.db.close())
```

### `src/plugins/index.ts`
```typescript
import { Elysia } from 'elysia'
import { dbPlugin } from './db'
import { authPlugin } from './auth'
import { loggerPlugin } from './logger'

export const plugins = new Elysia()
  .use(dbPlugin)
  .use(authPlugin)
  .use(loggerPlugin)
```

## Schema Pattern

### `src/schemas/common.schema.ts`
```typescript
import { z } from 'zod'

export const IdSchema = z.string().uuid()

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['asc', 'desc']).optional()
})

export const ApiErrorResponse = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string()
  })).optional()
})
```

### `src/schemas/user.schema.ts`
```typescript
import { z } from 'zod'
import { IdSchema } from './common.schema'

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional()
})

export const UserResponseSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
})

// Infer types from schemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UserResponse = z.infer<typeof UserResponseSchema>
```

## Service Pattern

### `src/services/user.service.ts`
```typescript
import { db } from '@/plugins/db'
import type { CreateUserInput, UpdateUserInput, UserResponse } from '@/schemas/user.schema'
import { NotFoundError } from '@/utils/errors'

export class UserService {
  async findAll(query: { page: number; limit: number }): Promise<UserResponse[]> {
    const offset = (query.page - 1) * query.limit

    return db.query(`
      SELECT id, email, name, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $limit OFFSET $offset
    `).all({ $limit: query.limit, $offset: offset })
  }

  async findById(id: string): Promise<UserResponse> {
    const user = db.query(`
      SELECT id, email, name, created_at, updated_at
      FROM users WHERE id = $id
    `).get({ $id: id })

    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async create(data: CreateUserInput): Promise<UserResponse> {
    const hashedPassword = await Bun.password.hash(data.password)

    const result = db.query(`
      INSERT INTO users (id, email, name, password)
      VALUES ($id, $email, $name, $password)
      RETURNING id, email, name, created_at, updated_at
    `).get({
      $id: crypto.randomUUID(),
      $email: data.email,
      $name: data.name,
      $password: hashedPassword
    })

    return result
  }

  async update(id: string, data: UpdateUserInput): Promise<UserResponse> {
    // Implementation...
  }

  async delete(id: string): Promise<void> {
    const result = db.query(`DELETE FROM users WHERE id = $id`).run({ $id: id })
    if (result.changes === 0) throw new NotFoundError('User not found')
  }
}
```

## Error Handling

### `src/utils/errors.ts`
```typescript
import { Elysia } from 'elysia'
import { ZodError } from 'zod'

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export const handleError = ({ code, error, set }: any) => {
  console.error('Error:', error)

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

  if (error instanceof NotFoundError) {
    set.status = 404
    return { success: false, message: error.message }
  }

  if (error instanceof UnauthorizedError) {
    set.status = 401
    return { success: false, message: error.message }
  }

  set.status = 500
  return { success: false, message: 'Internal server error' }
}
```