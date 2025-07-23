import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api'; // Import the new API client
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string | null;
  last_name?: string | null;
  // Add any other user properties returned by your backend
}

interface SessionContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  fetchUserRole: () => Promise<string | null>; // Expose for App.tsx/Sidebar.tsx
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async (jwtToken: string) => {
    try {
      // Assuming your /users endpoint can return the current user's profile
      // Or you might need a specific /auth/me endpoint if your backend provides one
      // For now, let's assume /users endpoint can filter by ID or you have a way to get current user's ID from token
      // Given the schema, the user object from login/register should contain enough info.
      // If not, we'd need a /auth/me endpoint. For now, we'll rely on the user object from login/register.
      // If the token is valid, we assume the user is authenticated.
      // The backend should return user details upon successful login/register.
      // For simplicity, we'll store the user object directly from login/register response.
      // If you need to re-fetch user details on app load, you'd need a /auth/me endpoint.
      // For now, we'll just check if a token exists.
      const storedUser = localStorage.getItem('user_profile');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // If no stored user, and token exists, we might need to fetch it.
        // This is a potential gap if /auth/login doesn't return full user profile.
        // For now, we'll assume the user object is stored on login/register.
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // If fetching profile fails, token might be invalid, so log out
      logout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
    } else {
      setIsLoading(false);
      navigate('/login');
    }
  }, [token, fetchUserProfile, navigate]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/login', { email, password }, null, true);
      localStorage.setItem('jwt_token', response.token);
      localStorage.setItem('user_profile', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      toast.success('Logged in successfully!');
      navigate('/'); // Redirect to home/dashboard
    } catch (error: any) {
      toast.error('Login failed: ' + error.message);
      throw error; // Re-throw to allow form to handle errors
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password, role }, null, true);
      localStorage.setItem('jwt_token', response.token);
      localStorage.setItem('user_profile', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      toast.success('Registration successful! You are now logged in.');
      navigate('/'); // Redirect to home/dashboard
    } catch (error: any) {
      toast.error('Registration failed: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  const fetchUserRole = useCallback(async (): Promise<string | null> => {
    if (!user?.id || !token) return null;
    try {
      // Assuming /users/:id returns the profile with role
      const profile = await api.get<User>(`/users/${user.id}`, token);
      setUser(prev => prev ? { ...prev, role: profile.role } : profile); // Update local user state
      return profile.role;
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      toast.error('Failed to fetch user role.');
      return null;
    }
  }, [user?.id, token]);

  return (
    <SessionContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!user, isLoading, fetchUserRole }}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">Loading application...</div>
      ) : (
        children
      )}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};