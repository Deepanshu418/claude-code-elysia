# Elysia Docs MCP Server

This MCP server provides live access to Elysia.js documentation from elysiajs.com.

## Tools

### `elysia_search_docs`
Search Elysia documentation for relevant topics.

```
Query: "authentication" → Returns docs about JWT, guards, etc.
```

### `elysia_get_doc`
Fetch the full content of a documentation page.

```
Path: "/life-cycle" → Returns the complete life cycle documentation
```

### `elysia_list_docs`
List all available documentation sections.

### `elysia_get_example`
Get code examples for common patterns:

- `route` - Route handlers and grouping
- `plugin` - Creating and using plugins
- `middleware` - Guards, derive, decorators
- `validation` - Request validation with Zod
- `error-handling` - Error handling patterns
- `authentication` - JWT and auth guards
- `websocket` - WebSocket implementation
- `cors` - CORS configuration
- `rate-limit` - Rate limiting

## Installation

The MCP server requires Bun and the MCP SDK:

```bash
cd mcp
bun install
```

## Usage

Once the plugin is installed, the MCP tools are automatically available:

```
# In Claude Code session
User: How do I create a plugin in Elysia?
Claude: [uses elysia_get_example with pattern "plugin"]

User: What lifecycle hooks are available?
Claude: [uses elysia_get_doc with path "/life-cycle"]
```