import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

function parseCredentials(): ServiceAccountCredentials {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not configured. Set it to your Google service account JSON key."
    );
  }
  try {
    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_ENCODED === "base64"
      ? Buffer.from(raw, "base64").toString("utf8")
      : raw;
    const parsed = JSON.parse(json) as ServiceAccountCredentials;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("Missing client_email/private_key");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not a valid service account key: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
}

function buildDrive() {
  const creds = parseCredentials();
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [SCOPE],
  });
  return google.drive({ version: "v3", auth });
}

export const DEFAULT_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

const FILE_FIELDS =
  "id, name, mimeType, size, modifiedTime, webViewLink, description";

export interface FileEntry {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  url?: string;
  description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFileEntry(f: any): FileEntry {
  return {
    id: f.id ?? "",
    name: f.name ?? "",
    mimeType: f.mimeType ?? "",
    size: f.size,
    modifiedTime: f.modifiedTime,
    url: f.webViewLink,
    description: f.description,
  };
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface ListFilesOptions {
  folderId?: string;
  pageSize?: number;
}

export async function listFiles(
  options: ListFilesOptions = {}
): Promise<FileEntry[]> {
  const drive = buildDrive();
  const folderId = options.folderId || DEFAULT_FOLDER_ID || "";
  const q = folderId
    ? `'${escapeQuery(folderId)}' in parents and trashed = false`
    : "trashed = false";
  const res = await drive.files.list({
    q,
    pageSize: options.pageSize ?? 50,
    orderBy: "name",
    fields: `files(${FILE_FIELDS})`,
  });
  return (res.data.files ?? []).map(toFileEntry);
}

export async function searchFiles(
  nameQuery: string,
  pageSize = 50
): Promise<FileEntry[]> {
  const drive = buildDrive();
  const res = await drive.files.list({
    q: `name contains '${escapeQuery(nameQuery)}' and trashed = false`,
    pageSize,
    orderBy: "name",
    fields: `files(${FILE_FIELDS})`,
  });
  return (res.data.files ?? []).map(toFileEntry);
}

export async function getFile(fileId: string): Promise<FileEntry> {
  const drive = buildDrive();
  const res = await drive.files.get({ fileId, fields: FILE_FIELDS });
  return toFileEntry(res.data);
}

const TEXT_TYPES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/csv",
  "image/svg+xml",
];

export interface ReadFileResult {
  name: string;
  mimeType: string;
  content: string;
  truncated: boolean;
}

export async function readFile(fileId: string): Promise<ReadFileResult> {
  const drive = buildDrive();
  const meta = await drive.files.get({ fileId, fields: "id, name, mimeType" });
  const name = meta.data.name ?? fileId;
  const mimeType = meta.data.mimeType ?? "application/octet-stream";

  const isText = TEXT_TYPES.some((prefix) => mimeType.startsWith(prefix));
  if (!isText) {
    throw new Error(
      `File "${name}" is binary (${mimeType}). Use get_file for metadata.`
    );
  }

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  const content = Buffer.from(res.data as ArrayBuffer).toString("utf8");

  return {
    name,
    mimeType,
    content: content.substring(0, 500000),
    truncated: content.length > 500000,
  };
}
