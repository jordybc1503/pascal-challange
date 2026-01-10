'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { socketClient } from '@/lib/socket';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuth((state) => state.initialize);
  const user = useAuth((state) => state.user);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initialize();
    }
  }, [initialize]);

  // Connect socket when user is authenticated
  useEffect(() => {
    if (user) {
      console.log('🔌 Connecting socket for user:', user.email);
      socketClient.connect();

      return () => {
        console.log('🔌 Disconnecting socket');
        socketClient.disconnect();
      };
    }
  }, [user]);

  return <>{children}</>;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
