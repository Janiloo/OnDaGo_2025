import { DiscoveryRoute } from "../services/discoveryApi";

export interface TripMatch {
  route: DiscoveryRoute;
  /**
   * True when the route's declared stop order passes origin before destination.
   * PUVs run both directions on a chain and direction isn't modeled yet, so
   * reverse matches still count as rides — this only orders/annotates results.
   */
  sameDirection: boolean;
}

/**
 * Routes that connect an origin terminal to a destination terminal. A route
 * matches when its stop chain contains BOTH terminals; declared-direction
 * matches sort first.
 */
export function routesBetween(
  routes: DiscoveryRoute[],
  originId: string,
  destinationId: string
): TripMatch[] {
  if (!originId || !destinationId || originId === destinationId) return [];
  return routes
    .flatMap((route) => {
      const a = route.terminalIds.indexOf(originId);
      const b = route.terminalIds.indexOf(destinationId);
      if (a === -1 || b === -1) return [];
      return [{ route, sameDirection: a < b }];
    })
    .sort((x, y) => Number(y.sameDirection) - Number(x.sameDirection));
}
