import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type AppRole = "admin" | "hr" | "panelist";

interface AuthUser {
  id: string;   // email used as stable identifier
  email: string;
  name: string;
  role: string;
  hrRoles?: string[];
}

interface AuthCtx {
  user: AuthUser | null;
  session: AuthUser | null;
  loading: boolean;
  allowed: AuthUser | null;
  roles: AppRole[];
  isAdmin: boolean;
  isHR: boolean;
  isPanelist: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const data = await api<{ email: string; name: string; role: string; hrRoles?: string[] }>("/api/auth/me");
      setUser({ ...data, id: data.email });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  const roles: AppRole[] = user
    ? user.role === "admin"
      ? ["admin", "hr", "panelist"]
      : user.role === "hr"
      ? ["hr"]
      : ["panelist"]
    : [];

  return (
    <Ctx.Provider
      value={{
        user,
        session: user,
        loading,
        allowed: user,
        roles,
        isAdmin: roles.includes("admin"),
        isHR: roles.includes("hr") || roles.includes("admin"),
        isPanelist: roles.includes("panelist"),
        signOut,
        refresh: loadUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
