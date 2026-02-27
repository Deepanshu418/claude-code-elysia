#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'

const DOCS_URL = process.env.ELYSIA_DOCS_URL || 'https://elysiajs.com'
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/elysiajs/documentation/main/docs'

// Cache for documentation pages
const cache = new Map<string, { content: string; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

// Actual documentation sections from elysiajs.com
const DOC_SECTIONS = [
  // Getting Started
  { path: '/at-glance', title: 'At Glance', category: 'Getting Started', description: 'Overview of Elysia features' },
  { path: '/quick-start', title: 'Quick Start', category: 'Getting Started', description: 'Get started quickly' },
  { path: '/table-of-content', title: 'Table of Content', category: 'Getting Started', description: 'Documentation index' },
  { path: '/key-concept', title: 'Key Concept', category: 'Getting Started', description: 'Core concepts of Elysia' },

  // Essential
  { path: '/essential/route', title: 'Route', category: 'Essential', description: 'Routing and HTTP methods' },
  { path: '/essential/handler', title: 'Handler', category: 'Essential', description: 'Route handlers and context' },
  { path: '/essential/plugin', title: 'Plugin', category: 'Essential', description: 'Creating and using plugins' },
  { path: '/essential/life-cycle', title: 'Life Cycle', category: 'Essential', description: 'Request lifecycle and hooks' },
  { path: '/essential/validation', title: 'Validation', category: 'Essential', description: 'Request validation with schemas' },
  { path: '/essential/best-practice', title: 'Best Practice', category: 'Essential', description: 'Recommended patterns' },

  // Patterns
  { path: '/patterns/configuration', title: 'Configuration', category: 'Patterns', description: 'App configuration' },
  { path: '/patterns/cookie', title: 'Cookie', category: 'Patterns', description: 'Cookie handling' },
  { path: '/patterns/deploy', title: 'Deploy to Production', category: 'Patterns', description: 'Production deployment' },
  { path: '/patterns/error-handling', title: 'Error Handling', category: 'Patterns', description: 'Error handling patterns' },
  { path: '/patterns/extends-context', title: 'Extends Context', category: 'Patterns', description: 'Extending context with decorators' },
  { path: '/patterns/fullstack-dev-server', title: 'Fullstack Dev Server', category: 'Patterns', description: 'Fullstack development' },
  { path: '/patterns/macro', title: 'Macro', category: 'Patterns', description: 'Macro configuration' },
  { path: '/patterns/mount', title: 'Mount', category: 'Patterns', description: 'Mounting other apps' },
  { path: '/patterns/openapi', title: 'OpenAPI', category: 'Patterns', description: 'OpenAPI documentation' },
  { path: '/patterns/opentelemetry', title: 'OpenTelemetry', category: 'Patterns', description: 'Telemetry integration' },
  { path: '/patterns/trace', title: 'Trace', category: 'Patterns', description: 'Request tracing' },
  { path: '/patterns/typebox', title: 'TypeBox (Elysia.t)', category: 'Patterns', description: 'Built-in TypeBox schemas' },
  { path: '/patterns/typescript', title: 'TypeScript', category: 'Patterns', description: 'TypeScript configuration' },
  { path: '/patterns/unit-test', title: 'Unit Test', category: 'Patterns', description: 'Testing Elysia apps' },
  { path: '/patterns/websocket', title: 'WebSocket', category: 'Patterns', description: 'WebSocket support' },

  // Eden (Client)
  { path: '/eden/overview', title: 'Eden Overview', category: 'Eden', description: 'Eden client overview' },
  { path: '/eden/installation', title: 'Eden Installation', category: 'Eden', description: 'Installing Eden' },
  { path: '/eden/treaty/overview', title: 'Eden Treaty Overview', category: 'Eden', description: 'Type-safe client' },
  { path: '/eden/treaty/parameters', title: 'Eden Treaty Parameters', category: 'Eden', description: 'Client parameters' },
  { path: '/eden/treaty/response', title: 'Eden Treaty Response', category: 'Eden', description: 'Handling responses' },
  { path: '/eden/treaty/websocket', title: 'Eden Treaty WebSocket', category: 'Eden', description: 'WebSocket client' },
  { path: '/eden/treaty/config', title: 'Eden Treaty Config', category: 'Eden', description: 'Client configuration' },
  { path: '/eden/treaty/unit-test', title: 'Eden Treaty Unit Test', category: 'Eden', description: 'Testing with Eden' },
  { path: '/eden/fetch', title: 'Eden Fetch', category: 'Eden', description: 'Fetch-based client' },

  // Plugins
  { path: '/plugins/overview', title: 'Plugins Overview', category: 'Plugins', description: 'Plugin ecosystem' },
  { path: '/plugins/bearer', title: 'Bearer', category: 'Plugins', description: 'Bearer token auth' },
  { path: '/plugins/cors', title: 'CORS', category: 'Plugins', description: 'CORS configuration' },
  { path: '/plugins/cron', title: 'Cron', category: 'Plugins', description: 'Scheduled tasks' },
  { path: '/plugins/graphql-apollo', title: 'GraphQL Apollo', category: 'Plugins', description: 'GraphQL with Apollo' },
  { path: '/plugins/graphql-yoga', title: 'GraphQL Yoga', category: 'Plugins', description: 'GraphQL with Yoga' },
  { path: '/plugins/html', title: 'HTML', category: 'Plugins', description: 'HTML rendering' },
  { path: '/plugins/jwt', title: 'JWT', category: 'Plugins', description: 'JWT authentication' },
  { path: '/plugins/openapi', title: 'OpenAPI Plugin', category: 'Plugins', description: 'OpenAPI/Swagger docs' },
  { path: '/plugins/opentelemetry', title: 'OpenTelemetry Plugin', category: 'Plugins', description: 'Telemetry plugin' },
  { path: '/plugins/server-timing', title: 'Server Timing', category: 'Plugins', description: 'Server timing headers' },
  { path: '/plugins/static', title: 'Static', category: 'Plugins', description: 'Static file serving' },

  // Migration
  { path: '/migrate/from-express', title: 'From Express', category: 'Migration', description: 'Migrate from Express' },
  { path: '/migrate/from-fastify', title: 'From Fastify', category: 'Migration', description: 'Migrate from Fastify' },
  { path: '/migrate/from-hono', title: 'From Hono', category: 'Migration', description: 'Migrate from Hono' },
  { path: '/migrate/from-trpc', title: 'From tRPC', category: 'Migration', description: 'Migrate from tRPC' },

  // Integrations
  { path: '/integrations/ai-sdk', title: 'AI SDK', category: 'Integrations', description: 'Vercel AI SDK integration' },
  { path: '/integrations/astro', title: 'Astro', category: 'Integrations', description: 'Astro integration' },
  { path: '/integrations/better-auth', title: 'Better Auth', category: 'Integrations', description: 'Better Auth integration' },
  { path: '/integrations/cloudflare-worker', title: 'Cloudflare Worker', category: 'Integrations', description: 'Cloudflare deployment' },
  { path: '/integrations/deno', title: 'Deno', category: 'Integrations', description: 'Deno deployment' },
  { path: '/integrations/drizzle', title: 'Drizzle', category: 'Integrations', description: 'Drizzle ORM integration' },
  { path: '/integrations/expo', title: 'Expo', category: 'Integrations', description: 'Expo/React Native' },
  { path: '/integrations/netlify', title: 'Netlify', category: 'Integrations', description: 'Netlify deployment' },
  { path: '/integrations/nextjs', title: 'Next.js', category: 'Integrations', description: 'Next.js integration' },
  { path: '/integrations/node', title: 'Node.js', category: 'Integrations', description: 'Node.js deployment' },
  { path: '/integrations/nuxt', title: 'Nuxt', category: 'Integrations', description: 'Nuxt integration' },
  { path: '/integrations/prisma', title: 'Prisma', category: 'Integrations', description: 'Prisma ORM integration' },
  { path: '/integrations/react-email', title: 'React Email', category: 'Integrations', description: 'Email with React' },
  { path: '/integrations/sveltekit', title: 'SvelteKit', category: 'Integrations', description: 'SvelteKit integration' },
  { path: '/integrations/tanstack-start', title: 'TanStack Start', category: 'Integrations', description: 'TanStack Start integration' },
  { path: '/integrations/vercel', title: 'Vercel', category: 'Integrations', description: 'Vercel deployment' },

  // Internal
  { path: '/internal/jit-compiler', title: 'JIT Compiler', category: 'Internal', description: 'Just-in-time compiler internals' },
]

// Fetch a documentation page from GitHub raw markdown
async function fetchDoc(path: string): Promise<string> {
  const cacheKey = path
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content
  }

  // Fetch raw markdown from GitHub
  const githubUrl = `${GITHUB_RAW_URL}${path}.md`

  try {
    const response = await fetch(githubUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const content = await response.text()

    // Process markdown content
    const processed = processMarkdown(content)

    cache.set(cacheKey, { content: processed, timestamp: Date.now() })
    return processed
  } catch (error) {
    throw new Error(`Failed to fetch ${path}: ${error}`)
  }
}

// Process markdown content
function processMarkdown(content: string): string {
  // Remove frontmatter if present
  content = content.replace(/^---\n[\s\S]*?\n---\n/, '')

  // Clean up custom VuePress/VitePress components
  content = content
    .replace(/<[A-Z][a-zA-Z]*[^>]*\/?>/g, '') // Remove Vue components
    .replace(/<\/[A-Z][a-zA-Z]*>/g, '') // Remove Vue component closing tags
    .replace(/\{\{.*?\}\}/g, '') // Remove Vue interpolations
    .replace(/::: (tip|warning|danger|info)[\s\S]*?:::/g, (match) => {
      // Convert custom containers to blockquotes
      const lines = match.split('\n').slice(1, -1)
      return '> ' + lines.join('\n> ')
    })

  return content.trim()
}

// Search documentation
function searchDocs(query: string): typeof DOC_SECTIONS {
  const lowerQuery = query.toLowerCase()
  const keywords = lowerQuery.split(/\s+/)

  return DOC_SECTIONS.filter(section => {
    const searchText = `${section.title} ${section.description} ${section.category} ${section.path}`.toLowerCase()
    return keywords.some(keyword => searchText.includes(keyword))
  }).slice(0, 10)
}

// Define tools
const tools: Tool[] = [
  {
    name: 'elysia_search_docs',
    description: 'Search Elysia.js documentation for relevant topics. Returns matching documentation pages from elysiajs.com.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "route", "authentication", "websocket", "error")'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'elysia_get_doc',
    description: 'Fetch the content of a specific Elysia.js documentation page from elysiajs.com.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Documentation path (e.g., "/essential/route", "/patterns/error-handling", "/plugins/jwt")'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'elysia_list_docs',
    description: 'List all available Elysia.js documentation sections and pages.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (e.g., "Essential", "Patterns", "Plugins", "Integrations")',
          enum: ['Getting Started', 'Essential', 'Patterns', 'Eden', 'Plugins', 'Migration', 'Integrations', 'Internal']
        }
      }
    }
  },
  {
    name: 'elysia_get_example',
    description: 'Get code examples for common Elysia patterns by fetching relevant documentation.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Pattern to get examples for',
          enum: ['route', 'handler', 'plugin', 'middleware', 'validation', 'error-handling', 'authentication', 'websocket', 'cors', 'jwt', 'testing', 'cookie']
        }
      },
      required: ['pattern']
    }
  }
]

