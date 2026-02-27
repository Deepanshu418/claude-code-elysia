#!/bin/bash
# Install MCP server dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$SCRIPT_DIR/mcp"

echo "Installing Elysia Docs MCP server dependencies..."

cd "$MCP_DIR"

# Check for bun
if ! command -v bun &> /dev/null; then
    echo "Error: bun is not installed. Please install bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Install dependencies
bun install

echo "✓ MCP server installed successfully!"
echo ""
echo "To test the MCP server:"
echo "  bun run $MCP_DIR/server.ts"