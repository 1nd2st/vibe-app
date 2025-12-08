// Auth store for user authentication state
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authenticateUser,
  initDatabase,
  changePassword,
  type User,
} from "../database/db-enhanced";
import {
  generateSessionId,
  clearSessionId,
} from "../utils/security";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; errors: string[] }>;
  clearError: () => void;
  initializeDB: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionId: null,

      initializeDB: async () => {
        console.log("[AuthStore] Starting database initialization");
        try {
          await initDatabase();
          console.log("[AuthStore] Database initialized successfully");
        } catch (error) {
          console.error("[AuthStore] Failed to initialize database:", error);
          // Re-throw the error so App.tsx can catch it
          throw error;
        }
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const user = await authenticateUser(username, password);

          if (user) {
            // Generate session ID
            const sessionId = generateSessionId();

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionId,
            });
            return true;
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: "Invalid username or password",
              sessionId: null,
            });
            return false;
          }
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || "Login failed. Please try again.",
            sessionId: null,
          });
          return false;
        }
      },

      logout: () => {
        clearSessionId();
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          sessionId: null,
        });
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        const { user } = get();
        if (!user) {
          return { success: false, errors: ["Not logged in"] };
        }

        const result = await changePassword(user.id, oldPassword, newPassword);

        if (result.success) {
          // Update user must_change_password flag
          set({
            user: {
              ...user,
              must_change_password: false,
            },
          });
        }

        return result;
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionId: state.sessionId,
      }),
    }
  )
);
