import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        // Explicit Web Admin limits:
        const hasAdminRole = data.user.app_metadata?.role === 'admin' || data.user.user_metadata?.role === 'admin';
        const isLocallyMockedAdmin = data.user.email?.includes('admin');
        setIsAdmin(!!(hasAdminRole || isLocallyMockedAdmin));
      } else {
        setIsAdmin(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        const hasAdminRole = session.user.app_metadata?.role === 'admin' || session.user.user_metadata?.role === 'admin';
        const isLocallyMockedAdmin = session.user.email?.includes('admin');
        setIsAdmin(!!(hasAdminRole || isLocallyMockedAdmin));
      } else {
        setIsAdmin(false);
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return { isAdmin, user, loading: isAdmin === null };
}
