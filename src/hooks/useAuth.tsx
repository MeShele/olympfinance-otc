import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data: { session: Session | null } | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  verifyOtp: (email: string, token: string, type: 'signup' | 'email') => Promise<{ error: Error | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let initialSessionLoaded = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Only set loading=false from listener if initial session already loaded
        // This prevents flash of unauthenticated state
        if (initialSessionLoaded) {
          setLoading(false);
        }
      }
    );

    // THEN check for existing session (single source of truth for initial load)
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionLoaded = true;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          signup_domain: window.location.hostname,
        },
      }
    });

    return { error: error as Error | null, data: data ? { session: data.session } : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Compliance: capture login event with whatever IP/UA the proxy chain
    // forwards. Fire-and-forget — never block UX on tracking. The edge
    // function handles geo-mismatch detection internally.
    if (!error) {
      supabase.functions.invoke('compliance-log-event', {
        body: { event_type: 'login' },
      }).catch((err) => {
        // Swallow — observability shouldn't surface to the user.
        console.warn('compliance-log-event failed:', err);
      });
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Drop every cached query so a subsequent login on the same tab
    // cannot see the previous user's tenant data (orders, branding, etc).
    queryClient.clear();
  };

  const verifyOtp = async (email: string, token: string, type: 'signup' | 'email') => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });
    
    return { error: error as Error | null };
  };

  const resendOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, verifyOtp, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
