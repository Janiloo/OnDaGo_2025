import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { COMPANY_NAV } from "../companyNav";
import { colors, radius } from "../theme";

interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  status: string;
  verificationStatus: string;
  logoDataUri: string | null;
  brandColor: string | null;
}

/** Downscale an uploaded image to a small square-ish logo and return a data URI
 * that fits the backend's ~100KB cap. PNG keeps transparency; large photos fall
 * back to JPEG which compresses far better. */
async function fileToLogoDataUri(file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  const MAX = 256;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);

  const png = canvas.toDataURL("image/png");
  if (png.length <= 140_000) return png;
  const jpeg = canvas.toDataURL("image/jpeg", 0.85);
  if (jpeg.length <= 140_000) return jpeg;
  throw new Error("Even after downscaling, the image is too large. Use a simpler logo image.");
}

/**
 * Company console — Branding (Tier 2): the logo and brand color commuters see
 * ("Operated by …" in the mobile app). Stored inline on the company record.
 */
export default function CompanyBrandingPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [color, setColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<CompanyProfile>("/api/admin/company")
      .then((res) => {
        setProfile(res.data);
        setLogo(res.data.logoDataUri);
        setColor(res.data.brandColor ?? "");
      })
      .catch((err) => setError(errorMessage(err, "Could not load your company profile.")))
      .finally(() => setLoading(false));
  }, []);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setLogo(await fileToLogoDataUri(file));
      setSavedAt(null);
    } catch (err: any) {
      setError(err?.message ?? "Could not process that image.");
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put("/api/admin/company/branding", {
        logoDataUri: logo,
        brandColor: color.trim() || null,
      });
      setSavedAt(Date.now());
    } catch (err) {
      setError(errorMessage(err, "Could not save branding."));
    } finally {
      setSaving(false);
    }
  };

  const validColor = !color.trim() || /^#[0-9a-fA-F]{6}$/.test(color.trim());

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <h1 style={s.h1}>Branding</h1>
      <p style={s.sub}>
        Commuters see this as "Operated by {profile?.name ?? "your company"}" on the live map. The logo is downscaled
        automatically; the color accents your routes in the commuter app.
      </p>

      {error && <div style={s.error}>{error}</div>}
      {savedAt && <div style={s.saved}>Branding saved — commuters will see it on their next app refresh.</div>}

      <div style={s.card}>
        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : (
          <>
            <div style={s.rowWrap}>
              <div>
                <div style={s.label}>Logo</div>
                <div
                  style={{
                    ...s.logoBox,
                    borderColor: colors.border,
                  }}
                >
                  {logo ? (
                    <img src={logo} alt="Company logo" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                  ) : (
                    <span style={s.muted}>No logo yet</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button style={s.smallBtn} onClick={() => fileRef.current?.click()}>
                    Upload image…
                  </button>
                  {logo && (
                    <button style={{ ...s.smallBtn, color: colors.danger }} onClick={() => setLogo(null)}>
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={s.label}>Brand color</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#F97316"}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: 44, height: 36, border: "none", background: "transparent", cursor: "pointer" }}
                  />
                  <input
                    style={{ ...s.input, borderColor: validColor ? colors.border : colors.danger }}
                    placeholder="#F97316 (optional)"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    maxLength={7}
                  />
                </div>
                {!validColor && <div style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>Use #RRGGBB format.</div>}

                <div style={{ ...s.label, marginTop: 18 }}>Commuter preview</div>
                <div style={s.previewCard}>
                  {logo && <img src={logo} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain" }} />}
                  <div>
                    <div style={{ color: colors.text, fontWeight: 700, fontSize: 13 }}>
                      Operated by {profile?.name ?? "—"}
                    </div>
                    <div style={{ color: validColor && color.trim() ? color.trim() : colors.textMuted, fontSize: 12, fontWeight: 700 }}>
                      Montalban–Cubao · 2 stops
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button style={s.primaryBtn} disabled={saving || !validColor} onClick={save}>
              {saving ? "Saving…" : "Save branding"}
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}

const s: any = {
  h1: { fontSize: 26, fontWeight: 800, color: colors.text, margin: "0 0 6px" },
  sub: { color: colors.textMuted, fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.5 },
  card: { marginTop: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 },
  rowWrap: { display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 20 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  logoBox: {
    width: 160,
    height: 160,
    border: "1px dashed",
    borderRadius: radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: colors.surfaceAlt,
  },
  input: {
    background: colors.surfaceAlt,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: "9px 10px",
    fontSize: 14,
    width: 160,
  },
  previewCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: "10px 12px",
    maxWidth: 320,
  },
  primaryBtn: {
    background: colors.primary,
    color: "#0B0F14",
    border: "none",
    borderRadius: radius.md,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  smallBtn: {
    background: "transparent",
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { marginTop: 16, background: "#3B1A1A", color: colors.danger, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
  saved: { marginTop: 16, background: "#12281B", color: colors.success, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
};
