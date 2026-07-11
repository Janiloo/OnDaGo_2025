import { client, normalizeId } from "./client";

/**
 * Cross-tenant commuter discovery layer (backend /api/discovery/*). Unlike the
 * company-scoped admin endpoints, these read terminals/routes across every
 * VERIFIED company — the public "what can I ride?" intelligence the commuter map
 * is built on.
 */

export interface DiscoveryTerminal {
  id: string;
  name: string;
  code: string | null;
  latitude: number;
  longitude: number;
}

export interface DiscoveryRoute {
  id: string;
  name: string;
  code: string | null;
  terminalIds: string[];
  /** Owning operator — pairs with DiscoveryCompany for branding. */
  companyId: string | null;
}

/** Operator branding (Tier 2): "Operated by X" name, logo, and accent color. */
export interface DiscoveryCompany {
  id: string;
  name: string;
  logo: string | null;
  brandColor: string | null;
}

function normalizeTerminal(t: any): DiscoveryTerminal {
  return {
    id: normalizeId(t.id ?? t.Id),
    name: t.name ?? t.Name ?? "",
    code: t.code ?? t.Code ?? null,
    latitude: Number(t.latitude ?? t.Latitude ?? 0),
    longitude: Number(t.longitude ?? t.Longitude ?? 0),
  };
}

function normalizeRoute(r: any): DiscoveryRoute {
  const ids = r.terminalIds ?? r.TerminalIds ?? [];
  return {
    id: normalizeId(r.id ?? r.Id),
    name: r.name ?? r.Name ?? "",
    code: r.code ?? r.Code ?? null,
    terminalIds: Array.isArray(ids) ? ids.map((x: any) => normalizeId(x)) : [],
    companyId: r.companyId ?? r.CompanyId ?? null,
  };
}

function normalizeCompany(c: any): DiscoveryCompany {
  return {
    id: normalizeId(c.id ?? c.Id),
    name: c.name ?? c.Name ?? "",
    logo: c.logo ?? c.Logo ?? null,
    brandColor: c.brandColor ?? c.BrandColor ?? null,
  };
}

export async function getTerminals(): Promise<DiscoveryTerminal[]> {
  const { data } = await client.get("/api/discovery/terminals");
  return Array.isArray(data) ? data.map(normalizeTerminal) : [];
}

export async function getRoutes(): Promise<DiscoveryRoute[]> {
  const { data } = await client.get("/api/discovery/routes");
  return Array.isArray(data) ? data.map(normalizeRoute) : [];
}

export async function getCompanies(): Promise<DiscoveryCompany[]> {
  const { data } = await client.get("/api/discovery/companies");
  return Array.isArray(data) ? data.map(normalizeCompany) : [];
}

export interface DiscoveryVehicle {
  id: string;
  puvNo: string;
}

/** Plate numbers for one company — powers the commuter report plate picker. */
export async function getCompanyVehicles(companyId: string): Promise<DiscoveryVehicle[]> {
  const { data } = await client.get(`/api/discovery/companies/${encodeURIComponent(companyId)}/vehicles`);
  if (!Array.isArray(data)) return [];
  return data.map((v: any) => ({ id: normalizeId(v.id ?? v.Id), puvNo: v.puvNo ?? v.PuvNo ?? "" }));
}
