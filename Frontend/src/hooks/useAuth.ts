import { useEffect, useState, useCallback, useMemo } from "react";
import { AuthUser, clearAuth, getUser, isAdmin, isLoggedIn, isManager, isStaff } from "../lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getUser());
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  const refresh = useCallback(() => {
    setUser(getUser());
    setLoggedIn(isLoggedIn());
  }, []);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener("auth-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("auth-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const logout = () => {
    clearAuth();
    refresh();
  };

  const admin = useMemo(() => isAdmin(user), [user]);

  const manager = useMemo(() => isManager(user), [user]);
  const staff = useMemo(() => isStaff(user), [user]);
  return {
    user,
    loggedIn,
    isAdmin: admin,
    logout,
    isManager: manager,
    isStaff: staff,
    refresh,
  };
}
