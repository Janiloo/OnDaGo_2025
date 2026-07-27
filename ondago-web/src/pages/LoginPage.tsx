import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { errorMessage } from "../api/client";
import { colors, radius } from "../theme";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      navigate(user.kind === "super" ? "/platform" : "/company", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <form onSubmit={submit} style={s.card}>
        <div style={s.brand}>
          <div style={s.logo}>🚌</div>
          <div>
            <div style={s.title}>Sabako</div>
            <div style={s.subtitle}>Admin Console</div>
          </div>
        </div>

        <label style={s.label}>Email</label>
        <input
          style={s.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoFocus
        />

        <label style={s.label}>Password</label>
        <input
          style={s.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && <div style={s.error}>{error}</div>}

        <button type="submit" disabled={loading} style={{ ...s.button, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <div style={s.hint}>
          Platform SuperAdmin and Company Admin only. Drivers and commuters use the mobile app.
        </div>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: colors.bg, padding: 24 },
  card: {
    width: 380,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    padding: 28,
    display: "flex",
    flexDirection: "column",
  },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: colors.primary,
    display: "grid",
    placeItems: "center",
    fontSize: 26,
  },
  title: { fontSize: 24, fontWeight: 800, color: colors.text, lineHeight: 1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  label: { fontSize: 13, fontWeight: 600, color: colors.textMuted, marginBottom: 6, marginTop: 12 },
  input: {
    background: colors.surfaceAlt,
    border: `1.5px solid transparent`,
    borderRadius: radius.md,
    padding: "12px 14px",
    color: colors.text,
    fontSize: 15,
    outline: "none",
  },
  error: {
    marginTop: 14,
    background: "#3B1A1A",
    color: colors.danger,
    borderRadius: radius.sm,
    padding: "10px 12px",
    fontSize: 13,
  },
  button: {
    marginTop: 20,
    background: colors.primary,
    color: colors.onPrimary,
    border: "none",
    borderRadius: radius.md,
    padding: "13px 16px",
    fontSize: 15,
    fontWeight: 700,
  },
  hint: { marginTop: 16, fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 1.5 },
};
