import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Coach, Player } from "./types";

interface AuthState {
  coach: Coach | null;
  sessionExpiry: number | null; // Unix timestamp ms
  isAuthenticated: boolean;
  setCoach: (coach: Coach, expiryMs: number) => void;
  clearAuth: () => void;
  isSessionValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      coach: null,
      sessionExpiry: null,
      isAuthenticated: false,

      setCoach: (coach, expiryMs) =>
        set({ coach, sessionExpiry: expiryMs, isAuthenticated: true }),

      clearAuth: () =>
        set({ coach: null, sessionExpiry: null, isAuthenticated: false }),

      isSessionValid: () => {
        const { sessionExpiry } = get();
        if (!sessionExpiry) return false;
        return Date.now() < sessionExpiry;
      },
    }),
    {
      name: "oasis-auth",
    }
  )
);

interface PlayerState {
  players: Player[];
  selectedPlayer: Player | null;
  setPlayers: (players: Player[]) => void;
  setSelectedPlayer: (player: Player | null) => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  players: [],
  selectedPlayer: null,
  setPlayers: (players) => set({ players }),
  setSelectedPlayer: (player) => set({ selectedPlayer: player }),
}));
