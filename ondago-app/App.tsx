import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/store/AuthContext";
import { ThemeProvider, useTheme } from "./src/store/ThemeContext";
import { OnboardingProvider, useOnboarding } from "./src/store/OnboardingContext";
import { ToastProvider } from "./src/components/Toast";
import { BrandedSplash } from "./src/components/BrandedSplash";
import RootNavigator from "./src/navigation";
// Registers the driver background-location task at startup so the OS can
// invoke it even after the app is restarted in the background.
import "./src/services/backgroundLocation";

// Hold the native splash until JS has mounted, then hand off to the animated
// branded splash — no white flash in between. Best-effort; guarded so a missing
// native module (old dev build) or web can't crash app startup.
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {
  /* splash module unavailable */
}

function ThemedApp() {
  const { isDark } = useTheme();
  const { initializing: authInit } = useAuth();
  const { initializing: onboardingInit } = useOnboarding();
  const [splashDone, setSplashDone] = useState(false);

  // Hand off from the native splash to our animated one as soon as we mount.
  useEffect(() => {
    try {
      SplashScreen.hideAsync().catch(() => {});
    } catch {
      /* splash module unavailable */
    }
  }, []);

  // Hold the branded splash until both the session and the onboarding flag load.
  const ready = !authInit && !onboardingInit;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
      {!splashDone && <BrandedSplash ready={ready} onDone={() => setSplashDone(true)} />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <OnboardingProvider>
            <AuthProvider>
              <ThemedApp />
            </AuthProvider>
          </OnboardingProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
