'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<{ isSignedIn: boolean; loading: boolean }>({
  isSignedIn: false,
  loading: true,
});

export default function InsforgeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncLocalAuth = (signedIn: boolean, userId?: string | null) => {
      if (signedIn) {
        localStorage.setItem('octo_room_auth', 'true');
        if (userId) {
          localStorage.setItem('octo_room_user_id', userId);
        }
        return;
      }

      localStorage.removeItem('octo_room_auth');
      localStorage.removeItem('octo_room_user_id');
    };

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (session?.user) {
        syncLocalAuth(true, session.user.id);
        setIsSignedIn(true);
      } else {
        setIsSignedIn(localStorage.getItem('octo_room_auth') === 'true');
      }

      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      const signedIn = !!session?.user;
      syncLocalAuth(signedIn, session?.user?.id);
      setIsSignedIn(signedIn);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isSignedIn, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useLocalAuth = () => useContext(AuthContext);
