import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  points?: number;
  currentStreak?: number;
}

export interface AuthContextType {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  login: (jwtToken: string, refreshToken: string) => void;
  logout: () => void;
  updateToken: (newToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt_token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('refresh_token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          id: decoded.sub || '',
          email: decoded.email || '',
          name: decoded.name || 'User',
          picture: decoded.picture || undefined,
          points: decoded.points || 0,
          currentStreak: decoded.currentStreak || 0
        });
      } catch (err) {
        console.error("Token invǭlido", err);
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const login = (jwtToken: string, newRefreshToken: string) => {
    localStorage.setItem('jwt_token', jwtToken);
    localStorage.setItem('refresh_token', newRefreshToken);
    setToken(jwtToken);
    setRefreshToken(newRefreshToken);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    try {
      googleLogout();
    } catch (e) {
      // ignore
    }
  };

  const updateToken = (newToken: string) => {
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ token, refreshToken, user, login, logout, updateToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
