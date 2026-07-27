import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { archivoFontMap } from "./src/theme";
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
  // Brand typeface (Archivo). `error` lets us fail open to the system font
  // rather than hang on the splash if a font asset can't load.
  const [fontsLoaded, fontError] = useFonts(archivoFontMap);

  // Hand off from the native splash to our animated one as soon as we mount.
  useEffect(() => {
    try {
      SplashScreen.hideAsync().catch(() => {});
    } catch {
      /* splash module unavailable */
    }
  }, []);

  // Hold the branded splash until the session, onboarding flag, and brand fonts
  // are all resolved (font error counts as resolved — fall back to system font).
  const ready = !authInit && !onboardingInit && (fontsLoaded || !!fontError);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Mount the navigator only once fonts (and session) are ready. Mounting it
          under the splash before Archivo loads made screens measure their text
          with the system font, then clip when the wider brand font swapped in. */}
      {ready && <RootNavigator />}
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
