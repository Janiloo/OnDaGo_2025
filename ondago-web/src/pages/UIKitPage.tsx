import React, { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CellSub,
  EmptyState,
  Field,
  FormRow,
  PageHeader,
  RowActions,
  SectionTitle,
  Select,
  Skeleton,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Textarea,
} from "../components/ui";
import { colors } from "../theme";

/**
 * Living catalogue of the Sabako UI kit at /ui — a review surface for the design
 * system before pages are migrated onto it. Not linked from the app nav.
 * Delete once every page has been migrated.
 */
export default function UIKitPage() {
  const [loading, setLoading] = useState(false);

  const swatches: [string, string][] = [
    ["primary", colors.primary],
    ["accent", colors.accent],
    ["success", colors.success],
    ["danger", colors.danger],
    ["warning", colors.warning],
    ["info", colors.info],
    ["surface", colors.surface],
    ["surfaceAlt", colors.surfaceAlt],
    ["border", colors.border],
    ["textMuted", colors.textMuted],
  ];

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
        <PageHeader
          title="Sabako UI Kit"
          description="Every primitive in the console, with the states that inline styles could never express — hover, focus-visible, active, disabled and loading. Direction: jeepney at dusk — enamel vermillion and the flag's marigold sun over deep indigo."
          actions={
            <>
              <Button variant="ghost">Docs</Button>
              <Button variant="primary">Primary action</Button>
            </>
          }
        />

        {/* ---- Color ---- */}
        <section>
          <SectionTitle>Palette</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {swatches.map(([name, hex]) => (
              <Card key={name} padded={false}>
                <div style={{ height: 56, background: hex, borderRadius: "15px 15px 0 0" }} />
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: "monospace" }}>{hex}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- Type ---- */}
        <section>
          <SectionTitle>Typography — Archivo Black (display) / Archivo (text)</SectionTitle>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30 }}>Display 30 — Fleet overview</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>H1 24 — Vehicles</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>H2 18 — Active today</div>
              <div style={{ fontSize: 14 }}>Body 14 — Nine vehicles are broadcasting on two routes right now.</div>
              <div style={{ fontSize: 13, color: colors.textMuted }}>Small 13 — Last updated a moment ago</div>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textFaint }}>
                Overline 11 — Seat capacity
              </div>
              <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 26 }}>
                1,481,092 ← tabular numerals (no jitter on live updates)
              </div>
            </div>
          </Card>
        </section>

        {/* ---- Buttons ---- */}
        <section>
          <SectionTitle>Buttons — hover, focus (tab to it), active, disabled, loading</SectionTitle>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Delete</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary" size="sm">
                  Small
                </Button>
                <Button variant="primary" size="md">
                  Medium
                </Button>
                <Button variant="primary" size="lg">
                  Large
                </Button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
                <Button variant="primary" loading>
                  Saving
                </Button>
                <Button
                  variant="secondary"
                  loading={loading}
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 1600);
                  }}
                >
                  {loading ? "Working" : "Click to load"}
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* ---- Stats ---- */}
        <section>
          <SectionTitle>Stat cards</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <StatCard label="Live vehicles" value="9" hint="across 2 routes" />
            <StatCard label="Seats free" value="184" hint="of 270 total" />
            <StatCard label="Open reports" value="3" hint="1 needs triage" />
            <StatCard label="Drivers on duty" value="7" hint="2 off duty" />
          </div>
        </section>

        {/* ---- Form ---- */}
        <section>
          <SectionTitle>Form controls</SectionTitle>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <FormRow>
                <Field label="Plate number" placeholder="FTR-001" required hint="As printed on the vehicle." />
                <Field label="Seat capacity" type="number" placeholder="30" required />
              </FormRow>
              <FormRow>
                <Select
                  label="Assigned route"
                  options={[
                    { value: "", label: "Unassigned" },
                    { value: "1", label: "Montalban – Cubao" },
                    { value: "2", label: "San Mateo – Trinoma" },
                  ]}
                />
                <Field label="Terminal code" placeholder="MTL-1" error="That code is already taken." />
              </FormRow>
              <Textarea label="Notes" placeholder="Anything the dispatcher should know…" />
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="primary">Save vehicle</Button>
                <Button variant="ghost">Cancel</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* ---- Badges + alerts ---- */}
        <section>
          <SectionTitle>Badges &amp; alerts</SectionTitle>
          <Card>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              <Badge tone="success" dot pulse>
                Live
              </Badge>
              <Badge tone="neutral" dot>
                Off duty
              </Badge>
              <Badge tone="warning">Signal lost</Badge>
              <Badge tone="danger">Suspended</Badge>
              <Badge tone="brand">Company admin</Badge>
              <Badge tone="info">Verified</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Alert tone="error">Could not reach the server. Is the API running on :5147?</Alert>
              <Alert tone="success">Branding saved — commuters will see it on their next app refresh.</Alert>
              <Alert tone="warning">Two vehicles have not broadcast in over 30 minutes.</Alert>
              <Alert tone="info">Analytics begins accumulating from the day recording was enabled.</Alert>
            </div>
          </Card>
        </section>

        {/* ---- Table ---- */}
        <section>
          <SectionTitle>Table — hover a row to reveal actions</SectionTitle>
          <Table>
            <THead>
              <TR>
                <TH>Plate</TH>
                <TH>Route</TH>
                <TH>Driver</TH>
                <TH numeric>Seats</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {[
                ["FTR-001", "Montalban – Cubao", "Dhenscen Driver", "4 / 30", "live"],
                ["DRC-1414", "San Mateo – Trinoma", "Driver Denmark", "12 / 18", "live"],
                ["ABC-2201", "Unassigned", "—", "0 / 22", "off"],
              ].map(([plate, route, driver, seats, status]) => (
                <TR key={plate}>
                  <TD>
                    <strong>{plate}</strong>
                    <CellSub>Jeepney</CellSub>
                  </TD>
                  <TD>{route}</TD>
                  <TD>{driver}</TD>
                  <TD numeric>{seats}</TD>
                  <TD>
                    {status === "live" ? (
                      <Badge tone="success" dot pulse>
                        Live
                      </Badge>
                    ) : (
                      <Badge tone="neutral" dot>
                        Off duty
                      </Badge>
                    )}
                  </TD>
                  <TD>
                    <RowActions>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                      <Button size="sm" variant="danger">
                        Delete
                      </Button>
                    </RowActions>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>

        {/* ---- Empty + loading ---- */}
        <section>
          <SectionTitle>Empty &amp; loading states</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
            <Card padded={false}>
              <CardHeader title="No routes yet" />
              <EmptyState
                title="Walang ruta pa"
                description="Create your first route to start grouping terminals and tracking vehicles along it."
                action={<Button variant="primary">Add a route</Button>}
              />
            </Card>
            <Card padded={false}>
              <CardHeader title="Loading" />
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <Skeleton height={20} width="55%" />
                <Skeleton height={14} />
                <Skeleton height={14} width="85%" />
                <Skeleton height={14} width="70%" />
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <Skeleton height={38} width={110} radius={12} />
                  <Skeleton height={38} width={90} radius={12} />
                </div>
              </div>
            </Card>
          </div>
        </section>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
