import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

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
  supabase: typeof supabase; // Provide the supabase client
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSessionAndProfile = useCallback(async () => {
    setIsLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error fetching session:', sessionError.message);
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (session) {
      setToken(session.access_token);
      // Fetch user profile from public.profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles_with_auth_emails') // Use the view that includes email
        .select('id, first_name, last_name, role, email')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError.message);
        // If profile not found, it might be a new user, or an issue.
        // For now, we'll set a basic user from auth session.
        setUser({
          id: session.user.id,
          email: session.user.email || 'N/A',
          role: 'client', // Default role if profile not found
          first_name: null,
          last_name: null,
        });
      } else if (profileData) {
        setUser({
          id: profileData.id,
          email: profileData.email || 'N/A',
          role: profileData.role,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
        });
      }
    } else {
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setToken(session.access_token);
        // Re-fetch profile on auth state change (e.g., login, user update)
        supabase
          .from('profiles_with_auth_emails')
          .select('id, first_name, last_name, role, email')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              console.error('Error fetching user profile on auth state change:', profileError.message);
              setUser({
                id: session.user.id,
                email: session.user.email || 'N/A',
                role: 'client',
                first_name: null,
                last_name: null,
              });
            } else if (profileData) {
              setUser({
                id: profileData.id,
                email: profileData.email || 'N/A',
                role: profileData.role,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
              });
            }
          });
      } else {
        setToken(null);
        setUser(null);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchSessionAndProfile, navigate]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Login failed: ' + error.message);
      setIsLoading(false);
      throw error;
    }
    if (data.session) {
      setToken(data.session.access_token);
      // Profile will be fetched by onAuthStateChange listener
      toast.success('Logged in successfully!');
      navigate('/');
    }
    setIsLoading(false);
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: name.split(' ')[0] || null,
          last_name: name.split(' ').slice(1).join(' ') || null,
          role: role,
        },
      },
    });

    if (error) {
      toast.error('Registration failed: ' + error.message);
      setIsLoading(false);
      throw error;
    }
    if (data.session) {
      setToken(data.session.access_token);
      // Profile will be fetched by onAuthStateChange listener
      toast.success('Registration successful! You are now logged in.');
      navigate('/');
    } else if (data.user && !data.session) {
      // User created but email confirmation needed
      toast.info('Registration successful! Please check your email to confirm your account.');
      navigate('/login'); // Redirect to login to wait for confirmation
    }
    setIsLoading(false);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Logout failed: ' + error.message);
    } else {
      toast.success('Logged out successfully!');
      setToken(null);
      setUser(null);
      navigate('/login');
    }
  };

  const fetchUserRole = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('Failed to fetch user role:', error.message);
      toast.error('Failed to fetch user role.');
      return null;
    }
    setUser(prev => prev ? { ...prev, role: data.role } : null); // Update local user state
    return data.role;
  }, [user?.id]);

  return (
    <SessionContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!user, isLoading, fetchUserRole, supabase }}>
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