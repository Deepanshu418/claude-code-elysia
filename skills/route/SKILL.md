---
description: Generate Elysia routes with Zod validation and proper typing
disable-model-invocation: true
---

You are helping generate an Elysia.js route using Zod for validation. Use this pattern:

## Dependencies
```bash
bun add elysia zod
```

## Route Structure with Zod
```typescript
import { Elysia } from 'elysia'
import { z } from 'zod'

// Define Zod schemas
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().positive().optional()
})

const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date()
})

// Route with validation
app.post('/users', async ({ body, status }) => {
  // body is already validated and typed
  const user = await createUser(body)
  return user
}, {
  body: CreateUserSchema,
  response: UserResponseSchema,
  detail: {
    summary: 'Create a new user',
    tags: ['Users']
  }
})
```

## Validation Options
Elysia supports Zod schemas directly in route options:
- `body`: Validate request body
- `params`: Validate URL params (e.g., `/users/:id`)
- `query`: Validate query string
- `headers`: Validate headers
- `response`: Validate response shape

## Example with All Validation Points
```typescript
app.get('/users/:id', async ({ params, query }) => {
  return { id: params.id, include: query.include }
}, {
  params: z.object({
    id: z.string().uuid()
  }),
  query: z.object({
    include: z.enum(['posts', 'comments']).optional()
  }),
  response: z.object({
    id: z.string(),
    include: z.string().optional()
  })
})
```

## Grouped Routes Pattern
```typescript
app.group('/api/v1', (app) =>
  app
    .post('/users', createUserHandler, {
      body: CreateUserSchema,
      response: UserResponseSchema
    })
    .get('/users/:id', getUserHandler, {
      params: z.object({ id: z.string().uuid() })
    })
)
```

Generate an Elysia route for: $ARGUMENTS

Include:
- Zod schemas for all validation points
- Proper TypeScript inference from schemas
- OpenAPI documentation via `detail`
- Error handling with `status()` function