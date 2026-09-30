import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode, JwtPayload } from 'jwt-decode';

export interface CustomJwtPayload extends JwtPayload {
  email?: string;
  name?: string;
  picture?: string;
}

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
  user: User | null;
  isLoading: boolean;
  login: (jwtToken: string) => void;
  logout: () => void;
  updateToken: (newToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('loopdeck_jwt_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      let currentToken = localStorage.getItem('loopdeck_jwt_token');
      let needsRefresh = false;

      if (currentToken) {
        try {
          const decoded = jwtDecode<CustomJwtPayload>(currentToken);
          // Check if expired (with 10 seconds leeway)
          if (decoded.exp && (decoded.exp * 1000) < Date.now() + 10000) {
            needsRefresh = true;
          } else {
            setUser({
              id: decoded.sub || '',
              email: decoded.email || '',
              name: decoded.name || 'User',
              picture: decoded.picture || undefined
            });
          }
        } catch (err) {
          console.error("Token invǭlido", err);
          needsRefresh = true; // Try refreshing before giving up completely
        }
      } else {
        // No token at all, maybe user closed app with valid cookie? Try to proactive refresh just in case
        needsRefresh = true;
      }

      if (needsRefresh) {
        try {
          // Proactive refresh bypassing Axios interceptors to avoid race conditions on mount
          const res = await fetch('/api/auth/refresh', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              currentToken = data.token;
              localStorage.setItem('loopdeck_jwt_token', currentToken!);
              setToken(currentToken);
              
              const decoded = jwtDecode<CustomJwtPayload>(currentToken!);
              setUser({
                id: decoded.sub || '',
                email: decoded.email || '',
                name: decoded.name || 'User',
                picture: decoded.picture || undefined
              });
            } else {
              throw new Error("No token in response");
            }
          } else {
            throw new Error("Refresh failed");
          }
        } catch (err) {
          // Clean up if refresh failed
          if (currentToken) {
             localStorage.removeItem('loopdeck_jwt_token');
             setToken(null);
             setUser(null);
          }
        }
      }
      
      if (isMounted) setIsLoading(false);
    };

    initializeAuth();
    
    return () => { isMounted = false; };
  }, []);

  // Sync token state for subsequent changes (e.g. login/logout)
  useEffect(() => {
    if (token && !isLoading) {
      try {
        const decoded = jwtDecode<CustomJwtPayload>(token);
        setUser({
          id: decoded.sub || '',
          email: decoded.email || '',
          name: decoded.name || 'User',
          picture: decoded.picture || undefined
        });
      } catch (err) {
        logout();
      }
    } else if (!token && !isLoading) {
      setUser(null);
    }
  }, [token, isLoading]);

  const login = (jwtToken: string) => {
    localStorage.setItem('loopdeck_jwt_token', jwtToken);
    setToken(jwtToken);
  };

  const logout = () => {
    localStorage.removeItem('loopdeck_jwt_token');
    setToken(null);
    setUser(null);
    try {
      googleLogout();
    } catch (e) {
      // ignore
    }
  };

  const updateToken = (newToken: string) => {
    localStorage.setItem('loopdeck_jwt_token', newToken);
    setToken(newToken);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, updateToken, updateUser }}>
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
