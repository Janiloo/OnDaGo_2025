import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/AuthContext";
import { useTheme } from "../store/ThemeContext";
import { useOnboarding } from "../store/OnboardingContext";
import { IconName } from "../components/UI";
import { haptics } from "../services/haptics";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";

/** Subtle tactile tick on every tab switch. */
const tabListeners = { tabPress: () => haptics.selection() };

import WelcomeScreen from "../screens/auth/WelcomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import LegalScreen from "../screens/legal/LegalScreen";

import CommuterHomeScreen from "../screens/commuter/CommuterHomeScreen";
import ReportScreen from "../screens/shared/ReportScreen";
import ProfileScreen from "../screens/shared/ProfileScreen";
import EditProfileScreen from "../screens/shared/EditProfileScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import ChatSupportScreen from "../screens/settings/ChatSupportScreen";

import DriverHomeScreen from "../screens/driver/DriverHomeScreen";

import AdminMapScreen from "../screens/admin/AdminMapScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import EditFaresScreen from "../screens/admin/EditFaresScreen";
import ManageUsersScreen from "../screens/admin/ManageUsersScreen";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  Legal: { doc: "terms" | "privacy" };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();
const ProfileStackNav = createNativeStackNavigator();
const SettingsStackNav = createNativeStackNavigator();

function tabIcon(focusedName: IconName, name: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={22} color={color} />
  );
}

function useNavTheme(): Theme {
  const { palette, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.bg,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
    },
  };
}

function useScreenOptions() {
  const { palette } = useTheme();
  return {
    headerStyle: { backgroundColor: palette.surface },
    headerTintColor: palette.text,
    headerTitleStyle: { fontWeight: "700" as const, fontSize: 17 },
    headerShadowVisible: false,
    animation: "slide_from_right" as const,
  };
}

function useTabOptions() {
  const { palette } = useTheme();
  return {
    ...useScreenOptions(),
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.textMuted,
    tabBarStyle: {
      backgroundColor: palette.tabBar,
      borderTopColor: palette.border,
      height: Platform.OS === "ios" ? 84 : 64,
      paddingTop: 6,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const },
    animation: "shift" as const,
  };
}

function ProfileStack() {
  const screenOptions = useScreenOptions();
  return (
    <ProfileStackNav.Navigator screenOptions={screenOptions}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} options={{ title: "Profile" }} />
      <ProfileStackNav.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
    </ProfileStackNav.Navigator>
  );
}

/** Settings hub + its sub-pages (Report an Issue, Chat with Support, legal). */
function SettingsStack() {
  const screenOptions = useScreenOptions();
  return (
    <SettingsStackNav.Navigator screenOptions={screenOptions}>
      <SettingsStackNav.Screen name="SettingsMain" component={SettingsScreen} options={{ title: "Settings" }} />
      {/* Sub-pages carry their own large display titles, so the nav bar is just a
          back affordance (empty title). */}
      <SettingsStackNav.Screen name="Report" component={ReportScreen} options={{ title: "" }} />
      <SettingsStackNav.Screen name="ChatSupport" component={ChatSupportScreen} options={{ title: "" }} />
      <SettingsStackNav.Screen name="Legal" component={LegalScreen} options={{ title: "" }} />
    </SettingsStackNav.Navigator>
  );
}

// Consumer bottom nav (commuter + driver): Profile · Home · Settings. Opens on
// Home; Report an Issue now lives under Settings.
function CommuterTabs() {
  const tabOptions = useTabOptions();
  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={tabOptions} screenListeners={tabListeners}>
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ headerShown: false, tabBarIcon: tabIcon("person", "person-outline") }}
      />
      <Tab.Screen
        name="Home"
        component={CommuterHomeScreen}
        options={{ headerShown: false, tabBarIcon: tabIcon("map", "map-outline") }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{ headerShown: false, tabBarIcon: tabIcon("settings", "settings-outline") }}
      />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  const tabOptions = useTabOptions();
  return (
    <Tab.Navigator initialRouteName="DriverHome" screenOptions={tabOptions} screenListeners={tabListeners}>
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ headerShown: false, tabBarIcon: tabIcon("person", "person-outline") }}
      />
      <Tab.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ headerShown: false, tabBarLabel: "Home", tabBarIcon: tabIcon("map", "map-outline") }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{ headerShown: false, tabBarIcon: tabIcon("settings", "settings-outline") }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const tabOptions = useTabOptions();
  return (
    <Tab.Navigator screenOptions={tabOptions} screenListeners={tabListeners}>
      <Tab.Screen
        name="LiveMap"
        component={AdminMapScreen}
        options={{ headerShown: false, tabBarLabel: "Live Map", tabBarIcon: tabIcon("map", "map-outline") }}
      />
      <Tab.Screen
        name="Reports"
        component={AdminReportsScreen}
        options={{ title: "Operations", tabBarLabel: "Reports", tabBarIcon: tabIcon("reader", "reader-outline") }}
      />
      <Tab.Screen
        name="Fares"
        component={EditFaresScreen}
        options={{ title: "Fare Management", tabBarIcon: tabIcon("cash", "cash-outline") }}
      />
      <Tab.Screen
        name="Manage"
        component={ManageUsersScreen}
        options={{ title: "Accounts", tabBarIcon: tabIcon("person-add", "person-add-outline") }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ headerShown: false, tabBarIcon: tabIcon("person", "person-outline") }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, initializing } = useAuth();
  const { initializing: onboardingInit, seen: onboardingSeen, complete } = useOnboarding();
  const { palette } = useTheme();
  const navTheme = useNavTheme();
  const screenOptions = useScreenOptions();

  if (initializing || onboardingInit) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: palette.bg }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  // First launch (and not already signed in): show onboarding once. Completing
  // or skipping it drops through to the existing auth flow (Login).
  if (!user && !onboardingSeen) {
    return <OnboardingScreen onDone={complete} />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!user ? (
        <AuthStack.Navigator screenOptions={screenOptions}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Reset Password" }} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: "Enter Reset Token" }} />
          <AuthStack.Screen
            name="Legal"
            component={LegalScreen}
            options={({ route }) => ({ title: route.params.doc === "privacy" ? "Privacy Policy" : "Terms & Conditions" })}
          />
        </AuthStack.Navigator>
      ) : user.role === "Admin" ? (
        <AdminTabs />
      ) : user.role === "Driver" ? (
        <DriverTabs />
      ) : (
        <CommuterTabs />
      )}
    </NavigationContainer>
  );
}
