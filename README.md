# Claude Code Elysia Plugin

Production-grade Elysia.js framework support for Claude Code with Zod validation and live documentation access.

## Features

- ✅ **Skills** - Generate routes, guards, plugins, lifecycle hooks
- ✅ **Agent** - Elysia architecture review and best practices
- ✅ **MCP Server** - Live documentation from elysiajs.com
- ✅ **Templates** - Project structure and CRUD examples
- ✅ **Zod Validation** - All examples use Zod schemas

## Installation

### Option 1: Install from Marketplace

```bash
/plugin marketplace add ddixit/claude-code-elysia
/plugin install elysia
```

### Option 2: Local Development

```bash
git clone https://github.com/ddixit/claude-code-elysia
cd claude-code-elysia

# Install MCP server dependencies
./install.sh

# Test with Claude Code
claude --plugin-dir .
```

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Route | `/elysia:route <description>` | Generate typed routes with Zod validation |
| Guard | `/elysia:guard <description>` | Create guards for auth/validation |
| Lifecycle | `/elysia:lifecycle <description>` | Create lifecycle hooks |
| Decorator | `/elysia:decorator <description>` | Extend context with custom methods |
| Plugin | `/elysia:plugin <description>` | Create reusable Elysia plugins |

## MCP Server Tools

The plugin includes an MCP server that fetches live documentation:

| Tool | Description |
|------|-------------|
| `elysia_search_docs` | Search documentation for topics |
| `elysia_get_doc` | Fetch specific documentation page |
| `elysia_list_docs` | List all available sections |
| `elysia_get_example` | Get code examples for patterns |

### Example MCP Usage

```
# In Claude Code, the MCP tools are automatically available
User: How do I create a plugin in Elysia?
→ Claude uses elysia_get_example("plugin") to fetch docs

User: What lifecycle hooks are available?
→ Claude uses elysia_get_doc("/life-cycle") to fetch docs
```

## Agent

The `elysia-architect` agent provides code review:

- Schema validation best practices with Zod
- Plugin architecture patterns
- Error handling recommendations
- Performance and security checks
- Common anti-patterns to avoid

## Templates

- `project-structure.md` - Recommended file organization
- `quickstart.md` - Getting started guide
- `crud-example.md` - Complete REST API example

## Examples

### Generate a Route
```
/elysia:route POST /api/users with email validation and password hashing
```

### Create an Auth Guard
```
/elysia:guard JWT authentication with role-based access
```

### Add Lifecycle Hooks
```
/elysia:lifecycle request logging with timing
```

### Create a Plugin
```
/elysia:plugin database connection with Bun.sqlite
```

## Project Dependencies

Projects using this plugin need:

```bash
bun add elysia zod
```

## Directory Structure

```
claude-code-elysia/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── skills/
│   ├── route/SKILL.md       # Route generation
│   ├── guard/SKILL.md       # Auth/validation guards
│   ├── lifecycle/SKILL.md   # Lifecycle hooks
│   ├── decorator/SKILL.md   # Context decorators
│   └── plugin/SKILL.md      # Plugin creation
├── agents/
│   └── elysia-architect.md  # Code review agent
├── mcp/
│   ├── server.ts            # MCP server
│   ├── package.json         # MCP dependencies
│   └── README.md            # MCP documentation
├── hooks/
│   └── hooks.json           # Post-tool-use hooks
├── templates/
│   ├── quickstart.md        # Getting started
│   ├── project-structure.md # File organization
│   └── crud-example.md      # CRUD example
├── mcp.json                 # MCP configuration
├── marketplace.json         # Marketplace config
├── install.sh               # Installation script
└── README.md                # This file
```

## Contributing

1. Fork the repository
2. Make changes to skills/agents/templates/MCP
3. Test with `claude --plugin-dir .`
4. Submit a pull request

## License

MIT