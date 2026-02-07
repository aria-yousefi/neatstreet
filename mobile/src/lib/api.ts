
// mobile/src/lib/api.ts
import Constants from "expo-constants";

const API_BASE_URL =
  (Constants.expoConfig?.extra?.API_BASE_URL as string | undefined) ??
  "http://192.168.0.248:5000";
  

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function normalizeImageUrl(url: string) {
  if (url.startsWith("http://localhost:5000")) {
    return url.replace("http://localhost:5000", API_BASE_URL);
  }
  return url;
}


async function request<T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    token?: string; // if you have auth
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Try to parse JSON, but don’t crash if backend returns plain text
  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      `API ${res.status} ${res.statusText} for ${url}`,
      res.status,
      data ?? text
    );
  }

  return data as T;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** ---- Example endpoint wrappers (rename to match your backend) ---- **/

export type Report = {
  id: string;
  image_filename?: string;
  issue_type?: string;
  address?: string;
  latitude: number;
  longitude: number;
  timestamp?: string;
};

function withBaseUrl(url: string) {
  // If backend sends localhost URLs, replace with API_BASE_URL
  if (url.startsWith("http://localhost:5000")) {
    return url.replace("http://localhost:5000", API_BASE_URL);
  }
  // If backend sends relative paths like "/uploads/..."
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

export async function getAllReports(): Promise<Report[]> {
  // change "/reports" to whatever your backend route is
  const res = await fetch(`${API_BASE_URL}/user_reports`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: Report[] = await res.json();

  // normalize image_url so images load on device
  return data.map((r) => ({
    ...r,
    image_url: withBaseUrl(`http://localhost:5000/uploads/${r.image_filename}`),
  }));
}

export async function getReport(id: string): Promise<Report> {
  return request<Report>(`/user_reports/${id}`);
}

export async function reportIssue(input: {
  image_filename?: string;
  issue_type?: string;
  address?: string;
  latitude: number;
  longitude: number;
  timestamp?: string;
}): Promise<Report> {
  return request<Report>("/reports", { method: "POST", body: input });
}

export async function classifyIssue(photoUri: string): Promise<{ issue_type?: string }> {
  const form = new FormData();
  form.append("image", {
    uri: photoUri,
    name: "report.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${API_BASE_URL}/classify`, {
    method: "POST",
    headers: { Accept: "application/json" }, // DON'T set Content-Type with FormData
    body: form,
  });

  if (!res.ok) throw new Error(`Classify failed (HTTP ${res.status})`);
  return res.json();
}

export async function createUserReport(input: {
  photoUri: string;
  lat: number;
  lon: number;
}): Promise<Report> {
  if (!input.photoUri) throw new Error("photoUri missing");

  const uri = input.photoUri;
  const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ext === "png" || ext === "jpg" || ext === "jpeg" ? ext : "jpg";
  const mime = safeExt === "png" ? "image/png" : "image/jpeg";

  const form = new FormData();
  form.append("lat", String(input.lat));
  form.append("lon", String(input.lon));

  // IMPORTANT: must be exactly the key your backend checks: 'image'
  form.append("image", {
    uri,
    name: `report.${safeExt}`,
    type: mime,
  } as any);

  const url = `${API_BASE_URL}/report`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      // DO NOT set Content-Type here
    },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Create report failed (HTTP ${res.status}): ${text}`);

  return JSON.parse(text);
}

