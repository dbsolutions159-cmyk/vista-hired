/**
 * Connector registry. Register new connectors here — the sync pipeline picks up
 * every enabled `job_sources` row whose `connector` matches a registered id.
 */
import {
  adzunaConnector,
  ashbyConnector,
  greenhouseConnector,
  leverConnector,
  remotiveConnector,
  smartRecruitersConnector,
  workableConnector,
} from "./connectors.server";
import type { Connector } from "./types";

export const CONNECTORS: Record<string, Connector> = {
  [adzunaConnector.id]: adzunaConnector,
  [remotiveConnector.id]: remotiveConnector,
  [greenhouseConnector.id]: greenhouseConnector,
  [leverConnector.id]: leverConnector,
  [ashbyConnector.id]: ashbyConnector,
  [workableConnector.id]: workableConnector,
  [smartRecruitersConnector.id]: smartRecruitersConnector,
};

export function getConnector(id: string): Connector | null {
  return CONNECTORS[id] ?? null;
}
