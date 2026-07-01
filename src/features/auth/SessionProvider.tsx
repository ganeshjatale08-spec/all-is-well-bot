import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import { loginPurchases, logoutPurchases } from '../../lib/revenuecat';
import { registerForPushNotifications } from '../../lib/notifications';

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      if (nextSession?.user.id) {
        loginPurchases(nextSession.user.id);
        registerForPushNotifications(nextSession.user.id);
      } else {
        logoutPurchases();
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
