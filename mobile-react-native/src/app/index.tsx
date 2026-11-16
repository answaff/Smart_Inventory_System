
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import InventoryMobileApp from "../components/InventoryMobileApp";


const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

const ACCESS_KEY = "smartinventory_access";
const REFRESH_KEY = "smartinventory_refresh";

type UserProfile = {
  username: string;
  role?: string;
};

type TokenResponse = {
  access?: string;
  refresh?: string;
  detail?: string;
};

function endpoint(path: string): string {
  if (!API_URL) {
    throw new Error("API URL missing. Check your .env.local file.");
  }
  return `${API_URL}${path}`;
}

async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  await SecureStore.setItemAsync(ACCESS_KEY, access);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

async function getProfile(
  access: string
): Promise<UserProfile | null> {
  const response = await fetch(endpoint("/auth/me/"), {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Profile verification failed (${response.status}).`
    );
  }

  return (await response.json()) as UserProfile;
}

async function restoreSession(): Promise<UserProfile | null> {
  const access = await SecureStore.getItemAsync(ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);

  // Try the existing access token first.
  if (access) {
    const profile = await getProfile(access);
    if (profile) return profile;
  }

  // No usable access token and no refresh token.
  if (!refresh) {
    await clearTokens();
    return null;
  }

  // Request a fresh access token from Django.
  const response = await fetch(endpoint("/token/refresh/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  // The refresh token expired or is invalid.
  if (response.status === 400 || response.status === 401) {
    await clearTokens();
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Token refresh failed (${response.status}).`
    );
  }

  const data = (await response.json()) as TokenResponse;

  if (!data.access) {
    throw new Error("Django did not return a new access token.");
  }

  const profile = await getProfile(data.access);

  if (!profile) {
    await clearTokens();
    return null;
  }

  // Supports Django Simple JWT refresh-token rotation.
  await saveTokens(data.access, data.refresh || refresh);

  return profile;
}

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const profile = await restoreSession();

        if (active) {
          setUser(profile);
        }
      } catch (err) {
        if (active) {
          setError(
            "Could not restore your session. Check your connection."
          );
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin() {
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(endpoint("/token/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = (await response.json()) as TokenResponse;

      if (!response.ok) {
        setError(
          response.status === 401
            ? "Invalid username or password."
            : data.detail || `Login failed (${response.status}).`
        );
        return;
      }

      if (!data.access || !data.refresh) {
        throw new Error("Django did not return both JWT tokens.");
      }

      // Verify identity before saving the session.
      const profile = await getProfile(data.access);

      if (!profile) {
        throw new Error("Could not verify your account.");
      }

      await saveTokens(data.access, data.refresh);

      setUser(profile);
      setPassword("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error";

      setError(
        message.includes("Network request failed")
          ? "Cannot connect to Django. Check your Wi-Fi and API IP."
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setError("");

    try {
      await clearTokens();
      setUser(null);
      setPassword("");
      setUsername("");
    } catch {
      setError("Could not clear stored session. Please try again.");
    }
  }

  if (!checkingSession && user) {
  return (
    <InventoryMobileApp
      user={user}
      onLogout={handleLogout}
    />
  );
}


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>SI</Text>
        </View>

        <Text style={styles.appTitle}>Smart Inventory</Text>
        <Text style={styles.appSubtitle}>
          Inventory & Order Management System
        </Text>

        <View style={styles.card}>
          {checkingSession ? (
            <View style={styles.center}>
              <ActivityIndicator
                size="large"
                color="#2563EB"
              />
              <Text style={styles.description}>
                Checking your session...
              </Text>
            </View>
          ) : user ? (
            <View style={styles.center}>
              <Text style={styles.successIcon}>✓</Text>

              <Text style={styles.welcome}>
                Login Successful!
              </Text>

              <Text style={styles.description}>
                Connected to Django REST API
              </Text>

              <Text style={styles.accountLabel}>
                SIGNED IN AS
              </Text>

              <Text style={styles.accountName}>
                {user.username}
              </Text>

              <Text style={styles.accountRole}>
                {user.role || "Inventory User"}
              </Text>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogout}
              >
                <Text style={styles.buttonText}>
                  Sign Out
                </Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>
                Your session is saved securely.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.welcome}>
                Welcome Back
              </Text>

              <Text style={styles.description}>
                Sign in to access your inventory dashboard
              </Text>

              <Text style={styles.label}>Username</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                editable={!loading}
              />

              <Text style={styles.label}>Password</Text>

              <View style={styles.passwordBox}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  <Text style={styles.showText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.footerText}>
                Authorized Inventory Admin & Staff only
              </Text>
            </>
          )}
        </View>

        <Text style={styles.bottomText}>
          Smart Inventory Management System
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
    paddingVertical: 55,
  },
  center: {
    alignItems: "center",
    paddingVertical: 14,
  },
  logo: {
    width: 65,
    height: 65,
    backgroundColor: "#2563EB",
    borderRadius: 18,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  appTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    textAlign: "center",
  },
  appSubtitle: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 36,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 25,
    elevation: 5,
  },
  welcome: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 9,
    marginBottom: 27,
    lineHeight: 21,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
    marginBottom: 9,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 22,
  },
  passwordBox: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
  },
  showText: {
    color: "#2563EB",
    fontWeight: "700",
    padding: 6,
  },
  errorText: {
    color: "#DC2626",
    marginTop: 15,
    fontSize: 13,
    textAlign: "center",
  },
  loginButton: {
    height: 54,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 23,
  },
  bottomText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 30,
    fontSize: 12,
  },
  successIcon: {
    color: "#16A34A",
    fontSize: 65,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 15,
  },
  accountLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  accountName: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 8,
  },
  accountRole: {
    color: "#2563EB",
    fontSize: 15,
    marginTop: 6,
    fontWeight: "600",
  },
});
