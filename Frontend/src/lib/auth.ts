export type AuthUser = {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  role?: "admin" | "user" | string;
};

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("auth-change"));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-change"));
}

export function isAdmin(user?: AuthUser | null): boolean {
  const u = user === undefined ? getUser() : user;
  if (!u) return false;
  return u.role === "admin";
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getUser();
}