// Map patterns to relevant documentation paths
const PATTERN_DOCS: Record<string, string[]> = {
  'route': ['/essential/route', '/essential/handler'],
  'handler': ['/essential/handler', '/essential/route'],
  'plugin': ['/essential/plugin', '/plugins/overview'],
  'middleware': ['/essential/life-cycle', '/patterns/extends-context'],
  'validation': ['/essential/validation', '/patterns/typebox'],
  'error-handling': ['/patterns/error-handling', '/essential/life-cycle'],
  'authentication': ['/plugins/jwt', '/plugins/bearer'],
  'websocket': ['/patterns/websocket', '/eden/treaty/websocket'],
  'cors': ['/plugins/cors'],
  'jwt': ['/plugins/jwt'],
  'testing': ['/patterns/unit-test', '/eden/treaty/unit-test'],
  'cookie': ['/patterns/cookie'],
}

// Handle tool calls
async function handleToolCall(name: string, args: Record<string, unknown>): Promise<{ content: { type: string; text: string }[] }> {
  switch (name) {
    case 'elysia_search_docs': {
      const { query } = args as { query: string }
      const results = searchDocs(query)

      if (results.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No documentation found for "${query}". Try different keywords or use elysia_list_docs to see all available sections.`
          }]
        }
      }

      const grouped = results.reduce((acc, r) => {
        if (!acc[r.category]) acc[r.category] = []
        acc[r.category].push(r)
        return acc
      }, {} as Record<string, typeof results>)

      let output = `Found ${results.length} documentation pages for "${query}":\n\n`

      for (const [category, pages] of Object.entries(grouped)) {
        output += `### ${category}\n`
        for (const page of pages) {
          output += `- **${page.title}** (\`${page.path}\`)\n  ${page.description}\n`
        }
        output += '\n'
      }

      return { content: [{ type: 'text', text: output }] }
    }

    case 'elysia_get_doc': {
      const { path } = args as { path: string }

      try {
        const content = await fetchDoc(path)
        const section = DOC_SECTIONS.find(s => s.path === path)

        return {
          content: [{
            type: 'text',
            text: `# ${section?.title || path}\n\n**Category:** ${section?.category || 'Unknown'}  \n**Source:** ${DOCS_URL}${path}\n\n---\n\n${content}`
          }]
        }
      } catch (error) {
        const validPaths = DOC_SECTIONS.slice(0, 10).map(s => `  - ${s.path}`).join('\n')
        return {
          content: [{
            type: 'text',
            text: `Error fetching documentation: ${error}\n\nValid paths include:\n${validPaths}\n\nUse elysia_list_docs to see all available documentation.`
          }]
        }
      }
    }

    case 'elysia_list_docs': {
      const { category } = args as { category?: string }

      let sections = DOC_SECTIONS
      if (category) {
        sections = DOC_SECTIONS.filter(s => s.category === category)
      }

      const grouped = sections.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = []
        acc[s.category].push(s)
        return acc
      }, {} as Record<string, typeof sections>)

      let output = `Available Elysia.js documentation (${sections.length} pages):\n\n`

      for (const [cat, pages] of Object.entries(grouped)) {
        output += `### ${cat} (${pages.length} pages)\n`
        for (const page of pages) {
          output += `- **${page.title}** (\`${page.path}\`) - ${page.description}\n`
        }
        output += '\n'
      }

      output += `Use \`elysia_get_doc\` with a path to fetch full content.\n`
      output += `Example: \`elysia_get_doc("/essential/route")\``

      return { content: [{ type: 'text', text: output }] }
    }

    case 'elysia_get_example': {
      const { pattern } = args as { pattern: string }
      const docPaths = PATTERN_DOCS[pattern] || ['/essential/route']

      try {
        const docs = await Promise.all(
          docPaths.map(async (path) => {
            const content = await fetchDoc(path)
            const section = DOC_SECTIONS.find(s => s.path === path)
            return `## ${section?.title || path}\n\nSource: ${DOCS_URL}${path}\n\n${content}`
          })
        )

        return {
          content: [{
            type: 'text',
            text: `# Examples for: ${pattern}\n\n` + docs.join('\n\n---\n\n')
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error fetching examples: ${error}`
          }]
        }
      }
    }

    default:
      return {
        content: [{
          type: 'text',
          text: `Unknown tool: ${name}`
        }]
      }
  }
}

// Create and start server
async function main() {
  const server = new Server(
    { name: 'elysia-docs', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    return handleToolCall(name, args || {})
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('Elysia Docs MCP server running on stdio')
}

main().catch(console.error)