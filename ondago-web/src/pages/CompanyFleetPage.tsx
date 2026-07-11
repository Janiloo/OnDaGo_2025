import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { COMPANY_NAV, Driver, dutyPresentation, RouteInfo, Vehicle } from "../companyNav";
import { colors, radius } from "../theme";

// Manila-ish default view; the map auto-fits to the company's vehicles when any
// have broadcast a position.
const DEFAULT_CENTER: [number, number] = [14.6737, 121.1094];

/** Colored dot marker (avoids Leaflet's broken default-icon asset paths under Vite). */
function dot(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #0B0F14;box-shadow:0 0 0 2px ${color}55"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const hasPosition = (v: Vehicle) => !!(v.currentLat && v.currentLong);

/**
 * Company console — Fleet Map: every vehicle registered to THIS company, listed
 * with its assignments and plotted on a live map from its latest GPS broadcast.
 * All data comes from the tenant-scoped /api/admin/* endpoints, so a company
 * admin only ever sees their own fleet.
 */
export default function CompanyFleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);
  const driverByPuv = useMemo(
    () => new Map(drivers.filter((d) => d.puvNo).map((d) => [d.puvNo as string, d])),
    [drivers]
  );

  const load = async () => {
    setError(null);
    try {
      const [v, r, d] = await Promise.all([
        api.get<Vehicle[]>("/api/admin/vehicles"),
        api.get<RouteInfo[]>("/api/admin/routes"),
        api.get<Driver[]>("/api/admin/drivers"),
      ]);
      setVehicles(v.data);
      setRoutes(r.data);
      setDrivers(d.data);
    } catch (err) {
      setError(errorMessage(err, "Could not load your fleet."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh positions periodically so the map tracks live vehicles.
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const positioned = vehicles.filter(hasPosition);
  const bounds = positioned.length
    ? L.latLngBounds(positioned.map((v) => [v.currentLat!, v.currentLong!] as [number, number]))
    : null;

  const routeName = (v: Vehicle) => (v.routeId ? routeById.get(v.routeId)?.name ?? "—" : "—");
  const driverName = (v: Vehicle) => driverByPuv.get(v.puvNo)?.name ?? "—";

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <h1 style={s.h1}>Fleet Map</h1>
      <p style={s.sub}>
        Your registered vehicles and their live positions. Manage assignments on the{" "}
        <Link to="/company/vehicles" style={s.inlineLink}>
          Vehicles page
        </Link>
        .
      </p>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.mapWrap}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          bounds={bounds ?? undefined}
          boundsOptions={{ padding: [40, 40] }}
          style={{ height: 460, width: "100%", borderRadius: radius.lg }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positioned.map((v) => {
            const duty = dutyPresentation(v.dutyStatus, v.lastUpdated);
            const inactive = v.status === "Inactive";
            const color = inactive ? colors.textMuted : duty.tone === "success" ? colors.success : duty.tone === "warn" ? colors.accent : colors.textMuted;
            return (
              <Marker key={v.puvNo} position={[v.currentLat!, v.currentLong!]} icon={dot(color)}>
                <Popup>
                  <div style={{ minWidth: 180, fontFamily: "system-ui" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{v.puvNo}</div>
                    <div style={p.row}><span style={p.k}>PUV No.</span><span>{v.puvNo}</span></div>
                    <div style={p.row}><span style={p.k}>Driver</span><span>{driverName(v)}</span></div>
                    <div style={p.row}><span style={p.k}>Route</span><span>{routeName(v)}</span></div>
                    <div style={p.row}><span style={p.k}>Occupancy</span><span>{v.passengerCount}/{v.maxPassengerCount}</span></div>
                    <div style={p.row}><span style={p.k}>Status</span><span>{inactive ? "Inactive" : "Active"} · {duty.label.replace(/^[○●]\s*/, "")}</span></div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        {!loading && positioned.length === 0 && (
          <div style={s.mapOverlay}>No vehicles are broadcasting a position yet.</div>
        )}
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : vehicles.length === 0 ? (
          <div style={s.muted}>No vehicles registered yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Plate / PUV No.</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Seat Capacity</th>
                <th style={s.th}>Route</th>
                <th style={s.th}>Driver</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Duty</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const duty = dutyPresentation(v.dutyStatus, v.lastUpdated);
                const inactive = v.status === "Inactive";
                const tone = duty.tone === "success" ? colors.success : duty.tone === "warn" ? colors.accent : colors.textMuted;
                return (
                  <tr key={v.puvNo}>
                    <td style={s.td}><span style={s.mono}>{v.puvNo}</span></td>
                    <td style={s.td}>PUV</td>
                    <td style={s.td}>{v.maxPassengerCount}</td>
                    <td style={s.td}>{routeName(v)}</td>
                    <td style={s.td}>{driverName(v)}</td>
                    <td style={s.td}>
                      <span style={{ ...s.pill, color: inactive ? colors.danger : colors.success, borderColor: inactive ? colors.danger : colors.success }}>
                        {inactive ? "inactive" : "active"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.pill, color: tone, borderColor: tone }}>{duty.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const p: any = {
  row: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, padding: "2px 0" },
  k: { color: "#6B7280", fontWeight: 600 },
};

const s: any = {
  h1: { fontSize: 26, fontWeight: 800, color: colors.text, margin: "0 0 6px" },
  sub: { color: colors.textMuted, fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.5 },
  inlineLink: { color: colors.primary, fontWeight: 700, textDecoration: "none" },
  mapWrap: { position: "relative", marginTop: 16, borderRadius: radius.lg, overflow: "hidden", border: `1px solid ${colors.border}` },
  mapOverlay: {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(11,15,20,0.88)",
    color: "#fff",
    borderRadius: radius.pill,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 700,
    zIndex: 500,
  },
  card: { marginTop: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 8 },
  muted: { color: colors.textMuted, fontSize: 14, padding: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${colors.border}` },
  td: { padding: "14px 14px", color: colors.text, borderBottom: `1px solid ${colors.border}`, verticalAlign: "middle" },
  mono: { fontFamily: "monospace", fontSize: 15, fontWeight: 700 },
  pill: { fontSize: 12, fontWeight: 700, border: "1px solid", borderRadius: radius.pill, padding: "3px 10px", whiteSpace: "nowrap" },
  error: { marginTop: 16, background: "#3B1A1A", color: colors.danger, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
};
