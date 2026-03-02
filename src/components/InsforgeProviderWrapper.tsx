'use client'; 

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext<{ isSignedIn: boolean; loading: boolean }>({ 
  isSignedIn: false, 
  loading: true 
});

export default function InsforgeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🌟 终极暴力托底：只认我们自己写的通行证标识
    const hasPass = localStorage.getItem('octo_room_auth') === 'true';
    setIsSignedIn(hasPass);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isSignedIn, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useLocalAuth = () => useContext(AuthContext);