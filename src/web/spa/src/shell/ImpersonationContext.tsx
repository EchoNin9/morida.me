import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ImpersonationTarget {
  userId: string;
  role: string;
}

interface ImpersonationContextValue {
  /** Currently impersonated user (null when not impersonating) */
  target: ImpersonationTarget | null;
  /** Whether impersonation mode is active */
  isImpersonating: boolean;
  /** Start impersonating a user/role — only callable by admins */
  startImpersonation: (userId: string, role: string) => void;
  /** Stop impersonation and revert to real identity */
  stopImpersonation: () => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const ImpersonationContext = createContext<ImpersonationContextValue>({
  target: null,
  isImpersonating: false,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

export function useImpersonation(): ImpersonationContextValue {
  return useContext(ImpersonationContext);
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ImpersonationTarget | null>(() => {
    // Restore from sessionStorage on mount (survives page refreshes)
    const userId = sessionStorage.getItem('mo_impersonate_user');
    const role = sessionStorage.getItem('mo_impersonate_role');
    if (userId && role) return { userId, role };
    return null;
  });

  const startImpersonation = useCallback((userId: string, role: string) => {
    sessionStorage.setItem('mo_impersonate_user', userId);
    sessionStorage.setItem('mo_impersonate_role', role);
    setTarget({ userId, role });
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem('mo_impersonate_user');
    sessionStorage.removeItem('mo_impersonate_role');
    setTarget(null);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        target,
        isImpersonating: target !== null,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}
