import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, loginUser, registerUser } from './api';

const USER_STORAGE_KEY = 'neatstreet_user_session';

interface AuthContextType {
  user: User | null;
  // Update login and add register to match the form submissions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On app startup, load the user from secure storage.
    async function loadUserFromStorage() {
      try {
        const storedUserJson = await SecureStore.getItemAsync(USER_STORAGE_KEY);
        if (storedUserJson) {
          setUser(JSON.parse(storedUserJson));
        }
      } catch (e) {
        console.error("Failed to load user from storage", e);
      } finally {
        // Auth state has been loaded, app can now navigate.
        setIsLoading(false);
      }
    }
    loadUserFromStorage();
  }, []);

  const login = async (username: string, password: string) => {
    const { user } = await loginUser({ username, password });
    setUser(user);
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
  };

  const register = async (username: string, email: string, password: string) => {
    // This function calls the API but does not log the user in automatically.
    await registerUser({ username, email, password });
  };

  const logout = async () => {
    setUser(null);
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
  };

  return <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};