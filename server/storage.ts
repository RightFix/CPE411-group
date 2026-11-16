const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

function getStorageConfig() {
  const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "group-materials").trim();
  return { url, key, bucket };
}

export function isStorageConfigured() {
  const { url, key } = getStorageConfig();
  return Boolean(url && key);
}

function encodeObjectPath(objectPath: string) {
  return objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizeSignedUrl(baseUrl: string, rawPath: string): string {
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  if (rawPath.startsWith("/storage/v1/")) return `${baseUrl}${rawPath}`;
  if (rawPath.startsWith("/")) return `${baseUrl}/storage/v1${rawPath}`;
  return `${baseUrl}/storage/v1/${rawPath}`;
}

let bucketChecked = false;

export async function ensureBucket(): Promise<void> {
  if (bucketChecked) return;
  const { url, key, bucket } = getStorageConfig();
  if (!url || !key) {
    throw new Error("File storage is not configured on the server (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const checkRes = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    method: "GET",
    headers,
  });

  if (checkRes.ok) {
    bucketChecked = true;
    return;
  }

  const createRes = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: false,
      file_size_limit: MAX_FILE_BYTES,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    // Ignore 409 Conflict if created concurrently
    if (createRes.status !== 409) {
      throw new Error(`Failed to initialize storage bucket: ${errText || createRes.status}`);
    }
  }

  bucketChecked = true;
}

export async function createSignedUploadUrl(storagePath: string): Promise<{
  signedUrl: string;
  token: string;
  storagePath: string;
}> {
  await ensureBucket();
  const { url, key, bucket } = getStorageConfig();
  const encodedPath = encodeObjectPath(storagePath);

  const res = await fetch(
    `${url}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not create upload URL: ${errText || res.status}`);
  }

  const data = (await res.json()) as { url?: string; token?: string };
  if (!data.url) throw new Error("Storage provider did not return a signed upload URL.");

  return {
    signedUrl: normalizeSignedUrl(url, data.url),
    token: data.token || "",
    storagePath,
  };
}

export async function createSignedReadUrl(
  storagePath: string,
  downloadFileName?: string
): Promise<string | null> {
  if (!isStorageConfigured()) return null;
  const { url, key, bucket } = getStorageConfig();
  const encodedPath = encodeObjectPath(storagePath);

  const res = await fetch(
    `${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    }
  );

  if (!res.ok) return null;
  const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const raw = data.signedURL || data.signedUrl;
  if (!raw) return null;

  const full = normalizeSignedUrl(url, raw);
  if (!downloadFileName) return full;
  const sep = full.includes("?") ? "&" : "?";
  return `${full}${sep}download=${encodeURIComponent(downloadFileName)}`;
}

export async function deleteStorageObject(storagePath: string): Promise<void> {
  if (!isStorageConfigured()) return;
  const { url, key, bucket } = getStorageConfig();
  const encodedPath = encodeObjectPath(storagePath);

  const res = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: "DELETE",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Failed to remove stored file: ${errText || res.status}`);
  }
}
