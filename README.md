# mgx-thinking-log-mcp

An MCP (Model Context Protocol) server for downloading and reading MGX thinking logs. Enables AI agents to fetch and analyze MGX conversation logs programmatically.

## Installation

```bash
npm install -g mgx-thinking-log-mcp
```

## Quick Start

### Claude Desktop / Cursor (Team Mode)

Add to your MCP config (`claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mgx-thinking-log": {
      "command": "npx",
      "args": ["-y", "mgx-thinking-log-mcp"],
      "env": {
        "MGX_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add mgx-thinking-log -- npx -y mgx-thinking-log-mcp
```

Then set environment variable `MGX_TOKEN` or pass token per-request.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MGX_TOKEN` | Auth token (appended as `?token=` to skip Bearer auth) | - |
| `MGX_BASE_URL` | Base URL for the MGX API | `http://test-tool.deepwisdomai.com` |

## Tools

### `get_thinking_logs`

Fetch thinking logs for a chat. Returns log content as text for agent analysis.

**Parameters:**
- `chat_id` (required) - The chat/conversation ID
- `env` (optional) - Environment: `prod`, `alpha`, `pre`, `us-test`, `us-test-2` (default: `prod`)
- `token` (optional) - Auth token, overrides `MGX_TOKEN` env var

**Example prompt:**
> Read the thinking logs for chat `abc123` in prod environment

### `download_thinking_logs`

Download thinking logs to a local file.

**Parameters:**
- `chat_id` (required) - The chat/conversation ID
- `env` (optional) - Environment (default: `prod`)
- `output_path` (required) - Local file path to save logs
- `token` (optional) - Auth token

**Example prompt:**
> Download the logs for chat `abc123` to `/tmp/logs.txt`

### `get_mgx_env`

Fetch the `mgxenv.json` configuration for a specific chat version.

**Parameters:**
- `chat_id` (required) - The chat/conversation ID
- `env` (optional) - Environment (default: `prod`)
- `version` (required) - Version number
- `token` (optional) - Auth token

**Example prompt:**
> Get the mgxenv config for chat `abc123` version `v2`

## Rate Limiting

The upstream API has a global rate limit. Keep concurrent requests under 10 without prior arrangement. For higher concurrency, contact the platform team.

## Development

```bash
git clone <repo-url>
cd mgx-thinking-log-mcp
npm install
npm run build
npm start
```

## License

MIT
