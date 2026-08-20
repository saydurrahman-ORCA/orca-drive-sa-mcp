# ORCA Drive SA MCP

A Model Context Protocol (MCP) server that exposes a Google Drive folder over
[Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports/streamable-http),
deployed as a Vercel serverless function.

It reads Google Drive through a **Google service account** (Drive API v3,
read-only scope), so no Apps Script web app is needed.

## Tools

| Tool           | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| `list_files`   | List files in a folder (defaults to `DRIVE_FOLDER_ID`)         |
| `search_files` | Search files by name substring                                 |
| `get_file`     | Fetch metadata for a single file by ID                         |
| `read_file`    | Read text content of a file (JSON, CSV, TXT, etc.)             |

## 1. Create a Google service account

1. Go to <https://console.cloud.google.com> and create (or select) a project.
2. Enable the **Google Drive API** (APIs & Services → Library → "Google Drive API").
3. Create a service account:
   - **APIs & Services → Credentials → Create credentials → Service account**.
   - Give it a name and click **Create and continue**, then **Done**.
4. Generate a key:
   - Open the service account → **Keys → Add key → Create new key → JSON**.
   - Download the JSON key file.
5. Copy the service account **email** (e.g. `orca-drive@my-project.iam.gserviceaccount.com`).
6. Share the target Drive folder with that email (right-click the folder in Drive
   → Share → paste the email → **Viewer**).

> Only files/folders shared with the service account are accessible.

## 2. Configure environment variables

Copy `.env.example` to `.env` (local dev) and set the same values in Vercel
(Project > Settings > Environment Variables):

| Variable                              | Description                                            |
| ------------------------------------- | ------------------------------------------------------ |
| `GOOGLE_SERVICE_ACCOUNT_JSON`         | The full JSON key contents (single line)               |
| `GOOGLE_SERVICE_ACCOUNT_JSON_ENCODED` | Set to `base64` if the JSON value is base64-encoded    |
| `DRIVE_FOLDER_ID`                     | Default folder ID to list                              |

## 3. Run locally

```bash
npm install
vercel dev
```

Test with the MCP Inspector (`npx @modelcontextprotocol/inspector`) using
transport **Streamable HTTP** and URL `http://localhost:3000/`.

## 4. Deploy to Vercel

```bash
vercel --prod
```

Your endpoint will be `https://<project>.vercel.app/`.

## 5. Connect a client

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "orca-drive-sa": {
      "type": "http",
      "url": "https://<project>.vercel.app/"
    }
  }
}
```
