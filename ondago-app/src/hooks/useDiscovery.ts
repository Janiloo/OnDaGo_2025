import { useEffect, useMemo, useState } from "react";
import {
  DiscoveryCompany,
  DiscoveryRoute,
  DiscoveryTerminal,
  getCompanies,
  getRoutes,
  getTerminals,
} from "../services/discoveryApi";

/**
 * Commuter discovery data: the terminals, routes, and operator branding
 * published by verified companies. Fetched once (they change rarely — an admin
 * edits them, not the fleet), then held for the life of the screen. Failures
 * fall back to empty, and the map degrades to hardcoded stops.
 */
export function useDiscovery() {
  const [terminals, setTerminals] = useState<DiscoveryTerminal[]>([]);
  const [routes, setRoutes] = useState<DiscoveryRoute[]>([]);
  const [companies, setCompanies] = useState<DiscoveryCompany[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getTerminals(),
      getRoutes(),
      getCompanies().catch(() => [] as DiscoveryCompany[]), // branding is optional garnish
    ])
      .then(([t, r, c]) => {
        if (!mounted) return;
        setTerminals(t);
        setRoutes(r);
        setCompanies(c);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  return { terminals, routes, companies, companyById, loaded };
}
