import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api, { setAuthToken } from '@/lib/api'; // Import novog API klijenta

interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface SessionContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  fetchUserRole: () => Promise<string | null>;
  // Uklanjamo supabase instancu jer je više ne koristimo
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSessionAndProfile = useCallback(async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('token');

    if (storedToken) {
      setAuthToken(storedToken);
      try {
        const response = await api.get('/auth/me'); // Pretpostavljena ruta za dohvaćanje korisnika
        const profileData = response.data;

        setUser({
          id: profileData.id,
          email: profileData.email || 'N/A',
          role: profileData.role,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
        });
        setToken(storedToken);
      } catch (error: any) {
        console.error('Error fetching user profile:', error.response?.data || error.message);
        toast.error('Failed to load user session. Please log in again.');
        localStorage.removeItem('token');
        setAuthToken(null);
        setUser(null);
        setToken(null);
        navigate('/login');
      }
    } else {
      setUser(null);
      setToken(null);
    }
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchSessionAndProfile();

    // Nema više onAuthStateChange, moramo ručno provjeravati sesiju ili se osloniti na API pozive
    // Za jednostavnost, oslanjamo se na fetchSessionAndProfile pri učitavanju i nakon akcija
  }, [fetchSessionAndProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password }); // Pretpostavljena ruta za login
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      setAuthToken(newToken);
      setToken(newToken);
      setUser(userData); // API bi trebao vratiti korisničke podatke uključujući ulogu
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error('Login failed: ' + (error.response?.data?.message || error.message));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { // Pretpostavljena ruta za registraciju
        first_name: name.split(' ')[0] || null,
        last_name: name.split(' ').slice(1).join(' ') || null,
        email,
        password,
        role,
      });
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      setAuthToken(newToken);
      setToken(newToken);
      setUser(userData);
      toast.success('Registration successful! You are now logged in.');
      navigate('/');
    } catch (error: any) {
      toast.error('Registration failed: ' + (error.response?.data?.message || error.message));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setUser(null);
    setToken(null);
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  const fetchUserRole = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      const response = await api.get(`/profiles/${user.id}`); // Pretpostavljena ruta za dohvaćanje profila
      const profileData = response.data;
      setUser(prev => prev ? { ...prev, role: profileData.role } : null); // Ažuriraj lokalno stanje
      return profileData.role;
    } catch (error: any) {
      console.error('Failed to fetch user role:', error.response?.data || error.message);
      toast.error('Failed to fetch user role.');
      return null;
    }
  }, [user?.id]);

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