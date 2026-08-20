import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listFiles, searchFiles, getFile, readFile } from "./drive.js";

function toText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function run(fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    return { content: [{ type: "text" as const, text: toText(result) }] };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

export function buildServer(): McpServer {
  const server = new McpServer({
    name: "orca-drive-sa-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "list_files",
    {
      title: "List Drive files",
      description:
        "List files and folders in Google Drive. By default lists the configured DRIVE_FOLDER_ID folder.",
      inputSchema: {
        folderId: z
          .string()
          .optional()
          .describe("Google Drive folder ID to list (defaults to DRIVE_FOLDER_ID)"),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results to return (default 50)"),
      },
    },
    async ({ folderId, pageSize }) => run(() => listFiles({ folderId, pageSize }))
  );

  server.registerTool(
    "search_files",
    {
      title: "Search Drive files",
      description:
        "Search files by name (case-insensitive substring match) across everything the service account can access.",
      inputSchema: {
        name: z.string().describe("Substring to match against file names"),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results (default 50)"),
      },
    },
    async ({ name, pageSize }) => run(() => searchFiles(name, pageSize))
  );

  server.registerTool(
    "get_file",
    {
      title: "Get file metadata",
      description: "Fetch metadata for a single Google Drive file by ID.",
      inputSchema: {
        fileId: z.string().describe("Google Drive file ID"),
      },
    },
    async ({ fileId }) => run(() => getFile(fileId))
  );

  server.registerTool(
    "read_file",
    {
      title: "Read text file content",
      description:
        "Read the text content of a Google Drive file (text, JSON, CSV, XML, etc.). " +
        "Returns an error for binary files.",
      inputSchema: {
        fileId: z.string().describe("Google Drive file ID"),
      },
    },
    async ({ fileId }) =>
      run(async () => {
        const result = await readFile(fileId);
        const header =
          `File: ${result.name}\nMIME type: ${result.mimeType}` +
          (result.truncated ? "\n(WARNING: content truncated to 500 KB)\n\n" : "\n\n");
        return header + result.content;
      })
  );

  return server;
}
