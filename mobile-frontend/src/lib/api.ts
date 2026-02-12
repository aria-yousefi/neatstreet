
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

// Consolidate the URL normalization logic into one function.
function normalizeImageUrl(url: string) {
  if (url.startsWith("http://localhost:5000")) {
    return url.replace("http://localhost:5000", API_BASE_URL);
  }
  // If backend sends relative paths like "/uploads/..."
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
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
  image_url?: string; // Added for frontend convenience
  image_filename?: string;
  issue_type?: string;
  user_defined_issue_type?: string; // New field
  details?: string; // New field
  address?: string;
  latitude: number;
  longitude: number;
  timestamp?: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
};

export async function getAllReports(): Promise<Report[]> {
  // Use the generic request helper for consistency and better error handling.
  const data = await request<Report[]>("/user_reports");

  // normalize image_url so images load on device
  return data.map((bombo) => ({
    ...bombo,
    // Construct the relative path and let normalizeImageUrl handle the rest.
    image_url: normalizeImageUrl(`/uploads/${bombo.image_filename}`),
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
  userId: number;
  issue_type: string;
  user_defined_issue_type?: string; // New field
  details?: string; // New field
}): Promise<Report> {
  if (!input.photoUri) throw new Error("photoUri missing");

  const uri = input.photoUri;
  const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ext === "png" || ext === "jpg" || ext === "jpeg" ? ext : "jpg";
  const mime = safeExt === "png" ? "image/png" : "image/jpeg";

  const form = new FormData();
  form.append("lat", String(input.lat));
  form.append("lon", String(input.lon));
  form.append("user_id", String(input.userId));
  form.append("issue_type", input.issue_type);
  if (input.user_defined_issue_type) {
    form.append("user_defined_issue_type", input.user_defined_issue_type);
  }
  if (input.details) {
    form.append("details", input.details);
  }

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

/** ---- Auth endpoints ---- **/

export async function loginUser(input: {
  username: string;
  password: string;
}): Promise<{ message: string; user: User }> {
  return request<{ message: string; user: User }>("/login", {
    method: "POST",
    body: input,
  });
}

export async function getMyReports(userId: number): Promise<Report[]> {
  const reports = await request<Report[]>(`/my-reports/${userId}`);
  return reports.map((report) => ({
    ...report,
    image_url: normalizeImageUrl(report.image_url ?? ''),
  }));
}

export async function deleteReport(reportId: number, userId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/report/${reportId}`, {
    method: 'DELETE',
    // This is a simplified auth check. In a real app, this would be a JWT token.
    body: {
      user_id: userId,
    },
  });
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
}): Promise<{ message: string; user_id: number }> {
  return request<{ message: string; user_id: number }>("/register", {
    method: "POST",
    body: input,
  });
}
