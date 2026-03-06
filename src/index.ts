#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_BASE_URL = "http://test-tool.deepwisdomai.com";
const VALID_ENVS = ["prod", "alpha", "pre", "us-test", "us-test-2"] as const;

// Configuration from environment variables
const config = {
  baseUrl: process.env.MGX_BASE_URL || DEFAULT_BASE_URL,
  token: process.env.MGX_TOKEN || "",
};

function buildLogsUrl(params: {
  chatId: string;
  env: string;
  token?: string;
  download?: boolean;
  mgxenv?: boolean;
  version?: string;
}): string {
  const url = new URL(
    `/api/v1/chats/${params.chatId}/logs`,
    config.baseUrl
  );
  url.searchParams.set("env", params.env);

  if (params.download) {
    url.searchParams.set("download", "1");
  }
  if (params.mgxenv) {
    url.searchParams.set("mgxenv", "1");
  }
  if (params.version) {
    url.searchParams.set("version", params.version);
  }

  const token = params.token || config.token;
  if (token) {
    url.searchParams.set("token", token);
  }

  return url.toString();
}

async function fetchWithError(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `HTTP ${response.status} ${response.statusText}${body ? `: ${body}` : ""}`
    );
  }
  return response;
}

// Create MCP server
const server = new McpServer({
  name: "mgx-thinking-log-mcp",
  version: "1.0.0",
});

// Tool: get_thinking_logs - Read thinking logs content for agent consumption
server.tool(
  "get_thinking_logs",
  "Fetch MGX thinking logs for a given chat. Returns the log content as text, suitable for agent analysis.",
  {
    chat_id: z.string().describe("The chat/conversation ID"),
    env: z
      .enum(VALID_ENVS)
      .default("prod")
      .describe("Environment: prod, alpha, pre, us-test, us-test-2"),
    token: z
      .string()
      .optional()
      .describe(
        "Auth token (overrides MGX_TOKEN env var). Appended as ?token= to skip Bearer auth"
      ),
  },
  async ({ chat_id, env, token }) => {
    const url = buildLogsUrl({ chatId: chat_id, env, token });
    try {
      const response = await fetchWithError(url);
      const contentType = response.headers.get("content-type") || "";

      // If the response is JSON, pretty-print it
      if (contentType.includes("application/json")) {
        const json = await response.json();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(json, null, 2),
            },
          ],
        };
      }

      const text = await response.text();
      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching logs: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: download_thinking_logs - Download logs to a local file
server.tool(
  "download_thinking_logs",
  "Download MGX thinking logs to a local file. Useful for saving large log files for later analysis.",
  {
    chat_id: z.string().describe("The chat/conversation ID"),
    env: z
      .enum(VALID_ENVS)
      .default("prod")
      .describe("Environment: prod, alpha, pre, us-test, us-test-2"),
    output_path: z
      .string()
      .describe("Local file path to save the downloaded logs"),
    token: z
      .string()
      .optional()
      .describe("Auth token (overrides MGX_TOKEN env var)"),
  },
  async ({ chat_id, env, output_path, token }) => {
    const url = buildLogsUrl({
      chatId: chat_id,
      env,
      token,
      download: true,
    });
    try {
      const response = await fetchWithError(url);
      const buffer = Buffer.from(await response.arrayBuffer());

      const absPath = resolve(output_path);
      await mkdir(dirname(absPath), { recursive: true });
      await writeFile(absPath, buffer);

      return {
        content: [
          {
            type: "text" as const,
            text: `Logs downloaded successfully to ${absPath} (${buffer.length} bytes)`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error downloading logs: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: get_mgx_env - Fetch mgxenv.json for a specific version
server.tool(
  "get_mgx_env",
  "Fetch the mgxenv.json configuration for a specific MGX chat version. Returns environment config as JSON.",
  {
    chat_id: z.string().describe("The chat/conversation ID"),
    env: z
      .enum(VALID_ENVS)
      .default("prod")
      .describe("Environment: prod, alpha, pre, us-test, us-test-2"),
    version: z.string().describe("Version number for the mgxenv file"),
    token: z
      .string()
      .optional()
      .describe("Auth token (overrides MGX_TOKEN env var)"),
  },
  async ({ chat_id, env, version, token }) => {
    const url = buildLogsUrl({
      chatId: chat_id,
      env,
      token,
      mgxenv: true,
      version,
    });
    try {
      const response = await fetchWithError(url);
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await response.json();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(json, null, 2),
            },
          ],
        };
      }

      const text = await response.text();
      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching mgxenv: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MGX Thinking Log MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
