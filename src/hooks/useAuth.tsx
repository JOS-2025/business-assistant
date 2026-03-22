import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  aal: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  aal: null,
  loading: true,
  refreshProfile: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aal, setAal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ id: userId, role: 'owner' }])
            .select()
            .single();
          
          if (!createError) setProfile(newProfile);
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAal(session?.user?.app_metadata?.aal || null);
      if (currentUser) {
        localStorage.setItem('business_assistant_user', currentUser.id);
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAal(session?.user?.app_metadata?.aal || null);
      if (currentUser) {
        localStorage.setItem('business_assistant_user', currentUser.id);
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setAal(null);
        setLoading(false);
        localStorage.removeItem('business_assistant_user');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, aal, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
