export type Session = {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  role: "Administrador" | "Visualizador";
  theme: "Oscuro" | "RosaPastel";
};

const COOKIE_NAME = "finanzas_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

export function setSession(session: Session) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearSession() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function getClientSession(): Session | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as Session;
  } catch {
    return null;
  }
}

/** Isomorfa: en el cliente lee document.cookie, en el servidor lee next/headers. */
export async function getSession(): Promise<Session | null> {
  if (typeof window !== "undefined") return getClientSession();

  const { cookies } = await import("next/headers");
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as Session;
  } catch {
    return null;
  }
}
