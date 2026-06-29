/**
 * @file tickets-compat.ts
 * @description Tipos y utilidades compartidas tras la eliminación del módulo tickets.
 */
import type { DomainUser } from "./mappers/user.mapper";

export type TicketStatus = "new" | "assigned" | "planned" | "waiting" | "solved" | "closed";
export type TicketType = "incident" | "request";
export type HistorySortBy =
  | "id"
  | "createdAt"
  | "requester"
  | "location"
  | "type"
  | "subject"
  | "status"
  | "technician";
export type HistorySortOrder = "asc" | "desc";

export interface TicketResponseDto {
  id: number;
  type: TicketType;
  status: TicketStatus;
  urgency: string;
  subject: string;
  description: string | null;
  category: { id: number; name: string } | null;
  location: { id: number | null; name: string | null } | null;
  requester: { id: number | null; name: string | null; email: string | null };
  technician: { id: number | null; name: string | null; email: string | null } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TicketMetricSlice {
  open: number;
  openPercent: number;
  openThisMonth: number;
  totalThisMonth: number;
}

export interface MyTicketsMetricSlice {
  inProgress: number;
  openPercent: number;
  openThisMonth: number;
  totalThisMonth: number;
}

export interface OpenByLocationMetric {
  locationId: number;
  name: string;
  open: number;
}

export interface TicketMetricsResponseDto {
  myTickets: MyTicketsMetricSlice;
  mySite: TicketMetricSlice | null;
  myIncidents: TicketMetricSlice;
  myRequests: TicketMetricSlice;
  myGroup: TicketMetricSlice;
  mySolved: TicketMetricSlice;
  myClosed: TicketMetricSlice;
  openByLocation: OpenByLocationMetric[];
}

export const OPEN_STATUS_GLPI = [1, 2, 3, 4] as const;
export const MY_GROUP_HISTORY_STATUS_GLPI = [2, 3] as const;
export const EMPTY_METRIC_SLICE: TicketMetricSlice = {
  open: 0,
  openPercent: 0,
  openThisMonth: 0,
  totalThisMonth: 0,
};

export function openPercent(openThisMonth: number, totalThisMonth: number): number {
  if (totalThisMonth <= 0) return 0;
  return Math.round((openThisMonth / totalThisMonth) * 100);
}

export function normalizeLocationId(locationId: number | null | undefined): number | null {
  if (locationId == null) return null;
  const normalized = Number(locationId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function pickLastActiveTechnicianByName(
  technicians: DomainUser[],
  locationId: number | null,
): DomainUser | null {
  const normalizedLocationId = normalizeLocationId(locationId);
  const candidates = technicians.filter((tech) => {
    if (!tech.isActive) return false;
    if (normalizedLocationId == null) return true;
    return normalizeLocationId(tech.locationId) === normalizedLocationId;
  });

  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  return sorted[sorted.length - 1] ?? null;
}
