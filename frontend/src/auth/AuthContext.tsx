import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { Team, User } from "../types";

interface AuthState {
  user: User | null;
  teams: Team[];
  activeTeamId: number | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  setActiveTeamId: (teamId: number | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!localStorage.getItem("ops-token")) {
      setUser(null);
      setTeams([]);
      setActiveTeamId(null);
      return;
    }
    try {
      const response = await api.get("/users/me");
      setUser(response.data.user);
      const memberships = response.data.teams ?? [];
      setTeams(memberships);
      setActiveTeamId((current) =>
        memberships.some((team: Team) => team.id === current) ? current : null
      );
    } catch (error) {
      localStorage.removeItem("ops-token");
      setUser(null);
      setTeams([]);
      setActiveTeamId(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    refreshProfile().catch(() => undefined).finally(() => setLoading(false));
  }, [refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    localStorage.setItem("ops-token", response.data.token);
    await refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(() => {
    localStorage.removeItem("ops-token");
    setUser(null);
    setTeams([]);
    setActiveTeamId(null);
  }, []);

  const value = useMemo(
    () => ({ user, teams, activeTeamId, loading, signIn, signOut, refreshProfile, setActiveTeamId }),
    [user, teams, activeTeamId, loading, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
