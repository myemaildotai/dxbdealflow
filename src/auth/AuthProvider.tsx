"use client";

import { useState, useCallback, useMemo, ReactNode } from "react";
import { AuthContext, AuthContextType } from "./authContext";
import { AuthUser } from "./types";
import { useAuthInit } from "./useAuth";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const isAuthenticated = !loading && user !== null;
  const isAnonymous = user?.isAnonymous ?? false;

  const setContextUser = useCallback((nextUser: AuthUser | null) => setUser(nextUser), []);
  const setContextLoading = useCallback((nextLoading: boolean) => setLoading(nextLoading), []);
  const setContextError = useCallback((nextError: Error | null) => setError(nextError), []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      isAnonymous,
      setUser: setContextUser,
      setLoading: setContextLoading,
      setError: setContextError,
    }),
    [error, isAnonymous, isAuthenticated, loading, setContextError, setContextLoading, setContextUser, user]
  );

  useAuthInit(contextValue.setUser, contextValue.setLoading, contextValue.setError);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
