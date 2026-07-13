import type { QueryResultRow } from "pg";
import type { TarjetaSortBy, TarjetaSortOrder } from "./dto/list-tarjetas-query.dto";

export interface TarjetaAreaJson { id: number; sedeId: number; sedeNombre: string; empresaNombre: string; nombre: string; activo: boolean; createdAt: string; updatedAt: string; }
export interface TarjetaRow extends QueryResultRow {
  id: string; sede_id: string; sede_nombre: string; empresa_nombre: string; numero: number; color: string; icono: string; activo: boolean; en_uso: boolean;
  creado_en: Date | string; actualizado_en: Date | string; areas: TarjetaAreaJson[] | string;
}
export interface TarjetaListFilters {
  page: number; limit: number; search?: string; sedeId?: number; numero?: number; color?: string; icono?: string;
  areaId?: number; activo?: boolean; enUso?: boolean; sortBy?: TarjetaSortBy; sortOrder?: TarjetaSortOrder;
}
export interface TarjetaValues { sedeId?: number; numero?: number; color?: string; icono?: string; activo?: boolean; enUso?: boolean; areaIds?: number[]; }
