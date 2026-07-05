import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";

const KEY = "ondago.onboardingSeen";

interface OnboardingState {
  /** Still reading the persisted flag (gate the splash on this). */
  initializing: boolean;
  /** True once the user has completed or skipped onboarding. */
  seen: boolean;
  /** Mark onboarding done (persists) — call on Get Started / Skip. */
  complete: () => void;
}

const OnboardingContext = createContext<OnboardingState | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [seen, setSeen] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((value) => setSeen(value === "1"))
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, []);

  const complete = useMemo(
    () => () => {
      setSeen(true);
      SecureStore.setItemAsync(KEY, "1").catch(() => {});
    },
    []
  );

  const value = useMemo(
    () => ({ initializing, seen, complete }),
    [initializing, seen, complete]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
