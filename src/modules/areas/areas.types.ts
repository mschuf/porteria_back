import type { QueryResultRow } from "pg";
import type { AreaSortBy, AreaSortOrder } from "./dto/list-areas-query.dto";

export interface AreaRow extends QueryResultRow {
  id: string;
  sede_id: string;
  sede_nombre: string;
  empresa_nombre: string;
  nombre: string;
  activo: boolean;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

export interface AreaListFilters {
  page: number; limit: number; search?: string; nombre?: string; sedeId?: number; activo?: boolean;
  sortBy?: AreaSortBy; sortOrder?: AreaSortOrder; sedeIds?: number[];
}
