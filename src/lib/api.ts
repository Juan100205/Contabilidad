import { getSession } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit, skipJsonHeader = false): Promise<T> {
  const session = await getSession();

  const headers = new Headers(skipJsonHeader ? undefined : { "Content-Type": "application/json" });
  if (session) headers.set("Authorization", `Bearer ${session.token}`);
  if (options?.headers) {
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(text || `Error ${res.status} al llamar ${path}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
  // No fijamos Content-Type: el navegador arma el boundary de multipart/form-data solo.
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }, true),
};

export { API_URL };
